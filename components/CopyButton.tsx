"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
        copied
          ? "bg-zinc-100 border-white text-black font-bold"
          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
      }`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-black" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
