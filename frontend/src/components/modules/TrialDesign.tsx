"use client";
import { useState } from "react";
import { InputField, SelectField } from "@/components/ui/InputField";
import { ResultTable } from "@/components/ui/ResultTable";
import { ResultChart } from "@/components/ui/ResultChart";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { api } from "@/lib/api";
import { ApiResponse, DesignResult } from "@/types/rpact";

const DESIGN_TYPES = [
  { value: "OF", label: "O'Brien-Fleming" },
  { value: "P", label: "Pocock" },
  { value: "WT", label: "Wang-Tsiatis" },
  { value: "asP", label: "Alpha Spending (Pocock)" },
];

export function TrialDesign() {
  const [params, setParams] = useState({ kMax: 3, alpha: 0.025, beta: 0.2, typeOfDesign: "OF", sided: 1 });
  const [result, setResult] = useState<ApiResponse<DesignResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (v: string) => setParams((p) => ({ ...p, [k]: isNaN(Number(v)) ? v : Number(v) }));

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.design(params as Record<string, unknown>) as ApiResponse<DesignResult>;
      if (!res.success) throw new Error(res.error);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const tableData = result?.result
    ? (result.result.criticalValues ?? []).map((cv, i) => ({
        Stage: i + 1,
        "Information Rate": result.result!.informationRates?.[i] ?? "-",
        "Critical Value": cv,
        "Stage Level": result.result!.stageLevels?.[i] ?? "-",
      }))
    : [];

  const chartData = result?.result
    ? (result.result.criticalValues ?? []).map((cv, i) => ({ stage: i + 1, value: cv }))
    : [];

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Inputs */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-slate-800">Group Sequential Design</h2>
        <InputField label="Stages (kMax)" name="kMax" value={params.kMax} onChange={set("kMax")} min={1} max={5} step={1} helpText="Number of planned interim analyses" />
        <InputField label="Alpha (one-sided)" name="alpha" value={params.alpha} onChange={set("alpha")} min={0.001} max={0.1} step={0.001} />
        <InputField label="Beta (1 - power)" name="beta" value={params.beta} onChange={set("beta")} min={0.01} max={0.5} step={0.01} />
        <SelectField label="Design Type" name="typeOfDesign" value={params.typeOfDesign} onChange={set("typeOfDesign")} options={DESIGN_TYPES} />
        <SelectField label="Sided" name="sided" value={String(params.sided)} onChange={set("sided")} options={[{ value: "1", label: "One-sided" }, { value: "2", label: "Two-sided" }]} />
        <button onClick={run} disabled={loading} className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? "Computing..." : "Run Design"}
        </button>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
      </div>

      {/* Results */}
      {result?.result && (
        <div className="flex flex-col gap-4">
          <ResultTable data={tableData} caption="Design Boundaries" />
          <ResultChart data={chartData} yLabel="Critical Value" title="Critical Values by Stage" />
          {result.rCode && <CodeBlock code={result.rCode} />}
        </div>
      )}
    </div>
  );
}
