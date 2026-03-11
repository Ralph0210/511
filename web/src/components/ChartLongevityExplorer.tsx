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

type ClassifiedSong = SongSummary & { category: LongevityCategory };

type Props = {
  summaries: SongSummary[];
};

const CATEGORY_ORDER: LongevityCategory[] = ["viral", "lasting", "slow_burn", "flash"];

const CATEGORY_DESCRIPTIONS: Record<LongevityCategory, string> = {
  viral: "High impact, short chart life",
  lasting: "High impact, long chart life",
  slow_burn: "Moderate impact, long chart life",
  flash: "Brief chart appearance",
};

const CATEGORY_CRITERIA: Record<LongevityCategory, string> = {
  viral: "Impact score \u2265 0.35 (peak roughly #14 or higher) AND endurance score < 0.35 (fewer than ~4 weeks on chart)",
  lasting: "Impact score \u2265 0.35 (peak roughly #14 or higher) AND endurance score \u2265 0.35 (~4+ weeks on chart)",
  slow_burn: "Impact score < 0.35 (peak below ~#14) AND endurance score \u2265 0.35 (~4+ weeks on chart)",
  flash: "Both impact and endurance scores below 0.35 — low peak rank and short chart life",
};

export default function ChartLongevityExplorer({ summaries }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [activeCategories, setActiveCategories] = useState<Set<LongevityCategory | "all">>(
    () => new Set(["viral", "lasting", "slow_burn"] as const),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
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
          next.add("lasting");
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

  // Precompute percentile ranks for tooltip context
  const percentileMap = useMemo(() => {
    const sortedByWeeks = [...classified].sort((a, b) => a.weeks_on_chart - b.weeks_on_chart);
    const map = new Map<string, number>();
    sortedByWeeks.forEach((s, i) => {
      map.set(s.track_id, Math.round((i / (sortedByWeeks.length - 1)) * 100));
    });
    return map;
  }, [classified]);

  // Detect reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // --- Scatter plot ---
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // viewBox-based responsive sizing (data-visualization.md §2.1)
    const WIDTH = 800;
    const HEIGHT = 400;
    svg.attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");

    // Standard margins (data-visualization.md §2.2)
    const MARGIN = { top: 28, right: 64, bottom: 56, left: 64 };
    const w = WIDTH - MARGIN.left - MARGIN.right;
    const h = HEIGHT - MARGIN.top - MARGIN.bottom;

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // clipPath for data group (data-visualization.md §2.6)
    const CLIP_PAD = 10; // accommodate dot radius + stroke at edges
    svg.append("defs").append("clipPath").attr("id", "longevity-clip")
      .append("rect").attr("x", -CLIP_PAD).attr("y", -CLIP_PAD).attr("width", w + CLIP_PAD * 2).attr("height", h + CLIP_PAD);

    const dataGroup = g.append("g")
      .attr("clip-path", "url(#longevity-clip)");

    // Scales with .clamp(true) (data-visualization.md §2.10)
    const xMax = d3.max(filteredData, (d) => d.weeks_on_chart) || 50;
    const x = d3.scaleSqrt().domain([0, xMax]).range([0, w]).nice().clamp(true);
    const y = d3.scaleLinear().domain([200, 1]).range([h, 0]).clamp(true);

    // Grid lines — max 5 (data-visualization.md §2.4, §3.5)
    const yTickValues = [1, 50, 100, 150, 200];
    g.append("g")
      .selectAll("line")
      .data(yTickValues)
      .join("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#27272a").attr("stroke-dasharray", "2,2");

    // Axis styling utility (data-visualization.md §2.4)
    function styleAxis(sel: d3.Selection<SVGGElement, unknown, null, undefined>) {
      sel.select(".domain").attr("stroke", "#3f3f46");
      sel.selectAll(".tick line").attr("stroke", "#3f3f46");
      sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12);
    }

    // X axis — max 6 ticks (data-visualization.md §2.4)
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues([1, 5, 10, 25, 50, 100, 150, 200].filter(v => v <= xMax)).tickSizeOuter(0).tickPadding(8))
      .call(styleAxis);

    // Y axis — 5 explicit tick values with # prefix (data-visualization.md §2.4)
    g.append("g")
      .call(
        d3.axisLeft(y)
          .tickValues(yTickValues)
          .tickSizeOuter(0)
          .tickPadding(8)
          .tickFormat((d) => `#${d}`),
      )
      .call(styleAxis);

    // Axis labels
    g.append("text")
      .attr("x", w / 2).attr("y", h + 44)
      .attr("text-anchor", "middle")
      .attr("font-size", 13).attr("fill", "#71717a")
      .text("Weeks on Chart");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -48)
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

    const animDuration = prefersReducedMotion ? 0 : 100;

    dataGroup.selectAll("circle.dot")
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
          .transition().duration(animDuration)
          .attr("r", selectedSongs.has(d.track_id) ? 9 : 6)
          .attr("opacity", 1);

        const pctile = percentileMap.get(d.track_id) ?? 0;
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
            `<span style="font-size:12px">Peak #${d.peak_rank} · ${d.weeks_on_chart}w · longer than ${pctile}% of songs</span><br/>` +
            `<span style="color:${LONGEVITY_COLORS[d.category]};font-size:12px;font-weight:600">${LONGEVITY_LABELS[d.category]}</span>` +
            `</div></div>`,
          );
      })
      .on("mouseleave", function (_, d) {
        d3.select(this)
          .transition().duration(animDuration)
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

    // Persistent labels for selected songs (outside clip for visibility)
    const labelGroup = g.append("g").attr("class", "labels");
    selectedSongs.forEach((id) => {
      const song = classified.find((s) => s.track_id === id);
      if (!song) return;
      if (!activeCategories.has("all") && !activeCategories.has(song.category)) return;

      const cx = x(song.weeks_on_chart);
      const cy = y(song.peak_rank);

      // Position label to the right, unless near right edge
      const labelX = cx + w * 0.3 < w ? cx + 12 : cx - 12;
      const anchor = cx + w * 0.3 < w ? "start" : "end";

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

  }, [classified, filteredData, selectedSongs, activeCategories, percentileMap, prefersReducedMotion]);

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
            <span className="group relative cursor-help">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-zinc-600 transition-colors group-hover:text-zinc-400">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">i</text>
              </svg>
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                {CATEGORY_CRITERIA[cat]}
              </span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
