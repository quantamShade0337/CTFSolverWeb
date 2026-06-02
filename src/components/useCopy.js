import { useCallback, useRef, useState } from "react";

/* Tracks which key was last copied; auto-clears so the check mark reverts. */
export function useCopy(timeout = 1400) {
  const [copied, setCopied] = useState("");
  const timer = useRef(0);

  const copy = useCallback(
    async (text, key) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return;
      }
      setCopied(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(""), timeout);
    },
    [timeout],
  );

  return { copied, copy };
}
