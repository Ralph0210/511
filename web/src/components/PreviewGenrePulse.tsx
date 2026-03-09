"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { GENRE_COLORS } from "@/lib/spotify-data";

type YearShare = {
  year: number;
  shares: Record<string, number>;
};

// Display order — most prominent first
const GENRE_ORDER = ["Pop", "Hip Hop/Rap", "Latin", "R&B", "EDM/Dance", "Rock", "K-Pop", "Country", "Other"];

type Props = {
  data: YearShare[];
};

export default function PreviewGenrePulse({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth;
    const height = ref.current.clientHeight;
    const margin = { top: 12, right: 80, bottom: 24, left: 16 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Determine which genres appear in data
    const allGenres = new Set<string>();
    data.forEach((d) => Object.keys(d.shares).forEach((g) => allGenres.add(g)));
    const genres = GENRE_ORDER.filter((g) => allGenres.has(g));

    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, w]);
    const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

    // Build stack data
    const stackData = data.map((d) => {
      const obj: Record<string, number> = { year: d.year };
      genres.forEach((genre) => {
        obj[genre] = d.shares[genre] || 0;
      });
      return obj;
    });

    const stack = d3.stack<Record<string, number>>()
      .keys(genres)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(stackData);

    const area = d3.area<d3.SeriesPoint<Record<string, number>>>()
      .x((d) => x(d.data.year))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveBasis);

    g.selectAll(".genre-area")
      .data(series)
      .join("path")
      .attr("d", area)
      .attr("fill", (d) => GENRE_COLORS[d.key] || "#9CA3AF")
      .attr("opacity", 0.75);

    // Right-side labels (top 6 genres only to avoid clutter)
    series.slice(0, 6).forEach((s) => {
      const lastPoint = s[s.length - 1];
      const midY = (y(lastPoint[0]) + y(lastPoint[1])) / 2;
      g.append("text")
        .attr("x", w + 8)
        .attr("y", midY)
        .attr("dy", "0.35em")
        .attr("font-size", 8)
        .attr("fill", GENRE_COLORS[s.key] || "#9CA3AF")
        .attr("font-weight", 500)
        .text(s.key);
    });

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => String(d)).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 9));
  }, [data]);

  return (
    <svg ref={ref} className="h-full w-full" preserveAspectRatio="xMidYMid meet" />
  );
}
