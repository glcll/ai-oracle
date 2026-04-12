import { createHash, randomUUID } from "crypto";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { Hex } from "viem";

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

export async function triggerCREWorkflow(payload: {
  prompt: string;
  requestId: string;
  callbackUrl: string;
}): Promise<{ success: boolean; executionId?: string; error?: string }> {
  const gatewayUrl = process.env.CRE_GATEWAY_URL;
  const workflowId = process.env.CRE_WORKFLOW_ID;
  const privateKey = process.env.CRE_PRIVATE_KEY as Hex | undefined;

  if (!gatewayUrl || !workflowId || !privateKey) {
    return {
      success: false,
      error:
        "CRE not configured. Set CRE_GATEWAY_URL, CRE_WORKFLOW_ID, CRE_PRIVATE_KEY.",
    };
  }

  const account: PrivateKeyAccount = privateKeyToAccount(privateKey);

  const requestBody = {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "workflows.execute",
    params: {
      input: payload,
      workflow: { workflowID: workflowId },
    },
  };

  const sortedBody = JSON.stringify(sortObjectKeys(requestBody));
  const digest = `0x${createHash("sha256").update(sortedBody).digest("hex")}`;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "ETH", typ: "JWT" }));
  const jwtPayload = base64url(
    JSON.stringify({
      digest,
      iss: account.address,
      iat: now,
      exp: now + 300,
      jti: randomUUID(),
    })
  );

  const signature = await account.signMessage({
    message: `${header}.${jwtPayload}`,
  });
  const jwt = `${header}.${jwtPayload}.${base64url(Buffer.from(signature.slice(2), "hex"))}`;

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: sortedBody,
  });

  const text = await response.text();

  if (!response.ok) {
    return { success: false, error: `CRE gateway HTTP ${response.status}: ${text.slice(0, 500)}` };
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return { success: false, error: `CRE gateway returned non-JSON: ${text.slice(0, 200)}` };
  }

  if (data.error) {
    const err = data.error as Record<string, unknown>;
    return { success: false, error: `CRE gateway error: ${err.message || JSON.stringify(err)}` };
  }

  return {
    success: true,
    executionId: (data.result as Record<string, unknown>)?.workflow_execution_id as string,
  };
}
