"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type DataPoint = { week: string; rank: number; streams: number | null };

type Props = {
  data: DataPoint[];
  peakRank: number;
  /**
   * 0 = empty axes only
   * 1 = line appears (no animation, just drawn)
   * 2 = peak annotation + streams bars appear
   * 3 = full chart with all annotations
   */
  beat: number;
};

export default function ChartRiseScrolly({ data, peakRank, beat }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = 380;
    svg.attr("width", width).attr("height", height);

    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m-%d");
    const sorted = [...data].sort((a, b) => a.week.localeCompare(b.week));
    const dates = sorted.map((d) => parseDate(d.week)!);

    const x = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]).range([0, w]);
    const y = d3.scaleLinear().domain([200, 1]).range([h, 0]);
    const maxStreams = d3.max(sorted, (d) => d.streams || 0) || 1;
    const yStreams = d3.scaleLinear().domain([0, maxStreams]).range([h, h * 0.5]);

    // Grid lines
    [1, 10, 50, 100, 200].forEach((tick) => {
      g.append("line")
        .attr("x1", 0).attr("x2", w)
        .attr("y1", y(tick)).attr("y2", y(tick))
        .attr("stroke", "#f3f4f6").attr("stroke-dasharray", "3,3");
    });

    // Rank tier labels
    [
      { rank: 1, label: "#1" }, { rank: 10, label: "Top 10" },
      { rank: 50, label: "Top 50" }, { rank: 100, label: "Top 100" },
    ].forEach(({ rank, label }) => {
      g.append("text")
        .attr("x", w + 4).attr("y", y(rank))
        .attr("dy", "0.35em").attr("font-size", 8).attr("fill", "#d1d5db")
        .text(label);
    });

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6))
      .call((g) => g.select(".domain").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).tickValues([1, 10, 50, 100, 200]))
      .call((g) => g.select(".domain").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -35)
      .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#9ca3af")
      .text("Chart Rank");

    if (beat < 1) return; // Beat 0: just axes

    // Beat 1+: Draw area + line
    const area = d3.area<(typeof sorted)[0]>()
      .x((d) => x(parseDate(d.week)!))
      .y0(h).y1((d) => y(d.rank))
      .curve(d3.curveMonotoneX);

    g.append("path").datum(sorted).attr("d", area)
      .attr("fill", "#2563EB").attr("opacity", 0.06);

    const line = d3.line<(typeof sorted)[0]>()
      .x((d) => x(parseDate(d.week)!))
      .y((d) => y(d.rank))
      .curve(d3.curveMonotoneX);

    const path = g.append("path").datum(sorted).attr("d", line)
      .attr("fill", "none").attr("stroke", "#2563EB").attr("stroke-width", 2.5);

    // Animate line drawing
    const totalLength = path.node()?.getTotalLength() || 0;
    path.attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition().duration(1200).ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    if (beat < 2) return; // Beat 1: just the line

    // Beat 2+: Peak annotation
    const peakPoint = sorted.reduce((best, d) => d.rank < best.rank ? d : best);
    const peakDate = parseDate(peakPoint.week)!;

    g.append("circle")
      .attr("cx", x(peakDate)).attr("cy", y(peakPoint.rank))
      .attr("r", 0).attr("fill", "#2563EB").attr("stroke", "white").attr("stroke-width", 2)
      .transition().delay(800).duration(400)
      .attr("r", 6);

    g.append("text")
      .attr("x", x(peakDate)).attr("y", y(peakPoint.rank) - 14)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", "#2563EB")
      .attr("opacity", 0)
      .transition().delay(900).duration(300)
      .attr("opacity", 1)
      .text(`Peak: #${peakPoint.rank}`);

    if (beat < 3) return; // Beat 2: line + peak

    // Beat 3: Streams bars overlay
    const hasStreams = sorted.some((d) => d.streams && d.streams > 0);
    if (hasStreams) {
      const barWidth = Math.max(2, w / sorted.length - 1);

      g.selectAll(".stream-bar")
        .data(sorted.filter((d) => d.streams && d.streams > 0))
        .join("rect")
        .attr("x", (d) => x(parseDate(d.week)!) - barWidth / 2)
        .attr("y", h)
        .attr("width", barWidth)
        .attr("height", 0)
        .attr("fill", "#F59E0B")
        .attr("opacity", 0.4)
        .transition().duration(600).delay((_, i) => i * 15)
        .attr("y", (d) => yStreams(d.streams!))
        .attr("height", (d) => h - yStreams(d.streams!));

      // Streams axis label
      g.append("text")
        .attr("x", w).attr("y", h + 38)
        .attr("text-anchor", "end").attr("font-size", 9).attr("fill", "#F59E0B")
        .attr("opacity", 0)
        .transition().delay(400).duration(300).attr("opacity", 1)
        .text("Weekly streams ▲");
    }
  }, [data, beat, peakRank]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
