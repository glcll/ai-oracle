"use client";

import { useState } from "react";
import Link from "next/link";
import type { OracleResult } from "@/lib/types";

type Phase = "idle" | "submitting" | "querying" | "evaluating" | "consensus" | "done" | "error";

const PHASE_LABELS: Record<Phase, string> = {
  idle: "",
  submitting: "Connecting to oracle network...",
  querying: "Querying 3 AI models via OpenRouter...",
  evaluating: "Each model judging all 3 responses (3x3 matrix)...",
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

      if (!res.ok || !res.body) {
        const text = await res.text();
        setPhase("error");
        setError(text || `HTTP ${res.status}`);
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
        <span className="text-sm font-medium text-muted-foreground">Playground</span>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-[var(--space-6x)] py-[var(--space-10x)]">
        <div className="w-full max-w-2xl">
          <h1 className="font-display text-3xl font-bold mb-[var(--space-2x)] text-foreground">
            Ask the Oracle Council
          </h1>
          <p className="text-sm mb-[var(--space-8x)] text-muted-foreground">
            Your prompt will be answered by 3 AI models, cross-evaluated by 3 judges, and scored via decentralized consensus.
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
                    {result.consensus?.winningModel}
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
                    3x3 Scoring Matrix
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-mono">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left py-[var(--space-2x)] pr-[var(--space-4x)]"></th>
                          {result.allResponses?.map((r) => (
                            <th key={r.model} className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">
                              {r.model}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-foreground">
                        {result.allResponses?.map((judge) => (
                          <tr key={`judge-${judge.model}`} className="border-t border-border-muted">
                            <td className="py-[var(--space-2x)] pr-[var(--space-4x)] whitespace-nowrap text-muted-foreground">
                              Judge: {judge.model}
                            </td>
                            {result.allResponses?.map((respondent) => {
                              const score = result.consensus?.scoreMatrix?.[respondent.model]?.judgedBy?.[judge.model];
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
                        <span className="text-sm font-medium text-foreground">{r.model}</span>
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
