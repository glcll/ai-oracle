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
    winnerIndex?: number;
    judgeModel?: string;
    nodeCount?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { requestId, prompt, scores, responses, confidences, nodeCount } = body;
  const workerCount = responses?.length ?? 0;

  if (!requestId || !scores || !responses || workerCount < 2) {
    return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
  }

  const scoreMatrix: ScoreMatrix = {};
  const avgScores: { [model: string]: number } = {};

  if (scores.length === workerCount) {
    const judgeName = body.judgeModel || JUDGE_MODELS[0]?.id || "judge";
    for (let r = 0; r < workerCount; r++) {
      const workerId = WORKER_MODELS[r]?.id || `worker-${r}`;
      scoreMatrix[workerId] = { judgedBy: { [judgeName]: scores[r] } };
      avgScores[workerId] = scores[r];
    }
  } else if (scores.length === 9) {
    const totals = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      for (let r = 0; r < 3; r++) {
        const score = scores[j * 3 + r];
        const respondentId = WORKER_MODELS[r]?.id || `worker-${r}`;
        const judgeId = JUDGE_MODELS[j]?.id || `judge-${j}`;
        if (!scoreMatrix[respondentId]) {
          scoreMatrix[respondentId] = { judgedBy: {} };
        }
        scoreMatrix[respondentId].judgedBy[judgeId] = score;
        totals[r] += score;
      }
    }
    for (let r = 0; r < 3; r++) {
      avgScores[WORKER_MODELS[r]?.id || `worker-${r}`] = Math.round((totals[r] / 3) * 100) / 100;
    }
  } else {
    return NextResponse.json({ error: `scores length ${scores.length} does not match worker count ${workerCount}` }, { status: 400 });
  }

  const winningIndex = body.winnerIndex ?? scores.indexOf(Math.max(...scores.slice(0, workerCount)));

  const allResponses: ModelResponse[] = responses.map((resp, i) => ({
    model: WORKER_MODELS[i]?.id || `worker-${i}`,
    answer: resp,
    confidence: confidences?.[i] ?? 5,
    avgScore: avgScores[WORKER_MODELS[i]?.id || `worker-${i}`] ?? 5,
  }));

  await setResult({
    requestId,
    status: "completed",
    prompt,
    response: responses[winningIndex],
    consensus: {
      winningModel: WORKER_MODELS[winningIndex]?.id || `worker-${winningIndex}`,
      winningIndex,
      averageScores: avgScores,
      scoreMatrix,
      nodeCount: nodeCount ?? 5,
      consensusMethod: "median-aggregation-2w1j",
    },
    allResponses,
    timing: {
      submittedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ status: "ok", requestId });
}
