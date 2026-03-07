"use client";
import { useState } from "react";
import { InputField, SelectField } from "@/components/ui/InputField";
import { api } from "@/lib/api";
import { ApiResponse, SampleSizeResult } from "@/types/rpact";

const DESIGN_TYPES = [
  { value: "OF", label: "O'Brien-Fleming" },
  { value: "P", label: "Pocock" },
  { value: "WT", label: "Wang-Tsiatis" },
  { value: "asP", label: "Alpha Spending (Pocock)" },
];

export function SampleSizeRates({ onResult }: { onResult: (r: ApiResponse<unknown>) => void }) {
  const [params, setParams] = useState({
    kMax: 3, alpha: 0.025, beta: 0.2, typeOfDesign: "OF", sided: 1,
    pi1: 0.4, pi2: 0.2, allocationRatioPlanned: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (v: string) => setParams((p) => ({ ...p, [k]: isNaN(Number(v)) ? v : Number(v) }));

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.sampleSizeRates(params as Record<string, unknown>) as ApiResponse<SampleSizeResult>;
      if (!res.success) throw new Error(res.error);
      onResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-800">Sample Size — Binary Endpoint</h2>
      <p className="text-xs text-slate-500">Group sequential design · Rates</p>
      <div className="rounded-md bg-blue-50 border border-blue-100 p-3">
        <p className="text-xs font-semibold text-blue-700 mb-2">Design Parameters</p>
        <div className="flex flex-col gap-3">
          <InputField label="Stages (kMax)" name="kMax" value={params.kMax} onChange={set("kMax")} min={1} max={5} step={1} />
          <InputField label="Alpha" name="alpha" value={params.alpha} onChange={set("alpha")} min={0.001} max={0.1} step={0.001} />
          <InputField label="Beta" name="beta" value={params.beta} onChange={set("beta")} min={0.01} max={0.5} step={0.01} />
          <SelectField label="Design Type" name="typeOfDesign" value={params.typeOfDesign} onChange={set("typeOfDesign")} options={DESIGN_TYPES} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-slate-600">Endpoint Parameters</p>
        <InputField label="π₁ (treatment event rate)" name="pi1" value={params.pi1} onChange={set("pi1")} min={0.01} max={0.99} step={0.01} helpText="Expected response rate in treatment arm" />
        <InputField label="π₂ (control event rate)" name="pi2" value={params.pi2} onChange={set("pi2")} min={0.01} max={0.99} step={0.01} helpText="Expected response rate in control arm" />
        <InputField label="Allocation Ratio" name="allocationRatioPlanned" value={params.allocationRatioPlanned} onChange={set("allocationRatioPlanned")} min={0.1} step={0.1} />
      </div>
      <button onClick={run} disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? "Computing..." : "Calculate Sample Size"}
      </button>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
    </div>
  );
}
