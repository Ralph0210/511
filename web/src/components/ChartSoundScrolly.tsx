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
   * -1 = empty radar grid (before scroll)
   *  0 = empty radar grid
   *  1 = era average polygon
   *  2 = song polygon overlays
   *  3 = highlight distinctive features
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
  const drawnRef = useRef(false);
  const prevBeatRef = useRef(-2);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isFirstDraw = !drawnRef.current;
    const prevBeat = prevBeatRef.current;
    prevBeatRef.current = beat;

    if (isFirstDraw) {
      drawnRef.current = true;
      svg.selectAll("*").remove();

      const size = Math.min(svgRef.current.parentElement!.clientWidth, 540);
      svg.attr("width", size).attr("height", size);

      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.3;
      const levels = 5;
      const angleSlice = (2 * Math.PI) / FEATURE_KEYS.length;

      const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

      // Grid circles
      for (let i = 1; i <= levels; i++) {
        const r = (radius / levels) * i;
        g.append("circle")
          .attr("r", r).attr("fill", "none")
          .attr("stroke", "#3f3f46")
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
          .attr("stroke", "#3f3f46").attr("stroke-width", 0.5);

        const labelR = radius + 24;
        g.append("text")
          .attr("x", Math.cos(angle) * labelR)
          .attr("y", Math.sin(angle) * labelR)
          .attr("text-anchor", "middle").attr("dy", "0.35em")
          .attr("font-size", 14).attr("fill", "#71717a")
          .text(LABELS[feat]);
      });

      const getPoints = (features: AudioFeatures) =>
        FEATURE_KEYS.map((feat, i) => {
          const angle = angleSlice * i - Math.PI / 2;
          const r = features[feat] * radius;
          return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
        });

      // Era average polygon
      const eraPoints = getPoints(eraAverage);
      g.append("polygon")
        .attr("class", "sound-era-poly")
        .attr("points", eraPoints.map((p) => p.join(",")).join(" "))
        .attr("fill", "#9CA3AF").attr("fill-opacity", 0)
        .attr("stroke", "#9CA3AF").attr("stroke-width", 1).attr("stroke-opacity", 0);

      eraPoints.forEach(([px, py]) => {
        g.append("circle")
          .attr("class", "sound-era-dot")
          .attr("cx", px).attr("cy", py)
          .attr("r", 2.5).attr("fill", "#9CA3AF").attr("opacity", 0);
      });

      // Song polygon
      const songPoints = getPoints(songFeatures);
      g.append("polygon")
        .attr("class", "sound-song-poly")
        .attr("points", songPoints.map((p) => p.join(",")).join(" "))
        .attr("fill", "#1DB954").attr("fill-opacity", 0)
        .attr("stroke", "#1DB954").attr("stroke-width", 2).attr("stroke-opacity", 0);

      songPoints.forEach(([px, py]) => {
        g.append("circle")
          .attr("class", "sound-song-dot")
          .attr("cx", px).attr("cy", py)
          .attr("r", 3.5).attr("fill", "#1DB954").attr("opacity", 0);
      });

      // Callouts
      const deltas = FEATURE_KEYS.map((feat, i) => ({
        feat, index: i,
        songVal: songFeatures[feat],
        eraVal: eraAverage[feat],
        delta: Math.abs(songFeatures[feat] - eraAverage[feat]),
      }));
      deltas.sort((a, b) => b.delta - a.delta);

      deltas.slice(0, 2).forEach(({ feat, index, songVal, eraVal }, ci) => {
        const angle = angleSlice * index - Math.PI / 2;
        const r = songVal * radius;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;

        g.append("circle")
          .attr("class", "sound-callout")
          .attr("cx", px).attr("cy", py)
          .attr("r", 12).attr("fill", "none")
          .attr("stroke", "#1DB954").attr("stroke-width", 1.5)
          .attr("opacity", 0).attr("data-ci", ci);

        const calloutR = radius + 44;
        let cx2 = Math.cos(angle) * calloutR;
        let cy2 = Math.sin(angle) * calloutR;
        // Clamp callouts to stay within SVG bounds
        const halfSize = size / 2;
        const pad = 50;
        cx2 = Math.max(-halfSize + pad, Math.min(halfSize - pad, cx2));
        cy2 = Math.max(-halfSize + pad, Math.min(halfSize - pad, cy2));

        const diff = songVal - eraVal;
        const pctDiff = eraVal > 0 ? Math.round(Math.abs(diff / eraVal) * 100) : 0;
        const direction = diff > 0 ? "above" : "below";

        g.append("line")
          .attr("class", "sound-callout")
          .attr("x1", px).attr("y1", py).attr("x2", cx2).attr("y2", cy2)
          .attr("stroke", "#1DB954").attr("stroke-dasharray", "2,2")
          .attr("opacity", 0).attr("data-ci", ci);

        g.append("text")
          .attr("class", "sound-callout")
          .attr("x", cx2).attr("y", cy2 - 7)
          .attr("text-anchor", "middle").attr("font-size", 14).attr("font-weight", 600).attr("fill", "#1DB954")
          .attr("opacity", 0).attr("data-ci", ci)
          .text(`${pctDiff}% ${direction} avg`);

        g.append("text")
          .attr("class", "sound-callout")
          .attr("x", cx2).attr("y", cy2 + 8)
          .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#6b7280")
          .attr("opacity", 0).attr("data-ci", ci)
          .text(LABELS[feat]);
      });
    }

    // --- Update visibility ---
    const g = svg.select("g");
    const shouldAnimate = beat > prevBeat;

    // Era average
    if (beat >= 1) {
      if (shouldAnimate && prevBeat < 1) {
        g.select(".sound-era-poly").transition().duration(600)
          .attr("fill-opacity", 0.08).attr("stroke-opacity", 0.6);
        g.selectAll(".sound-era-dot").transition().delay(300).duration(300).attr("opacity", 1);
      } else {
        g.select(".sound-era-poly").attr("fill-opacity", 0.08).attr("stroke-opacity", 0.6);
        g.selectAll(".sound-era-dot").attr("opacity", 1);
      }
    } else {
      g.select(".sound-era-poly").attr("fill-opacity", 0).attr("stroke-opacity", 0);
      g.selectAll(".sound-era-dot").attr("opacity", 0);
    }

    // Song polygon
    if (beat >= 2) {
      if (shouldAnimate && prevBeat < 2) {
        g.select(".sound-song-poly").transition().duration(800)
          .attr("fill-opacity", 0.12).attr("stroke-opacity", 1);
        g.selectAll(".sound-song-dot").transition().delay(400).duration(400).attr("opacity", 1);
      } else {
        g.select(".sound-song-poly").attr("fill-opacity", 0.12).attr("stroke-opacity", 1);
        g.selectAll(".sound-song-dot").attr("opacity", 1);
      }
    } else {
      g.select(".sound-song-poly").attr("fill-opacity", 0).attr("stroke-opacity", 0);
      g.selectAll(".sound-song-dot").attr("opacity", 0);
    }

    // Callouts
    if (beat >= 3) {
      const callouts = g.selectAll(".sound-callout");
      if (shouldAnimate && prevBeat < 3) {
        // Stagger callouts by ci index for dramatic reveal
        callouts.each(function () {
          const el = d3.select(this);
          const ci = parseInt(el.attr("data-ci") || "0");
          el.attr("opacity", 0)
            .transition().duration(500).delay(ci * 300)
            .attr("opacity", 0.85);
        });
        // Pulse the callout circles
        g.selectAll<SVGCircleElement, unknown>(".sound-callout")
          .filter(function () { return this.tagName === "circle"; })
          .each(function () {
            const el = d3.select(this);
            const ci = parseInt(el.attr("data-ci") || "0");
            el.attr("r", 12)
              .transition().delay(ci * 300).duration(400)
              .attr("r", 16)
              .transition().duration(300)
              .attr("r", 12);
          });
      } else {
        callouts.attr("opacity", 0.85);
      }
    } else {
      g.selectAll(".sound-callout").attr("opacity", 0);
    }
  }, [songFeatures, eraAverage, beat]);

  useEffect(() => {
    drawnRef.current = false;
    prevBeatRef.current = -2;
  }, [songFeatures, eraAverage]);

  return (
    <div>
      <div className="flex justify-center">
        <svg ref={svgRef} role="img" aria-label={`Radar chart comparing ${songName} audio features against era average`} />
      </div>
    </div>
  );
}
