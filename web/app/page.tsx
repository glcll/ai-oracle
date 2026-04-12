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
        <Link href="#why-cre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Why CRE
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
        Send a prompt to the Chainlink oracle network. 2 ultra-fast worker models respond,
        1 judge scores both, and DON nodes reach consensus on the best answer. One API call.
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
{`curl -X POST https://ai-oracle-council.vercel.app/api/v1/ask \\
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
      description: "2 ultra-fast worker models (GPT-4o Mini, Gemini 2.5 Flash) respond independently. Then a judge model (GPT-4o Mini) scores both responses on a 1-10 scale.",
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
            Scoring Matrix
          </h3>
          <p className="text-sm mb-[var(--space-4x)] text-muted-foreground">
            2 worker models generate responses, then 1 judge model scores each response.
            The highest score wins. DON nodes run this independently and reach median-aggregated consensus.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-[var(--space-2x)] pr-[var(--space-4x)]"></th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">GPT-4o Mini</th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">Gemini 2.5 Flash</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-t border-border-muted">
                  <td className="py-[var(--space-2x)] pr-[var(--space-4x)] text-left text-muted-foreground">
                    GPT-4o Mini
                  </td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)] text-success-foreground font-bold">8</td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">7</td>
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
              desc: "Poll for the consensus result. Returns the winning response, score matrix, and all model responses.",
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

function WhyCRE() {
  const centralized = [
    { label: "Single point of failure", desc: "One server goes down, your AI is offline." },
    { label: "Trust the operator", desc: "You have no way to verify the response wasn't filtered, edited, or fabricated." },
    { label: "Opaque model selection", desc: "The provider picks one model behind the scenes. You get what you get." },
    { label: "No consensus", desc: "One model, one opinion. Hallucinations pass through unchecked." },
    { label: "Mutable history", desc: "Responses can be retroactively altered. No audit trail." },
  ];

  const cre = [
    { label: "Decentralized oracle network", desc: "Runs across independent DON nodes. No single operator can censor or tamper with results." },
    { label: "Cryptographic attestation", desc: "Every response is signed by the nodes that produced it. Verifiable on-chain." },
    { label: "Multi-model by design", desc: "Multiple models respond independently. You see every answer, not just the one someone picked for you." },
    { label: "BFT consensus on quality", desc: "An independent judge scores each response, and DON nodes reach median-aggregated consensus — outliers and hallucinations get filtered." },
    { label: "Immutable results", desc: "Consensus output can be anchored on-chain. The record can't be changed after the fact." },
  ];

  return (
    <section id="why-cre" className="px-[var(--space-6x)] py-[var(--space-16x)]">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)] text-foreground">
          Why Chainlink CRE?
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)] max-w-2xl mx-auto text-muted-foreground">
          Running AI inference on a centralized API means trusting a single operator with no verification.
          CRE replaces trust with cryptographic proof.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-6x)]">
          {/* Centralized column */}
          <div className="rounded-[var(--border-radius-secondary)] border border-error-border bg-error/30 p-[var(--space-6x)]">
            <div className="flex items-center gap-[var(--space-3x)] mb-[var(--space-6x)]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-error border border-error-border">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-error-foreground">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Centralized AI API</h3>
            </div>
            <ul className="space-y-[var(--space-5x)]">
              {centralized.map((item) => (
                <li key={item.label}>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground mt-[var(--space-1x)]">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* CRE column */}
          <div className="rounded-[var(--border-radius-secondary)] border border-success-border bg-success/30 p-[var(--space-6x)]">
            <div className="flex items-center gap-[var(--space-3x)] mb-[var(--space-6x)]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-success border border-success-border">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success-foreground">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Chainlink CRE</h3>
            </div>
            <ul className="space-y-[var(--space-5x)]">
              {cre.map((item) => (
                <li key={item.label}>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground mt-[var(--space-1x)]">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-[var(--space-10x)] rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)]">
          <div className="flex items-start gap-[var(--space-4x)]">
            <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-progress border border-progress-border">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-progress-foreground">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h4 className="font-display text-base font-bold text-foreground mb-[var(--space-1x)]">
                What is the Chainlink Runtime Environment?
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                CRE is an execution framework where independent node operators run your workflow logic
                inside a decentralized oracle network (DON). Each node fetches data, runs computation,
                and participates in Byzantine Fault Tolerant consensus — meaning even if some nodes
                misbehave, the network still produces a correct, agreed-upon result. For AI inference,
                this means no single model or operator decides the answer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Models() {
  const workers = [
    { name: "GPT-4o Mini", provider: "OpenAI", role: "Worker" },
    { name: "Gemini 2.5 Flash", provider: "Google", role: "Worker" },
  ];
  const judges = [
    { name: "GPT-4o Mini", provider: "OpenAI", role: "Judge" },
  ];

  return (
    <section className="px-[var(--space-6x)] py-[var(--space-16x)] bg-background-alt">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)] text-foreground">
          The Oracle Council
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)] max-w-2xl mx-auto text-muted-foreground">
          Three models, two roles. Workers generate answers independently.
          A judge scores both responses. DON nodes reach consensus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6x)]">
          {workers.map((m) => (
            <div
              key={`worker-${m.name}`}
              className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)] text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg font-bold mb-[var(--space-4x)] bg-progress/30 text-progress-foreground border border-progress-border">
                {m.name[0]}
              </div>
              <div className="mb-[var(--space-2x)]">
                <span className="inline-flex items-center rounded-[1.5rem] border border-progress-border bg-progress text-progress-foreground px-[var(--space-2x)] py-0.5 text-xxs font-bold">
                  Worker
                </span>
              </div>
              <h3 className="font-display text-base font-bold mb-[var(--space-1x)] text-foreground">
                {m.name}
              </h3>
              <p className="text-xs text-muted-foreground">{m.provider}</p>
            </div>
          ))}

          {judges.map((m) => (
            <div
              key={`judge-${m.name}`}
              className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)] text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg font-bold mb-[var(--space-4x)] bg-warning/30 text-warning-foreground border border-warning-border">
                {m.name[0]}
              </div>
              <div className="mb-[var(--space-2x)]">
                <span className="inline-flex items-center rounded-[1.5rem] border border-warning-border bg-warning text-warning-foreground px-[var(--space-2x)] py-0.5 text-xxs font-bold">
                  Judge
                </span>
              </div>
              <h3 className="font-display text-base font-bold mb-[var(--space-1x)] text-foreground">
                {m.name}
              </h3>
              <p className="text-xs text-muted-foreground">{m.provider}</p>
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
        <WhyCRE />
        <Models />
        <ApiReference />
      </main>
      <Footer />
    </>
  );
}
