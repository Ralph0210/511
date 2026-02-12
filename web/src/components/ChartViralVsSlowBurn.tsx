"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type BoxStats = { groupLabel: string; avg_weeks: number; median_weeks: number; q1_weeks: number; q3_weeks: number; min_weeks: number; max_weeks: number; song_count: number };

export default function ChartViralVsSlowBurn({ stats }: { stats: BoxStats[] }) {
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

    const groups = stats.map((s) => `${s.groupLabel} (n=${s.song_count})`);
    const xScale = d3.scaleBand().domain(groups).range([0, width]).padding(0.4);

    const yMax = d3.max(stats, (s) => s.max_weeks) ?? 80;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.05]).range([height, 0]);

    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#9b59b6"];
    const boxWidth = xScale.bandwidth() * 0.6;

    stats.forEach((s, i) => {
      const groupKey = `${s.groupLabel} (n=${s.song_count})`;
      const x = (xScale(groupKey) ?? 0) + (xScale.bandwidth() - boxWidth) / 2;
      const color = colors[i % colors.length];

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

      svg
        .append("line")
        .attr("x1", x)
        .attr("x2", x + boxWidth)
        .attr("y1", yScale(s.median_weeks))
        .attr("y2", yScale(s.median_weeks))
        .attr("stroke", "#1a1a1a")
        .attr("stroke-width", 2);

      svg
        .append("line")
        .attr("x1", x + boxWidth / 2)
        .attr("x2", x + boxWidth / 2)
        .attr("y1", yScale(s.min_weeks))
        .attr("y2", yScale(s.q1_weeks))
        .attr("stroke", color)
        .attr("stroke-width", 1.5);
      svg.append("line").attr("x1", x + boxWidth / 2 - 4).attr("x2", x + boxWidth / 2 + 4).attr("y1", yScale(s.min_weeks)).attr("y2", yScale(s.min_weeks)).attr("stroke", color).attr("stroke-width", 1.5);

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
      .attr("font-size", 11);

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
