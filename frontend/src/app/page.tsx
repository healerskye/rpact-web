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

const MODULE_LEFT: Record<TabId, React.ReactNode> = {
  "design": <TrialDesign />,
  "ss-means": <SampleSizeMeans />,
  "ss-rates": <SampleSizeRates />,
  "ss-survival": <SampleSizeSurvival />,
  "sim-means": <SimulationMeans />,
  "sim-rates": <SimulationRates />,
  "sim-survival": <SimulationSurvival />,
};

export default function Home() {
  const [tab, setTab] = useState<TabId>("ss-means");

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <TabNav active={tab} onChange={setTab} />
      <div className="flex-1 overflow-hidden">
        <SplitPanel
          left={MODULE_LEFT[tab]}
          right={
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Run a calculation to see results here.
            </div>
          }
        />
      </div>
    </div>
  );
}
