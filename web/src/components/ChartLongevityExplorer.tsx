"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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

type ClassifiedSong = SongSummary & { category: LongevityCategory };

type Props = {
  summaries: SongSummary[];
  initialTrajectories: TrajectoryPoint[];
};

const CATEGORY_ORDER: LongevityCategory[] = ["viral", "sustained", "slow_burn", "other"];

const CATEGORY_DESCRIPTIONS: Record<LongevityCategory, string> = {
  viral: "Peak Top 20, \u22648 weeks",
  sustained: "15+ weeks on chart",
  slow_burn: "Peak Top 50, 8+ weeks",
  other: "Everything else",
};

export default function ChartLongevityExplorer({ summaries, initialTrajectories }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeCategories, setActiveCategories] = useState<Set<LongevityCategory | "all">>(
    () => new Set(["viral", "sustained", "slow_burn"] as const),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [trajectories] = useState<TrajectoryPoint[]>(initialTrajectories);

  // Classify all songs
  const classified = useMemo<ClassifiedSong[]>(() => {
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
          s.artist_name.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [searchQuery, classified]);

  // Toggle category
  const toggleCategory = useCallback((cat: LongevityCategory | "all") => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (cat === "all") {
        // Toggle between "all 4" and "default 3"
        if (next.has("all")) {
          next.clear();
          next.add("viral");
          next.add("sustained");
          next.add("slow_burn");
        } else {
          next.clear();
          next.add("all");
          CATEGORY_ORDER.forEach((c) => next.add(c));
        }
        return next;
      }
      if (next.has(cat)) {
        next.delete(cat);
        next.delete("all");
      } else {
        next.add(cat);
        // Check if all 4 are now active
        if (CATEGORY_ORDER.every((c) => next.has(c))) next.add("all");
      }
      return next;
    });
  }, []);

  // Filtered data based on active categories
  const filteredData = useMemo(() => {
    if (activeCategories.has("all")) return classified;
    return classified.filter((s) => activeCategories.has(s.category));
  }, [classified, activeCategories]);

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
        .slice(0, 30);
    }
    return result;
  }, [classified, trajectoryByTrack]);

  // --- Scatter plot ---
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = 520;
    svg.attr("width", width).attr("height", height);

    const margin = { top: 20, right: 40, bottom: 56, left: 60 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Use sqrt scale on x-axis to spread the dense cluster
    const xMax = d3.max(filteredData, (d) => d.weeks_on_chart) || 50;
    const x = d3.scaleSqrt().domain([0, xMax]).range([0, w]).nice();
    const y = d3.scaleLinear().domain([200, 1]).range([h, 0]);

    // Grid lines
    g.append("g")
      .selectAll("line")
      .data(y.ticks(10))
      .join("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#27272a").attr("stroke-dasharray", "2,2");

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(8))
      .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", "#3f3f46"))
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(10))
      .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", "#3f3f46"))
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12));

    // Axis labels
    g.append("text")
      .attr("x", w / 2).attr("y", h + 44)
      .attr("text-anchor", "middle")
      .attr("font-size", 13).attr("fill", "#71717a")
      .text("Weeks on Chart");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -44)
      .attr("text-anchor", "middle")
      .attr("font-size", 13).attr("fill", "#71717a")
      .text("Peak Rank (1 = best)");

    // Tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Dots — draw non-selected first, then selected on top
    const sortedData = [...filteredData].sort((a, b) => {
      const aSelected = selectedSongs.has(a.track_id) ? 1 : 0;
      const bSelected = selectedSongs.has(b.track_id) ? 1 : 0;
      return aSelected - bSelected;
    });

    g.selectAll("circle.dot")
      .data(sortedData, (d) => (d as ClassifiedSong).track_id)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d.weeks_on_chart))
      .attr("cy", (d) => y(d.peak_rank))
      .attr("r", (d) => (selectedSongs.has(d.track_id) ? 7 : 4))
      .attr("fill", (d) => LONGEVITY_COLORS[d.category])
      .attr("opacity", (d) => (selectedSongs.has(d.track_id) ? 1 : 0.55))
      .attr("stroke", (d) => (selectedSongs.has(d.track_id) ? "#fff" : "none"))
      .attr("stroke-width", (d) => (selectedSongs.has(d.track_id) ? 2 : 0))
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition().duration(100)
          .attr("r", selectedSongs.has(d.track_id) ? 9 : 6)
          .attr("opacity", 1);

        const imgTag = d.album_img
          ? `<img src="${d.album_img}" alt="" style="width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0" />`
          : `<div style="width:40px;height:40px;border-radius:6px;background:#3f3f46;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;color:#71717a">&#9835;</div>`;

        tooltip
          .style("opacity", "1")
          .style("left", `${event.offsetX + 14}px`)
          .style("top", `${event.offsetY - 14}px`)
          .html(
            `<div style="display:flex;gap:10px;align-items:center">` +
            imgTag +
            `<div>` +
            `<strong style="font-size:13px">${d.track_name}</strong><br/>` +
            `<span style="color:#9CA3AF;font-size:12px">${d.artist_name}</span><br/>` +
            `<span style="font-size:12px">Peak #${d.peak_rank} · ${d.weeks_on_chart}w</span><br/>` +
            `<span style="color:${LONGEVITY_COLORS[d.category]};font-size:12px;font-weight:600">${LONGEVITY_LABELS[d.category]}</span>` +
            `</div></div>`,
          );
      })
      .on("mouseleave", function (_, d) {
        d3.select(this)
          .transition().duration(100)
          .attr("r", selectedSongs.has(d.track_id) ? 7 : 4)
          .attr("opacity", selectedSongs.has(d.track_id) ? 1 : 0.55);
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

    // Persistent labels for selected songs
    const labelGroup = g.append("g").attr("class", "labels");
    selectedSongs.forEach((id) => {
      const song = classified.find((s) => s.track_id === id);
      if (!song) return;
      if (!activeCategories.has("all") && !activeCategories.has(song.category)) return;

      const cx = x(song.weeks_on_chart);
      const cy = y(song.peak_rank);

      // Position label to the right, unless near right edge
      const labelX = cx + w * 0.7 < w ? cx + 12 : cx - 12;
      const anchor = cx + w * 0.7 < w ? "start" : "end";

      // Background rect + text
      const labelG = labelGroup.append("g");

      const text = labelG.append("text")
        .attr("x", labelX).attr("y", cy - 2)
        .attr("text-anchor", anchor)
        .attr("font-size", 13).attr("font-weight", 600)
        .attr("fill", LONGEVITY_COLORS[song.category])
        .text(song.track_name);

      // Add bg behind text
      const bbox = text.node()?.getBBox();
      if (bbox) {
        labelG.insert("rect", "text")
          .attr("x", bbox.x - 3).attr("y", bbox.y - 1)
          .attr("width", bbox.width + 6).attr("height", bbox.height + 2)
          .attr("rx", 3)
          .attr("fill", "#121212").attr("opacity", 0.85);
      }

      // Connector line
      labelG.append("line")
        .attr("x1", cx).attr("y1", cy)
        .attr("x2", labelX + (anchor === "start" ? -6 : 6)).attr("y2", cy - 2)
        .attr("stroke", LONGEVITY_COLORS[song.category])
        .attr("stroke-width", 1).attr("stroke-dasharray", "2,2")
        .attr("opacity", 0.5);
    });

    // Average trajectory lines (small inset sparklines in bottom-right)
    if (Object.keys(avgTrajectories).length > 0) {
      const insetW = Math.min(180, w * 0.22);
      const insetH = 80;
      const insetX = w - insetW - 8;
      const insetY = 8;

      const insetG = g.append("g")
        .attr("transform", `translate(${insetX},${insetY})`);

      // Background
      insetG.append("rect")
        .attr("width", insetW).attr("height", insetH)
        .attr("rx", 8)
        .attr("fill", "#121212").attr("stroke", "#27272a").attr("stroke-width", 1);

      insetG.append("text")
        .attr("x", insetW / 2).attr("y", 14)
        .attr("text-anchor", "middle")
        .attr("font-size", 12).attr("fill", "#71717a")
        .text("Avg. rank trajectory");

      const sparkX = d3.scaleLinear().domain([0, 29]).range([8, insetW - 8]);
      const sparkY = d3.scaleLinear().domain([200, 1]).range([insetH - 8, 22]);

      const line = d3.line<{ weekNum: number; avgRank: number }>()
        .x((d) => sparkX(d.weekNum))
        .y((d) => sparkY(d.avgRank))
        .curve(d3.curveCatmullRom);

      for (const cat of CATEGORY_ORDER) {
        if (!activeCategories.has("all") && !activeCategories.has(cat)) continue;
        const traj = avgTrajectories[cat];
        if (!traj?.length) continue;

        insetG.append("path")
          .attr("d", line(traj))
          .attr("fill", "none")
          .attr("stroke", LONGEVITY_COLORS[cat])
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.8);
      }
    }
  }, [classified, filteredData, selectedSongs, activeCategories, avgTrajectories]);

  return (
    <div className="space-y-4">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleCategory("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategories.has("all")
              ? "bg-white text-zinc-900"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          All ({categoryCounts.all})
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`group relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategories.has(cat)
                ? "text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
            style={activeCategories.has(cat) ? { backgroundColor: LONGEVITY_COLORS[cat] } : undefined}
            title={CATEGORY_DESCRIPTIONS[cat]}
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
          className="w-full rounded-xl border border-zinc-800 bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-zinc-800 bg-surface shadow-lg">
            {searchResults.map((s) => (
              <button
                key={s.track_id}
                onClick={() => {
                  setSelectedSongs((prev) => {
                    const next = new Set(prev);
                    next.add(s.track_id);
                    return next;
                  });
                  // Ensure category is visible
                  setActiveCategories((prev) => {
                    if (prev.has("all") || prev.has(s.category)) return prev;
                    const next = new Set(prev);
                    next.add(s.category);
                    if (CATEGORY_ORDER.every((c) => next.has(c))) next.add("all");
                    return next;
                  });
                  setSearchQuery("");
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-800 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-zinc-700">
                  {s.album_img ? (
                    <img src={s.album_img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">&#9835;</div>
                  )}
                </div>
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
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
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: LONGEVITY_COLORS[song.category] }}
              >
                {song.album_img && (
                  <img
                    src={song.album_img}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                )}
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
                  className="ml-1 text-zinc-400 hover:text-white"
                >
                  &times;
                </button>
              </span>
            );
          })}
          <button
            onClick={() => setSelectedSongs(new Set())}
            className="text-xs text-muted hover:text-white"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main scatter plot */}
      <div className="relative rounded-2xl border border-zinc-800 bg-surface p-4">
        <svg ref={svgRef} className="w-full" role="img" aria-label="Scatter plot of song longevity: peak rank vs weeks on chart" />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute rounded-lg border border-zinc-800 bg-surface px-3 py-2.5 text-xs shadow-xl opacity-0 transition-opacity"
          style={{ maxWidth: 300 }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        {CATEGORY_ORDER.map((cat) => (
          <span key={cat} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: LONGEVITY_COLORS[cat] }}
            />
            <strong>{LONGEVITY_LABELS[cat]}:</strong>
            <span className="text-zinc-500">{CATEGORY_DESCRIPTIONS[cat]}</span>
          </span>
        ))}
      </div>

      {/* Insights */}
      <div className="rounded-xl bg-zinc-800/50 p-5">
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
