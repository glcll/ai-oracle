import { NextResponse } from "next/server";
import { MODELS } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    models: MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      openRouterId: m.openRouterId,
    })),
    judgingMethod: "3x3 cross-evaluation matrix",
    consensusMethod: "median-aggregation across DON nodes",
  });
}
