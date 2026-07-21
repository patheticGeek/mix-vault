"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

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
    const url = `${window.location.origin}/track/${slug}`;
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
      {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      {showLabel && <span>{copied ? "Copied" : "Copy link"}</span>}
    </button>
  );
}
