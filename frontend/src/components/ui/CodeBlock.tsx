"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <span className="text-xs font-medium text-slate-400">R Code</span>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
