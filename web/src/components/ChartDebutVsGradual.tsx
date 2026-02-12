"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Q2: Do songs that debut as new chart entries tend to remain on the chart for fewer weeks
 * than songs that gradually rise in rank?
 *
 * Rationale:
 * - Compare two distributions: Debut (is_new=true on first appearance) vs Gradual (is_new=false)
 * - Box plot: Shows median (center), IQR (box), whiskers (min/max or 1.5*IQR), and outliers.
 *   Ideal for comparing distributions across categorical groups.
 * - d3.scaleBand: Places the two groups side by side with consistent spacing
 * - Manual box construction: d3 has no built-in box plot; we draw rect (IQR), line (median),
 *   and lines (whiskers) using the precomputed q1, median, q3, min, max from the backend.
 */
type Stats = { is_debut: boolean; avg_weeks: number; median_weeks: number; q1_weeks: number; q3_weeks: number; min_weeks: number; max_weeks: number; song_count: number };

export default function ChartDebutVsGradual({ stats }: { stats: Stats[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!stats.length || !svgRef.current) return;

    const margin = { top: 24, right: 24, bottom: 56, left: 72 };
    const width = 520 - margin.left - margin.right;
    const height = 320 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const groups = stats.map((s) => (s.is_debut ? "Debut (new entry)" : "Gradual rise"));
    const xScale = d3.scaleBand().domain(groups).range([0, width]).padding(0.4);

    const yMax = d3.max(stats, (s) => s.max_weeks) ?? 80;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.05]).range([height, 0]);

    const boxWidth = xScale.bandwidth() * 0.6;

    stats.forEach((s, i) => {
      const groupLabel = s.is_debut ? "Debut (new entry)" : "Gradual rise";
      const x = (xScale(groupLabel) ?? 0) + (xScale.bandwidth() - boxWidth) / 2;
      const color = s.is_debut ? "#e74c3c" : "#3498db";

      // Box (IQR: q1 to q3)
      svg
        .append("rect")
        .attr("x", x)
        .attr("y", yScale(s.q3_weeks))
        .attr("width", boxWidth)
        .attr("height", Math.max(2, yScale(s.q1_weeks) - yScale(s.q3_weeks)))
        .attr("fill", color)
        .attr("fill-opacity", 0.6)
        .attr("stroke", color)
        .attr("stroke-width", 1);

      // Median line
      svg
        .append("line")
        .attr("x1", x)
        .attr("x2", x + boxWidth)
        .attr("y1", yScale(s.median_weeks))
        .attr("y2", yScale(s.median_weeks))
        .attr("stroke", "#1a1a1a")
        .attr("stroke-width", 2);

      // Lower whisker (min to q1)
      svg
        .append("line")
        .attr("x1", x + boxWidth / 2)
        .attr("x2", x + boxWidth / 2)
        .attr("y1", yScale(s.min_weeks))
        .attr("y2", yScale(s.q1_weeks))
        .attr("stroke", color)
        .attr("stroke-width", 1.5);

      svg.append("line").attr("x1", x + boxWidth / 2 - 4).attr("x2", x + boxWidth / 2 + 4).attr("y1", yScale(s.min_weeks)).attr("y2", yScale(s.min_weeks)).attr("stroke", color).attr("stroke-width", 1.5);

      // Upper whisker (q3 to max)
      svg
        .append("line")
        .attr("x1", x + boxWidth / 2)
        .attr("x2", x + boxWidth / 2)
        .attr("y1", yScale(s.q3_weeks))
        .attr("y2", yScale(s.max_weeks))
        .attr("stroke", color)
        .attr("stroke-width", 1.5);

      svg.append("line").attr("x1", x + boxWidth / 2 - 4).attr("x2", x + boxWidth / 2 + 4).attr("y1", yScale(s.max_weeks)).attr("y2", yScale(s.max_weeks)).attr("stroke", color).attr("stroke-width", 1.5);
    });

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("font-size", 12);

    svg.append("g").call(d3.axisLeft(yScale).ticks(8)).selectAll("text").attr("font-size", 11);

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 16)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text("Weeks on chart (total run per song)");

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [stats]);

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} className="min-w-[520px]" />
    </div>
  );
}
