"use client";

import { useState } from "react";
import ChartViralVsSlowBurn from "./ChartViralVsSlowBurn";

type MethodologyStats = { groupLabel: string; avg_weeks: number; median_weeks: number; q1_weeks: number; q3_weeks: number; min_weeks: number; max_weeks: number; song_count: number };

type SampleInfo = {
  songCount: number;
  rowCount: number;
  totalRowsInDb?: number;
  dateRange: { min: string; max: string } | null;
  isFullDataset: boolean;
};

type MethodologyData = {
  optionAStats: MethodologyStats[];
  optionBStats: MethodologyStats[];
  optionCStats: MethodologyStats[];
  sampleInfo: SampleInfo;
} | null;

const OPTIONS = [
  { id: "A" as const, label: "Option A: Debut rank", desc: "Viral = debuted in Top 10. Slow burn = debuted below Top 40. Clean and defensible." },
  { id: "B" as const, label: "Option B: Climb speed", desc: "Viral = reached peak in ≤2 weeks (fast diffusion). Slow burn = took >5 weeks to peak. Directly captures climb speed." },
  { id: "C" as const, label: "Option C: Shape classification", desc: "Viral burst (debut top 10 or peak ≤2 wks), slow burn (debut >40 and peak >5 wks), steady climber (debut 11–40, peak in 3–5 wks). Uses slope, time to peak, and peak height." },
];

export default function Q2MethodologySection({ methodology }: { methodology: MethodologyData }) {
  const [active, setActive] = useState<"A" | "B" | "C">("A");

  if (!methodology) {
    return (
      <div className="rounded-lg border border-amber-800 bg-amber-950 p-4 text-sm text-amber-200">
        Methodology options require <code>chart_entries</code> with <code>rank</code> column. Ensure your data includes rank for each week.
      </div>
    );
  }

  const stats = active === "A" ? methodology.optionAStats : active === "B" ? methodology.optionBStats : methodology.optionCStats;
  const activeOption = OPTIONS.find((o) => o.id === active)!;

  const { sampleInfo } = methodology;
  const dateStr = sampleInfo.dateRange
    ? `${sampleInfo.dateRange.min} → ${sampleInfo.dateRange.max}`
    : "—";
  const totalStr = sampleInfo.totalRowsInDb != null
    ? ` of ${sampleInfo.totalRowsInDb.toLocaleString()} total`
    : "";

  return (
    <div>
      <div className="mb-4 rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3 text-sm">
        <strong>Data source:</strong>{" "}
        {sampleInfo.isFullDataset ? (
          <>Full dataset — {sampleInfo.songCount.toLocaleString()} songs ({sampleInfo.rowCount.toLocaleString()} chart rows)</>
        ) : (
          <>
            Sample — {sampleInfo.songCount.toLocaleString()} songs from {sampleInfo.rowCount.toLocaleString()}{totalStr} rows ({dateStr}).{" "}
            <span className="text-zinc-400">
              <strong>Sampling method:</strong> Temporal prioritization (earliest-chart-first). We cap at 150k rows to balance load time with completeness. 
              This preserves <em>complete song-level runs</em> for all included songs—no truncation mid-run—and ensures representation from chart inception (1958). 
              Run <code className="rounded bg-zinc-700 px-1">002_analytics_views.sql</code> for full-population results.
            </span>
          </>
        )}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActive(opt.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active === opt.id
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-zinc-400">{activeOption.desc}</p>
      {stats.length ? (
        <ChartViralVsSlowBurn stats={stats} />
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-[#181818] p-6 text-center text-sm text-zinc-400">
          No data for this methodology with the current sample.
        </div>
      )}
    </div>
  );
}
