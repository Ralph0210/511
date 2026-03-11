"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { WeeklyAttributes } from "@/lib/spotify-data";

type Props = {
  data: WeeklyAttributes[];
};

type AttributeKey =
  | "avg_duration"
  | "avg_danceability"
  | "avg_energy"
  | "avg_valence"
  | "avg_tempo"
  | "avg_acousticness"
  | "avg_speechiness"
  | "avg_loudness";

const ATTRIBUTES: { key: AttributeKey; label: string; unit: string; desc: string; format: (v: number) => string }[] = [
  { key: "avg_duration", label: "Duration", unit: "", desc: "Average song length. Shorter songs tend to perform better in the streaming era.", format: (v) => { const m = Math.floor(v / 60000); const s = Math.floor((v % 60000) / 1000); return `${m}:${s.toString().padStart(2, "0")}`; } },
  { key: "avg_danceability", label: "Danceability", unit: "", desc: "How suitable a track is for dancing (0–1), based on tempo, rhythm stability, and beat strength.", format: (v) => v.toFixed(3) },
  { key: "avg_energy", label: "Energy", unit: "", desc: "Perceptual intensity and activity (0–1). Energetic tracks feel fast, loud, and noisy.", format: (v) => v.toFixed(3) },
  { key: "avg_valence", label: "Valence", unit: "", desc: "Musical positivity (0–1). High valence = happy/cheerful; low valence = sad/angry.", format: (v) => v.toFixed(3) },
  { key: "avg_tempo", label: "Tempo", unit: "BPM", desc: "Estimated tempo in beats per minute. Most pop hits fall between 100–130 BPM.", format: (v) => v.toFixed(1) },
  { key: "avg_acousticness", label: "Acousticness", unit: "", desc: "Confidence that the track is acoustic (0–1). Higher = more acoustic instruments, less electronic production.", format: (v) => v.toFixed(3) },
  { key: "avg_speechiness", label: "Speechiness", unit: "", desc: "Presence of spoken words (0–1). Above 0.33 likely spoken word; below 0.33 is mostly music.", format: (v) => v.toFixed(3) },
  { key: "avg_loudness", label: "Loudness", unit: "dB", desc: "Overall loudness in decibels (dB). Typical range: −60 to 0 dB. Louder tracks are often mastered more aggressively.", format: (v) => v.toFixed(1) },
];

const ATTR_COLORS: Record<string, string> = {
  avg_duration: "#1DB954",
  avg_danceability: "#8B5CF6",
  avg_energy: "#EF4444",
  avg_valence: "#F59E0B",
  avg_tempo: "#10B981",
  avg_acousticness: "#6366F1",
  avg_speechiness: "#EC4899",
  avg_loudness: "#D97706",
};

type TimeGranularity = "week" | "month" | "year";

const WIDTH = 800;
const HEIGHT = 400;
const MARGIN = { top: 28, right: 140, bottom: 56, left: 64 };

function styleAxis(sel: d3.Selection<SVGGElement, unknown, null, undefined>) {
  sel.select(".domain").attr("stroke", "#3f3f46");
  sel.selectAll(".tick line").attr("stroke", "#3f3f46");
  sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12);
}

export default function ChartSongAnatomyExplorer({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<Set<AttributeKey>>(
    new Set<AttributeKey>(["avg_duration", "avg_danceability", "avg_energy"])
  );
  const [granularity, setGranularity] = useState<TimeGranularity>("month");
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);

  // Detect reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Aggregate by granularity
  const aggregated = useMemo(() => {
    if (granularity === "week") return data;

    const buckets: Record<string, WeeklyAttributes[]> = {};
    for (const row of data) {
      let key: string;
      if (granularity === "month") {
        key = row.week.slice(0, 7);
      } else {
        key = row.week.slice(0, 4);
      }
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(row);
    }

    return Object.entries(buckets)
      .map(([key, rows]) => {
        const avg = (fn: (r: WeeklyAttributes) => number | null) => {
          const vals = rows.map(fn).filter((v): v is number => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        };
        return {
          week: granularity === "month" ? `${key}-01` : `${key}-01-01`,
          song_count: Math.round(rows.reduce((a, r) => a + r.song_count, 0) / rows.length),
          avg_duration: avg((r) => r.avg_duration),
          avg_danceability: avg((r) => r.avg_danceability),
          avg_energy: avg((r) => r.avg_energy),
          avg_valence: avg((r) => r.avg_valence),
          avg_tempo: avg((r) => r.avg_tempo),
          avg_acousticness: avg((r) => r.avg_acousticness),
          avg_speechiness: avg((r) => r.avg_speechiness),
          avg_loudness: avg((r) => r.avg_loudness),
          avg_duration_top10: avg((r) => r.avg_duration_top10),
          avg_duration_top50: avg((r) => r.avg_duration_top50),
        } as WeeklyAttributes;
      })
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [data, granularity]);

  // Compute baselines (average of first 4 data points for stability)
  const baselines = useMemo(() => {
    const map: Record<string, number> = {};
    for (const attr of ATTRIBUTES) {
      const firstN = aggregated.slice(0, 4);
      const vals = firstN
        .map((d) => d[attr.key] as number | null)
        .filter((v): v is number => v != null);
      map[attr.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 1;
    }
    return map;
  }, [aggregated]);

  // Draw chart
  useEffect(() => {
    if (!svgRef.current || !aggregated.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // viewBox-based responsive sizing (§2.1)
    svg.attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");

    const w = WIDTH - MARGIN.left - MARGIN.right;
    const h = HEIGHT - MARGIN.top - MARGIN.bottom;
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // clipPath (§2.6)
    svg.append("defs").append("clipPath").attr("id", "anatomy-clip")
      .append("rect").attr("x", -4).attr("y", -4).attr("width", w + 8).attr("height", h + 8);

    const dataGroup = g.append("g").attr("clip-path", "url(#anatomy-clip)");

    const parseDate = d3.timeParse("%Y-%m-%d");
    const dates = aggregated.map((d) => parseDate(d.week)!).filter(Boolean);
    const attrs = Array.from(selectedAttrs);

    // Shared x scale
    const x = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]).range([0, w]).clamp(true);

    // Compute % change data for all selected attributes
    const pctData: { attrKey: AttributeKey; points: { date: Date; pct: number; raw: number; week: string; songCount: number }[] }[] = [];
    let yMinAll = 0;
    let yMaxAll = 0;

    for (const attrKey of attrs) {
      const baseline = baselines[attrKey];
      if (!baseline) continue;
      const points: { date: Date; pct: number; raw: number; week: string; songCount: number }[] = [];
      for (const d of aggregated) {
        const raw = d[attrKey] as number | null;
        if (raw == null) continue;
        const date = parseDate(d.week);
        if (!date) continue;
        const pct = ((Number(raw) - baseline) / Math.abs(baseline)) * 100;
        points.push({ date, pct, raw: Number(raw), week: d.week, songCount: d.song_count });
        if (pct < yMinAll) yMinAll = pct;
        if (pct > yMaxAll) yMaxAll = pct;
      }
      pctData.push({ attrKey, points });
    }

    // Symmetric y domain around 0 for honest representation
    const yExtent = Math.max(Math.abs(yMinAll), Math.abs(yMaxAll), 5) * 1.1;
    const y = d3.scaleLinear().domain([-yExtent, yExtent]).range([h, 0]).nice().clamp(true);

    // Grid lines (§3.5)
    const yTickValues = y.ticks(5);
    g.append("g")
      .selectAll("line")
      .data(yTickValues)
      .join("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#27272a").attr("stroke-dasharray", "2,2");

    // Zero baseline — prominent reference line
    g.append("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", y(0)).attr("y2", y(0))
      .attr("stroke", "#52525b").attr("stroke-width", 1.5);

    // X axis (§2.4)
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0).tickPadding(8))
      .call(styleAxis);

    // Y axis — % change (§2.4)
    g.append("g")
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSizeOuter(0)
          .tickPadding(8)
          .tickFormat((d) => `${(d as number) > 0 ? "+" : ""}${Math.round(d as number)}%`)
      )
      .call(styleAxis);

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -48)
      .attr("text-anchor", "middle")
      .attr("font-size", 13).attr("fill", "#71717a")
      .text("Change from baseline");

    const tooltip = d3.select(tooltipRef.current);
    const animDuration = prefersReducedMotion ? 0 : 100;

    // Collect end label positions for collision avoidance
    const endLabels: { attrKey: AttributeKey; color: string; pct: number; label: string; yPos: number }[] = [];
    for (const { attrKey, points } of pctData) {
      const lastPoint = points[points.length - 1];
      if (lastPoint) {
        const attrInfo = ATTRIBUTES.find((a) => a.key === attrKey)!;
        const sign = lastPoint.pct >= 0 ? "+" : "";
        endLabels.push({
          attrKey,
          color: ATTR_COLORS[attrKey],
          pct: lastPoint.pct,
          label: `${attrInfo.label} ${sign}${lastPoint.pct.toFixed(1)}%`,
          yPos: y(lastPoint.pct),
        });
      }
    }

    // Sort by y position and nudge overlapping labels apart (min 16px gap)
    endLabels.sort((a, b) => a.yPos - b.yPos);
    const MIN_GAP = 16;
    for (let i = 1; i < endLabels.length; i++) {
      const gap = endLabels[i].yPos - endLabels[i - 1].yPos;
      if (gap < MIN_GAP) {
        endLabels[i].yPos = endLabels[i - 1].yPos + MIN_GAP;
      }
    }

    // Draw each attribute line + end labels
    for (const { attrKey, points } of pctData) {
      const color = ATTR_COLORS[attrKey];

      // Line
      const line = d3.line<(typeof points)[0]>()
        .x((d) => x(d.date))
        .y((d) => y(d.pct))
        .curve(d3.curveMonotoneX);

      dataGroup.append("path")
        .datum(points)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.85);
    }

    // Render end labels (after all lines so they sit on top)
    for (const el of endLabels) {
      g.append("text")
        .attr("x", w + 6)
        .attr("y", el.yPos)
        .attr("dy", "0.35em")
        .attr("font-size", 12).attr("font-weight", 600).attr("fill", el.color)
        .text(el.label);
    }

    // Draw hover elements per line
    for (const { attrKey, points } of pctData) {
      const attrInfo = ATTRIBUTES.find((a) => a.key === attrKey)!;
      const color = ATTR_COLORS[attrKey];

      // Hover dots
      const dots = dataGroup
        .selectAll(`circle.dot-${attrKey}`)
        .data(points)
        .join("circle")
        .attr("class", `dot-${attrKey}`)
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.pct))
        .attr("r", 0)
        .attr("fill", color);

      // Invisible hover rects
      g.selectAll(`rect.hover-${attrKey}`)
        .data(points)
        .join("rect")
        .attr("class", `hover-${attrKey}`)
        .attr("x", (d) => x(d.date) - 8)
        .attr("y", 0)
        .attr("width", 16)
        .attr("height", h)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mouseenter", (event, d) => {
          dots.filter((dd) => dd === d)
            .transition().duration(animDuration)
            .attr("r", 5);
          const sign = d.pct >= 0 ? "+" : "";
          const baselineVal = baselines[attrKey];
          tooltip
            .style("opacity", "1")
            .style("left", `${event.offsetX + 12}px`)
            .style("top", `${event.offsetY - 10}px`)
            .html(
              `<strong style="color:${color}">${attrInfo.label}</strong><br/>` +
              `<span style="color:#9CA3AF">${d.week}</span><br/>` +
              `${attrInfo.format(d.raw)}${attrInfo.unit ? ` ${attrInfo.unit}` : ""} ` +
              `<span style="color:${d.pct >= 0 ? "#4ade80" : "#f87171"}">(${sign}${d.pct.toFixed(1)}%)</span><br/>` +
              `<span style="color:#6b7280">Baseline: ${attrInfo.format(baselineVal)} · ${d.songCount} songs</span>`
            );
        })
        .on("mouseleave", () => {
          dots.transition().duration(animDuration).attr("r", 0);
          tooltip.style("opacity", "0");
        });
    }
  }, [aggregated, selectedAttrs, baselines, prefersReducedMotion]);

  const toggleAttr = (key: AttributeKey) => {
    setSelectedAttrs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Attribute selector */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Attributes</p>
        <div className="flex flex-wrap gap-2">
          {ATTRIBUTES.map((attr) => (
            <span key={attr.key} className="relative inline-flex items-center">
              <button
                onClick={() => toggleAttr(attr.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedAttrs.has(attr.key)
                    ? "text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
                style={selectedAttrs.has(attr.key) ? { backgroundColor: ATTR_COLORS[attr.key] } : undefined}
              >
                {attr.label}
              </button>
              <button
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-zinc-600 transition-colors hover:text-zinc-300"
                onMouseEnter={() => setHoveredInfo(attr.key)}
                onMouseLeave={() => setHoveredInfo(null)}
                onClick={(e) => { e.stopPropagation(); setHoveredInfo(hoveredInfo === attr.key ? null : attr.key); }}
                aria-label={`Info about ${attr.label}`}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm.75-10.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.25 8a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V8z" clipRule="evenodd" />
                </svg>
              </button>
              {hoveredInfo === attr.key && (
                <div className="absolute left-0 top-full z-20 mt-1.5 w-56 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs leading-relaxed text-zinc-300 shadow-lg">
                  {attr.desc}
                </div>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Granularity selector */}
      <div className="flex items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Granularity</p>
        {(["week", "month", "year"] as TimeGranularity[]).map((g) => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              granularity === g
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative rounded-2xl border border-zinc-800 bg-surface p-4">
        <svg
          ref={svgRef}
          className="w-full"
          role="img"
          aria-label="Audio attribute trends shown as percent change from baseline over time"
        />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute rounded-lg border border-zinc-800 bg-surface-hover px-3 py-2 text-xs shadow-lg opacity-0 transition-opacity"
          style={{ maxWidth: 260 }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {Array.from(selectedAttrs).map((key) => {
          const attr = ATTRIBUTES.find((a) => a.key === key)!;
          return (
            <span key={key} className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded-full" style={{ backgroundColor: ATTR_COLORS[key] }} />
              {attr.label}
            </span>
          );
        })}
        <span className="text-zinc-600">· Baseline = avg of first data points</span>
      </div>
    </div>
  );
}
