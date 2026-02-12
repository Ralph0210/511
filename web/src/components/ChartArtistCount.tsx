"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type DataPoint = { artist: string; count: number };

export default function ChartArtistCount({ data }: { data: DataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const margin = { top: 20, right: 20, bottom: 60, left: 100 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count) ?? 0])
      .range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.artist))
      .range([0, height])
      .padding(0.2);

    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, data.length]);

    svg
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.artist) ?? 0)
      .attr("width", (d) => xScale(d.count))
      .attr("height", yScale.bandwidth())
      .attr("fill", (_, i) => colorScale(i))
      .attr("rx", 4);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6));

    svg
      .append("g")
      .call(
        d3
          .axisLeft(yScale)
          .tickFormat((d) => (d.length > 20 ? d.slice(0, 17) + "…" : d))
      )
      .selectAll("text")
      .attr("font-size", 11);

    return () => {
      d3.select(svgRef.current).selectAll("*").remove();
    };
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} className="min-w-[600px]" />
    </div>
  );
}
