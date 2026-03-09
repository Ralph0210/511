"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type BoxStats = { groupLabel: string; avg_weeks: number; median_weeks: number; q1_weeks: number; q3_weeks: number; min_weeks: number; max_weeks: number; song_count: number };

export default function ChartViralVsSlowBurn({ stats }: { stats: BoxStats[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stats.length || !svgRef.current) return;

    const tooltip = tooltipRef.current;
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
      const boxHeight = Math.max(2, yScale(s.q1_weeks) - yScale(s.q3_weeks));
      const boxTop = yScale(s.q3_weeks);

      const boxGroup = svg.append("g").attr("class", "box-group");

      boxGroup
        .append("rect")
        .attr("x", x)
        .attr("y", boxTop)
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("fill", color)
        .attr("fill-opacity", 0.6)
        .attr("stroke", color)
        .attr("stroke-width", 1);

      boxGroup
        .append("line")
        .attr("x1", x)
        .attr("x2", x + boxWidth)
        .attr("y1", yScale(s.median_weeks))
        .attr("y2", yScale(s.median_weeks))
        .attr("stroke", "#1a1a1a")
        .attr("stroke-width", 2);

      boxGroup
        .append("line")
        .attr("x1", x + boxWidth / 2)
        .attr("x2", x + boxWidth / 2)
        .attr("y1", yScale(s.min_weeks))
        .attr("y2", yScale(s.q1_weeks))
        .attr("stroke", color)
        .attr("stroke-width", 1.5);
      boxGroup.append("line").attr("x1", x + boxWidth / 2 - 4).attr("x2", x + boxWidth / 2 + 4).attr("y1", yScale(s.min_weeks)).attr("y2", yScale(s.min_weeks)).attr("stroke", color).attr("stroke-width", 1.5);

      boxGroup
        .append("line")
        .attr("x1", x + boxWidth / 2)
        .attr("x2", x + boxWidth / 2)
        .attr("y1", yScale(s.q3_weeks))
        .attr("y2", yScale(s.max_weeks))
        .attr("stroke", color)
        .attr("stroke-width", 1.5);
      boxGroup.append("line").attr("x1", x + boxWidth / 2 - 4).attr("x2", x + boxWidth / 2 + 4).attr("y1", yScale(s.max_weeks)).attr("y2", yScale(s.max_weeks)).attr("stroke", color).attr("stroke-width", 1.5);

      // Hit area for hover (full band height for easy targeting)
      boxGroup
        .append("rect")
        .attr("x", (xScale(groupKey) ?? 0))
        .attr("y", 0)
        .attr("width", xScale.bandwidth())
        .attr("height", height)
        .attr("fill", "transparent")
        .attr("pointer-events", "all")
        .style("cursor", "pointer")
        .on("mouseenter", function (event) {
          if (!tooltip) return;
          tooltip.innerHTML = `
            <strong>${s.groupLabel}</strong><br/>
            Songs: ${s.song_count.toLocaleString()}<br/>
            Min: ${s.min_weeks} wks<br/>
            Q1: ${s.q1_weeks} wks<br/>
            Median: ${s.median_weeks} wks<br/>
            Q3: ${s.q3_weeks} wks<br/>
            Max: ${s.max_weeks} wks<br/>
            Avg: ${s.avg_weeks.toFixed(1)} wks
          `;
          tooltip.style.display = "block";
          tooltip.style.left = `${event.clientX + 12}px`;
          tooltip.style.top = `${event.clientY + 12}px`;
          boxGroup.select("rect").attr("fill-opacity", 0.8);
        })
        .on("mousemove", function (event) {
          if (!tooltip || tooltip.style.display !== "block") return;
          tooltip.style.left = `${event.clientX + 12}px`;
          tooltip.style.top = `${event.clientY + 12}px`;
        })
        .on("mouseleave", function () {
          if (tooltip) tooltip.style.display = "none";
          boxGroup.select("rect").attr("fill-opacity", 0.6);
        });
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
    <div className="relative overflow-x-auto">
      <svg ref={svgRef} className="min-w-[520px]" />
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 hidden rounded-lg border border-zinc-700 bg-[#181818] px-3 py-2 text-sm shadow-lg"
        style={{ display: "none" }}
      />
    </div>
  );
}
