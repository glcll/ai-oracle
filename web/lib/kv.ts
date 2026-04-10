import { Redis } from "@upstash/redis";
import type { OracleResult } from "./types";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function generateRequestId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "req_";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function getResult(
  requestId: string
): Promise<OracleResult | null> {
  const redis = getRedis();
  if (redis) {
    return redis.get<OracleResult>(`oracle:${requestId}`);
  }
  return null;
}

export async function setResult(result: OracleResult): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(`oracle:${result.requestId}`, result, { ex: 3600 });
    return;
  }
}
