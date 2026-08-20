"use client";

import { Bot } from "lucide-react";

const REPO_URL = "https://github.com/patheticGeek/mix-vault";

// Small footer at the very end of the page.
export function Footer() {
  return (
    <footer className="py-6 text-center text-xs text-base-content/50">
      <span className="inline-flex items-center gap-1.5">
        Built with
        <Bot className="w-4 h-4" aria-label="AI" />
        <span aria-hidden>·</span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-base-content transition-colors"
        >
          patheticGeek/mix-vault
        </a>
      </span>
    </footer>
  );
}
