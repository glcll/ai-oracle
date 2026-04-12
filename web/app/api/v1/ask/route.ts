import { generateRequestId, setResult } from "@/lib/kv";
import { runOracleConsensusStreaming } from "@/lib/oracle-engine";
import { triggerCREWorkflow } from "@/lib/cre-trigger";
import { WORKER_MODELS, JUDGE_MODELS } from "@/lib/types";

export const maxDuration = 60;

function isCREConfigured(): boolean {
  return !!(
    process.env.CRE_GATEWAY_URL &&
    process.env.CRE_WORKFLOW_ID &&
    process.env.CRE_PRIVATE_KEY
  );
}

export async function POST(request: Request) {
  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid JSON body. Expected: { "prompt": "..." }' },
      { status: 400 }
    );
  }

  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length === 0) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  if (prompt.length > 2000) {
    return Response.json(
      { error: "prompt must be 2000 characters or fewer" },
      { status: 400 }
    );
  }

  const requestId = generateRequestId();

  // Primary path: trigger CRE workflow on the decentralized oracle network.
  // The workflow runs on DON nodes, reaches consensus, and posts the result
  // back to /api/v1/webhook. The client polls /api/v1/result/:id.
  if (isCREConfigured()) {
    try {
      const baseUrl =
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "https://ai-oracle-council.vercel.app";

      const callbackUrl = `${baseUrl}/api/v1/webhook`;

      await setResult({
        requestId,
        status: "pending",
        prompt,
      });

      const cre = await triggerCREWorkflow({ prompt, requestId, callbackUrl });

      if (cre.success) {
        return Response.json({
          requestId,
          status: "pending",
          statusUrl: `/api/v1/result/${requestId}`,
          executionId: cre.executionId,
          engine: "cre",
          workerModels: WORKER_MODELS.map((m) => m.id),
          judgeModels: JUDGE_MODELS.map((m) => m.id),
        });
      }

      console.error("CRE trigger failed, falling back to local engine:", cre.error);
    } catch (err) {
      console.error("CRE trigger threw, falling back to local engine:", err);
    }
  }

  // Fallback: local streaming engine (runs entirely in this serverless function)
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      send({
        type: "started",
        requestId,
        workerModels: WORKER_MODELS.map((m) => m.id),
        judgeModels: JUDGE_MODELS.map((m) => m.id),
        engine: "local",
      });

      try {
        const result = await runOracleConsensusStreaming(
          requestId,
          prompt,
          send
        );

        await setResult(result).catch(() => {});

        send({ type: "complete", result });
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
