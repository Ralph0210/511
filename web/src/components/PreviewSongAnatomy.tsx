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

const WIDTH = 800;
const HEIGHT = 400;
const MARGIN = { top: 28, right: 100, bottom: 56, left: 64 };
const W = WIDTH - MARGIN.left - MARGIN.right;
const H = HEIGHT - MARGIN.top - MARGIN.bottom;

export default function PreviewSongAnatomy({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    svg
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");

    // Clip path
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "anatomy-clip")
      .append("rect")
      .attr("width", W)
      .attr("height", H);

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const dataGroup = g
      .append("g")
      .attr("clip-path", "url(#anatomy-clip)");

    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, W]);

    const y = d3.scaleLinear().domain([0, 1]).range([H, 0]).clamp(true);

    // Grid
    [0.25, 0.5, 0.75].forEach((tick) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", W)
        .attr("y1", y(tick))
        .attr("y2", y(tick))
        .attr("stroke", "#27272a")
        .attr("stroke-dasharray", "2,3")
        .attr("opacity", 0.5);
    });

    // Lines for each attribute
    ATTRIBUTES.forEach((attr) => {
      const line = d3
        .line<YearPoint>()
        .x((d) => x(d.year))
        .y((d) => y(d[attr.key]))
        .curve(d3.curveMonotoneX);

      dataGroup
        .append("path")
        .datum(data)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", attr.color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.85);

      // Dots
      dataGroup
        .selectAll(`.dot-${attr.key}`)
        .data(data)
        .join("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d[attr.key]))
        .attr("r", 3)
        .attr("fill", attr.color);

      // Right-side label (outside clip area)
      const lastPoint = data[data.length - 1];
      g.append("text")
        .attr("x", W + 8)
        .attr("y", y(lastPoint[attr.key]))
        .attr("dy", "0.35em")
        .attr("font-size", 12)
        .attr("fill", attr.color)
        .attr("font-weight", 500)
        .text(attr.label);
    });

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${H})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickFormat((d) => String(d))
          .tickSizeOuter(0)
          .tickPadding(8)
      )
      .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
      .call((sel) =>
        sel.selectAll(".tick line").attr("stroke", "#3f3f46")
      )
      .call((sel) =>
        sel
          .selectAll(".tick text")
          .attr("fill", "#9CA3AF")
          .attr("font-size", 12)
      );

    // Y axis
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSizeOuter(0)
          .tickPadding(8)
      )
      .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
      .call((sel) =>
        sel.selectAll(".tick line").attr("stroke", "#3f3f46")
      )
      .call((sel) =>
        sel
          .selectAll(".tick text")
          .attr("fill", "#9CA3AF")
          .attr("font-size", 12)
      );
  }, [data]);

  return (
    <svg
      ref={ref}
      className="w-full"
      role="img"
      aria-label="Line chart showing trends in danceability, energy, valence, and acousticness over time"
    />
  );
}
