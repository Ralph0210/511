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

const WIDTH = 800;
const HEIGHT = 400;
const MARGIN = { top: 28, right: 90, bottom: 56, left: 64 };
const W = WIDTH - MARGIN.left - MARGIN.right;
const H = HEIGHT - MARGIN.top - MARGIN.bottom;

export default function PreviewGenrePulse({ data }: Props) {
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
      .attr("id", "genre-clip")
      .append("rect")
      .attr("width", W)
      .attr("height", H);

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const dataGroup = g
      .append("g")
      .attr("clip-path", "url(#genre-clip)");

    // Determine which genres appear in data
    const allGenres = new Set<string>();
    data.forEach((d) => Object.keys(d.shares).forEach((genre) => allGenres.add(genre)));
    const genres = GENRE_ORDER.filter((genre) => allGenres.has(genre));

    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, W]);
    const y = d3.scaleLinear().domain([0, 100]).range([H, 0]).clamp(true);

    // Build stack data
    const stackData = data.map((d) => {
      const obj: Record<string, number> = { year: d.year };
      genres.forEach((genre) => {
        obj[genre] = d.shares[genre] || 0;
      });
      return obj;
    });

    const stack = d3
      .stack<Record<string, number>>()
      .keys(genres)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(stackData);

    const area = d3
      .area<d3.SeriesPoint<Record<string, number>>>()
      .x((d) => x(d.data.year))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveBasis);

    dataGroup
      .selectAll(".genre-area")
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
        .attr("x", W + 8)
        .attr("y", midY)
        .attr("dy", "0.35em")
        .attr("font-size", 12)
        .attr("fill", GENRE_COLORS[s.key] || "#9CA3AF")
        .attr("font-weight", 500)
        .text(s.key);
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

    // Y axis (percentage)
    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .tickValues([0, 25, 50, 75, 100])
          .tickSizeOuter(0)
          .tickPadding(8)
          .tickFormat((d) => `${d}%`)
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
      aria-label="Stacked area chart showing genre market share trends over time"
    />
  );
}
