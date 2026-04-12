import { generateRequestId, setResult } from "@/lib/kv";
import { runOracleConsensusStreaming } from "@/lib/oracle-engine";
import { WORKER_MODELS, JUDGE_MODELS } from "@/lib/types";

export const maxDuration = 60;

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
