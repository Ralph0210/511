"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ScatterPoint } from "@/lib/featured-exemplars";
import { LONGEVITY_COLORS, type LongevityCategory } from "@/lib/spotify-data";

const CATEGORY_LABELS: Record<string, string> = {
  viral: "Viral Spike",
  sustained: "Sustained Hit",
  slow_burn: "Slow Burn",
  other: "Other",
};

type Props = {
  data: ScatterPoint[];
};

export default function PreviewLongevity({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth;
    const height = ref.current.clientHeight;
    const margin = { top: 12, right: 16, bottom: 28, left: 34 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.weeks) || 50]).range([0, w]);
    const y = d3.scaleLinear().domain([1, 200]).range([0, h]);

    // Grid lines
    [50, 100, 150].forEach((tick) => {
      g.append("line")
        .attr("x1", 0).attr("x2", w)
        .attr("y1", y(tick)).attr("y2", y(tick))
        .attr("stroke", "#e5e7eb").attr("stroke-dasharray", "2,3").attr("opacity", 0.5);
    });

    // Points
    const categories: LongevityCategory[] = ["other", "slow_burn", "sustained", "viral"];
    for (const cat of categories) {
      const points = data.filter((d) => d.category === cat);
      g.selectAll(`.dot-${cat}`)
        .data(points)
        .join("circle")
        .attr("cx", (d) => x(d.weeks))
        .attr("cy", (d) => y(d.peak))
        .attr("r", cat === "other" ? 1.5 : 2.5)
        .attr("fill", LONGEVITY_COLORS[cat])
        .attr("opacity", cat === "other" ? 0.2 : 0.6);
    }

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 8).attr("dy", 8));

    g.append("text")
      .attr("x", w / 2).attr("y", h + 24)
      .attr("text-anchor", "middle")
      .attr("font-size", 8).attr("fill", "#9ca3af")
      .text("Weeks on Chart");

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).tickValues([1, 50, 100, 150, 200]).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 8).attr("dx", -2));

    // Legend
    const legendCats: LongevityCategory[] = ["viral", "sustained", "slow_burn"];
    const legend = g.append("g").attr("transform", `translate(${w - 180},0)`);
    legendCats.forEach((cat, i) => {
      const lx = i * 64;
      legend.append("circle")
        .attr("cx", lx).attr("cy", 4).attr("r", 3)
        .attr("fill", LONGEVITY_COLORS[cat]);
      legend.append("text")
        .attr("x", lx + 6).attr("y", 7)
        .text(CATEGORY_LABELS[cat])
        .attr("font-size", 7).attr("fill", "#9ca3af");
    });
  }, [data]);

  return (
    <svg ref={ref} className="h-full w-full" preserveAspectRatio="xMidYMid meet" />
  );
}
