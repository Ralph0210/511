"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type DataPoint = { date: string; song: string; artist: string; rank: number };

export default function ChartNumberOnesByYear({ data }: { data: DataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const byYear = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.date.slice(0, 4)
    );
    const aggregated = Array.from(byYear.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 700 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(aggregated.map((d) => d.year))
      .range([0, width])
      .padding(0.3);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(aggregated, (d) => d.count) ?? 0])
      .nice()
      .range([height, 0]);

    svg
      .selectAll("rect")
      .data(aggregated)
      .join("rect")
      .attr("x", (d) => xScale(d.year) ?? 0)
      .attr("y", (d) => yScale(d.count))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - yScale(d.count))
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.85)
      .attr("rx", 4);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickValues(xScale.domain().filter((_, i) => i % 5 === 0)));

    svg.append("g").call(d3.axisLeft(yScale));

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text("Year");

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} className="min-w-[700px]" />
    </div>
  );
}
