"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type AudioFeatures = {
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  speechiness: number;
  tempo: number;
};

type Props = {
  songFeatures: AudioFeatures;
  eraAverage: AudioFeatures;
  songName: string;
  /**
   * 0 = empty radar grid only
   * 1 = era average polygon appears
   * 2 = song polygon overlays with animation
   * 3 = highlight most distinctive features with callouts
   */
  beat: number;
};

const FEATURE_KEYS: (keyof AudioFeatures)[] = [
  "danceability", "energy", "valence", "acousticness", "speechiness", "tempo",
];

const LABELS: Record<string, string> = {
  danceability: "Danceability",
  energy: "Energy",
  valence: "Valence",
  acousticness: "Acousticness",
  speechiness: "Speechiness",
  tempo: "Tempo",
};

export default function ChartSoundScrolly({ songFeatures, eraAverage, songName, beat }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const size = Math.min(svgRef.current.parentElement!.clientWidth, 420);
    svg.attr("width", size).attr("height", size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.32;
    const levels = 5;
    const angleSlice = (2 * Math.PI) / FEATURE_KEYS.length;

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
    FEATURE_KEYS.forEach((feat, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const xEnd = Math.cos(angle) * radius;
      const yEnd = Math.sin(angle) * radius;

      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", xEnd).attr("y2", yEnd)
        .attr("stroke", "#e5e7eb").attr("stroke-width", 0.5);

      const labelR = radius + 22;
      g.append("text")
        .attr("x", Math.cos(angle) * labelR)
        .attr("y", Math.sin(angle) * labelR)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", 10)
        .attr("fill", "#9ca3af")
        .text(LABELS[feat]);
    });

    if (beat < 1) return; // Beat 0: just the grid

    // Helper: build polygon points
    const getPoints = (features: AudioFeatures) =>
      FEATURE_KEYS.map((feat, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = features[feat] * radius;
        return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
      });

    // Beat 1+: Era average polygon
    const eraPoints = getPoints(eraAverage);
    const eraPolygon = g.append("polygon")
      .attr("points", eraPoints.map((p) => p.join(",")).join(" "))
      .attr("fill", "#9CA3AF")
      .attr("fill-opacity", 0)
      .attr("stroke", "#9CA3AF")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0);

    eraPolygon.transition().duration(600)
      .attr("fill-opacity", 0.08)
      .attr("stroke-opacity", 0.6);

    eraPoints.forEach(([x, y]) => {
      g.append("circle")
        .attr("cx", x).attr("cy", y)
        .attr("r", 0).attr("fill", "#9CA3AF")
        .transition().delay(300).duration(300)
        .attr("r", 2.5);
    });

    if (beat < 2) return; // Beat 1: just era average

    // Beat 2+: Song polygon overlays
    const songPoints = getPoints(songFeatures);
    const songPolygon = g.append("polygon")
      .attr("points", eraPoints.map((p) => p.join(",")).join(" ")) // start from era shape
      .attr("fill", "#2563EB")
      .attr("fill-opacity", 0.12)
      .attr("stroke", "#2563EB")
      .attr("stroke-width", 2);

    songPolygon.transition().duration(800).ease(d3.easeCubicOut)
      .attr("points", songPoints.map((p) => p.join(",")).join(" "));

    songPoints.forEach(([x, y], i) => {
      g.append("circle")
        .attr("cx", eraPoints[i][0]).attr("cy", eraPoints[i][1])
        .attr("r", 0).attr("fill", "#2563EB")
        .transition().delay(400).duration(400).ease(d3.easeCubicOut)
        .attr("cx", x).attr("cy", y)
        .attr("r", 3.5);
    });

    if (beat < 3) return; // Beat 2: both polygons

    // Beat 3: Highlight most distinctive features with callouts
    const deltas = FEATURE_KEYS.map((feat, i) => ({
      feat,
      index: i,
      songVal: songFeatures[feat],
      eraVal: eraAverage[feat],
      delta: Math.abs(songFeatures[feat] - eraAverage[feat]),
    }));
    deltas.sort((a, b) => b.delta - a.delta);
    const topFeatures = deltas.slice(0, 2);

    topFeatures.forEach(({ feat, index, songVal, eraVal }, calloutIdx) => {
      const angle = angleSlice * index - Math.PI / 2;
      const r = songVal * radius;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;

      // Pulsing highlight circle
      g.append("circle")
        .attr("cx", px).attr("cy", py)
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", "#2563EB")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0)
        .transition().delay(calloutIdx * 200).duration(400)
        .attr("r", 12)
        .attr("opacity", 0.5);

      // Callout line + text
      const calloutR = radius + 50;
      const cx2 = Math.cos(angle) * calloutR;
      const cy2 = Math.sin(angle) * calloutR;
      const diff = songVal - eraVal;
      const pctDiff = eraVal > 0 ? Math.round(Math.abs(diff / eraVal) * 100) : 0;
      const direction = diff > 0 ? "above" : "below";

      g.append("line")
        .attr("x1", px).attr("y1", py)
        .attr("x2", px).attr("y2", py)
        .attr("stroke", "#2563EB").attr("stroke-dasharray", "2,2")
        .attr("opacity", 0)
        .transition().delay(200 + calloutIdx * 200).duration(300)
        .attr("x2", cx2).attr("y2", cy2)
        .attr("opacity", 0.6);

      g.append("text")
        .attr("x", cx2).attr("y", cy2 - 6)
        .attr("text-anchor", "middle")
        .attr("font-size", 9).attr("font-weight", 600).attr("fill", "#2563EB")
        .attr("opacity", 0)
        .transition().delay(400 + calloutIdx * 200).duration(300)
        .attr("opacity", 1)
        .text(`${pctDiff}% ${direction} avg`);

      g.append("text")
        .attr("x", cx2).attr("y", cy2 + 6)
        .attr("text-anchor", "middle")
        .attr("font-size", 8).attr("fill", "#6b7280")
        .attr("opacity", 0)
        .transition().delay(500 + calloutIdx * 200).duration(300)
        .attr("opacity", 1)
        .text(LABELS[feat]);
    });
  }, [songFeatures, eraAverage, beat]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex justify-center">
        <svg ref={svgRef} />
      </div>
      {beat >= 2 && (
        <div className="mt-4 flex justify-center gap-6 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-600" />
            {songName}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-zinc-400" />
            Era Average
          </span>
        </div>
      )}
    </div>
  );
}
