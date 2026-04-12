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
    judgingMethod: "2 independent judges (GPT-4o Mini, Qwen Turbo) score both worker responses 1-10",
    consensusMethod: "median-aggregation across DON nodes (2 workers + 2 judges)",
  });
}
