"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { GENRE_COLORS } from "@/lib/spotify-data";

type GenreShare = { period: string; genre: string; share: number };

type Props = {
  data: GenreShare[];
  highlightGenre: string;
  songFirstWeek: string;
  songLastWeek: string;
  /**
   * 0 = empty axes only
   * 1 = all genres stacked area (muted, equal opacity)
   * 2 = highlight song's genre (others fade)
   * 3 = add "on chart" band + annotation
   */
  beat: number;
};

export default function ChartContextScrolly({
  data, highlightGenre, songFirstWeek, songLastWeek, beat,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const genres = useMemo(
    () => Array.from(new Set(data.map((d) => d.genre))).sort(),
    [data],
  );
  const periods = useMemo(
    () => Array.from(new Set(data.map((d) => d.period))).sort(),
    [data],
  );

  useEffect(() => {
    if (!svgRef.current || !periods.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = 340;
    svg.attr("width", width).attr("height", height);

    const margin = { top: 16, right: 90, bottom: 36, left: 40 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint<string>().domain(periods).range([0, w]).padding(0.1);
    const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

    // X axis
    const tickInterval = Math.max(1, Math.floor(periods.length / 8));
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues(periods.filter((_, i) => i % tickInterval === 0)))
      .call((sel) => sel.select(".domain").attr("stroke", "#e5e7eb"))
      .call((sel) => sel.selectAll(".tick line").remove())
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 9));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`))
      .call((sel) => sel.select(".domain").attr("stroke", "#e5e7eb"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", "#f3f4f6"))
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 9));

    if (beat < 1) return; // Beat 0: just axes

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

    // Beat 1: all genres at equal moderate opacity
    const isHighlightBeat = beat >= 2;
    const paths = g.selectAll(".genre-area")
      .data(series)
      .join("path")
      .attr("d", area as unknown as string)
      .attr("fill", (d) => GENRE_COLORS[d.key] || "#D1D5DB")
      .attr("opacity", 0);

    if (isHighlightBeat) {
      paths.transition().duration(600)
        .attr("opacity", (d) => (d.key === highlightGenre ? 0.85 : 0.15));
    } else {
      paths.transition().duration(600)
        .attr("opacity", 0.4);
    }

    // Right-side labels
    series.forEach((s) => {
      const lastPoint = s[s.length - 1];
      if (!lastPoint) return;
      const midY = (y(lastPoint[0]) + y(lastPoint[1])) / 2;
      g.append("text")
        .attr("x", w + 6).attr("y", midY)
        .attr("dy", "0.35em").attr("font-size", 9)
        .attr("fill", GENRE_COLORS[s.key] || "#9CA3AF")
        .attr("font-weight", isHighlightBeat && s.key === highlightGenre ? 700 : 400)
        .attr("opacity", 0)
        .transition().delay(300).duration(300)
        .attr("opacity", isHighlightBeat ? (s.key === highlightGenre ? 1 : 0.4) : 0.7)
        .text(s.key);
    });

    if (beat < 3) return; // Beats 1-2: stacked areas

    // Beat 3: "On chart" band
    const songStart = songFirstWeek.slice(0, 7);
    const songEnd = songLastWeek.slice(0, 7);
    const startIdx = periods.findIndex((p) => p >= songStart);
    const endIdx = periods.findIndex((p) => p > songEnd);

    if (startIdx >= 0) {
      const x1 = x(periods[startIdx])!;
      const x2 = endIdx >= 0 ? x(periods[endIdx])! : w;
      const bandWidth = Math.max(x2 - x1, 4);

      g.append("rect")
        .attr("x", x1).attr("y", 0)
        .attr("width", 0).attr("height", h)
        .attr("fill", "#2563EB").attr("opacity", 0.08)
        .transition().duration(500)
        .attr("width", bandWidth);

      g.append("line")
        .attr("x1", x1).attr("x2", x1)
        .attr("y1", 0).attr("y2", h)
        .attr("stroke", "#2563EB").attr("stroke-dasharray", "4,3")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0)
        .transition().delay(300).duration(300)
        .attr("opacity", 0.7);

      g.append("text")
        .attr("x", x1 + 4).attr("y", 12)
        .attr("font-size", 10).attr("fill", "#2563EB").attr("font-weight", 600)
        .attr("opacity", 0)
        .transition().delay(400).duration(300)
        .attr("opacity", 1)
        .text("On chart");

      // End marker
      if (endIdx >= 0) {
        g.append("line")
          .attr("x1", x2).attr("x2", x2)
          .attr("y1", 0).attr("y2", h)
          .attr("stroke", "#2563EB").attr("stroke-dasharray", "4,3")
          .attr("stroke-width", 1.5)
          .attr("opacity", 0)
          .transition().delay(400).duration(300)
          .attr("opacity", 0.5);
      }
    }
  }, [data, genres, periods, highlightGenre, songFirstWeek, songLastWeek, beat]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <svg ref={svgRef} className="w-full" />
      {beat >= 2 && (
        <p className="mt-2 text-center text-xs text-muted">
          <span className="font-semibold" style={{ color: GENRE_COLORS[highlightGenre] }}>
            {highlightGenre}
          </span>
          {" "}highlighted
          {beat >= 3 && " · Blue band marks this song\u2019s time on chart"}
        </p>
      )}
    </div>
  );
}
