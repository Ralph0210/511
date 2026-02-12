"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type DataPoint = { song: string; artist: string; weeks: number };

export default function ChartWeeksOnBoard({ data }: { data: DataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const margin = { top: 20, right: 20, bottom: 80, left: 120 };
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
      .domain([0, d3.max(data, (d) => d.weeks) ?? 0])
      .range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => `${d.song} – ${d.artist}`))
      .range([0, height])
      .padding(0.25);

    svg
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d) => yScale(`${d.song} – ${d.artist}`) ?? 0)
      .attr("width", (d) => xScale(d.weeks))
      .attr("height", yScale.bandwidth())
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.8)
      .attr("rx", 4);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(8));

    svg
      .append("g")
      .call(
        d3
          .axisLeft(yScale)
          .tickFormat((d) => (d.length > 28 ? d.slice(0, 25) + "…" : d))
      )
      .selectAll("text")
      .attr("font-size", 10);

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
