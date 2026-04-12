"use client";

import { useState } from "react";
import Link from "next/link";
import { WORKER_MODELS, JUDGE_MODELS, type OracleResult } from "@/lib/types";

type Phase = "idle" | "submitting" | "querying" | "evaluating" | "consensus" | "done" | "error";

const MODEL_NAMES: Record<string, string> = Object.fromEntries(
  [...WORKER_MODELS, ...JUDGE_MODELS].map((m) => [m.id, m.name])
);

const PHASE_LABELS: Record<Phase, string> = {
  idle: "",
  submitting: "Connecting to oracle network...",
  querying: "Querying 3 worker models via OpenRouter...",
  evaluating: `${JUDGE_MODELS[0]?.name || "Judge"} evaluating all 3 responses...`,
  consensus: "Computing consensus scores...",
  done: "Consensus reached!",
  error: "Something went wrong",
};

export default function Playground() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<OracleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setPhase("submitting");
    setResult(null);
    setError(null);
    setExpandedModel(null);

    try {
      const res = await fetch("/api/v1/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const text = await res.text();
        setPhase("error");
        setError(text || `HTTP ${res.status}`);
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        // CRE path: JSON response with requestId, poll for result
        const data = await res.json();
        if (!data.requestId) {
          setPhase("error");
          setError(data.error || "No requestId returned");
          return;
        }

        setPhase("querying");
        const statusUrl = data.statusUrl || `/api/v1/result/${data.requestId}`;

        for (let attempt = 0; attempt < 60; attempt++) {
          await new Promise((r) => setTimeout(r, 5000));
          try {
            const poll = await fetch(statusUrl);
            if (!poll.ok) continue;
            const pollData = await poll.json();

            if (pollData.status === "completed") {
              setPhase("done");
              setResult(pollData);
              return;
            } else if (pollData.status === "failed") {
              setPhase("error");
              setError(pollData.error || "Workflow execution failed");
              return;
            }

            if (attempt > 5) setPhase("evaluating");
            if (attempt > 15) setPhase("consensus");
          } catch {
            // polling error, retry
          }
        }

        setPhase("error");
        setError("Timed out waiting for CRE result (5 minutes)");
        return;
      }

      // Fallback SSE streaming path (local engine)
      if (!res.body) {
        setPhase("error");
        setError("No response body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "phase") {
              if (event.phase === "generation") setPhase("querying");
              else if (event.phase === "judging") setPhase("evaluating");
              else if (event.phase === "consensus") setPhase("consensus");
            } else if (event.type === "complete") {
              setPhase("done");
              setResult(event.result);
            } else if (event.type === "error") {
              setPhase("error");
              setError(event.error);
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Network error");
    }
  };

  const isProcessing = phase !== "idle" && phase !== "done" && phase !== "error";

  return (
    <div className="min-h-full flex flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-[var(--space-6x)] py-[var(--space-4x)] border-b border-border">
        <Link href="/" className="flex items-center gap-[var(--space-3x)]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold text-foreground">AI Oracle</span>
        </Link>
        <div className="flex items-center gap-[var(--space-6x)]">
          <Link href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link href="/#why-cre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Why CRE
          </Link>
          <Link href="/#api" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            API
          </Link>
          <Link
            href="/playground"
            className="inline-flex items-center justify-center rounded-[var(--border-radius-primary)] px-[var(--space-4x)] py-[var(--space-2x)] text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            Try it
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-[var(--space-6x)] py-[var(--space-10x)]">
        <div className="w-full max-w-2xl">
          <h1 className="font-display text-3xl font-bold mb-[var(--space-2x)] text-foreground">
            Ask the Oracle Council
          </h1>
          <p className="text-sm mb-[var(--space-8x)] text-muted-foreground">
            Your prompt will be answered by 3 worker models, scored by 3 independent judge models, and resolved via decentralized consensus.
          </p>

          {/* Input */}
          <div className="mb-[var(--space-6x)]">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What causes auroras?"
              rows={3}
              maxLength={2000}
              disabled={isProcessing}
              className="w-full rounded-[var(--border-radius-secondary)] border border-input-border bg-input text-input-foreground p-[var(--space-4x)] text-base font-sans resize-none outline-none transition-colors focus:border-input-border-active"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <div className="flex items-center justify-between mt-[var(--space-2x)]">
              <span className="text-xs text-muted-foreground">{prompt.length}/2000</span>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isProcessing}
                className="rounded-[var(--border-radius-primary)] px-[var(--space-6x)] py-[var(--space-2x)] text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors cursor-pointer disabled:bg-primary-disabled disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : "Ask Oracle"}
              </button>
            </div>
          </div>

          {/* Progress */}
          {phase !== "idle" && <ProgressIndicator phase={phase} />}

          {/* Error */}
          {phase === "error" && error && (
            <div className="rounded-[var(--border-radius-secondary)] border border-error-border bg-error text-error-foreground p-[var(--space-4x)] mb-[var(--space-6x)]">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && result.status === "completed" && (
            <div className="space-y-[var(--space-6x)]">
              {/* Winning response */}
              <div className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)]">
                <div className="flex items-center gap-[var(--space-3x)] mb-[var(--space-4x)]">
                  <span className="inline-flex items-center rounded-[1.5rem] border border-success-border bg-success text-success-foreground px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-bold">
                    Winner
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {MODEL_NAMES[result.consensus?.winningModel ?? ""] ?? result.consensus?.winningModel}
                  </span>
                </div>
                <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                  {result.response}
                </p>
                {result.timing?.durationMs && (
                  <p className="mt-[var(--space-3x)] text-xs text-muted-foreground">
                    Completed in {(result.timing.durationMs / 1000).toFixed(1)}s
                  </p>
                )}
              </div>

              {/* Score matrix */}
              {result.consensus?.scoreMatrix && (
                <div className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)]">
                  <h3 className="font-display text-base font-bold mb-[var(--space-4x)] text-foreground">
                    Scoring Matrix
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-mono">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left py-[var(--space-2x)] pr-[var(--space-4x)]"></th>
                          {result.allResponses?.map((r) => (
                            <th key={r.model} className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">
                              {MODEL_NAMES[r.model] ?? r.model}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-foreground">
                        {JUDGE_MODELS.map((judge) => (
                          <tr key={`judge-${judge.id}`} className="border-t border-border-muted">
                            <td className="py-[var(--space-2x)] pr-[var(--space-4x)] whitespace-nowrap text-muted-foreground">
                              {judge.name}
                            </td>
                            {result.allResponses?.map((respondent) => {
                              const score = result.consensus?.scoreMatrix?.[respondent.model]?.judgedBy?.[judge.id];
                              const isWinner = respondent.model === result.consensus?.winningModel;
                              return (
                                <td
                                  key={respondent.model}
                                  className={`text-center py-[var(--space-2x)] px-[var(--space-3x)] ${isWinner ? "text-success-foreground font-medium" : ""}`}
                                >
                                  {score ?? "-"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr className="border-t border-border font-bold">
                          <td className="py-[var(--space-2x)] pr-[var(--space-4x)] text-muted-foreground">
                            Average
                          </td>
                          {result.allResponses?.map((r) => (
                            <td
                              key={r.model}
                              className={`text-center py-[var(--space-2x)] px-[var(--space-3x)] ${
                                r.model === result.consensus?.winningModel ? "text-success-foreground" : ""
                              }`}
                            >
                              {r.avgScore}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-[var(--space-2x)] mt-[var(--space-4x)]">
                    <span className="inline-flex items-center rounded-[1.5rem] border border-border bg-muted text-muted-foreground px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-medium">
                      {result.consensus?.consensusMethod}
                    </span>
                  </div>
                </div>
              )}

              {/* All responses */}
              <div className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card overflow-hidden">
                <div className="p-[var(--space-6x)] pb-[var(--space-3x)]">
                  <h3 className="font-display text-base font-bold text-foreground">
                    All Model Responses
                  </h3>
                </div>
                {result.allResponses?.map((r, i) => (
                  <div key={r.model} className="border-t border-border-muted">
                    <button
                      onClick={() => setExpandedModel(expandedModel === i ? null : i)}
                      className="w-full flex items-center justify-between p-[var(--space-4x)] px-[var(--space-6x)] cursor-pointer text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-[var(--space-3x)]">
                        <span className="text-sm font-medium text-foreground">{MODEL_NAMES[r.model] ?? r.model}</span>
                        {r.model === result.consensus?.winningModel && (
                          <span className="inline-flex items-center rounded-[1.5rem] border border-success-border bg-success text-success-foreground px-[var(--space-2x)] py-0.5 text-xxs font-bold">
                            Winner
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-[var(--space-3x)]">
                        <span className="text-sm font-mono text-muted-foreground">
                          avg: {r.avgScore}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`text-muted-foreground transition-transform ${expandedModel === i ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>
                    {expandedModel === i && (
                      <div className="px-[var(--space-6x)] pb-[var(--space-4x)]">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                          {r.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ProgressIndicator({ phase }: { phase: Phase }) {
  const steps: { key: Phase; label: string }[] = [
    { key: "querying", label: "Querying models" },
    { key: "evaluating", label: "Cross-evaluating" },
    { key: "consensus", label: "Oracle consensus" },
    { key: "done", label: "Complete" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === phase);

  return (
    <div className="mb-[var(--space-6x)]">
      <div className="flex items-center gap-[var(--space-2x)] mb-[var(--space-3x)]">
        {phase !== "done" && phase !== "error" && (
          <div className="w-4 h-4 rounded-full border-2 border-progress-border border-t-progress-foreground animate-spin" />
        )}
        {phase === "done" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-success-foreground">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="text-sm font-medium text-foreground">
          {PHASE_LABELS[phase]}
        </span>
      </div>
      <div className="flex gap-[var(--space-1x)]">
        {steps.map((step, i) => {
          const isActive = step.key === phase;
          const isDone = currentIndex > i || phase === "done";
          return (
            <div
              key={step.key}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                isDone
                  ? "bg-success-foreground"
                  : isActive
                    ? "bg-progress-foreground"
                    : "bg-muted-more"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
