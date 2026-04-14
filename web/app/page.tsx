import Link from "next/link";
import { CopyButton } from "./components/copy-button";

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
        <span className="font-display text-lg font-bold text-foreground">AI Oracle Council</span>
      </div>
      <div className="flex items-center gap-[var(--space-6x)]">
        <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          How it works
        </Link>
        <Link href="#why-cre" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Why CRE
        </Link>
        <Link href="#agent-skill" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Agent Skill
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
        Send a prompt to the Chainlink oracle network. 2 worker models respond,
        2 independent judges score both, and DON nodes reach consensus on the best answer. One API call.
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
        <div className="flex items-center justify-between px-[var(--space-4x)] py-[var(--space-3x)] border-b border-border bg-muted">
          <span className="font-mono text-xs text-muted-foreground">ask-council.sh</span>
          <CopyButton text={`curl -X POST https://ai-oracle-council.vercel.app/api/v1/ask \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt": "What causes auroras?"}'`} />
        </div>
        <pre className="p-[var(--space-4x)] overflow-x-auto select-all">
          <code className="font-mono text-sm text-foreground">
{`curl -X POST https://ai-oracle-council.vercel.app/api/v1/ask \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "What causes auroras?"}'`}
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
      description: "2 worker models (Gemini 2.5 Flash, GLM-5 Turbo) respond independently. Then 2 judges (GPT-4o Mini, Qwen Turbo) each score both responses on a 1-10 scale.",
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
      <div className="max-w-5xl mx-auto">
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
            2 worker models generate responses, then 2 independent judges score each response.
            The highest average score wins. DON nodes run this independently and reach median-aggregated consensus.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-[var(--space-2x)] pr-[var(--space-4x)]"></th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">Gemini Flash</th>
                  <th className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">GLM-5 Turbo</th>
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
                <tr className="border-t border-border-muted">
                  <td className="py-[var(--space-2x)] pr-[var(--space-4x)] text-left text-muted-foreground">
                    Qwen Turbo
                  </td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)] text-success-foreground font-bold">9</td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">7</td>
                </tr>
                <tr className="border-t border-border font-bold">
                  <td className="py-[var(--space-2x)] pr-[var(--space-4x)] text-muted-foreground">Average</td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)] text-success-foreground">8.5</td>
                  <td className="text-center py-[var(--space-2x)] px-[var(--space-3x)]">7.0</td>
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
    <section id="api" className="px-[var(--space-6x)] py-[var(--space-16x)] bg-background-alt">
      <div className="max-w-5xl mx-auto">
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
    { label: "Multi-model by design", desc: "2 workers respond, 2 judges score independently. You see every answer, not just the one someone picked for you." },
    { label: "BFT consensus on quality", desc: "Two independent judges score each response, and DON nodes reach median-aggregated consensus — outliers and hallucinations get filtered." },
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
    { name: "Gemini 2.5 Flash", provider: "Google", role: "Worker" },
    { name: "GLM-5 Turbo", provider: "Zhipu AI", role: "Worker" },
  ];
  const judges = [
    { name: "GPT-4o Mini", provider: "OpenAI", role: "Judge" },
    { name: "Qwen Turbo", provider: "Alibaba", role: "Judge" },
  ];

  return (
    <section className="px-[var(--space-6x)] py-[var(--space-16x)] bg-background-alt">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center mb-[var(--space-4x)] text-foreground">
          The Oracle Council
        </h2>
        <p className="text-center text-base mb-[var(--space-12x)] max-w-2xl mx-auto text-muted-foreground">
          Four models, two roles. Workers generate answers independently.
          Two judges score both responses. DON nodes reach consensus.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[var(--space-6x)]">
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

function AgentSkill() {
  const installCmd = `npx skills add glcll/ai-oracle`;

  const features = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-progress-foreground">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      ),
      title: "Multi-model consensus",
      desc: "Get the best answer from 2 workers, independently scored by 2 judges. Your agent gets a verified, consensus-scored response instead of a single model's opinion.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-progress-foreground">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
        </svg>
      ),
      title: "Structured scoring data",
      desc: "Every response comes with a full scoring matrix — per-judge, per-worker scores, averages, and the winning model ID. Feed this into evaluation pipelines or quality monitoring.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-progress-foreground">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      title: "One API call",
      desc: "No SDK. No auth tokens. POST a JSON prompt, parse the SSE stream. Works from any language, any runtime, any agent framework.",
    },
  ];

  return (
    <section id="agent-skill" className="px-[var(--space-6x)] py-[var(--space-16x)]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center gap-[var(--space-3x)] mb-[var(--space-4x)]">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 border border-primary/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground">
            AI Agent Skill
          </h2>
        </div>
        <p className="text-center text-base mb-[var(--space-4x)] max-w-2xl mx-auto text-muted-foreground">
          Give your AI agent access to verified, multi-model consensus. Install via{" "}
          <a href="https://skills.sh" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">skills.sh</a>{" "}
          and your agent can query the Oracle Council directly.
        </p>
        <p className="text-center text-xs mb-[var(--space-12x)] text-muted-foreground">
          Works with Cursor, Claude Code, Codex, Windsurf, Cline, and 40+ other agents.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6x)] mb-[var(--space-10x)]">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card p-[var(--space-6x)]"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-progress/30 border border-progress-border mb-[var(--space-4x)]">
                {f.icon}
              </div>
              <h3 className="font-display text-base font-bold mb-[var(--space-2x)] text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Install command */}
        <div className="rounded-[var(--border-radius-secondary)] border border-card-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-[var(--space-4x)] py-[var(--space-3x)] border-b border-border bg-muted">
            <span className="font-mono text-xs text-muted-foreground">terminal</span>
            <CopyButton text={installCmd} />
          </div>
          <div className="p-[var(--space-5x)] flex items-center">
            <span className="font-mono text-sm text-muted-foreground select-none mr-[var(--space-2x)]">$</span>
            <code className="font-mono text-sm text-foreground">{installCmd}</code>
          </div>
        </div>

        <div className="flex items-center justify-center gap-[var(--space-6x)] mt-[var(--space-6x)]">
          <a
            href="https://skills.sh/?q=ai-oracle-council"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-[var(--space-2x)] text-sm font-medium text-link hover:underline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            View on skills.sh
          </a>
          <a
            href="https://github.com/glcll/ai-oracle/blob/main/skills/ai-oracle-council/SKILL.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-[var(--space-2x)] text-sm font-medium text-link hover:underline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View on GitHub
          </a>
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
        <AgentSkill />
        <ApiReference />
      </main>
      <Footer />
    </>
  );
}
