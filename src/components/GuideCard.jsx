import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { categoryMeta, displayTitle } from "../lib.js";

export function GuideCard({ guide }) {
  const meta = categoryMeta[guide.category];
  const renamed = Boolean(guide.plain);
  return (
    <Link
      to={`/guide/${guide.id}`}
      className="guide-card"
      data-tone={meta.tone}
    >
      <span className="guide-card-rail" aria-hidden="true" />
      <div className="guide-card-top">
        <span className="cat-chip" data-tone={meta.tone}>
          {meta.friendly}
        </span>
        <span className="diff">{guide.difficulty}</span>
      </div>
      <h3 className="guide-card-title">{displayTitle(guide)}</h3>
      {renamed && <span className="tech-tag">aka {guide.title}</span>}
      <p className="guide-card-symptom">{guide.symptoms}</p>
      <span className="guide-card-go">
        Open playbook <ArrowUpRight size={15} />
      </span>
    </Link>
  );
}

export function GuideRow({ guide }) {
  const meta = categoryMeta[guide.category];
  return (
    <Link to={`/guide/${guide.id}`} className="guide-row" data-tone={meta.tone}>
      <span className="guide-row-rail" aria-hidden="true" />
      <span className="guide-row-body">
        <strong>
          {displayTitle(guide)}
          {guide.plain && <span className="row-tech">{guide.title}</span>}
        </strong>
        <small>{guide.symptoms}</small>
      </span>
      <span className="guide-row-meta">
        <span className="cat-chip ghost" data-tone={meta.tone}>
          {meta.friendly}
        </span>
        <em className="diff">{guide.difficulty}</em>
      </span>
    </Link>
  );
}
