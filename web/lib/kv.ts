import type { OracleResult } from "./types";

const store = new Map<string, OracleResult>();

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
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import("@vercel/kv");
    return kv.get<OracleResult>(`oracle:${requestId}`);
  }
  return store.get(requestId) ?? null;
}

export async function setResult(result: OracleResult): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import("@vercel/kv");
    await kv.set(`oracle:${result.requestId}`, result, { ex: 3600 });
    return;
  }
  store.set(result.requestId, result);
}
