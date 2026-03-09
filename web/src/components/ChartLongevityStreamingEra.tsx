"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Q4: How has the longevity of Billboard Hot 100 songs changed over time,
 * and what does this reveal about shifting chart dynamics in the streaming era?
 *
 * Incorporates the streaming era by:
 * - Shaded vertical band (2013–present): Marks when streaming consumption became dominant
 *   (Billboard added streaming in 2007, but 2013+ is when streaming reshaped industry dynamics)
 * - Era averages: Pre-streaming vs streaming-era mean longevity for direct comparison
 * - Visual framing: Lets viewers see if longevity trends differ before/after the shift
 */
const STREAMING_ERA_START = 2013;

type DataPoint = { debut_year: number; avg_lifespan: number; song_count: number };

export default function ChartLongevityStreamingEra({ data }: { data: DataPoint[] }) {
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

    // Era splits: pre-streaming vs streaming
    const preStreaming = data.filter((d) => d.debut_year < STREAMING_ERA_START);
    const streamingEra = data.filter((d) => d.debut_year >= STREAMING_ERA_START);

    const preStreamingTotal = preStreaming.reduce((sum, d) => sum + d.song_count, 0);
    const streamingTotal = streamingEra.reduce((sum, d) => sum + d.song_count, 0);
    const preStreamingAvg =
      preStreamingTotal > 0
        ? preStreaming.reduce((sum, d) => sum + d.avg_lifespan * d.song_count, 0) / preStreamingTotal
        : 0;
    const streamingAvg =
      streamingTotal > 0
        ? streamingEra.reduce((sum, d) => sum + d.avg_lifespan * d.song_count, 0) / streamingTotal
        : 0;

    // Streaming era shaded band (draw first, behind everything)
    const bandStart = Math.max(xExtent[0], STREAMING_ERA_START - 0.5);
    const bandEnd = xExtent[1] + 0.5;
    if (bandEnd > STREAMING_ERA_START) {
      svg
        .append("rect")
        .attr("x", xScale(bandStart))
        .attr("y", 0)
        .attr("width", xScale(bandEnd) - xScale(bandStart))
        .attr("height", height)
        .attr("fill", "#1e3a5f")
        .attr("fill-opacity", 0.12)
        .attr("rx", 0);

      svg
        .append("line")
        .attr("x1", xScale(STREAMING_ERA_START))
        .attr("x2", xScale(STREAMING_ERA_START))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4")
        .attr("opacity", 0.7);

      svg
        .append("text")
        .attr("x", xScale(STREAMING_ERA_START) + 6)
        .attr("y", 16)
        .attr("fill", "#3b82f6")
        .attr("font-size", 11)
        .attr("font-weight", 600)
        .text("Streaming era →");
    }

    // Era average reference lines
    if (preStreamingAvg > 0) {
      const yPre = yScale(preStreamingAvg);
      svg
        .append("line")
        .attr("x1", 0)
        .attr("x2", xScale(Math.min(STREAMING_ERA_START, xExtent[1])))
        .attr("y1", yPre)
        .attr("y2", yPre)
        .attr("stroke", "#64748b")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "6,4")
        .attr("opacity", 0.8);
    }
    if (streamingAvg > 0 && streamingEra.length) {
      const yStream = yScale(streamingAvg);
      const xStart = xScale(Math.max(STREAMING_ERA_START, xExtent[0]));
      svg
        .append("line")
        .attr("x1", xStart)
        .attr("x2", width)
        .attr("y1", yStream)
        .attr("y2", yStream)
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "6,4")
        .attr("opacity", 0.8);
    }

    // Area + line (same as Q1)
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
      .attr("fill-opacity", 0.3)
      .attr("d", area);

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

    // Hover points
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
        const era = d.debut_year >= STREAMING_ERA_START ? "Streaming era" : "Pre-streaming";
        tooltip.innerHTML = `
          <strong>${d.debut_year}</strong> (${era})<br/>
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

    // Era legend
    const legendY = -8;
    if (preStreamingAvg > 0) {
      svg
        .append("text")
        .attr("x", 0)
        .attr("y", legendY)
        .attr("fill", "#64748b")
        .attr("font-size", 10)
        .attr("font-weight", 500)
        .text(`Pre-streaming avg: ${preStreamingAvg.toFixed(1)} wks`);
    }
    if (streamingAvg > 0 && streamingEra.length) {
      svg
        .append("text")
        .attr("x", width)
        .attr("y", legendY)
        .attr("text-anchor", "end")
        .attr("fill", "#3b82f6")
        .attr("font-size", 10)
        .attr("font-weight", 500)
        .text(`Streaming era avg: ${streamingAvg.toFixed(1)} wks`);
    }

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
