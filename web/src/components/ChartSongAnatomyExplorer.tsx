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

const ATTRIBUTES: { key: AttributeKey; label: string; unit: string; format: (v: number) => string }[] = [
  { key: "avg_duration", label: "Duration", unit: "ms", format: (v) => { const m = Math.floor(v / 60000); const s = Math.floor((v % 60000) / 1000); return `${m}:${s.toString().padStart(2, "0")}`; } },
  { key: "avg_danceability", label: "Danceability", unit: "", format: (v) => v.toFixed(3) },
  { key: "avg_energy", label: "Energy", unit: "", format: (v) => v.toFixed(3) },
  { key: "avg_valence", label: "Valence", unit: "", format: (v) => v.toFixed(3) },
  { key: "avg_tempo", label: "Tempo", unit: "BPM", format: (v) => v.toFixed(1) },
  { key: "avg_acousticness", label: "Acousticness", unit: "", format: (v) => v.toFixed(3) },
  { key: "avg_speechiness", label: "Speechiness", unit: "", format: (v) => v.toFixed(3) },
  { key: "avg_loudness", label: "Loudness", unit: "dB", format: (v) => v.toFixed(1) },
];

const ATTR_COLORS: Record<string, string> = {
  avg_duration: "#2563EB",
  avg_danceability: "#8B5CF6",
  avg_energy: "#EF4444",
  avg_valence: "#F59E0B",
  avg_tempo: "#10B981",
  avg_acousticness: "#6366F1",
  avg_speechiness: "#EC4899",
  avg_loudness: "#D97706",
};

type TimeGranularity = "week" | "month" | "year";

export default function ChartSongAnatomyExplorer({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<Set<AttributeKey>>(
    new Set<AttributeKey>(["avg_duration", "avg_danceability", "avg_energy"])
  );
  const [granularity, setGranularity] = useState<TimeGranularity>("month");

  // Aggregate by granularity
  const aggregated = useMemo(() => {
    if (granularity === "week") return data;

    const buckets: Record<string, WeeklyAttributes[]> = {};
    for (const row of data) {
      let key: string;
      if (granularity === "month") {
        key = row.week.slice(0, 7); // YYYY-MM
      } else {
        key = row.week.slice(0, 4); // YYYY
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

  // Draw chart
  useEffect(() => {
    if (!svgRef.current || !aggregated.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = 480;
    svg.attr("width", width).attr("height", height);

    const margin = { top: 20, right: 30, bottom: 50, left: 55 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m-%d");
    const dates = aggregated.map((d) => parseDate(d.week)!).filter(Boolean);

    const x = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]).range([0, w]);

    // For each selected attribute, create its own y scale and draw
    const attrs = Array.from(selectedAttrs);

    // We'll use separate y-axes (normalized to [0, 1] for overlay)
    // Duration is in ms, others are 0-1 or dB — need separate scales
    const tooltip = d3.select(tooltipRef.current);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(8))
      .call((g) => g.select(".domain").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", 11));

    g.append("text")
      .attr("x", w / 2).attr("y", h + 40)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#6b7280")
      .text("Date");

    // Draw each attribute line with its own y-scale
    attrs.forEach((attrKey, attrIdx) => {
      const attrInfo = ATTRIBUTES.find((a) => a.key === attrKey)!;
      const color = ATTR_COLORS[attrKey];
      const values = aggregated.map((d) => d[attrKey] as number | null).filter((v): v is number => v != null);
      if (!values.length) return;

      const yMin = d3.min(values)! * 0.95;
      const yMax = d3.max(values)! * 1.05;
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

      // Y axis (only for first attribute)
      if (attrIdx === 0) {
        g.append("g")
          .call(d3.axisLeft(yScale).ticks(6).tickFormat((d) => attrInfo.format(d as number)))
          .call((g) => g.select(".domain").attr("stroke", "#e5e7eb"))
          .call((g) => g.selectAll(".tick line").attr("stroke", "#e5e7eb"))
          .call((g) => g.selectAll(".tick text").attr("fill", color).attr("font-size", 10));
      }

      // Line
      const line = d3
        .line<WeeklyAttributes>()
        .defined((d) => d[attrKey] != null)
        .x((d) => x(parseDate(d.week)!))
        .y((d) => yScale(d[attrKey] as number))
        .curve(d3.curveMonotoneX);

      // Area
      const area = d3
        .area<WeeklyAttributes>()
        .defined((d) => d[attrKey] != null)
        .x((d) => x(parseDate(d.week)!))
        .y0(h)
        .y1((d) => yScale(d[attrKey] as number))
        .curve(d3.curveMonotoneX);

      if (attrs.length === 1) {
        g.append("path")
          .datum(aggregated)
          .attr("d", area)
          .attr("fill", color)
          .attr("opacity", 0.06);
      }

      g.append("path")
        .datum(aggregated)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.85);

      // Dots on hover
      const dots = g
        .selectAll(`.dot-${attrKey}`)
        .data(aggregated.filter((d) => d[attrKey] != null))
        .join("circle")
        .attr("class", `dot-${attrKey}`)
        .attr("cx", (d) => x(parseDate(d.week)!))
        .attr("cy", (d) => yScale(d[attrKey] as number))
        .attr("r", 0)
        .attr("fill", color);

      // Invisible hover rect
      g.selectAll(`.hover-${attrKey}`)
        .data(aggregated.filter((d) => d[attrKey] != null))
        .join("rect")
        .attr("class", `hover-${attrKey}`)
        .attr("x", (d) => x(parseDate(d.week)!) - 8)
        .attr("y", 0)
        .attr("width", 16)
        .attr("height", h)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mouseenter", (event, d) => {
          dots.filter((dd) => dd === d).attr("r", 5);
          const val = d[attrKey] as number;
          tooltip
            .style("opacity", "1")
            .style("left", `${event.offsetX + 12}px`)
            .style("top", `${event.offsetY - 10}px`)
            .html(
              `<strong>${attrInfo.label}</strong><br/>` +
              `${d.week}<br/>` +
              `${attrInfo.format(val)}${attrInfo.unit ? ` ${attrInfo.unit}` : ""}<br/>` +
              `<span style="color:#6b7280">${d.song_count} songs</span>`
            );
        })
        .on("mouseleave", () => {
          dots.attr("r", 0);
          tooltip.style("opacity", "0");
        });
    });
  }, [aggregated, selectedAttrs]);

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
            <button
              key={attr.key}
              onClick={() => toggleAttr(attr.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedAttrs.has(attr.key)
                  ? "text-white"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
              style={selectedAttrs.has(attr.key) ? { backgroundColor: ATTR_COLORS[attr.key] } : undefined}
            >
              {attr.label}
            </button>
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
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <svg ref={svgRef} className="w-full" />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg opacity-0 transition-opacity dark:border-zinc-700 dark:bg-zinc-800"
          style={{ maxWidth: 220 }}
        />
      </div>

      {/* Active legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {Array.from(selectedAttrs).map((key) => {
          const attr = ATTRIBUTES.find((a) => a.key === key)!;
          return (
            <span key={key} className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded-full" style={{ backgroundColor: ATTR_COLORS[key] }} />
              {attr.label}
              {attr.unit && ` (${attr.unit})`}
            </span>
          );
        })}
      </div>

      {/* Insights */}
      <div className="rounded-xl bg-zinc-50 p-5 dark:bg-zinc-800/50">
        <h3 className="text-sm font-semibold">Key Insights</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>
            Average song duration has been steadily declining from ~3:48 in 2017 to ~3:15 in 2021,
            reflecting playlist-era incentives for shorter songs.
          </li>
          <li>
            Toggle multiple attributes to see how danceability, energy, and valence correlate
            — or diverge — over time.
          </li>
          <li>
            Switch between weekly, monthly, and yearly views to spot short-term fluctuations
            vs long-term trends.
          </li>
        </ul>
      </div>
    </div>
  );
}
