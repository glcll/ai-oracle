import { NextResponse } from "next/server";
import { generateRequestId, setResult } from "@/lib/kv";
import { runOracleConsensus } from "@/lib/oracle-engine";
import { MODELS } from "@/lib/types";

export const maxDuration = 60;

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  rateLimitMap.set(ip, recent);
  return recent.length >= RATE_LIMIT;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limited. Max 5 requests per hour." },
      { status: 429 }
    );
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body. Expected: { "prompt": "..." }' },
      { status: 400 }
    );
  }

  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length === 0) {
    return NextResponse.json(
      { error: "prompt is required" },
      { status: 400 }
    );
  }

  if (prompt.length > 2000) {
    return NextResponse.json(
      { error: "prompt must be 2000 characters or fewer" },
      { status: 400 }
    );
  }

  const requestId = generateRequestId();

  const timestamps = rateLimitMap.get(ip) ?? [];
  timestamps.push(Date.now());
  rateLimitMap.set(ip, timestamps);

  const result = await runOracleConsensus(requestId, prompt);

  await setResult(result);

  return NextResponse.json(result, {
    status: result.status === "completed" ? 200 : 500,
  });
}
