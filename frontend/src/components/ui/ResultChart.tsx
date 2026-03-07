"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ResultChartProps {
  data: { stage: number; value: number; label?: string }[];
  yLabel?: string;
  title?: string;
}

export function ResultChart({ data, yLabel = "Value", title }: ResultChartProps) {
  if (!data.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {title && <p className="mb-3 text-sm font-semibold text-slate-700">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="stage" label={{ value: "Stage", position: "insideBottom", offset: -2 }} tick={{ fontSize: 11 }} />
          <YAxis label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10 }} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => v.toFixed(4)} />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name={yLabel} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
