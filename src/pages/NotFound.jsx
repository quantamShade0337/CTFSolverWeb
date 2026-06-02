import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="page notfound">
      <span className="notfound-code">404</span>
      <h1>No playbook here</h1>
      <p>
        That route doesn't map to a challenge type. Head back and search for the
        symptom you're seeing.
      </p>
      <Link to="/" className="btn">
        Back to triage
      </Link>
    </div>
  );
}
