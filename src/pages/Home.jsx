import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Copy, Flag, Terminal, Compass, BookOpen } from "lucide-react";
import { SearchBar } from "../components/SearchBar.jsx";
import { useCopy } from "../components/useCopy.js";
import {
  categories,
  categoryMeta,
  categoryCount,
  quickChecks,
  featuredGuide,
  displayTitle,
  totalGuides,
} from "../lib.js";

const STARTERS = [
  { q: "binary digits", label: "a file full of 1s and 0s" },
  { q: "metadata", label: "hidden info in a photo" },
  { q: "rsa", label: "an RSA crypto puzzle" },
  { q: "pcap http", label: "a captured-traffic file" },
  { q: "qr", label: "a QR code" },
  { q: "jwt", label: "a login token" },
];

export function Home() {
  const { copied, copy } = useCopy();

  return (
    <>
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-inner">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Beginner-friendly CTF playbooks · {totalGuides} of them
          </span>
          <h1 className="hero-title">
            Stuck on a challenge?
            <br />
            <span className="hero-title-accent">Here's exactly what to try next.</span>
          </h1>
          <p className="hero-sub">
            New to Capture The Flag? This is a plain-English field guide. Tell it
            what you're looking at — a weird file, an odd message, a website — and
            it gives you the commands to run, the order to run them in, and the
            mistakes to skip.
          </p>

          <SearchBar variant="hero" autoFocus />

          <div className="hero-tags">
            <span>I'm looking at…</span>
            {STARTERS.map((s) => (
              <Link key={s.q} to={`/search?q=${encodeURIComponent(s.q)}`}>
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="primer">
          <div className="primer-head">
            <BookOpen size={16} />
            <h2>New here? Read this first</h2>
          </div>
          <div className="primer-grid">
            <div className="primer-card">
              <h3>
                <Flag size={15} /> What's a "flag"?
              </h3>
              <p>
                Every challenge hides a secret string — the <em>flag</em> — that
                proves you solved it. It usually looks like{" "}
                <code>flag{"{"}...{"}"}</code> or <code>picoCTF{"{"}...{"}"}</code>.
                Find it, paste it in, score points.
              </p>
            </div>
            <div className="primer-card">
              <h3>
                <Compass size={15} /> How do I use this?
              </h3>
              <p>
                Figure out which <em>kind</em> of challenge you have (the cards
                below describe each one in plain words). Open its playbook and work
                top to bottom — read what each command prints before the next.
              </p>
            </div>
            <div className="primer-card">
              <h3>
                <Terminal size={15} /> Totally lost?
              </h3>
              <p>
                Run the <strong>first-things-to-try</strong> commands further down
                this page on whatever file you were given. What they print usually
                tells you which category you're in.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>What kind of challenge is it?</h2>
          <p>
            Eight kinds, each in plain English. Not sure? The one-liners below tell
            you what each one feels like. The proper name is in small text — you'll
            pick those up as you go.
          </p>
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
                  <span className="cat-count">{categoryCount(c)} playbooks</span>
                </div>
                <h3>{meta.friendly}</h3>
                <span className="cat-card-tech">{meta.tech}</span>
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
            <h2>First things to try</h2>
            <p>
              When you don't know where to start, run these on any file you're
              given. Click to copy, paste into your terminal, then read what comes
              back. It almost always points you somewhere.
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
            <span className="featured-tag">Walked-through example</span>
            <h3>{displayTitle(featuredGuide)}</h3>
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
              See how a real one gets solved <ArrowUpRight size={15} />
            </span>
          </Link>
        )}
      </section>
    </>
  );
}
