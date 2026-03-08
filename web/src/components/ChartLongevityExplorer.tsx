"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import {
  type SongSummary,
  classifySongLongevity,
  LONGEVITY_COLORS,
  LONGEVITY_LABELS,
  type LongevityCategory,
} from "@/lib/spotify-data";

type TrajectoryPoint = {
  track_id: string;
  track_name: string;
  artist_name: string;
  week: string;
  rank: number;
  streams: number | null;
};

type Props = {
  summaries: SongSummary[];
  // Pre-fetched trajectories for initial featured songs
  initialTrajectories: TrajectoryPoint[];
};

const CATEGORY_ORDER: LongevityCategory[] = ["viral", "sustained", "slow_burn", "other"];

export default function ChartLongevityExplorer({ summaries, initialTrajectories }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<LongevityCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [trajectories, setTrajectories] = useState<TrajectoryPoint[]>(initialTrajectories);
  const [showAverages, setShowAverages] = useState(true);

  // Classify all songs
  const classified = useMemo(() => {
    return summaries.map((s) => ({
      ...s,
      category: classifySongLongevity(s),
    }));
  }, [summaries]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: classified.length };
    for (const s of classified) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [classified]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return classified
      .filter(
        (s) =>
          s.track_name.toLowerCase().includes(q) ||
          s.artist_name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchQuery, classified]);

  // Group trajectories by track
  const trajectoryByTrack = useMemo(() => {
    const map = new Map<string, TrajectoryPoint[]>();
    for (const t of trajectories) {
      if (!map.has(t.track_id)) map.set(t.track_id, []);
      map.get(t.track_id)!.push(t);
    }
    return map;
  }, [trajectories]);

  // Compute average trajectories per category
  const avgTrajectories = useMemo(() => {
    const result: Record<string, { weekNum: number; avgRank: number }[]> = {};

    for (const cat of CATEGORY_ORDER) {
      const songIds = classified
        .filter((s) => s.category === cat)
        .map((s) => s.track_id);

      const weekBuckets: Record<number, number[]> = {};
      for (const id of songIds) {
        const traj = trajectoryByTrack.get(id);
        if (!traj) continue;
        const sorted = [...traj].sort((a, b) => a.week.localeCompare(b.week));
        sorted.forEach((t, i) => {
          if (!weekBuckets[i]) weekBuckets[i] = [];
          weekBuckets[i].push(t.rank);
        });
      }

      result[cat] = Object.entries(weekBuckets)
        .map(([w, ranks]) => ({
          weekNum: parseInt(w),
          avgRank: ranks.reduce((a, b) => a + b, 0) / ranks.length,
        }))
        .sort((a, b) => a.weekNum - b.weekNum)
        .slice(0, 30); // Cap at 30 weeks
    }
    return result;
  }, [classified, trajectoryByTrack]);

  // Scatter plot: weeks on chart vs peak rank, colored by category
  useEffect(() => {
    if (!svgRef.current) return;
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

    const filteredData =
      selectedCategory === "all"
        ? classified
        : classified.filter((s) => s.category === selectedCategory);

    const x = d3.scaleLinear().domain([0, d3.max(filteredData, (d) => d.weeks_on_chart) || 50]).range([0, w]);
    const y = d3.scaleLinear().domain([200, 1]).range([h, 0]);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(10))
      .call((g) => g.select(".domain").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", 11));

    g.append("g")
      .call(d3.axisLeft(y).ticks(10))
      .call((g) => g.select(".domain").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", 11));

    // Axis labels
    g.append("text")
      .attr("x", w / 2).attr("y", h + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 12).attr("fill", "#6b7280")
      .text("Weeks on Chart");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -40)
      .attr("text-anchor", "middle")
      .attr("font-size", 12).attr("fill", "#6b7280")
      .text("Peak Rank (1 = best)");

    // Grid lines
    g.append("g")
      .selectAll("line")
      .data(y.ticks(10))
      .join("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#f3f4f6").attr("stroke-dasharray", "2,2");

    // Dots
    const tooltip = d3.select(tooltipRef.current);

    g.selectAll("circle")
      .data(filteredData)
      .join("circle")
      .attr("cx", (d) => x(d.weeks_on_chart))
      .attr("cy", (d) => y(d.peak_rank))
      .attr("r", (d) => (selectedSongs.has(d.track_id) ? 6 : 3.5))
      .attr("fill", (d) => LONGEVITY_COLORS[d.category])
      .attr("opacity", (d) => (selectedSongs.has(d.track_id) ? 1 : 0.5))
      .attr("stroke", (d) => (selectedSongs.has(d.track_id) ? "#1a1a1a" : "none"))
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        tooltip
          .style("opacity", "1")
          .style("left", `${event.offsetX + 12}px`)
          .style("top", `${event.offsetY - 10}px`)
          .html(
            `<strong>${d.track_name}</strong><br/>` +
            `<span style="color:#6b7280">${d.artist_name}</span><br/>` +
            `Peak: #${d.peak_rank} · ${d.weeks_on_chart} weeks<br/>` +
            `<span style="color:${LONGEVITY_COLORS[d.category]}">${LONGEVITY_LABELS[d.category]}</span>`
          );
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
      })
      .on("click", (_, d) => {
        setSelectedSongs((prev) => {
          const next = new Set(prev);
          if (next.has(d.track_id)) next.delete(d.track_id);
          else next.add(d.track_id);
          return next;
        });
      });
  }, [classified, selectedCategory, selectedSongs]);

  return (
    <div className="space-y-6">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          All ({categoryCounts.all})
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
            style={selectedCategory === cat ? { backgroundColor: LONGEVITY_COLORS[cat] } : undefined}
          >
            {LONGEVITY_LABELS[cat]} ({categoryCounts[cat] || 0})
          </button>
        ))}
      </div>

      {/* Song search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search for a song to highlight..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent dark:border-zinc-700 dark:bg-zinc-900"
        />
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {searchResults.map((s) => (
              <button
                key={s.track_id}
                onClick={() => {
                  setSelectedSongs((prev) => {
                    const next = new Set(prev);
                    next.add(s.track_id);
                    return next;
                  });
                  setSearchQuery("");
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: LONGEVITY_COLORS[s.category] }}
                />
                <span className="font-medium">{s.track_name}</span>
                <span className="text-muted">{s.artist_name}</span>
                <span className="ml-auto text-xs text-muted">
                  #{s.peak_rank} · {s.weeks_on_chart}w
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected songs tags */}
      {selectedSongs.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(selectedSongs).map((id) => {
            const song = classified.find((s) => s.track_id === id);
            if (!song) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: LONGEVITY_COLORS[song.category] }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: LONGEVITY_COLORS[song.category] }}
                />
                {song.track_name}
                <button
                  onClick={() =>
                    setSelectedSongs((prev) => {
                      const next = new Set(prev);
                      next.delete(id);
                      return next;
                    })
                  }
                  className="ml-1 text-zinc-400 hover:text-zinc-600"
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            onClick={() => setSelectedSongs(new Set())}
            className="text-xs text-muted hover:text-zinc-600"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main scatter plot */}
      <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <svg ref={svgRef} className="w-full" />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg opacity-0 transition-opacity dark:border-zinc-700 dark:bg-zinc-800"
          style={{ maxWidth: 240 }}
        />
      </div>

      {/* Average toggle */}
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={showAverages}
          onChange={(e) => setShowAverages(e.target.checked)}
          className="rounded"
        />
        Show average trajectory overlay by category
      </label>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {CATEGORY_ORDER.map((cat) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: LONGEVITY_COLORS[cat] }}
            />
            <strong>{LONGEVITY_LABELS[cat]}:</strong>
            {cat === "viral" && "Peak Top 20, ≤8 weeks on chart"}
            {cat === "sustained" && "15+ weeks on chart"}
            {cat === "slow_burn" && "Peak Top 50, 8+ weeks"}
            {cat === "other" && "Everything else"}
          </span>
        ))}
      </div>

      {/* Insights */}
      <div className="rounded-xl bg-zinc-50 p-5 dark:bg-zinc-800/50">
        <h3 className="text-sm font-semibold">Key Insights</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>
            Songs that peak higher tend to stay longer — the top-left cluster shows sustained
            hits with both high peaks and long chart runs.
          </li>
          <li>
            Viral spikes (red) cluster in the bottom-left — high peaks but short chart lives,
            suggesting rapid audience attention followed by equally rapid decline.
          </li>
          <li>
            Click any dot to highlight it, or search for specific songs to compare their profiles.
          </li>
        </ul>
      </div>
    </div>
  );
}
