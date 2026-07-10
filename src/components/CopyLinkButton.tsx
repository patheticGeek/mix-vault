"use client";

import { useState } from "react";

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 10.5 10.5 13.5m-3.75 3.75 1.5-1.5m6-9 1.5-1.5a3.182 3.182 0 0 1 4.5 4.5l-1.5 1.5m-9 9-1.5 1.5a3.182 3.182 0 0 1-4.5-4.5l1.5-1.5"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

interface CopyLinkButtonProps {
  slug: string;
  className?: string;
  showLabel?: boolean;
}

export function CopyLinkButton({ slug, className = "", showLabel = false }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/#${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission denied or unavailable — nothing more we can do
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy track link"
      aria-label="Copy track link"
      className={`btn btn-ghost btn-xs gap-1 ${className}`}
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
      {showLabel && <span>{copied ? "Copied" : "Copy link"}</span>}
    </button>
  );
}
