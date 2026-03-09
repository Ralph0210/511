"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Q1: How has the average lifespan of songs on the Billboard Hot 100 changed over time?
 *
 * Rationale:
 * - X-axis: Debut year (when a song first entered the chart) — temporal dimension to track evolution
 * - Y-axis: Average lifespan (mean of max weeks_on_board per song) — our operational definition of "lifespan"
 * - Line + area: Line shows the trend; area fill emphasizes magnitude and makes the trend visually salient.
 *   d3.area() creates a filled region that helps the eye track the overall level across time.
 * - d3.curveMonotoneX: Preserves monotonicity in x (no overshooting), appropriate for temporal data.
 */
type DataPoint = { debut_year: number; avg_lifespan: number; song_count: number };

export default function ChartAvgLifespanOverTime({ data }: { data: DataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const tooltip = tooltipRef.current;
    const margin = { top: 24, right: 24, bottom: 48, left: 52 };
    const width = 720 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xExtent = d3.extent(data, (d) => d.debut_year) as [number, number];
    const xScale = d3.scaleLinear().domain(xExtent).range([0, width]);

    const yMax = d3.max(data, (d) => d.avg_lifespan) ?? 0;
    const yScale = d3.scaleLinear().domain([0, Math.max(yMax * 1.05, 10)]).range([height, 0]);

    // Overall average across all history (weighted by song count)
    const totalSongs = data.reduce((sum, d) => sum + d.song_count, 0);
    const overallAvg = totalSongs > 0
      ? data.reduce((sum, d) => sum + d.avg_lifespan * d.song_count, 0) / totalSongs
      : 0;

    // Reference line: overall historical average
    if (overallAvg > 0) {
      const yAvg = yScale(overallAvg);
      svg
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yAvg)
        .attr("y2", yAvg)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "6,4");

      svg
        .append("text")
        .attr("x", width - 4)
        .attr("y", yAvg - 6)
        .attr("text-anchor", "end")
        .attr("fill", "#e74c3c")
        .attr("font-size", 11)
        .attr("font-weight", 500)
        .text(`Overall avg: ${overallAvg.toFixed(1)} wks`);
    }

    // Area: filled region under the line for visual weight
    const area = d3
      .area<DataPoint>()
      .x((d) => xScale(d.debut_year))
      .y0(height)
      .y1((d) => yScale(d.avg_lifespan))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.25)
      .attr("d", area);

    // Line: primary trend signal
    const line = d3
      .line<DataPoint>()
      .x((d) => xScale(d.debut_year))
      .y((d) => yScale(d.avg_lifespan))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);

    // Hover points: invisible circles for tooltip interaction
    svg
      .selectAll("circle.hover-point")
      .data(data)
      .join("circle")
      .attr("class", "hover-point")
      .attr("cx", (d) => xScale(d.debut_year))
      .attr("cy", (d) => yScale(d.avg_lifespan))
      .attr("r", 12)
      .attr("fill", "transparent")
      .attr("pointer-events", "all")
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        if (!tooltip) return;
        tooltip.innerHTML = `
          <strong>${d.debut_year}</strong><br/>
          Avg. lifespan: ${d.avg_lifespan.toFixed(1)} wks<br/>
          Songs: ${d.song_count.toLocaleString()}
        `;
        tooltip.style.display = "block";
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY + 12}px`;
        d3.select(this).raise();
      })
      .on("mousemove", function (event) {
        if (!tooltip || tooltip.style.display !== "block") return;
        tooltip.style.left = `${event.clientX + 12}px`;
        tooltip.style.top = `${event.clientY + 12}px`;
      })
      .on("mouseleave", function () {
        if (tooltip) tooltip.style.display = "none";
      });

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat((y) => String(y)))
      .selectAll("text")
      .attr("font-size", 11);

    svg
      .append("g")
      .call(d3.axisLeft(yScale).ticks(6))
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
      .text("Avg. weeks on chart");

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data]);

  return (
    <div className="relative overflow-x-auto">
      <svg ref={svgRef} className="min-w-[720px]" />
      <div
        ref={tooltipRef}
        className="pointer-events-none fixed z-50 hidden rounded-lg border border-zinc-700 bg-[#181818] px-3 py-2 text-sm shadow-lg"
        style={{ display: "none" }}
      />
    </div>
  );
}
