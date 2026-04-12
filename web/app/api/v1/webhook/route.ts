import { NextResponse } from "next/server";
import { setResult } from "@/lib/kv";
import { WORKER_MODELS, JUDGE_MODELS, type ScoreMatrix, type ModelResponse } from "@/lib/types";

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
    nodeCount?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { requestId, prompt, scores, responses, confidences, nodeCount } = body;

  if (!requestId || !scores || scores.length !== 9 || !responses || responses.length !== 3) {
    return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
  }

  const scoreMatrix: ScoreMatrix = {};
  const avgScores: { [model: string]: number } = {};
  const totals = [0, 0, 0];

  for (let j = 0; j < 3; j++) {
    for (let r = 0; r < 3; r++) {
      const score = scores[j * 3 + r];
      const respondentId = WORKER_MODELS[r].id;
      if (!scoreMatrix[respondentId]) {
        scoreMatrix[respondentId] = { judgedBy: {} };
      }
      scoreMatrix[respondentId].judgedBy[JUDGE_MODELS[j].id] = score;
      totals[r] += score;
    }
  }

  for (let r = 0; r < 3; r++) {
    avgScores[WORKER_MODELS[r].id] = Math.round((totals[r] / 3) * 100) / 100;
  }

  const winningIndex = totals.indexOf(Math.max(...totals));

  const allResponses: ModelResponse[] = WORKER_MODELS.map((m, i) => ({
    model: m.id,
    answer: responses[i],
    confidence: confidences?.[i] ?? 5,
    avgScore: avgScores[m.id],
  }));

  await setResult({
    requestId,
    status: "completed",
    prompt,
    response: responses[winningIndex],
    consensus: {
      winningModel: WORKER_MODELS[winningIndex].id,
      winningIndex,
      averageScores: avgScores,
      scoreMatrix,
      nodeCount: nodeCount ?? 5,
      consensusMethod: "median-aggregation-3x3",
    },
    allResponses,
    timing: {
      submittedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ status: "ok", requestId });
}
