"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import ScrollySection from "./ScrollySection";

type AudioFeatures = {
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  speechiness: number;
  tempo: number; // normalized 0-1 for radar
};

type Props = {
  songFeatures: AudioFeatures;
  eraAverage: AudioFeatures;
  songName: string;
};

const FEATURE_LABELS: (keyof AudioFeatures)[] = [
  "danceability",
  "energy",
  "valence",
  "acousticness",
  "speechiness",
  "tempo",
];

const LABELS_DISPLAY: Record<string, string> = {
  danceability: "Danceability",
  energy: "Energy",
  valence: "Valence",
  acousticness: "Acousticness",
  speechiness: "Speechiness",
  tempo: "Tempo",
};

export default function ChartRadarFeatures({ songFeatures, eraAverage, songName }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const size = Math.min(svgRef.current.parentElement!.clientWidth, 400);
    const height = size;
    svg.attr("width", size).attr("height", height);

    const cx = size / 2;
    const cy = height / 2;
    const radius = size * 0.35;
    const levels = 5;
    const angleSlice = (2 * Math.PI) / FEATURE_LABELS.length;

    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    // Grid circles
    for (let i = 1; i <= levels; i++) {
      const r = (radius / levels) * i;
      g.append("circle")
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-dasharray", i < levels ? "2,3" : "none")
        .attr("stroke-width", i === levels ? 1 : 0.5);
    }

    // Axis lines + labels
    FEATURE_LABELS.forEach((feat, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", x).attr("y2", y)
        .attr("stroke", "#e5e7eb").attr("stroke-width", 0.5);

      const labelR = radius + 20;
      g.append("text")
        .attr("x", Math.cos(angle) * labelR)
        .attr("y", Math.sin(angle) * labelR)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", 10)
        .attr("fill", "#6b7280")
        .text(LABELS_DISPLAY[feat]);
    });

    // Draw polygon for a dataset
    const drawPolygon = (
      features: AudioFeatures,
      color: string,
      fillOpacity: number,
      strokeWidth: number
    ) => {
      const points = FEATURE_LABELS.map((feat, i) => {
        const val = features[feat];
        const angle = angleSlice * i - Math.PI / 2;
        const r = val * radius;
        return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
      });

      // Area
      g.append("polygon")
        .attr("points", points.map((p) => p.join(",")).join(" "))
        .attr("fill", color)
        .attr("fill-opacity", fillOpacity)
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth);

      // Dots
      points.forEach(([x, y]) => {
        g.append("circle")
          .attr("cx", x).attr("cy", y)
          .attr("r", 3)
          .attr("fill", color);
      });
    };

    // Era average (gray, background)
    drawPolygon(eraAverage, "#9CA3AF", 0.1, 1);
    // Song (accent, foreground)
    drawPolygon(songFeatures, "#2563EB", 0.15, 2);
  }, [songFeatures, eraAverage]);

  return (
    <ScrollySection>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex justify-center">
          <svg ref={svgRef} />
        </div>
        <div className="mt-4 flex justify-center gap-6 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-accent" />
            {songName}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-zinc-400" />
            Era Average
          </span>
        </div>
      </div>
    </ScrollySection>
  );
}
