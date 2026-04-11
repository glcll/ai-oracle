import Link from "next/link";

function Nav() {
  return (
    <nav className="flex items-center justify-between px-[var(--space-6x)] py-[var(--space-4x)] border-b border-border">
      <div className="flex items-center gap-[var(--space-3x)]">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <span className="font-display text-lg font-bold text-foreground">AI Oracle</span>
      </div>
      <div className="flex items-center gap-[var(--space-6x)]">
        <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          How it works
        </Link>
        <Link href="#api" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
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
  );
}

function Hero() {
  return (
    <section className="flex flex-col items-center text-center px-[var(--space-6x)] pt-[var(--space-20x)] pb-[var(--space-16x)]">
      <div className="inline-flex items-center gap-[var(--space-2x)] rounded-[1.5rem] border border-progress-border bg-progress text-progress-foreground px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-medium mb-[var(--space-6x)]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-progress-foreground" />
        Powered by Chainlink CRE
      </div>

      <h1 className="font-display text-5xl md:text-6xl font-bold max-w-3xl leading-tight text-foreground">
        Decentralized AI inference
        <br />
        <span className="text-primary">with oracle consensus</span>
      </h1>

      <p className="mt-[var(--space-6x)] text-lg max-w-2xl leading-relaxed text-muted-foreground">
        Send a prompt to the Chainlink oracle network. 3 AI models respond, 3 judges
        cross-evaluate, and DON nodes reach consensus on the best answer. One API call.
      </p>

      <div className="flex gap-[var(--space-4x)] mt-[var(--space-10x)]">
        <Link
          href="/playground"
          className="inline-flex items-center justify-center rounded-[var(--border-radius-primary)] px-[var(--space-6x)] py-[var(--space-3x)] text-base font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          Try it now
        </Link>
        <Link
          href="#api"
          className="inline-flex items-center justify-center rounded-[var(--border-radius-primary)] border border-border px-[var(--space-6x)] py-[var(--space-3x)] text-base font-medium text-foreground hover:bg-muted transition-colors"
        >
          API Reference
        </Link>
      </div>

      <div className="mt-[var(--space-12x)] w-full max-w-2xl rounded-[var(--border-radius-secondary)] border border-card-border bg-card text-left overflow-hidden">
        <div className="flex items-center gap-[var(--space-2x)] px-[var(--space-4x)] py-[var(--space-3x)] border-b border-border bg-muted">
          <span className="font-mono text-xs text-muted-foreground">ask-oracle.sh</span>
        </div>
        <pre className="p-[var(--space-4x)] overflow-x-auto">
          <code className="font-mono text-sm text-foreground">
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
      bg: "bg-progress",
      border: "border-progress-border",
      fg: "text-progress-foreground",
    },
    {
      step: "2",
      title: "Evaluate",
      description: "3 AI models respond independently. Each model then judges all 3 responses on a 1-10 scale, producing a 3x3 scoring matrix.",
      bg: "bg-warning",
      border: "border-warning-border",
      fg: "text-warning-foreground",
    },
    {
      step: "3",
      title: "Consensus",
      description: "DON nodes reach BFT consensus on the scores via median aggregation. The response with the highest average score wins.",
      bg: "bg-success",
      border: "border-success-border",
      fg: "text-success-foreground",
    },
  ];

  return (
    <section id="how-it-works" className="px-[var(--space-6x)] py-[var(--space-16x)] bg-background-alt">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)] text-foreground">
          How it works
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)] text-muted-foreground">
          Three steps. One API call. Cryptographic proof of consensus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6x)]">
          {steps.map((s) => (
            <div
              key={s.step}
              className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)]"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-[var(--space-4x)] ${s.bg} ${s.fg} border ${s.border}`}>
                {s.step}
              </div>
              <h3 className="font-display text-xl font-bold mb-[var(--space-2x)] text-foreground">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-[var(--space-10x)] rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)]">
          <h3 className="font-display text-lg font-bold mb-[var(--space-4x)] text-foreground">
            3x3 Scoring Matrix
          </h3>
          <p className="text-sm mb-[var(--space-4x)] text-muted-foreground">
            Each model generates a response, then acts as an impartial judge of all three responses.
            The highest average score wins.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-[var(--space-2x)] pr-[var(--space-4x)]"></th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">Model A</th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">Model B</th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">Model C</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {[
                  { judge: "Judge: A", scores: [7, 8, 6] },
                  { judge: "Judge: B", scores: [8, 9, 7] },
                  { judge: "Judge: C", scores: [7, 8, 5] },
                ].map((row) => (
                  <tr key={row.judge} className="border-t border-border-muted">
                    <td className="py-[var(--space-2x)] pr-[var(--space-4x)] text-left text-muted-foreground">
                      {row.judge}
                    </td>
                    {row.scores.map((score, i) => (
                      <td key={i} className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">
                        {score}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border font-bold">
                  <td className="py-[var(--space-2x)] pr-[var(--space-4x)] text-muted-foreground">Average</td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">7.33</td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)] text-success-foreground">
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
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)] text-foreground">
          API Reference
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)] text-muted-foreground">
          Three endpoints. No SDK required. Works with any language.
        </p>

        <div className="space-y-[var(--space-6x)]">
          {[
            {
              method: "POST",
              path: "/api/v1/ask",
              desc: "Submit a prompt for oracle consensus. Returns a requestId and statusUrl to poll.",
              body: `{ "prompt": "What causes auroras?" }`,
              tagBg: "bg-success",
              tagBorder: "border-success-border",
              tagFg: "text-success-foreground",
            },
            {
              method: "GET",
              path: "/api/v1/result/:id",
              desc: "Poll for the consensus result. Returns the winning response, full 3x3 score matrix, and all model responses.",
              body: null,
              tagBg: "bg-progress",
              tagBorder: "border-progress-border",
              tagFg: "text-progress-foreground",
            },
            {
              method: "GET",
              path: "/api/v1/models",
              desc: "List the AI models in the oracle council and the consensus method used.",
              body: null,
              tagBg: "bg-progress",
              tagBorder: "border-progress-border",
              tagFg: "text-progress-foreground",
            },
          ].map((ep) => (
            <div
              key={ep.path}
              className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)]"
            >
              <div className="flex items-center gap-[var(--space-3x)] mb-[var(--space-3x)]">
                <span
                  className={`inline-flex items-center rounded-[1.5rem] border px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-bold font-mono ${ep.tagBg} ${ep.tagBorder} ${ep.tagFg}`}
                >
                  {ep.method}
                </span>
                <code className="font-mono text-sm font-bold text-foreground">{ep.path}</code>
              </div>
              <p className="text-sm text-muted-foreground">{ep.desc}</p>
              {ep.body && (
                <pre className="mt-[var(--space-3x)] rounded-[var(--border-radius-primary)] bg-muted p-[var(--space-3x)] overflow-x-auto">
                  <code className="font-mono text-xs text-foreground">{ep.body}</code>
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
    { name: "Nemotron Nano 9B", provider: "NVIDIA", role: "Fast inference" },
    { name: "Nemotron 3 Nano 30B", provider: "NVIDIA", role: "Reasoning" },
    { name: "LFM 2.5 1.2B", provider: "Liquid", role: "Lightweight" },
  ];

  return (
    <section className="px-[var(--space-6x)] py-[var(--space-16x)] bg-background-alt">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)] text-foreground">
          The Oracle Council
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)] text-muted-foreground">
          Three models. Each generates a response AND judges all responses. No single model decides.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6x)]">
          {models.map((m) => (
            <div
              key={m.name}
              className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)] text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg font-bold mb-[var(--space-4x)] bg-muted text-foreground">
                {m.name[0]}
              </div>
              <h3 className="font-display text-base font-bold mb-[var(--space-1x)] text-foreground">
                {m.name}
              </h3>
              <p className="text-xs mb-[var(--space-2x)] text-muted-foreground">{m.provider}</p>
              <span className="inline-flex items-center rounded-[1.5rem] border border-border bg-muted px-[var(--space-3x)] py-[var(--space-1x)] text-xs font-medium text-foreground">
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
    <footer className="px-[var(--space-6x)] py-[var(--space-8x)] border-t border-border text-center">
      <p className="text-xs text-muted-foreground">
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
