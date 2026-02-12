"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Q3: What is the relationship between a song's peak rank and its overall chart longevity?
 *
 * Rationale:
 * - X-axis: Peak rank (1 = #1 hit, 100 = bottom of chart) — captures "how high" a song climbed
 * - Y-axis: Weeks on board (longevity) — operational definition of staying power
 * - Scatter: Each point = one song. Reveals correlation, outliers, and density.
 * - Hexbin overlay (optional): For dense scatters, d3.hexbin aggregates points into hexagonal
 *   bins to show density. Here we use alpha on circles to handle overplotting.
 * - Trend line: Linear regression (d3.regressionLinear) or LOESS. We use simple OLS to show
 *   the average relationship: do higher-peaking songs (lower rank number) chart longer?
 * - d3.bin for binning peak_rank if we want a binned view — but scatter + trend is standard.
 */
type DataPoint = { peak_rank: number; weeks_on_board: number };

function linearRegression(data: DataPoint[]): { m: number; b: number } {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of data) {
    sumX += p.peak_rank;
    sumY += p.weeks_on_board;
    sumXY += p.peak_rank * p.weeks_on_board;
    sumX2 += p.peak_rank * p.peak_rank;
  }
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

export default function ChartPeakVsLongevity({ data }: { data: DataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const margin = { top: 24, right: 24, bottom: 48, left: 52 };
    const width = 640 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([1, 100]).range([0, width]);

    const yExtent = d3.extent(data, (d) => d.weeks_on_board) as [number, number];
    const yScale = d3.scaleLinear().domain([0, yExtent[1] * 1.05]).range([height, 0]);

    // Trend line via OLS
    const { m, b } = linearRegression(data);
    const x0 = xScale.domain()[0];
    const x1 = xScale.domain()[1];
    const trendData: [number, number][] = [
      [x0, m * x0 + b],
      [x1, m * x1 + b],
    ];

    const trendLine = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    svg
      .append("path")
      .datum(trendData)
      .attr("fill", "none")
      .attr("stroke", "#e74c3c")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,4")
      .attr("opacity", 0.9)
      .attr("d", trendLine);

    // Scatter: semi-transparent circles for overplotting
    svg
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => xScale(d.peak_rank))
      .attr("cy", (d) => yScale(d.weeks_on_board))
      .attr("r", 2.5)
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.35)
      .attr("stroke", "none");

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .selectAll("text")
      .attr("font-size", 11);

    svg
      .append("g")
      .call(d3.axisLeft(yScale).ticks(8))
      .selectAll("text")
      .attr("font-size", 11);

    // Labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text("Peak rank (1 = #1 hit)");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 16)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text("Weeks on chart");

    svg
      .append("text")
      .attr("x", width)
      .attr("y", -8)
      .attr("text-anchor", "end")
      .attr("fill", "currentColor")
      .attr("font-size", 11)
      .attr("fill-opacity", 0.8)
      .text(`n = ${data.length.toLocaleString()}`);

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} className="min-w-[640px]" />
    </div>
  );
}
