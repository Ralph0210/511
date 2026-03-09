"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import ScrollySection from "./ScrollySection";
import { GENRE_COLORS } from "@/lib/spotify-data";

type GenreShare = {
  period: string;
  genre: string;
  share: number;
};

type Props = {
  data: GenreShare[];
  highlightGenre: string;
  songFirstWeek: string;
  songLastWeek: string;
};

export default function ChartGenreContext({ data, highlightGenre, songFirstWeek, songLastWeek }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const genres = useMemo(() => {
    return Array.from(new Set(data.map((d) => d.genre))).sort();
  }, [data]);

  const periods = useMemo(() => {
    return Array.from(new Set(data.map((d) => d.period))).sort();
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !periods.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = 300;
    svg.attr("width", width).attr("height", height);

    const margin = { top: 16, right: 90, bottom: 36, left: 40 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint<string>().domain(periods).range([0, w]).padding(0.1);
    const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

    // Build stacked data
    const stackData = periods.map((p) => {
      const obj: Record<string, number> = {};
      for (const genre of genres) {
        const match = data.find((d) => d.period === p && d.genre === genre);
        obj[genre] = match ? match.share : 0;
      }
      return { ...obj, _period: p };
    });

    const stack = d3
      .stack<Record<string, number | string>>()
      .keys(genres)
      .value((d, key) => (d[key] as number) || 0)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(stackData as unknown as Record<string, number>[]);

    const area = d3
      .area<d3.SeriesPoint<Record<string, number>>>()
      .x((_, i) => x(periods[i])!)
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveBasis);

    // Draw areas
    g.selectAll(".genre-area")
      .data(series)
      .join("path")
      .attr("d", area as unknown as string)
      .attr("fill", (d) => GENRE_COLORS[d.key] || "#52525b")
      .attr("opacity", (d) => (d.key === highlightGenre ? 0.85 : 0.3));

    // Highlight band for song's chart period
    const songStart = songFirstWeek.slice(0, 7);
    const songEnd = songLastWeek.slice(0, 7);
    const startIdx = periods.findIndex((p) => p >= songStart);
    const endIdx = periods.findIndex((p) => p > songEnd);
    if (startIdx >= 0) {
      const x1 = x(periods[startIdx])!;
      const x2 = endIdx >= 0 ? x(periods[endIdx])! : w;
      g.append("rect")
        .attr("x", x1).attr("y", 0)
        .attr("width", Math.max(x2 - x1, 4)).attr("height", h)
        .attr("fill", "#1DB954").attr("opacity", 0.08);

      g.append("line")
        .attr("x1", x1).attr("x2", x1)
        .attr("y1", 0).attr("y2", h)
        .attr("stroke", "#1DB954").attr("stroke-dasharray", "4,3").attr("stroke-width", 1.5);

      g.append("text")
        .attr("x", x1 + 4).attr("y", 10)
        .attr("font-size", 9).attr("fill", "#1DB954").attr("font-weight", 500)
        .text("On chart");
    }

    // X axis
    const tickInterval = Math.max(1, Math.floor(periods.length / 8));
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues(periods.filter((_, i) => i % tickInterval === 0)))
      .call((g) => g.select(".domain").attr("stroke", "#3f3f46"))
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 9));

    // Right-side labels
    series.forEach((s) => {
      const lastPoint = s[s.length - 1];
      if (!lastPoint) return;
      const midY = (y(lastPoint[0]) + y(lastPoint[1])) / 2;
      g.append("text")
        .attr("x", w + 6).attr("y", midY)
        .attr("dy", "0.35em").attr("font-size", 9)
        .attr("fill", GENRE_COLORS[s.key] || "#9CA3AF")
        .attr("font-weight", s.key === highlightGenre ? 700 : 400)
        .attr("opacity", s.key === highlightGenre ? 1 : 0.6)
        .text(s.key);
    });
  }, [data, genres, periods, highlightGenre, songFirstWeek, songLastWeek]);

  return (
    <ScrollySection>
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#181818] p-4">
        <svg ref={svgRef} className="w-full" />
        <p className="mt-2 text-center text-xs text-muted">
          <span className="font-semibold" style={{ color: GENRE_COLORS[highlightGenre] }}>
            {highlightGenre}
          </span>{" "}
          highlighted &middot; Blue band marks this song&apos;s time on chart
        </p>
      </div>
    </ScrollySection>
  );
}
