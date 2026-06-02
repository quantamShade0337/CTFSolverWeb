import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Lightbulb,
  ListChecks,
  Package,
  Target,
  Terminal,
} from "lucide-react";
import { CommandBlock } from "../components/CommandBlock.jsx";
import { useCopy } from "../components/useCopy.js";
import {
  categoryMeta,
  getGuide,
  installHints,
  quickChecks,
  relatedGuides,
} from "../lib.js";
import { NotFound } from "./NotFound.jsx";

/* Wrap `inline code` spans in <code>. */
function fmt(text) {
  return text
    .split(/`([^`]+)`/g)
    .map((seg, i) => (i % 2 ? <code key={i}>{seg}</code> : seg));
}

export function Guide() {
  const { id } = useParams();
  const guide = getGuide(id);
  const { copied, copy } = useCopy();

  if (!guide) return <NotFound />;
  const meta = categoryMeta[guide.category];
  const related = relatedGuides(guide);

  return (
    <div className="page guide" data-tone={meta.tone}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={13} />
        <Link to={`/category/${meta.slug}`}>{guide.category}</Link>
        <ChevronRight size={13} />
        <span>{guide.title}</span>
      </nav>

      <div className="guide-layout">
        <article className="guide-main">
          <header className="guide-header" data-tone={meta.tone}>
            <div className="guide-header-meta">
              <span className="cat-chip" data-tone={meta.tone}>
                {guide.category}
              </span>
              <span className="diff solid">{guide.difficulty}</span>
            </div>
            <h1>{guide.title}</h1>
            <p className="guide-symptom">{guide.symptoms}</p>
          </header>

          {guide.explain && (
            <section className="doc-block">
              <div className="doc-head">
                <Lightbulb size={16} />
                <h2>What's actually going on</h2>
              </div>
              <div className="explain">
                {guide.explain.split("\n\n").map((para, i) => (
                  <p key={i}>{fmt(para)}</p>
                ))}
              </div>
            </section>
          )}

          <section className="doc-block">
            <div className="doc-head">
              <Terminal size={16} />
              <h2>Commands to run</h2>
            </div>
            <p className="doc-lead">Top to bottom. Read each output before the next.</p>
            <div className="cmd-stack">
              {guide.commands.map((command, i) => (
                <CommandBlock
                  key={i}
                  command={command}
                  label={
                    guide.commands.length > 1 ? `step ${i + 1}` : "shell"
                  }
                  copied={copied === `cmd-${i}`}
                  onCopy={() => copy(command, `cmd-${i}`)}
                />
              ))}
            </div>
          </section>

          {guide.apply && guide.apply.length > 0 && (
            <section className="doc-block">
              <div className="doc-head">
                <Target size={16} />
                <h2>How to apply it to your challenge</h2>
              </div>
              <ol className="apply">
                {guide.apply.map((step, i) => (
                  <li key={i}>
                    <span className="apply-num">{i + 1}</span>
                    <span>{fmt(step)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="doc-block">
            <div className="doc-head">
              <ListChecks size={16} />
              <h2>Thought process</h2>
            </div>
            <ol className="thought">
              {guide.thought.map((step, i) => (
                <li key={i}>
                  <span className="thought-num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {guide.example && (
            <section className="doc-block">
              <div className="doc-head">
                <Terminal size={16} />
                <h2>Worked example · {guide.example.name}</h2>
              </div>
              <div className="walk">
                {guide.example.walkthrough.map((item, i) => (
                  <div className="walk-step" key={item.step}>
                    <span className="walk-num">{i + 1}</span>
                    <div className="walk-body">
                      <strong>{item.step}</strong>
                      <code className="walk-cmd">{item.command}</code>
                      <p>{item.why}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="doc-block">
            <div className="doc-head warn">
              <AlertTriangle size={16} />
              <h2>Mistakes to avoid</h2>
            </div>
            <ul className="pitfalls">
              {guide.pitfalls.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>
        </article>

        <aside className="guide-rail">
          {related.length > 0 && (
            <div className="rail-card">
              <h3>More in {guide.category}</h3>
              <div className="rail-links">
                {related.map((g) => (
                  <Link key={g.id} to={`/guide/${g.id}`} className="rail-link">
                    <span>{g.title}</span>
                    <ChevronRight size={14} />
                  </Link>
                ))}
              </div>
              <Link to={`/category/${meta.slug}`} className="rail-all">
                All {guide.category} playbooks
              </Link>
            </div>
          )}

          <div className="rail-card">
            <h3>
              <ListChecks size={14} /> Fast checks
            </h3>
            <div className="rail-copies">
              {quickChecks.map((check, i) => (
                <button
                  key={check.label}
                  type="button"
                  className="rail-copy"
                  onClick={() => copy(check.command, `qc-${i}`)}
                >
                  <span>{check.label}</span>
                  {copied === `qc-${i}` ? <Check size={14} /> : <Copy size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className="rail-card">
            <h3>
              <Package size={14} /> Install the toolkit
            </h3>
            <div className="rail-copies">
              {installHints.map((hint, i) => (
                <button
                  key={i}
                  type="button"
                  className="rail-install"
                  onClick={() => copy(hint, `inst-${i}`)}
                  title={hint}
                >
                  <code>{hint}</code>
                  {copied === `inst-${i}` ? <Check size={14} /> : <Copy size={14} />}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
