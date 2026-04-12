import { NextResponse } from "next/server";
import { WORKER_MODELS, JUDGE_MODELS } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    workerModels: WORKER_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      openRouterId: m.openRouterId,
    })),
    judgeModels: JUDGE_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      openRouterId: m.openRouterId,
    })),
    judgingMethod: "3x3 cross-evaluation matrix (3 independent judges score 3 worker responses)",
    consensusMethod: "median-aggregation across DON nodes",
  });
}
