import { Check, Copy } from "lucide-react";

export function CommandBlock({ command, label = "shell", copied, onCopy }) {
  const lines = command.split("\n");
  return (
    <div className="cmd">
      <div className="cmd-bar">
        <span className="cmd-label">
          <span className="cmd-prompt">$</span>
          {label}
        </span>
        <button
          type="button"
          className="cmd-copy"
          onClick={onCopy}
          aria-label={copied ? "Copied" : "Copy command"}
          data-copied={copied ? "true" : "false"}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="cmd-body">
        <code>
          {lines.map((line, i) => (
            <span
              key={i}
              className="cmd-line"
              data-comment={line.trim().startsWith("#") ? "true" : "false"}
            >
              {line || " "}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
