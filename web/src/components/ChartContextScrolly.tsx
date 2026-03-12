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
   * -1 = empty axes (before scroll)
   *  0 = empty axes only
   *  1 = all genres stacked area
   *  2 = highlight song's genre
   *  3 = "on chart" band + zoom into song's time period
   */
  beat: number;
};

export default function ChartContextScrolly({
  data, highlightGenre, songFirstWeek, songLastWeek, beat,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);
  const prevBeatRef = useRef(-2);

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
    const isFirstDraw = !drawnRef.current;
    const prevBeat = prevBeatRef.current;
    prevBeatRef.current = beat;

    if (isFirstDraw) {
      drawnRef.current = true;
      svg.selectAll("*").remove();

      const container = svgRef.current.parentElement!;
      const width = container.clientWidth;
      const height = 500;
      svg.attr("width", width).attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      const margin = { top: 20, right: 100, bottom: 44, left: 50 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      // Clip path for zoom group
      svg.append("defs").append("clipPath").attr("id", "ctx-clip")
        .append("rect").attr("width", w).attr("height", h);

      const x = d3.scalePoint<string>().domain(periods).range([0, w]).padding(0.1);
      const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

      // X axis
      const tickInterval = Math.max(1, Math.floor(periods.length / 8));
      g.append("g")
        .attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickValues(periods.filter((_, i) => i % tickInterval === 0)))
        .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
        .call((sel) => sel.selectAll(".tick line").remove())
        .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 13));

      // Y axis
      g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`))
        .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
        .call((sel) => sel.selectAll(".tick line").attr("stroke", "#27272a"))
        .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 13));

      // Data group (clipped)
      const zoomG = g.append("g").attr("class", "zoom-group").attr("clip-path", "url(#ctx-clip)");

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

      // Genre area paths (in zoom group)
      zoomG.selectAll(".genre-area")
        .data(series)
        .join("path")
        .attr("class", "genre-area")
        .attr("d", area as unknown as string)
        .attr("fill", (d) => GENRE_COLORS[d.key] || "#52525b")
        .attr("opacity", 0)
        .attr("data-genre", (d) => d.key);

      // Right-side labels
      series.forEach((s) => {
        const lastPoint = s[s.length - 1];
        if (!lastPoint) return;
        const midY = (y(lastPoint[0]) + y(lastPoint[1])) / 2;
        g.append("text")
          .attr("class", "genre-label")
          .attr("x", w + 6).attr("y", midY)
          .attr("dy", "0.35em").attr("font-size", 13)
          .attr("fill", GENRE_COLORS[s.key] || "#9CA3AF")
          .attr("opacity", 0)
          .attr("data-genre", s.key)
          .text(s.key);
      });

      // "On chart" band elements (beat 3+) — in zoom group
      const songStart = songFirstWeek.slice(0, 7);
      const songEnd = songLastWeek.slice(0, 7);
      const startIdx = periods.findIndex((p) => p >= songStart);
      const endIdx = periods.findIndex((p) => p > songEnd);

      let bandCenterX = w / 2;
      let bandW = w;

      if (startIdx >= 0) {
        const x1 = x(periods[startIdx])!;
        const x2 = endIdx >= 0 ? x(periods[endIdx])! : w;
        bandW = Math.max(x2 - x1, 4);
        bandCenterX = x1 + bandW / 2;

        zoomG.append("rect")
          .attr("class", "onchart-band")
          .attr("x", x1).attr("y", 0)
          .attr("width", bandW).attr("height", h)
          .attr("fill", "#1DB954").attr("opacity", 0);

        zoomG.append("line")
          .attr("class", "onchart-line-start")
          .attr("x1", x1).attr("x2", x1)
          .attr("y1", 0).attr("y2", h)
          .attr("stroke", "#1DB954").attr("stroke-dasharray", "4,3")
          .attr("stroke-width", 1.5).attr("opacity", 0);

        zoomG.append("text")
          .attr("class", "onchart-label")
          .attr("x", x1 + 4).attr("y", 14)
          .attr("font-size", 13).attr("fill", "#1DB954").attr("font-weight", 600)
          .attr("opacity", 0)
          .text("On chart");

        if (endIdx >= 0) {
          zoomG.append("line")
            .attr("class", "onchart-line-end")
            .attr("x1", x2).attr("x2", x2)
            .attr("y1", 0).attr("y2", h)
            .attr("stroke", "#1DB954").attr("stroke-dasharray", "4,3")
            .attr("stroke-width", 1.5).attr("opacity", 0);
        }
      }

    }

    // --- Update visibility ---
    const g = svg.select("g");
    const shouldAnimate = beat > prevBeat;
    const isHighlight = beat >= 2;

    // Genre areas (beat 1+)
    if (beat >= 1) {
      const paths = g.selectAll<SVGPathElement, d3.Series<Record<string, number>, string>>(".genre-area");

      if (shouldAnimate && prevBeat < 1) {
        paths.transition().duration(600).attr("opacity", 0.4);
      } else if (shouldAnimate && prevBeat < 2 && isHighlight) {
        paths.each(function () {
          const el = d3.select(this);
          const genre = el.attr("data-genre");
          el.transition().duration(400)
            .attr("opacity", genre === highlightGenre ? 0.85 : 0.15);
        });
      } else if (isHighlight) {
        paths.each(function () {
          const el = d3.select(this);
          const genre = el.attr("data-genre");
          el.attr("opacity", genre === highlightGenre ? 0.85 : 0.15);
        });
      } else {
        paths.attr("opacity", 0.4);
      }
    } else {
      g.selectAll(".genre-area").attr("opacity", 0);
    }

    // Genre labels
    if (beat >= 1) {
      g.selectAll<SVGTextElement, unknown>(".genre-label").each(function () {
        const el = d3.select(this);
        const genre = el.attr("data-genre");
        if (isHighlight) {
          el.attr("opacity", genre === highlightGenre ? 1 : 0.4)
            .attr("font-weight", genre === highlightGenre ? 700 : 400);
        } else {
          el.attr("opacity", 0.7).attr("font-weight", 400);
        }
      });
    } else {
      g.selectAll(".genre-label").attr("opacity", 0);
    }

    // "On chart" band (beat 3+)
    if (beat >= 3) {
      if (shouldAnimate && prevBeat < 3) {
        g.select(".onchart-band").transition().duration(500).attr("opacity", 0.08);
        g.select(".onchart-line-start").transition().delay(300).duration(300).attr("opacity", 0.7);
        g.select(".onchart-label").transition().delay(400).duration(300).attr("opacity", 1);
        g.select(".onchart-line-end").transition().delay(400).duration(300).attr("opacity", 0.5);
      } else {
        g.select(".onchart-band").attr("opacity", 0.08);
        g.select(".onchart-line-start").attr("opacity", 0.7);
        g.select(".onchart-label").attr("opacity", 1);
        g.select(".onchart-line-end").attr("opacity", 0.5);
      }
    } else {
      g.selectAll(".onchart-band, .onchart-line-start, .onchart-label, .onchart-line-end")
        .attr("opacity", 0);
    }
  }, [data, genres, periods, highlightGenre, songFirstWeek, songLastWeek, beat]);

  useEffect(() => {
    drawnRef.current = false;
    prevBeatRef.current = -2;
  }, [data, highlightGenre]);

  return (
    <div>
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
