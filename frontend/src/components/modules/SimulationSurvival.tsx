"use client";
import { useState } from "react";
import { InputField, SelectField } from "@/components/ui/InputField";
import { ResultTable } from "@/components/ui/ResultTable";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { api } from "@/lib/api";
import { ApiResponse } from "@/types/rpact";

const DESIGN_TYPES = [
  { value: "OF", label: "O'Brien-Fleming" },
  { value: "P", label: "Pocock" },
  { value: "WT", label: "Wang-Tsiatis" },
  { value: "asP", label: "Alpha Spending (Pocock)" },
];

interface SurvivalSimResult {
  overallReject: number;
  expectedNumberOfSubjects: number;
  expectedNumberOfEvents: number;
  iterations: number;
}

export function SimulationSurvival() {
  const [params, setParams] = useState({
    kMax: 3, alpha: 0.025, beta: 0.2, typeOfDesign: "OF", sided: 1,
    lambda1: 0.05, lambda2: 0.08, accrualTime: 12, followUpTime: 6, maxNumberOfIterations: 1000,
  });
  const [result, setResult] = useState<ApiResponse<SurvivalSimResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (v: string) => setParams((p) => ({ ...p, [k]: isNaN(Number(v)) ? v : Number(v) }));

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.simulationSurvival(params as Record<string, unknown>) as ApiResponse<SurvivalSimResult>;
      if (!res.success) throw new Error(res.error);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setLoading(false); }
  };

  const tableData = result?.result
    ? [{ "Overall Reject": result.result.overallReject, "Exp. Subjects": result.result.expectedNumberOfSubjects, "Exp. Events": result.result.expectedNumberOfEvents, "Iterations": result.result.iterations }]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-800">Simulation — Survival Endpoint</h2>
      <p className="text-xs text-slate-500">Monte Carlo simulation · Time-to-event</p>

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
        <p className="text-xs font-semibold text-slate-600">Survival Parameters</p>
        <InputField label="λ₁ (treatment hazard rate)" name="lambda1" value={params.lambda1} onChange={set("lambda1")} min={0.001} step={0.001} helpText="Monthly hazard rate in treatment arm" />
        <InputField label="λ₂ (control hazard rate)" name="lambda2" value={params.lambda2} onChange={set("lambda2")} min={0.001} step={0.001} helpText="Monthly hazard rate in control arm" />
        <InputField label="Accrual Time (months)" name="accrualTime" value={params.accrualTime} onChange={set("accrualTime")} min={0.1} step={1} />
        <InputField label="Follow-up Time (months)" name="followUpTime" value={params.followUpTime} onChange={set("followUpTime")} min={0.1} step={1} />
        <InputField label="Iterations" name="maxNumberOfIterations" value={params.maxNumberOfIterations} onChange={set("maxNumberOfIterations")} min={100} max={10000} step={100} />
      </div>

      <button onClick={run} disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? "Simulating..." : "Run Simulation"}
      </button>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}

      {result?.result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-xs text-green-600 font-medium">Simulated Power</p>
            <p className="text-2xl font-bold text-green-800">{(result.result.overallReject * 100).toFixed(1)}%</p>
          </div>
          <ResultTable data={tableData} caption="Simulation Summary" />
          {result.rCode && <CodeBlock code={result.rCode} />}
        </div>
      )}
    </div>
  );
}
