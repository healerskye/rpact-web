"use client";

interface SplitPanelProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export function SplitPanel({ left, right }: SplitPanelProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: inputs */}
      <aside className="w-96 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-5">
        {left}
      </aside>
      {/* Right: results */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {right}
      </main>
    </div>
  );
}
