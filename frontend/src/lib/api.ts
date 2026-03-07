const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function post<T>(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  design: (body: Record<string, unknown>) => post("/design", body),
  sampleSizeMeans: (body: Record<string, unknown>) => post("/sample-size/means", body),
  sampleSizeRates: (body: Record<string, unknown>) => post("/sample-size/rates", body),
  sampleSizeSurvival: (body: Record<string, unknown>) => post("/sample-size/survival", body),
  powerMeans: (body: Record<string, unknown>) => post("/power/means", body),
  powerRates: (body: Record<string, unknown>) => post("/power/rates", body),
  powerSurvival: (body: Record<string, unknown>) => post("/power/survival", body),
  simulationMeans: (body: Record<string, unknown>) => post("/simulation/means", body),
  simulationRates: (body: Record<string, unknown>) => post("/simulation/rates", body),
  simulationSurvival: (body: Record<string, unknown>) => post("/simulation/survival", body),
};
