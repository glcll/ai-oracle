import { WORKER_MODELS, JUDGE_MODELS, type OracleResult, type ModelResponse, type ScoreMatrix } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type SendFn = (data: Record<string, unknown>) => void;

async function callModel(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens = 256
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "AI Oracle",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (res.status === 429) {
    const wait = Math.min(parseInt(res.headers.get("retry-after") || "5", 10), 10) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return callModel(modelId, systemPrompt, userPrompt, apiKey, maxTokens);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJsonResponse(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function runOracleConsensusStreaming(
  requestId: string,
  prompt: string,
  send: SendFn
): Promise<OracleResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { requestId, status: "failed", error: "OPENROUTER_API_KEY not configured" };
  }

  const submittedAt = new Date().toISOString();

  try {
    // Phase 1: 2 workers generate answers in parallel
    send({
      type: "phase",
      phase: "generation",
      message: `Querying ${WORKER_MODELS.map((m) => m.name).join(", ")}...`,
    });

    const generationPrompt =
      'Answer the question clearly and concisely. Return valid JSON: {"answer":"your full answer here","confidence":<1-10>}';

    const rawResponses = await Promise.all(
      WORKER_MODELS.map(async (m, i) => {
        const result = await callModel(m.openRouterId, generationPrompt, prompt, apiKey, 512);
        send({ type: "model_done", phase: "generation", model: m.id, index: i });
        return result;
      })
    );

    const responses = rawResponses.map((raw, i) => {
      const parsed = parseJsonResponse(raw);
      return {
        model: WORKER_MODELS[i].id,
        modelName: WORKER_MODELS[i].name,
        answer: (parsed?.answer as string) ?? raw.slice(0, 500),
        confidence: (parsed?.confidence as number) ?? 5,
      };
    });

    // Phase 2: 2 judges score both worker responses in parallel
    send({
      type: "phase",
      phase: "judging",
      message: `${JUDGE_MODELS.map((m) => m.name).join(" & ")} evaluating responses...`,
    });

    const answers = responses.map((r) => r.answer);
    const judgePromptText =
      `Q:"${prompt}" A1:"${answers[0]}" A2:"${answers[1]}" Return:{"s1":N,"s2":N}`;

    const judgeResults = await Promise.all(
      JUDGE_MODELS.map(async (judge, i) => {
        const result = await callModel(
          judge.openRouterId,
          "Score each answer 1-10 for accuracy and clarity. Return only JSON.",
          judgePromptText,
          apiKey,
          64
        );
        send({ type: "model_done", phase: "judging", model: judge.id, index: i });
        return result;
      })
    );

    // Phase 3: Compute scores and winner
    send({ type: "phase", phase: "consensus", message: "Computing consensus..." });

    const scoreMatrix: ScoreMatrix = {};
    const avgScores: { [model: string]: number } = {};

    for (let w = 0; w < WORKER_MODELS.length; w++) {
      const workerId = WORKER_MODELS[w].id;
      scoreMatrix[workerId] = { judgedBy: {} };
      let total = 0;
      for (let j = 0; j < JUDGE_MODELS.length; j++) {
        const parsed = parseJsonResponse(judgeResults[j]);
        const scoreKey = `s${w + 1}`;
        const score = clampScore(parsed?.[scoreKey]);
        scoreMatrix[workerId].judgedBy[JUDGE_MODELS[j].id] = score;
        total += score;
      }
      avgScores[workerId] = Math.round((total / JUDGE_MODELS.length) * 100) / 100;
    }

    const winningIndex = avgScores[WORKER_MODELS[0].id] >= avgScores[WORKER_MODELS[1].id] ? 0 : 1;
    const completedAt = new Date().toISOString();

    const allResponses: ModelResponse[] = responses.map((r, i) => ({
      model: r.model,
      answer: r.answer,
      confidence: r.confidence,
      avgScore: avgScores[r.model],
    }));

    return {
      requestId,
      status: "completed",
      prompt,
      response: responses[winningIndex].answer,
      consensus: {
        winningModel: WORKER_MODELS[winningIndex].id,
        winningIndex,
        averageScores: avgScores,
        scoreMatrix,
        nodeCount: 1,
        consensusMethod: "median-aggregation-2w2j",
      },
      allResponses,
      timing: {
        submittedAt,
        completedAt,
        durationMs: new Date(completedAt).getTime() - new Date(submittedAt).getTime(),
      },
    };
  } catch (err) {
    return {
      requestId,
      status: "failed",
      prompt,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function clampScore(val: unknown): number {
  const n = Number(val);
  if (isNaN(n)) return 5;
  return Math.max(1, Math.min(10, Math.round(n)));
}
