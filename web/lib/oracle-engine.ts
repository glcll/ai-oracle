import { MODELS, type OracleResult, type ModelResponse, type ScoreMatrix } from "./types";
import { setResult } from "./kv";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callModel(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
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
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

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

export async function runOracleConsensus(
  requestId: string,
  prompt: string
): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    await setResult({
      requestId,
      status: "failed",
      error: "OPENROUTER_API_KEY not configured",
    });
    return;
  }

  try {
    // Phase 1: Query all 3 models
    const generationPrompt = `Answer the following question thoughtfully and concisely. Respond with valid JSON only: { "answer": "your detailed answer here", "confidence": <integer 1-10> }`;

    const rawResponses = await Promise.all(
      MODELS.map((m) =>
        callModel(m.openRouterId, generationPrompt, prompt, apiKey)
      )
    );

    const responses = rawResponses.map((raw, i) => {
      const parsed = parseJsonResponse(raw);
      return {
        model: MODELS[i].id,
        modelName: MODELS[i].name,
        answer: (parsed?.answer as string) ?? raw,
        confidence: (parsed?.confidence as number) ?? 5,
      };
    });

    // Phase 2: Each model judges all 3 responses (3x3 matrix)
    const judgePrompt = (r1: string, r2: string, r3: string) =>
      `You are evaluating 3 AI responses to the question: "${prompt}"

[Response 1]: ${r1}

[Response 2]: ${r2}

[Response 3]: ${r3}

Score each response on accuracy, completeness, and clarity (1-10 integer scale). Respond with ONLY valid JSON: { "score_1": <int>, "score_2": <int>, "score_3": <int> }`;

    const answers = responses.map((r) => r.answer);
    const judgeResults = await Promise.all(
      MODELS.map((m) =>
        callModel(
          m.openRouterId,
          "You are an impartial AI response evaluator. Score responses 1-10. Return only JSON.",
          judgePrompt(answers[0], answers[1], answers[2]),
          apiKey
        )
      )
    );

    // Phase 3: Build score matrix and compute winner
    const scoreMatrix: ScoreMatrix = {};
    const avgScores: { [model: string]: number } = {};
    const totals = [0, 0, 0];
    let judgeCount = 0;

    for (let j = 0; j < 3; j++) {
      const parsed = parseJsonResponse(judgeResults[j]);
      const s1 = clampScore(parsed?.score_1);
      const s2 = clampScore(parsed?.score_2);
      const s3 = clampScore(parsed?.score_3);

      totals[0] += s1;
      totals[1] += s2;
      totals[2] += s3;
      judgeCount++;

      for (let r = 0; r < 3; r++) {
        const respondentId = MODELS[r].id;
        if (!scoreMatrix[respondentId]) {
          scoreMatrix[respondentId] = { judgedBy: {} };
        }
        scoreMatrix[respondentId].judgedBy[MODELS[j].id] = [s1, s2, s3][r];
      }
    }

    for (let r = 0; r < 3; r++) {
      avgScores[MODELS[r].id] = Math.round((totals[r] / judgeCount) * 100) / 100;
    }

    const winningIndex = totals.indexOf(Math.max(...totals));

    const allResponses: ModelResponse[] = responses.map((r, i) => ({
      model: r.model,
      answer: r.answer,
      confidence: r.confidence,
      avgScore: avgScores[r.model],
    }));

    const completedAt = new Date().toISOString();

    await setResult({
      requestId,
      status: "completed",
      prompt,
      response: responses[winningIndex].answer,
      consensus: {
        winningModel: MODELS[winningIndex].id,
        winningIndex,
        averageScores: avgScores,
        scoreMatrix,
        nodeCount: 1,
        consensusMethod: "median-aggregation-3x3",
      },
      allResponses,
      timing: {
        submittedAt: new Date().toISOString(),
        completedAt,
      },
    });
  } catch (err) {
    await setResult({
      requestId,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

function clampScore(val: unknown): number {
  const n = Number(val);
  if (isNaN(n)) return 5;
  return Math.max(1, Math.min(10, Math.round(n)));
}
