import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { GuideRow } from "../components/GuideCard.jsx";
import {
  categoryFromSlug,
  categoryMeta,
  guidesInCategory,
  searchGuides,
} from "../lib.js";
import { NotFound } from "./NotFound.jsx";

const DIFFICULTY_ORDER = ["Beginner", "Easy", "Medium", "Hard"];

export function Category() {
  const { slug } = useParams();
  const category = categoryFromSlug(slug);
  const [filter, setFilter] = useState("");
  const [diff, setDiff] = useState("All");

  const all = useMemo(
    () => (category ? guidesInCategory(category) : []),
    [category],
  );

  const difficulties = useMemo(() => {
    const present = new Set(all.map((g) => g.difficulty));
    return DIFFICULTY_ORDER.filter((d) => present.has(d));
  }, [all]);

  const results = useMemo(() => {
    if (!category) return [];
    let list = filter.trim()
      ? searchGuides(filter, { category })
      : [...all].sort((a, b) => a.title.localeCompare(b.title));
    if (diff !== "All") list = list.filter((g) => g.difficulty === diff);
    return list;
  }, [category, filter, diff, all]);

  if (!category) return <NotFound />;
  const meta = categoryMeta[category];

  return (
    <div className="page" data-tone={meta.tone}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={13} />
        <span>{meta.friendly}</span>
      </nav>

      <header className="cat-hero" data-tone={meta.tone}>
        <span className="cat-dot lg" data-tone={meta.tone} />
        <h1>{meta.friendly}</h1>
        <span className="cat-hero-tech">also called {meta.tech}</span>
        <p className="cat-hero-blurb">{meta.blurb}</p>
        <p className="cat-hero-hint">
          <strong>Rule of thumb:</strong> {meta.hint}
        </p>
        <span className="cat-hero-count">{all.length} playbooks</span>
      </header>

      <div className="cat-controls">
        <input
          className="filter-input"
          placeholder={`Filter these ${all.length} playbooks…`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="diff-tabs" role="tablist" aria-label="Difficulty">
          {["All", ...difficulties].map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={diff === d}
              className={`diff-tab ${diff === d ? "active" : ""}`}
              onClick={() => setDiff(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {results.length ? (
        <div className="row-list">
          {results.map((g) => (
            <GuideRow key={g.id} guide={g} />
          ))}
        </div>
      ) : (
        <p className="empty">No playbooks match that filter.</p>
      )}
    </div>
  );
}
