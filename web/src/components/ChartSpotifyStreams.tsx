"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Avg weekly streams by year, split into two series:
 *   - Top 10 (rank 1–10): the "hits" tier
 *   - Rank 11–200: the broader chart
 *
 * X-axis: year (2017–2021)
 * Y-axis: average streams per entry (in millions)
 *
 * Shows whether the top-10 songs pull increasingly further ahead of the rest
 * of the chart as streaming platforms amplify winner-takes-all dynamics.
 */
export type StreamsDataPoint = {
  year: number;
  avgStreamsTop10: number;
  avgStreamsRest: number;
  countTop10: number;
  countRest: number;
};

export default function ChartSpotifyStreams({ data }: { data: StreamsDataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const tooltip = tooltipRef.current;
    const margin = { top: 32, right: 120, bottom: 48, left: 68 };
    const width = 720 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const years = data.map((d) => d.year);
    const xScale = d3
      .scaleLinear()
      .domain([Math.min(...years), Math.max(...years)])
      .range([0, width]);

    const yMax =
      d3.max(data, (d) => Math.max(d.avgStreamsTop10, d.avgStreamsRest)) ?? 0;
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax * 1.1])
      .range([height, 0]);

    const toM = (v: number) => v / 1_000_000;

    // Grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke", "#3f3f46")
          .attr("stroke-dasharray", "3,3")
      );

    // Lines
    const lineTop10 = d3
      .line<StreamsDataPoint>()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.avgStreamsTop10))
      .curve(d3.curveMonotoneX);

    const lineRest = d3
      .line<StreamsDataPoint>()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.avgStreamsRest))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#f97316") // orange — Top 10
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("d", lineTop10);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#6366f1") // indigo — rest
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("d", lineRest);

    // Dots
    const addDots = (
      key: "avgStreamsTop10" | "avgStreamsRest",
      color: string
    ) => {
      svg
        .selectAll(`circle.dot-${key}`)
        .data(data)
        .join("circle")
        .attr("class", `dot-${key}`)
        .attr("cx", (d) => xScale(d.year))
        .attr("cy", (d) => yScale(d[key]))
        .attr("r", 5)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          if (!tooltip) return;
          const countKey = key === "avgStreamsTop10" ? "countTop10" : "countRest";
          const label = key === "avgStreamsTop10" ? "Top 10" : "Rank 11–200";
          tooltip.innerHTML = `
            <strong>${d.year} · ${label}</strong><br/>
            Avg streams: <strong>${toM(d[key]).toFixed(2)}M</strong><br/>
            Entries: ${d[countKey].toLocaleString()}
          `;
          tooltip.style.display = "block";
          tooltip.style.left = `${event.clientX + 12}px`;
          tooltip.style.top = `${event.clientY + 12}px`;
        })
        .on("mousemove", function (event) {
          if (!tooltip || tooltip.style.display !== "block") return;
          tooltip.style.left = `${event.clientX + 12}px`;
          tooltip.style.top = `${event.clientY + 12}px`;
        })
        .on("mouseleave", function () {
          if (tooltip) tooltip.style.display = "none";
        });
    };

    addDots("avgStreamsTop10", "#f97316");
    addDots("avgStreamsRest", "#6366f1");

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(years)
          .tickFormat((y) => String(y))
      )
      .selectAll("text")
      .attr("font-size", 11);

    svg
      .append("g")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickFormat((v) => `${toM(+v).toFixed(0)}M`)
      )
      .selectAll("text")
      .attr("font-size", 11);

    // Y-axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 14)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text("Avg streams per entry");

    // Legend
    const legend = [
      { label: "Top 10 (rank 1–10)", color: "#f97316" },
      { label: "Rank 11–200", color: "#6366f1" },
    ];
    legend.forEach(({ label, color }, i) => {
      const lx = width + 12;
      const ly = 20 + i * 22;
      svg.append("line").attr("x1", lx).attr("x2", lx + 16).attr("y1", ly).attr("y2", ly).attr("stroke", color).attr("stroke-width", 2.5);
      svg.append("circle").attr("cx", lx + 8).attr("cy", ly).attr("r", 4).attr("fill", color).attr("stroke", "white").attr("stroke-width", 1.5);
      svg.append("text").attr("x", lx + 22).attr("y", ly + 4).attr("font-size", 11).attr("fill", "currentColor").text(label);
    });

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
