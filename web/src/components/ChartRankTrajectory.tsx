"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import ScrollyProgress from "./ScrollyProgress";

type DataPoint = {
  week: string;
  rank: number;
  streams: number | null;
};

type Props = {
  data: DataPoint[];
  peakRank: number;
  weeksOnChart: number;
};

export default function ChartRankTrajectory({ data, peakRank, weeksOnChart }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [progress, setProgress] = useState(0);
  const drawnRef = useRef(false);

  const handleProgress = useCallback((p: number) => {
    setProgress(p);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = 320;
    svg.attr("width", width).attr("height", height);

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m-%d");
    const sortedData = [...data].sort((a, b) => a.week.localeCompare(b.week));
    const dates = sortedData.map((d) => parseDate(d.week)!);

    const x = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]).range([0, w]);
    const y = d3.scaleLinear().domain([200, 1]).range([h, 0]);

    // Grid
    g.selectAll(".grid-line")
      .data([1, 10, 50, 100, 200])
      .join("line")
      .attr("x1", 0).attr("x2", w)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#27272a").attr("stroke-dasharray", "3,3");

    // Rank tier labels
    g.selectAll(".tier-label")
      .data([
        { rank: 1, label: "#1" },
        { rank: 10, label: "Top 10" },
        { rank: 50, label: "Top 50" },
        { rank: 100, label: "Top 100" },
      ])
      .join("text")
      .attr("x", w + 4).attr("y", (d) => y(d.rank))
      .attr("dy", "0.35em").attr("font-size", 8).attr("fill", "#52525b")
      .text((d) => d.label);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6))
      .call((g) => g.select(".domain").attr("stroke", "#3f3f46"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#3f3f46"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 10));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).tickValues([1, 10, 50, 100, 200]))
      .call((g) => g.select(".domain").attr("stroke", "#3f3f46"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#3f3f46"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 10));

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -35)
      .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#71717a")
      .text("Chart Rank");

    // Area
    const area = d3
      .area<(typeof sortedData)[0]>()
      .x((d) => x(parseDate(d.week)!))
      .y0(h)
      .y1((d) => y(d.rank))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(sortedData)
      .attr("d", area)
      .attr("fill", "#1DB954")
      .attr("opacity", 0.06);

    // Line — animate with progress
    const line = d3
      .line<(typeof sortedData)[0]>()
      .x((d) => x(parseDate(d.week)!))
      .y((d) => y(d.rank))
      .curve(d3.curveMonotoneX);

    const path = g
      .append("path")
      .datum(sortedData)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#1DB954")
      .attr("stroke-width", 2.5);

    // Animate: draw line progressively
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength);

    // Animate on scroll progress
    const animateProgress = Math.min(1, Math.max(0, (progress - 0.1) / 0.6));
    path.attr("stroke-dashoffset", totalLength * (1 - animateProgress));

    // Peak annotation
    if (animateProgress > 0.3) {
      const peakPoint = sortedData.reduce((best, d) => (d.rank < best.rank ? d : best));
      const peakDate = parseDate(peakPoint.week)!;

      g.append("circle")
        .attr("cx", x(peakDate)).attr("cy", y(peakPoint.rank))
        .attr("r", 5)
        .attr("fill", "#1DB954")
        .attr("stroke", "white").attr("stroke-width", 2);

      g.append("text")
        .attr("x", x(peakDate))
        .attr("y", y(peakPoint.rank) - 12)
        .attr("text-anchor", "middle")
        .attr("font-size", 11).attr("font-weight", 600).attr("fill", "#1DB954")
        .text(`Peak: #${peakPoint.rank}`);
    }
  }, [data, progress]);

  return (
    <ScrollyProgress onProgress={handleProgress} className="mt-8">
      <div className="rounded-2xl border border-zinc-800 bg-[#181818] p-4">
        <div className="mb-3 flex items-center gap-4 text-xs text-muted">
          <span>Peak: <strong className="text-zinc-100">#{peakRank}</strong></span>
          <span>Weeks on chart: <strong className="text-zinc-100">{weeksOnChart}</strong></span>
        </div>
        <svg ref={svgRef} className="w-full" />
      </div>
    </ScrollyProgress>
  );
}
