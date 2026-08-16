"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy Link",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
        copied
          ? "bg-emerald-100 border-emerald-300 text-emerald-800"
          : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {copied ? "✓ Copied!" : label}
    </button>
  );
}
