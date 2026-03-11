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

const WIDTH = 800;
const HEIGHT = 400;
const MARGIN = { top: 28, right: 64, bottom: 56, left: 64 };
const W = WIDTH - MARGIN.left - MARGIN.right;
const H = HEIGHT - MARGIN.top - MARGIN.bottom;

export default function PreviewLongevity({ data }: Props) {
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
      .attr("id", "longevity-clip")
      .append("rect")
      .attr("width", W)
      .attr("height", H);

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const dataGroup = g
      .append("g")
      .attr("clip-path", "url(#longevity-clip)");

    const maxWeeks = d3.max(data, (d) => d.weeks) ?? 50;
    const x = d3.scaleLinear().domain([0, maxWeeks]).range([0, W]).clamp(true);
    const y = d3.scaleLinear().domain([1, 200]).range([0, H]).clamp(true);

    // Grid lines
    [50, 100, 150].forEach((tick) => {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", W)
        .attr("y1", y(tick))
        .attr("y2", y(tick))
        .attr("stroke", "#27272a")
        .attr("stroke-dasharray", "2,3")
        .attr("opacity", 0.5);
    });

    // Points — render "other" first (background), then featured categories on top
    const categories: LongevityCategory[] = ["other", "slow_burn", "sustained", "viral"];
    for (const cat of categories) {
      const points = data.filter((d) => d.category === cat);
      dataGroup
        .selectAll(`.dot-${cat}`)
        .data(points)
        .join("circle")
        .attr("cx", (d) => x(d.weeks))
        .attr("cy", (d) => y(d.peak))
        .attr("r", cat === "other" ? 2.5 : 4)
        .attr("fill", LONGEVITY_COLORS[cat])
        .attr("opacity", cat === "other" ? 0.2 : 0.6);
    }

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0).tickPadding(8))
      .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
      .call((sel) =>
        sel
          .selectAll(".tick line")
          .attr("stroke", "#3f3f46")
      )
      .call((sel) =>
        sel
          .selectAll(".tick text")
          .attr("fill", "#9CA3AF")
          .attr("font-size", 12)
      );

    g.append("text")
      .attr("x", W / 2)
      .attr("y", H + 44)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("font-weight", 500)
      .attr("fill", "#71717a")
      .text("Weeks on Chart");

    // Y axis
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .tickValues([1, 50, 100, 150, 200])
          .tickSizeOuter(0)
          .tickPadding(8)
          .tickFormat((d) => `#${d}`)
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

    // Legend
    const legendCats: LongevityCategory[] = ["viral", "sustained", "slow_burn"];
    const legend = g.append("g").attr("transform", `translate(${W - 260},0)`);
    legendCats.forEach((cat, i) => {
      const lx = i * 90;
      legend
        .append("circle")
        .attr("cx", lx)
        .attr("cy", -8)
        .attr("r", 4)
        .attr("fill", LONGEVITY_COLORS[cat]);
      legend
        .append("text")
        .attr("x", lx + 8)
        .attr("y", -4)
        .text(CATEGORY_LABELS[cat])
        .attr("font-size", 12)
        .attr("font-weight", 500)
        .attr("fill", "#9CA3AF");
    });
  }, [data]);

  return (
    <svg
      ref={ref}
      className="w-full"
      role="img"
      aria-label="Scatter plot showing song longevity categories: viral spikes, sustained hits, and slow burns"
    />
  );
}
