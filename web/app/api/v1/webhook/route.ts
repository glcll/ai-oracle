import { NextResponse } from "next/server";
import { setResult } from "@/lib/kv";
import { WORKER_MODELS, JUDGE_MODELS, type ScoreMatrix, type ModelResponse } from "@/lib/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function fetchAnswer(modelId: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: "Answer concisely and directly." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 256,
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (webhookSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    requestId: string;
    prompt: string;
    scores: number[];
    responses: string[];
    confidences: number[];
    winnerIndex?: number;
    judgeModels?: string[];
    nodeCount?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { requestId, prompt, scores, responses, confidences, nodeCount } = body;
  const workerCount = responses?.length ?? 0;
  const judgeCount = JUDGE_MODELS.length;

  if (!requestId || !scores || !responses || workerCount < 2) {
    return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
  }

  const scoreMatrix: ScoreMatrix = {};
  const avgScores: { [model: string]: number } = {};

  if (scores.length === workerCount * judgeCount) {
    // 2W+2J format: scores = [j0_w0, j0_w1, j1_w0, j1_w1]
    for (let w = 0; w < workerCount; w++) {
      const workerId = WORKER_MODELS[w]?.id || `worker-${w}`;
      scoreMatrix[workerId] = { judgedBy: {} };
      let total = 0;
      for (let j = 0; j < judgeCount; j++) {
        const score = scores[j * workerCount + w];
        const judgeId = (body.judgeModels?.[j]) || JUDGE_MODELS[j]?.id || `judge-${j}`;
        scoreMatrix[workerId].judgedBy[judgeId] = score;
        total += score;
      }
      avgScores[workerId] = Math.round((total / judgeCount) * 100) / 100;
    }
  } else if (scores.length === workerCount) {
    // Single judge format: scores = [w0_score, w1_score]
    const judgeName = JUDGE_MODELS[0]?.id || "judge";
    for (let w = 0; w < workerCount; w++) {
      const workerId = WORKER_MODELS[w]?.id || `worker-${w}`;
      scoreMatrix[workerId] = { judgedBy: { [judgeName]: scores[w] } };
      avgScores[workerId] = scores[w];
    }
  } else {
    return NextResponse.json({ error: `unexpected scores length ${scores.length}` }, { status: 400 });
  }

  let winningIndex = 0;
  let bestAvg = -1;
  for (let w = 0; w < workerCount; w++) {
    const wId = WORKER_MODELS[w]?.id || `worker-${w}`;
    if (avgScores[wId] > bestAvg) {
      bestAvg = avgScores[wId];
      winningIndex = w;
    }
  }
  if (body.winnerIndex !== undefined) winningIndex = body.winnerIndex;

  const winningModel = WORKER_MODELS[winningIndex];

  const hasResponses = responses.some((r) => r && r.trim().length > 0);
  let finalResponses = responses;

  if (!hasResponses && prompt) {
    const fetched = await Promise.all(
      WORKER_MODELS.slice(0, workerCount).map((m) => fetchAnswer(m.openRouterId, prompt))
    );
    finalResponses = fetched;
  }

  const allResponses: ModelResponse[] = finalResponses.map((resp, i) => ({
    model: WORKER_MODELS[i]?.id || `worker-${i}`,
    answer: resp || "",
    confidence: confidences?.[i] ?? 5,
    avgScore: avgScores[WORKER_MODELS[i]?.id || `worker-${i}`] ?? 5,
  }));

  await setResult({
    requestId,
    status: "completed",
    prompt,
    response: finalResponses[winningIndex] || "",
    consensus: {
      winningModel: winningModel?.id || `worker-${winningIndex}`,
      winningIndex,
      averageScores: avgScores,
      scoreMatrix,
      nodeCount: nodeCount ?? 5,
      consensusMethod: "median-aggregation-2w2j",
    },
    allResponses,
    timing: {
      submittedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ status: "ok", requestId });
}
