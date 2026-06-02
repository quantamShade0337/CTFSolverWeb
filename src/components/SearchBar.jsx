import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft } from "lucide-react";
import { searchGuides, categoryMeta } from "../lib.js";

/* Search input with live suggestions. variant: "hero" (large, dropdown) or "bar" (compact). */
export function SearchBar({ variant = "hero", autoFocus = false, initial = "" }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();

  const trimmed = value.trim();
  const suggestions = trimmed ? searchGuides(trimmed).slice(0, 6) : [];

  // Global "/" focuses the search.
  useEffect(() => {
    if (variant !== "hero") return;
    function onKey(e) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  function go(query) {
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  function onKeyDown(e) {
    if (!open || !suggestions.length) {
      if (e.key === "Enter" && trimmed) go(trimmed);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % (suggestions.length + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length + 1) % (suggestions.length + 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active > 0 && suggestions[active - 1]) {
        navigate(`/guide/${suggestions[active - 1].id}`);
        setOpen(false);
      } else if (trimmed) {
        go(trimmed);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={`searchbar ${variant}`}>
      <div className="searchbar-field">
        <Search size={variant === "hero" ? 20 : 16} className="searchbar-icon" />
        <input
          ref={inputRef}
          value={value}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={
            variant === "hero"
              ? "Describe what you're stuck on — a file, a symptom, a tool…"
              : "Search playbooks"
          }
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onKeyDown={onKeyDown}
        />
        {variant === "hero" ? (
          trimmed ? (
            <button type="button" className="searchbar-enter" onClick={() => go(trimmed)}>
              <span>Search</span>
              <CornerDownLeft size={14} />
            </button>
          ) : (
            <kbd className="searchbar-kbd">/</kbd>
          )
        ) : null}
      </div>

      {variant === "hero" && open && suggestions.length > 0 && (
        <ul className="searchbar-suggest" id={listId} role="listbox">
          {suggestions.map((g, i) => {
            const meta = categoryMeta[g.category];
            return (
              <li key={g.id} role="option" aria-selected={active === i + 1}>
                <button
                  type="button"
                  className={`suggest-row ${active === i + 1 ? "active" : ""}`}
                  data-tone={meta.tone}
                  onMouseEnter={() => setActive(i + 1)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(`/guide/${g.id}`);
                    setOpen(false);
                  }}
                >
                  <span className="suggest-dot" data-tone={meta.tone} />
                  <span className="suggest-title">{g.title}</span>
                  <span className="suggest-cat">{g.category}</span>
                </button>
              </li>
            );
          })}
          <li role="option" aria-selected={active === 0}>
            <button
              type="button"
              className={`suggest-all ${active === 0 ? "active" : ""}`}
              onMouseEnter={() => setActive(0)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(trimmed);
              }}
            >
              See all matches for “{trimmed}”
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
