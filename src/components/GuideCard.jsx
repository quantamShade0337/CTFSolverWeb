import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { categoryMeta } from "../lib.js";

/* A guide as a self-contained card linking to its own page. */
export function GuideCard({ guide }) {
  const meta = categoryMeta[guide.category];
  return (
    <Link
      to={`/guide/${guide.id}`}
      className="guide-card"
      data-tone={meta.tone}
    >
      <span className="guide-card-rail" aria-hidden="true" />
      <div className="guide-card-top">
        <span className="cat-chip" data-tone={meta.tone}>
          {guide.category}
        </span>
        <span className="diff">{guide.difficulty}</span>
      </div>
      <h3 className="guide-card-title">{guide.title}</h3>
      <p className="guide-card-symptom">{guide.symptoms}</p>
      <span className="guide-card-go">
        Open playbook <ArrowUpRight size={15} />
      </span>
    </Link>
  );
}

/* Compact one-line variant for dense lists. */
export function GuideRow({ guide }) {
  const meta = categoryMeta[guide.category];
  return (
    <Link to={`/guide/${guide.id}`} className="guide-row" data-tone={meta.tone}>
      <span className="guide-row-rail" aria-hidden="true" />
      <span className="guide-row-body">
        <strong>{guide.title}</strong>
        <small>{guide.symptoms}</small>
      </span>
      <span className="guide-row-meta">
        <span className="cat-chip ghost" data-tone={meta.tone}>
          {guide.category}
        </span>
        <em className="diff">{guide.difficulty}</em>
      </span>
    </Link>
  );
}
