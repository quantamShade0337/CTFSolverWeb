import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Terminal } from "lucide-react";
import { SearchBar } from "./SearchBar.jsx";
import { categories, categoryMeta, totalGuides } from "../lib.js";

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname, search]);
  return null;
}

export function Layout() {
  return (
    <div className="shell">
      <ScrollToTop />
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Terminal size={16} />
            </span>
            <span className="brand-name">
              ctf<span className="brand-accent">solver</span>
            </span>
          </Link>

          <nav className="topnav" aria-label="Categories">
            {categories.map((c) => (
              <NavLink
                key={c}
                to={`/category/${categoryMeta[c].slug}`}
                className="topnav-link"
                data-tone={categoryMeta[c].tone}
              >
                {c}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-search">
            <SearchBar variant="bar" />
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-mark small">
              <Terminal size={13} />
            </span>
            <span>ctfsolver</span>
          </div>
          <p className="footer-note">
            {totalGuides} playbooks across {categories.length} categories. Built for
            CTF players who are stuck and want the next command, not a lecture.
          </p>
          <nav className="footer-cats" aria-label="All categories">
            {categories.map((c) => (
              <Link key={c} to={`/category/${categoryMeta[c].slug}`}>
                {c}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
