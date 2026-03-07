"use client";
import { useState } from "react";
import { Header } from "@/components/Header";
import { TabNav, TabId } from "@/components/TabNav";
import { SplitPanel } from "@/components/SplitPanel";
import { TrialDesign } from "@/components/modules/TrialDesign";
import { SampleSizeMeans } from "@/components/modules/SampleSizeMeans";
import { SampleSizeRates } from "@/components/modules/SampleSizeRates";
import { SampleSizeSurvival } from "@/components/modules/SampleSizeSurvival";
import { SimulationMeans } from "@/components/modules/SimulationMeans";
import { SimulationRates } from "@/components/modules/SimulationRates";
import { SimulationSurvival } from "@/components/modules/SimulationSurvival";
import { ResultTable } from "@/components/ui/ResultTable";
import { ResultChart } from "@/components/ui/ResultChart";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { ApiResponse } from "@/types/rpact";

function ResultPanel({ result }: { result: ApiResponse<unknown> | null }) {
  if (!result?.result) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Run a calculation to see results here.
      </div>
    );
  }

  const r = result.result as Record<string, unknown>;

  // Build table rows from all numeric array fields
  const arrayFields = Object.entries(r).filter(([, v]) => Array.isArray(v));
  const rowCount = arrayFields.length > 0 ? (arrayFields[0][1] as unknown[]).length : 0;

  const tableData = Array.from({ length: rowCount }, (_, i) => {
    const row: Record<string, unknown> = { Stage: i + 1 };
    for (const [key, val] of arrayFields) {
      const arr = val as number[];
      row[key] = typeof arr[i] === "number" ? Math.round(arr[i] * 10000) / 10000 : arr[i];
    }
    return row;
  });

  // Scalar highlights
  const scalars = Object.entries(r).filter(([, v]) => typeof v === "number");

  // Chart: use first meaningful array (numberOfSubjects, overallReject, criticalValues)
  const chartKey = ["numberOfSubjects", "criticalValues", "overallReject"].find(k => Array.isArray(r[k]));
  const chartData = chartKey
    ? (r[chartKey] as number[]).map((v, i) => ({ stage: i + 1, value: v }))
    : [];
  const chartLabel = chartKey === "numberOfSubjects" ? "Subjects"
    : chartKey === "criticalValues" ? "Critical Value"
    : chartKey === "overallReject" ? "Rejection Rate" : "Value";

  return (
    <div className="flex flex-col gap-5 min-w-0 w-full">
      {scalars.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {scalars.slice(0, 4).map(([key, val]) => (
            <div key={key} className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs text-green-600 font-medium">{key}</p>
              <p className="text-xl font-bold text-green-800">
                {typeof val === "number" ? (Math.abs(val) < 1 ? val.toFixed(4) : Math.round(val as number)) : String(val)}
              </p>
            </div>
          ))}
        </div>
      )}
      {tableData.length > 0 && <ResultTable data={tableData as Record<string, string | number | number[]>[]} caption="Results by Stage" />}
      {chartData.length > 0 && <ResultChart data={chartData} yLabel={chartLabel} title={`${chartLabel} by Stage`} />}
      {result.rCode && <CodeBlock code={result.rCode} />}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<TabId>("ss-means");
  const [result, setResult] = useState<ApiResponse<unknown> | null>(null);

  const handleTabChange = (t: TabId) => { setTab(t); setResult(null); };
  const onResult = (r: ApiResponse<unknown>) => setResult(r);

  const leftPanel: Record<TabId, React.ReactNode> = {
    "design": <TrialDesign onResult={onResult} />,
    "ss-means": <SampleSizeMeans onResult={onResult} />,
    "ss-rates": <SampleSizeRates onResult={onResult} />,
    "ss-survival": <SampleSizeSurvival onResult={onResult} />,
    "sim-means": <SimulationMeans onResult={onResult} />,
    "sim-rates": <SimulationRates onResult={onResult} />,
    "sim-survival": <SimulationSurvival onResult={onResult} />,
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <TabNav active={tab} onChange={handleTabChange} />
      <div className="flex-1 overflow-hidden">
        <SplitPanel
          left={leftPanel[tab]}
          right={<ResultPanel result={result} />}
        />
      </div>
    </div>
  );
}
