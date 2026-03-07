"use client";

interface ResultTableProps {
  data: Record<string, number | number[] | string>[];
  caption?: string;
}

export function ResultTable({ data, caption }: ResultTableProps) {
  if (!data.length) return null;
  const keys = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        {caption && (
          <caption className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">
            {caption}
          </caption>
        )}
        <thead className="bg-slate-50">
          <tr>
            {keys.map((k) => (
              <th key={k} className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {keys.map((k) => (
                <td key={k} className="px-4 py-2 text-slate-700 font-mono text-xs">
                  {Array.isArray(row[k])
                    ? (row[k] as number[]).map((v) => (typeof v === "number" ? v.toFixed(4) : v)).join(", ")
                    : typeof row[k] === "number"
                    ? (row[k] as number).toFixed(4)
                    : String(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
