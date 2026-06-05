import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { SearchBar } from "../components/SearchBar.jsx";
import { GuideRow } from "../components/GuideCard.jsx";
import { searchGuides } from "../lib.js";

export function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const results = useMemo(() => searchGuides(q), [q]);

  return (
    <div className="page search-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={13} />
        <span>Search</span>
      </nav>

      <header className="search-head">
        <h1>Search</h1>
        <SearchBar variant="hero" initial={q} autoFocus key={q} />
        <p className="search-count">
          {q ? (
            <>
              <strong>{results.length}</strong> playbook
              {results.length === 1 ? "" : "s"} for “{q}”
            </>
          ) : (
            "Search in plain words (“hidden in a photo”) or by tool, symptom, or file type."
          )}
        </p>
      </header>

      {q && results.length === 0 ? (
        <p className="empty">
          Nothing matched. Try a symptom (“repeated blocks”), a tool (“volatility”),
          or a file type (“pcap”).
        </p>
      ) : (
        <div className="row-list">
          {results.map((g) => (
            <GuideRow key={g.id} guide={g} />
          ))}
        </div>
      )}
    </div>
  );
}
