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

  return (
    <div className="min-h-full flex flex-col">
      <nav
        className="flex items-center justify-between px-[var(--space-6x)] py-[var(--space-4x)] border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-[var(--space-3x)]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold" style={{ color: "var(--foreground)" }}>
            AI Oracle
          </span>
        </Link>
        <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          Playground
        </span>
      </nav>

      <main className="flex-1 flex flex-col items-center px-[var(--space-6x)] py-[var(--space-10x)]">
        <div className="w-full max-w-2xl">
          <h1 className="font-display text-3xl font-bold mb-[var(--space-2x)]" style={{ color: "var(--foreground)" }}>
            Ask the Oracle Council
          </h1>
          <p className="text-sm mb-[var(--space-8x)]" style={{ color: "var(--muted-foreground)" }}>
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
              disabled={phase !== "idle" && phase !== "done" && phase !== "error"}
              className="w-full rounded-[var(--border-radius-secondary)] border p-[var(--space-4x)] text-base font-sans resize-none outline-none transition-colors"
              style={{
                background: "var(--input)",
                borderColor: "var(--input-border)",
                color: "var(--input-foreground)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--input-border-active)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--input-border)")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <div className="flex items-center justify-between mt-[var(--space-2x)]">
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {prompt.length}/2000
              </span>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || (phase !== "idle" && phase !== "done" && phase !== "error")}
                className="rounded-[var(--border-radius-primary)] px-[var(--space-6x)] py-[var(--space-2x)] text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {phase === "idle" || phase === "done" || phase === "error" ? "Ask Oracle" : "Processing..."}
              </button>
            </div>
          </div>

          {/* Progress */}
          {phase !== "idle" && <ProgressIndicator phase={phase} />}

          {/* Error */}
          {phase === "error" && error && (
            <div
              className="rounded-[var(--border-radius-secondary)] border p-[var(--space-4x)] mb-[var(--space-6x)]"
              style={{
                background: "var(--error)",
                borderColor: "var(--error-border)",
                color: "var(--error-foreground)",
              }}
            >
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && result.status === "completed" && (
            <div className="space-y-[var(--space-6x)]">
              {/* Winning response */}
              <div
                className="rounded-[var(--border-radius-secondary)] border p-[var(--space-6x)]"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                <div className="flex items-center gap-[var(--space-3x)] mb-[var(--space-4x)]">
                  <span
                    className="inline-flex items-center rounded-[1.5rem] border px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-bold"
                    style={{
                      background: "var(--success)",
                      borderColor: "var(--success-border)",
                      color: "var(--success-foreground)",
                    }}
                  >
                    Winner
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {result.consensus?.winningModel}
                  </span>
                </div>
                <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                  {result.response}
                </p>
              </div>

              {/* Score matrix */}
              {result.consensus?.scoreMatrix && (
                <div
                  className="rounded-[var(--border-radius-secondary)] border p-[var(--space-6x)]"
                  style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                >
                  <h3 className="font-display text-base font-bold mb-[var(--space-4x)]" style={{ color: "var(--foreground)" }}>
                    3x3 Scoring Matrix
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-mono">
                      <thead>
                        <tr style={{ color: "var(--muted-foreground)" }}>
                          <th className="text-left py-[var(--space-2x)] pr-[var(--space-4x)]"></th>
                          {result.allResponses?.map((r) => (
                            <th key={r.model} className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">
                              {r.model.split("-")[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody style={{ color: "var(--foreground)" }}>
                        {result.allResponses?.map((judge) => (
                          <tr key={`judge-${judge.model}`} className="border-t" style={{ borderColor: "var(--border-muted)" }}>
                            <td className="py-[var(--space-2x)] pr-[var(--space-4x)] whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                              Judge: {judge.model.split("-")[0]}
                            </td>
                            {result.allResponses?.map((respondent) => {
                              const score = result.consensus?.scoreMatrix?.[respondent.model]?.judgedBy?.[judge.model];
                              return (
                                <td key={respondent.model} className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">
                                  {score ?? "-"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr className="border-t font-bold" style={{ borderColor: "var(--border)" }}>
                          <td className="py-[var(--space-2x)] pr-[var(--space-4x)]" style={{ color: "var(--muted-foreground)" }}>
                            Average
                          </td>
                          {result.allResponses?.map((r) => (
                            <td
                              key={r.model}
                              className="text-center py-[var(--space-2x)] px-[var(--space-3x)]"
                              style={{
                                color: r.model === result.consensus?.winningModel ? "var(--success-foreground)" : undefined,
                              }}
                            >
                              {r.avgScore}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-[var(--space-2x)] mt-[var(--space-4x)]">
                    <span
                      className="inline-flex items-center rounded-[1.5rem] border px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-medium"
                      style={{
                        background: "var(--muted)",
                        borderColor: "var(--border)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {result.consensus?.consensusMethod}
                    </span>
                  </div>
                </div>
              )}

              {/* All responses */}
              <div
                className="rounded-[var(--border-radius-secondary)] border"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                <div className="p-[var(--space-6x)] pb-0">
                  <h3 className="font-display text-base font-bold mb-[var(--space-4x)]" style={{ color: "var(--foreground)" }}>
                    All Model Responses
                  </h3>
                </div>
                {result.allResponses?.map((r, i) => (
                  <div
                    key={r.model}
                    className="border-t"
                    style={{ borderColor: "var(--border-muted)" }}
                  >
                    <button
                      onClick={() => setExpandedModel(expandedModel === i ? null : i)}
                      className="w-full flex items-center justify-between p-[var(--space-4x)] px-[var(--space-6x)] cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-[var(--space-3x)]">
                        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                          {r.model}
                        </span>
                        {r.model === result.consensus?.winningModel && (
                          <span
                            className="inline-flex items-center rounded-[1.5rem] border px-[var(--space-2x)] py-0.5 text-xxs font-bold"
                            style={{
                              background: "var(--success)",
                              borderColor: "var(--success-border)",
                              color: "var(--success-foreground)",
                            }}
                          >
                            Winner
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-[var(--space-3x)]">
                        <span className="text-sm font-mono" style={{ color: "var(--muted-foreground)" }}>
                          avg: {r.avgScore}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="transition-transform"
                          style={{
                            color: "var(--muted-foreground)",
                            transform: expandedModel === i ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>
                    {expandedModel === i && (
                      <div className="px-[var(--space-6x)] pb-[var(--space-4x)]">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
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
          <div
            className="w-4 h-4 rounded-full border-2 animate-spin"
            style={{
              borderColor: "var(--progress-border)",
              borderTopColor: "var(--progress-foreground)",
            }}
          />
        )}
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
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
              className="flex-1 h-1.5 rounded-full transition-colors"
              style={{
                background: isDone
                  ? "var(--success-foreground)"
                  : isActive
                    ? "var(--progress-foreground)"
                    : "var(--muted-more)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
