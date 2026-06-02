import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Copy, Terminal } from "lucide-react";
import { SearchBar } from "../components/SearchBar.jsx";
import { useCopy } from "../components/useCopy.js";
import {
  categories,
  categoryMeta,
  categoryCount,
  quickChecks,
  featuredGuide,
  totalGuides,
} from "../lib.js";

export function Home() {
  const { copied, copy } = useCopy();

  return (
    <>
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            CTF triage playbooks · {totalGuides} and counting
          </span>
          <h1 className="hero-title">
            You're stuck on a challenge.
            <br />
            <span className="hero-title-accent">Here's the next command.</span>
          </h1>
          <p className="hero-sub">
            Not write-ups for one event — a field guide to challenge{" "}
            <em>types</em>. Tell it what you're looking at, get the commands to
            run, the order to run them, and the mistakes to skip.
          </p>

          <SearchBar variant="hero" autoFocus />

          <div className="hero-tags">
            <span>Try:</span>
            {["jwt", "binary digits", "rsa", "pcap http", "lsb stego", "ret2win"].map(
              (t) => (
                <Link key={t} to={`/search?q=${encodeURIComponent(t)}`}>
                  {t}
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Pick the terrain</h2>
          <p>Eight categories. Every one opens onto its own index of playbooks.</p>
        </div>
        <div className="cat-grid">
          {categories.map((c) => {
            const meta = categoryMeta[c];
            return (
              <Link
                key={c}
                to={`/category/${meta.slug}`}
                className="cat-card"
                data-tone={meta.tone}
              >
                <div className="cat-card-head">
                  <span className="cat-dot" data-tone={meta.tone} />
                  <span className="cat-count">{categoryCount(c)}</span>
                </div>
                <h3>{c}</h3>
                <p>{meta.blurb}</p>
                <span className="cat-card-go">
                  Browse <ArrowUpRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section split">
        <div className="triage">
          <div className="section-head">
            <h2>Baseline triage</h2>
            <p>
              When you don't know where to start, run these on any artifact. Copy,
              paste, read the output.
            </p>
          </div>
          <div className="triage-list">
            {quickChecks.map((check, i) => (
              <button
                key={check.label}
                type="button"
                className="triage-row"
                onClick={() => copy(check.command, `q-${i}`)}
              >
                <span className="triage-label">
                  <Terminal size={14} />
                  {check.label}
                </span>
                <code>{check.command}</code>
                <span className="triage-copy" data-copied={copied === `q-${i}`}>
                  {copied === `q-${i}` ? <Check size={14} /> : <Copy size={14} />}
                </span>
              </button>
            ))}
          </div>
        </div>

        {featuredGuide && (
          <Link to={`/guide/${featuredGuide.id}`} className="featured">
            <span className="featured-tag">Worked example</span>
            <h3>{featuredGuide.title}</h3>
            <p>{featuredGuide.symptoms}</p>
            {featuredGuide.example && (
              <ol className="featured-steps">
                {featuredGuide.example.walkthrough.slice(0, 4).map((s, i) => (
                  <li key={s.step}>
                    <b>{i + 1}</b>
                    <span>{s.step}</span>
                  </li>
                ))}
              </ol>
            )}
            <span className="featured-go">
              Walk through it <ArrowUpRight size={15} />
            </span>
          </Link>
        )}
      </section>
    </>
  );
}
