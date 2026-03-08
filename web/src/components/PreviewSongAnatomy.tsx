"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type YearPoint = {
  year: number;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
};

const ATTRIBUTES = [
  { key: "danceability" as const, color: "#8B5CF6", label: "Danceability" },
  { key: "energy" as const, color: "#EF4444", label: "Energy" },
  { key: "valence" as const, color: "#F59E0B", label: "Valence" },
  { key: "acousticness" as const, color: "#10B981", label: "Acousticness" },
];

type Props = {
  data: YearPoint[];
};

export default function PreviewSongAnatomy({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth;
    const height = ref.current.clientHeight;
    const margin = { top: 12, right: 90, bottom: 28, left: 34 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, w]);

    const y = d3.scaleLinear().domain([0, 1]).range([h, 0]);

    // Grid
    [0.25, 0.5, 0.75].forEach((tick) => {
      g.append("line")
        .attr("x1", 0).attr("x2", w)
        .attr("y1", y(tick)).attr("y2", y(tick))
        .attr("stroke", "#e5e7eb").attr("stroke-dasharray", "2,3").attr("opacity", 0.5);
    });

    // Lines for each attribute
    ATTRIBUTES.forEach((attr) => {
      const line = d3.line<YearPoint>()
        .x((d) => x(d.year))
        .y((d) => y(d[attr.key]))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(data)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", attr.color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.85);

      // Dots
      g.selectAll(`.dot-${attr.key}`)
        .data(data)
        .join("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d[attr.key]))
        .attr("r", 2.5)
        .attr("fill", attr.color);

      // Right-side label
      const lastPoint = data[data.length - 1];
      g.append("text")
        .attr("x", w + 6)
        .attr("y", y(lastPoint[attr.key]))
        .attr("dy", "0.35em")
        .attr("font-size", 8)
        .attr("fill", attr.color)
        .attr("font-weight", 500)
        .text(attr.label);
    });

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => String(d)).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 8).attr("dy", 8));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(4).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 8).attr("dx", -2));
  }, [data]);

  return (
    <svg ref={ref} className="h-full w-full" preserveAspectRatio="xMidYMid meet" />
  );
}
