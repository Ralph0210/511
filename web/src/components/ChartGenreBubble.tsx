"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

/**
 * Bubble chart: how genres perform on Spotify
 *
 * X-axis:  Average chart rank (1 = top, 200 = bottom)
 * Y-axis:  Average streams per entry
 * Color:   Genre category
 * Size:    Average song duration (longer = bigger)
 * Faceted by year (2017–2021)
 */
export type BubbleDataPoint = {
  genre: string;
  year: number;
  avgRank: number;
  avgStreams: number;
  avgDuration: number; // ms
  count: number;
};

const GENRE_COLORS: Record<string, string> = {
  "Pop":         "#f97316",
  "Hip Hop/Rap": "#8b5cf6",
  "Latin":       "#ef4444",
  "R&B":         "#06b6d4",
  "Rock":        "#22c55e",
  "EDM/Dance":   "#ec4899",
  "Country":     "#eab308",
  "Other":       "#94a3b8",
};

export default function ChartGenreBubble({ data }: { data: BubbleDataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const years = Array.from(new Set(data.map((d) => d.year))).sort();
  const [selectedYear, setSelectedYear] = useState<number>(years[years.length - 1] ?? 2021);

  useEffect(() => {
    if (!data.length || !containerRef.current) return;

    const tooltip = tooltipRef.current;
    const margin = { top: 24, right: 24, bottom: 48, left: 72 };
    const width = 720 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    const container = d3.select(containerRef.current);
    container.selectAll("svg").remove();

    const yearData = data.filter((d) => d.year === selectedYear);
    if (!yearData.length) return;

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("class", "min-w-[720px]")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().domain([1, 200]).range([0, width]);
    const yMax = d3.max(yearData, (d) => d.avgStreams) ?? 0;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.15]).range([height, 0]);

    const durationExtent = d3.extent(data, (d) => d.avgDuration) as [number, number];
    const sizeScale = d3.scaleSqrt().domain(durationExtent).range([6, 32]);

    // Grid
    svg
      .append("g")
      .call(
        d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => "")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g.selectAll(".tick line").attr("stroke", "#e5e7eb").attr("stroke-dasharray", "3,3")
      );

    // Bubbles
    svg
      .selectAll("circle.bubble")
      .data(yearData.sort((a, b) => b.avgDuration - a.avgDuration)) // draw big ones first
      .join("circle")
      .attr("class", "bubble")
      .attr("cx", (d) => xScale(d.avgRank))
      .attr("cy", (d) => yScale(d.avgStreams))
      .attr("r", (d) => sizeScale(d.avgDuration))
      .attr("fill", (d) => GENRE_COLORS[d.genre] ?? GENRE_COLORS["Other"])
      .attr("fill-opacity", 0.7)
      .attr("stroke", (d) => GENRE_COLORS[d.genre] ?? GENRE_COLORS["Other"])
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        if (!tooltip) return;
        d3.select(this).attr("fill-opacity", 1).attr("stroke-width", 2.5);
        const mins = Math.floor(d.avgDuration / 60000);
        const secs = Math.round((d.avgDuration % 60000) / 1000);
        tooltip.innerHTML = `
          <strong>${d.genre}</strong> · ${d.year}<br/>
          Avg rank: <strong>${d.avgRank.toFixed(1)}</strong><br/>
          Avg streams: <strong>${(d.avgStreams / 1_000_000).toFixed(2)}M</strong><br/>
          Avg duration: <strong>${mins}:${secs.toString().padStart(2, "0")}</strong><br/>
          Entries: ${d.count.toLocaleString()}
        `;
        tooltip.style.display = "block";
        tooltip.style.left = `${event.clientX + 14}px`;
        tooltip.style.top = `${event.clientY + 14}px`;
      })
      .on("mousemove", function (event) {
        if (!tooltip || tooltip.style.display !== "block") return;
        tooltip.style.left = `${event.clientX + 14}px`;
        tooltip.style.top = `${event.clientY + 14}px`;
      })
      .on("mouseleave", function () {
        d3.select(this).attr("fill-opacity", 0.7).attr("stroke-width", 1.5);
        if (tooltip) tooltip.style.display = "none";
      });

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .selectAll("text")
      .attr("font-size", 11);

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 38)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text("Average chart rank (1 = top)");

    svg
      .append("g")
      .call(
        d3.axisLeft(yScale).ticks(5).tickFormat((v) => `${(+v / 1_000_000).toFixed(0)}M`)
      )
      .selectAll("text")
      .attr("font-size", 11);

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 14)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text("Avg streams per entry");

    return () => {
      container.selectAll("svg").remove();
    };
  }, [data, selectedYear]);

  const genres = Array.from(new Set(data.map((d) => d.genre))).sort();

  return (
    <div>
      {/* Year selector */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Year:</span>
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              selectedYear === y
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {genres.map((g) => (
          <span key={g} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: GENRE_COLORS[g] ?? GENRE_COLORS["Other"] }}
            />
            {g}
          </span>
        ))}
        <span className="ml-2 text-zinc-400 dark:text-zinc-500">| bubble size = avg duration</span>
      </div>

      <div className="relative overflow-x-auto" ref={containerRef} />
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 hidden rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        style={{ display: "none" }}
      />
    </div>
  );
}
