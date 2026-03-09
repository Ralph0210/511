"use client";

import { useState, useCallback } from "react";
import StickyScrolly, { type ScrollBeat } from "@/components/StickyScrolly";
import ChartLifespanScrolly from "@/components/ChartLifespanScrolly";
import type { LifespanByYear } from "@/lib/billboard-data";

type Props = {
  lifespanData: LifespanByYear[];
};

export default function LongViewSection({ lifespanData }: Props) {
  const [beat, setBeat] = useState(-1);
  const handleBeatChange = useCallback((i: number) => setBeat(i), []);

  // Compute some stats for narrative text
  const preStreaming = lifespanData.filter((d) => d.debut_year < 2013);
  const postStreaming = lifespanData.filter((d) => d.debut_year >= 2013);
  const preAvg = preStreaming.length
    ? (preStreaming.reduce((s, d) => s + d.avg_lifespan, 0) / preStreaming.length).toFixed(1)
    : "?";
  const postAvg = postStreaming.length
    ? (postStreaming.reduce((s, d) => s + d.avg_lifespan, 0) / postStreaming.length).toFixed(1)
    : "?";
  const firstYear = lifespanData[0]?.debut_year ?? 1958;
  const lastYear = lifespanData[lifespanData.length - 1]?.debut_year ?? 2026;
  const totalYears = lastYear - firstYear;

  const beats: ScrollBeat[] = [
    {
      id: "longview-0",
      text: (
        <p className="leading-relaxed text-muted">
          Before Spotify, before streaming, before even the internet — the{" "}
          <span className="font-semibold text-amber-400">Billboard Hot 100</span>{" "}
          has tracked America&apos;s hits since {firstYear}. How long do songs survive on the chart?
          This {totalYears}-year trendline tells the story.
        </p>
      ),
    },
    {
      id: "longview-1",
      text: (
        <p className="leading-relaxed text-muted">
          From the late 1950s through the 1980s, the chart was driven by radio airplay and record sales.
          Songs typically lasted around {preAvg} weeks. The pattern was remarkably stable — the mechanics
          of radio promotion created a predictable lifecycle for hits.
        </p>
      ),
    },
    {
      id: "longview-2",
      text: (
        <div className="space-y-3 leading-relaxed text-muted">
          <p>
            Then the disruptions began. <strong>SoundScan</strong> (1991) replaced
            estimated sales with real point-of-sale data — the first time the chart reflected
            what people actually bought. <strong>Digital downloads</strong> (2005) changed how
            singles were purchased. And <strong>streaming</strong> (2012) rewrote the rules entirely.
          </p>
          <p>Each shift reshaped how long a song could hold a chart position.</p>
        </div>
      ),
    },
    {
      id: "longview-3",
      text: (
        <div className="space-y-3 leading-relaxed text-muted">
          <p>
            Since streaming took over, the average lifespan shifted to{" "}
            <span className="font-semibold text-amber-400">{postAvg} weeks</span>{" "}
            — {Number(postAvg) > Number(preAvg) ? "longer" : "shorter"} than the pre-streaming
            average of {preAvg} weeks.
          </p>
          <p>
            But the average masks a growing split: some songs vanish in weeks while others
            linger for record-breaking runs. The middle ground is disappearing.
          </p>
        </div>
      ),
    },
    {
      id: "longview-4",
      text: (
        <div className="space-y-3 leading-relaxed text-muted">
          <p>
            The Spotify scatter plot above covers 2017–2021 in fine detail — streams, audio features,
            individual song trajectories. This Billboard trendline spans {totalYears} years.
          </p>
          <p className="font-medium text-zinc-300">
            Together, they frame the central question of this page: is a hit&apos;s lifespan getting
            shorter — or are we just measuring it differently?
          </p>
        </div>
      ),
    },
  ];

  return (
    <StickyScrolly beats={beats} onBeatChange={handleBeatChange}>
      <ChartLifespanScrolly data={lifespanData} beat={beat} />
    </StickyScrolly>
  );
}
