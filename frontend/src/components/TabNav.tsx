"use client";

export type TabId =
  | "design"
  | "ss-means"
  | "ss-rates"
  | "ss-survival"
  | "sim-means"
  | "sim-rates"
  | "sim-survival";

const TABS: { id: TabId; label: string; group: string }[] = [
  { id: "design", label: "Trial Design", group: "Design" },
  { id: "ss-means", label: "Means", group: "Sample Size" },
  { id: "ss-rates", label: "Rates", group: "Sample Size" },
  { id: "ss-survival", label: "Survival", group: "Sample Size" },
  { id: "sim-means", label: "Means", group: "Simulation" },
  { id: "sim-rates", label: "Rates", group: "Simulation" },
  { id: "sim-survival", label: "Survival", group: "Simulation" },
];

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  const groups = Array.from(new Set(TABS.map((t) => t.group)));

  return (
    <nav className="border-b border-slate-200 bg-white px-6">
      <div className="flex items-end gap-6 overflow-x-auto">
        {groups.map((group) => (
          <div key={group} className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 pb-1">{group}</span>
            <div className="flex gap-1">
              {TABS.filter((t) => t.group === group).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onChange(tab.id)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
