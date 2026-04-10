import Link from "next/link";

function Nav() {
  return (
    <nav
      className="flex items-center justify-between px-[var(--space-6x)] py-[var(--space-4x)] border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-[var(--space-3x)]">
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
      </div>
      <div className="flex items-center gap-[var(--space-6x)]">
        <Link
          href="#how-it-works"
          className="text-sm font-medium transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          How it works
        </Link>
        <Link
          href="#api"
          className="text-sm font-medium transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          API
        </Link>
        <Link
          href="/playground"
          className="inline-flex items-center justify-center rounded-[var(--border-radius-primary)] px-[var(--space-4x)] py-[var(--space-2x)] text-sm font-medium transition-colors"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Try it
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="flex flex-col items-center text-center px-[var(--space-6x)] pt-[var(--space-20x)] pb-[var(--space-16x)]">
      <div
        className="inline-flex items-center gap-[var(--space-2x)] rounded-[1.5rem] border px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-medium mb-[var(--space-6x)]"
        style={{
          background: "var(--progress)",
          borderColor: "var(--progress-border)",
          color: "var(--progress-foreground)",
        }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--progress-foreground)" }} />
        Powered by Chainlink CRE
      </div>

      <h1
        className="font-display text-5xl md:text-6xl font-bold max-w-3xl leading-tight"
        style={{ color: "var(--foreground)" }}
      >
        Decentralized AI inference
        <br />
        <span style={{ color: "var(--primary)" }}>with oracle consensus</span>
      </h1>

      <p
        className="mt-[var(--space-6x)] text-lg max-w-2xl leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        Send a prompt to the Chainlink oracle network. 3 AI models respond, 3 judges
        cross-evaluate, and DON nodes reach consensus on the best answer. One API call.
      </p>

      <div className="flex gap-[var(--space-4x)] mt-[var(--space-10x)]">
        <Link
          href="/playground"
          className="inline-flex items-center justify-center rounded-[var(--border-radius-primary)] px-[var(--space-6x)] py-[var(--space-3x)] text-base font-medium transition-colors"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Try it now
        </Link>
        <Link
          href="#api"
          className="inline-flex items-center justify-center rounded-[var(--border-radius-primary)] border px-[var(--space-6x)] py-[var(--space-3x)] text-base font-medium transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          API Reference
        </Link>
      </div>

      <div
        className="mt-[var(--space-12x)] w-full max-w-2xl rounded-[var(--border-radius-secondary)] border text-left overflow-hidden"
        style={{
          background: "var(--card)",
          borderColor: "var(--card-border)",
        }}
      >
        <div
          className="flex items-center gap-[var(--space-2x)] px-[var(--space-4x)] py-[var(--space-3x)] border-b"
          style={{ borderColor: "var(--border)", background: "var(--muted)" }}
        >
          <span className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
            ask-oracle.sh
          </span>
        </div>
        <pre className="p-[var(--space-4x)] overflow-x-auto">
          <code className="font-mono text-sm" style={{ color: "var(--foreground)" }}>
{`curl -X POST https://ai-oracle.vercel.app/api/v1/ask \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "What causes auroras?"}'

# Response:
{
  "requestId": "req_k8m2x9p1",
  "status": "pending",
  "statusUrl": "/api/v1/result/req_k8m2x9p1"
}`}
          </code>
        </pre>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "1",
      title: "Ask",
      description: "POST a prompt to the API. Your question is sent to the Chainlink oracle network.",
      color: "var(--progress)",
      borderColor: "var(--progress-border)",
      fgColor: "var(--progress-foreground)",
    },
    {
      step: "2",
      title: "Evaluate",
      description: "3 AI models respond independently. Each model then judges all 3 responses on a 1-10 scale, producing a 3x3 scoring matrix.",
      color: "var(--warning)",
      borderColor: "var(--warning-border)",
      fgColor: "var(--warning-foreground)",
    },
    {
      step: "3",
      title: "Consensus",
      description: "DON nodes reach BFT consensus on the scores via median aggregation. The response with the highest average score wins.",
      color: "var(--success)",
      borderColor: "var(--success-border)",
      fgColor: "var(--success-foreground)",
    },
  ];

  return (
    <section id="how-it-works" className="px-[var(--space-6x)] py-[var(--space-16x)]" style={{ background: "var(--background-alt)" }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)]" style={{ color: "var(--foreground)" }}>
          How it works
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)]" style={{ color: "var(--muted-foreground)" }}>
          Three steps. One API call. Cryptographic proof of consensus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6x)]">
          {steps.map((s) => (
            <div
              key={s.step}
              className="rounded-[var(--border-radius-secondary)] border p-[var(--space-6x)]"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-[var(--space-4x)]"
                style={{ background: s.color, color: s.fgColor, border: `1px solid ${s.borderColor}` }}
              >
                {s.step}
              </div>
              <h3 className="font-display text-xl font-bold mb-[var(--space-2x)]" style={{ color: "var(--foreground)" }}>
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {s.description}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-[var(--space-10x)] rounded-[var(--border-radius-secondary)] border p-[var(--space-6x)]"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <h3 className="font-display text-lg font-bold mb-[var(--space-4x)]" style={{ color: "var(--foreground)" }}>
            3x3 Scoring Matrix
          </h3>
          <p className="text-sm mb-[var(--space-4x)]" style={{ color: "var(--muted-foreground)" }}>
            Each model generates a response, then acts as an impartial judge of all three responses.
            The highest average score wins.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr style={{ color: "var(--muted-foreground)" }}>
                  <th className="text-left py-[var(--space-2x)] pr-[var(--space-4x)]"></th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">Llama 3.3</th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">DeepSeek R1</th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">Qwen3 80B</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--foreground)" }}>
                {[
                  { judge: "Judge: Llama", scores: [7, 8, 6] },
                  { judge: "Judge: DeepSeek", scores: [8, 9, 7] },
                  { judge: "Judge: Qwen3", scores: [7, 8, 5] },
                ].map((row) => (
                  <tr key={row.judge} className="border-t" style={{ borderColor: "var(--border-muted)" }}>
                    <td className="py-[var(--space-2x)] pr-[var(--space-4x)] text-left" style={{ color: "var(--muted-foreground)" }}>
                      {row.judge}
                    </td>
                    {row.scores.map((score, i) => (
                      <td key={i} className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">
                        {score}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t font-bold" style={{ borderColor: "var(--border)" }}>
                  <td className="py-[var(--space-2x)] pr-[var(--space-4x)]" style={{ color: "var(--muted-foreground)" }}>Average</td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">7.33</td>
                  <td
                    className="text-center py-[var(--space-2x)] px-[var(--space-3x)]"
                    style={{ color: "var(--success-foreground)" }}
                  >
                    8.33
                  </td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">6.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function ApiReference() {
  return (
    <section id="api" className="px-[var(--space-6x)] py-[var(--space-16x)]">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)]" style={{ color: "var(--foreground)" }}>
          API Reference
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)]" style={{ color: "var(--muted-foreground)" }}>
          Three endpoints. No SDK required. Works with any language.
        </p>

        <div className="space-y-[var(--space-6x)]">
          {[
            {
              method: "POST",
              path: "/api/v1/ask",
              desc: "Submit a prompt for oracle consensus. Returns a requestId and statusUrl to poll.",
              body: `{ "prompt": "What causes auroras?" }`,
            },
            {
              method: "GET",
              path: "/api/v1/result/:id",
              desc: "Poll for the consensus result. Returns the winning response, full 3x3 score matrix, and all model responses.",
              body: null,
            },
            {
              method: "GET",
              path: "/api/v1/models",
              desc: "List the AI models in the oracle council and the consensus method used.",
              body: null,
            },
          ].map((ep) => (
            <div
              key={ep.path}
              className="rounded-[var(--border-radius-secondary)] border p-[var(--space-6x)]"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <div className="flex items-center gap-[var(--space-3x)] mb-[var(--space-3x)]">
                <span
                  className="inline-flex items-center rounded-[1.5rem] border px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-bold font-mono"
                  style={{
                    background: ep.method === "POST" ? "var(--success)" : "var(--progress)",
                    borderColor: ep.method === "POST" ? "var(--success-border)" : "var(--progress-border)",
                    color: ep.method === "POST" ? "var(--success-foreground)" : "var(--progress-foreground)",
                  }}
                >
                  {ep.method}
                </span>
                <code className="font-mono text-sm font-bold" style={{ color: "var(--foreground)" }}>
                  {ep.path}
                </code>
              </div>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {ep.desc}
              </p>
              {ep.body && (
                <pre
                  className="mt-[var(--space-3x)] rounded-[var(--border-radius-primary)] p-[var(--space-3x)] overflow-x-auto"
                  style={{ background: "var(--muted)", color: "var(--foreground)" }}
                >
                  <code className="font-mono text-xs">{ep.body}</code>
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Models() {
  const models = [
    { name: "Llama 3.3 70B", provider: "Meta", role: "General purpose" },
    { name: "DeepSeek R1", provider: "DeepSeek", role: "Reasoning" },
    { name: "Qwen3 80B", provider: "Alibaba", role: "Broad capabilities" },
  ];

  return (
    <section className="px-[var(--space-6x)] py-[var(--space-16x)]" style={{ background: "var(--background-alt)" }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)]" style={{ color: "var(--foreground)" }}>
          The Oracle Council
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)]" style={{ color: "var(--muted-foreground)" }}>
          Three models. Each generates a response AND judges all responses. No single model decides.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6x)]">
          {models.map((m) => (
            <div
              key={m.name}
              className="rounded-[var(--border-radius-secondary)] border p-[var(--space-6x)] text-center"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <div
                className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg font-bold mb-[var(--space-4x)]"
                style={{ background: "var(--muted)", color: "var(--foreground)" }}
              >
                {m.name[0]}
              </div>
              <h3 className="font-display text-base font-bold mb-[var(--space-1x)]" style={{ color: "var(--foreground)" }}>
                {m.name}
              </h3>
              <p className="text-xs mb-[var(--space-2x)]" style={{ color: "var(--muted-foreground)" }}>
                {m.provider}
              </p>
              <span
                className="inline-flex items-center rounded-[1.5rem] border px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-medium"
                style={{
                  background: "var(--muted)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="px-[var(--space-6x)] py-[var(--space-8x)] border-t text-center"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        Built on Chainlink CRE. Not affiliated with or endorsed by Chainlink Labs. Free proof of concept &mdash; use at your own risk.
      </p>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Models />
        <ApiReference />
      </main>
      <Footer />
    </>
  );
}
