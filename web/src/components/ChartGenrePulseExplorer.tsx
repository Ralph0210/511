"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { type GenreRow, classifyGenre, GENRE_COLORS } from "@/lib/spotify-data";

type Props = {
  data: GenreRow[];
};

type MetricMode = "share" | "avg_rank" | "avg_streams";
type TimeGranularity = "month" | "quarter" | "year";

export default function ChartGenrePulseExplorer({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<MetricMode>("share");
  const [granularity, setGranularity] = useState<TimeGranularity>("month");
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(
    new Set(["Pop", "Hip Hop/Rap", "Latin", "R&B", "EDM/Dance"])
  );

  // All unique genres
  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    for (const row of data) {
      genres.add(classifyGenre(row.artist_genres));
    }
    return Array.from(genres).sort();
  }, [data]);

  // Aggregate data
  const aggregated = useMemo(() => {
    // Bucket rows by time period and genre
    const buckets: Record<string, Record<string, { count: number; ranks: number[]; streams: number[] }>> = {};

    for (const row of data) {
      const genre = classifyGenre(row.artist_genres);
      if (!selectedGenres.has(genre)) continue;

      let period: string;
      if (granularity === "month") {
        period = row.week.slice(0, 7);
      } else if (granularity === "quarter") {
        const month = parseInt(row.week.slice(5, 7));
        const q = Math.ceil(month / 3);
        period = `${row.week.slice(0, 4)}-Q${q}`;
      } else {
        period = row.week.slice(0, 4);
      }

      if (!buckets[period]) buckets[period] = {};
      if (!buckets[period][genre]) buckets[period][genre] = { count: 0, ranks: [], streams: [] };
      buckets[period][genre].count++;
      buckets[period][genre].ranks.push(row.rank);
      if (row.streams != null) buckets[period][genre].streams.push(row.streams);
    }

    // Convert to flat array
    const result: { period: string; genre: string; value: number; count: number }[] = [];

    for (const [period, genres] of Object.entries(buckets)) {
      const totalCount = Object.values(genres).reduce((a, g) => a + g.count, 0);

      for (const [genre, stats] of Object.entries(genres)) {
        let value: number;
        if (metric === "share") {
          value = (stats.count / totalCount) * 100;
        } else if (metric === "avg_rank") {
          value = stats.ranks.reduce((a, b) => a + b, 0) / stats.ranks.length;
        } else {
          value = stats.streams.length
            ? stats.streams.reduce((a, b) => a + b, 0) / stats.streams.length
            : 0;
        }
        result.push({ period, genre, value, count: stats.count });
      }
    }

    return result.sort((a, b) => a.period.localeCompare(b.period));
  }, [data, selectedGenres, granularity, metric]);

  // Unique periods
  const periods = useMemo(() => {
    return Array.from(new Set(aggregated.map((d) => d.period))).sort();
  }, [aggregated]);

  // Draw stacked area chart
  useEffect(() => {
    if (!svgRef.current || !periods.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement!;
    const width = container.clientWidth;
    const height = 480;
    svg.attr("width", width).attr("height", height);

    const margin = { top: 20, right: 120, bottom: 50, left: 55 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select(tooltipRef.current);
    const genres = Array.from(selectedGenres);

    if (metric === "share") {
      // Stacked area chart
      const x = d3.scalePoint<string>().domain(periods).range([0, w]).padding(0.1);

      // Build stack-friendly data
      const stackData = periods.map((p) => {
        const obj: Record<string, number> = { period: 0 };
        for (const genre of genres) {
          const match = aggregated.find((d) => d.period === p && d.genre === genre);
          obj[genre] = match ? match.value : 0;
        }
        // Store period as index for x scale
        return { ...obj, _period: p };
      });

      const stack = d3
        .stack<Record<string, number | string>>()
        .keys(genres)
        .value((d, key) => (d[key] as number) || 0)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

      const series = stack(stackData as unknown as Record<string, number>[]);

      const yMax = d3.max(series, (s) => d3.max(s, (d) => d[1])) || 100;
      const y = d3.scaleLinear().domain([0, yMax]).range([h, 0]);

      // Areas
      const area = d3
        .area<d3.SeriesPoint<Record<string, number>>>()
        .x((_, i) => x(periods[i])!)
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(d3.curveBasis);

      g.selectAll(".genre-area")
        .data(series)
        .join("path")
        .attr("d", area as unknown as string)
        .attr("fill", (d) => GENRE_COLORS[d.key] || "#9CA3AF")
        .attr("opacity", 0.75)
        .on("mouseenter", (event, d) => {
          tooltip
            .style("opacity", "1")
            .style("left", `${event.offsetX + 12}px`)
            .style("top", `${event.offsetY - 10}px`)
            .html(`<strong>${d.key}</strong>`);
        })
        .on("mouseleave", () => tooltip.style("opacity", "0"));

      // Y axis
      g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}%`))
        .call((g) => g.select(".domain").attr("stroke", "#3f3f46"))
        .call((g) => g.selectAll(".tick line").attr("stroke", "#3f3f46"))
        .call((g) => g.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", 10));

      // X axis
      const tickInterval = Math.max(1, Math.floor(periods.length / 10));
      g.append("g")
        .attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickValues(periods.filter((_, i) => i % tickInterval === 0)))
        .call((g) => g.select(".domain").attr("stroke", "#3f3f46"))
        .call((g) => g.selectAll(".tick line").attr("stroke", "#3f3f46"))
        .call((g) =>
          g.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", 9).attr("transform", "rotate(-30)").attr("text-anchor", "end")
        );

      // Right-side labels
      series.forEach((s) => {
        const lastPoint = s[s.length - 1];
        if (!lastPoint) return;
        const midY = (y(lastPoint[0]) + y(lastPoint[1])) / 2;
        g.append("text")
          .attr("x", w + 8).attr("y", midY)
          .attr("dy", "0.35em").attr("font-size", 10)
          .attr("fill", GENRE_COLORS[s.key] || "#9CA3AF")
          .attr("font-weight", 600)
          .text(s.key);
      });
    } else {
      // Line chart for avg_rank or avg_streams
      const x = d3.scalePoint<string>().domain(periods).range([0, w]).padding(0.1);
      const allValues = aggregated.map((d) => d.value);
      const yDomain: [number, number] =
        metric === "avg_rank"
          ? [d3.max(allValues) || 200, d3.min(allValues) || 1]
          : [0, d3.max(allValues) || 1000000];
      const y = d3.scaleLinear().domain(yDomain).range([h, 0]);

      // Axes
      g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat((d) =>
          metric === "avg_streams" ? d3.format(".2s")(d as number) : String(Math.round(d as number))
        ))
        .call((g) => g.select(".domain").attr("stroke", "#3f3f46"))
        .call((g) => g.selectAll(".tick line").attr("stroke", "#3f3f46"))
        .call((g) => g.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", 10));

      const tickInterval = Math.max(1, Math.floor(periods.length / 10));
      g.append("g")
        .attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickValues(periods.filter((_, i) => i % tickInterval === 0)))
        .call((g) => g.select(".domain").attr("stroke", "#3f3f46"))
        .call((g) => g.selectAll(".tick line").attr("stroke", "#3f3f46"))
        .call((g) =>
          g.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", 9).attr("transform", "rotate(-30)").attr("text-anchor", "end")
        );

      // Lines
      for (const genre of genres) {
        const genreData = periods
          .map((p) => {
            const match = aggregated.find((d) => d.period === p && d.genre === genre);
            return match ? { period: p, value: match.value } : null;
          })
          .filter(Boolean) as { period: string; value: number }[];

        if (!genreData.length) continue;

        const line = d3
          .line<{ period: string; value: number }>()
          .x((d) => x(d.period)!)
          .y((d) => y(d.value))
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(genreData)
          .attr("d", line)
          .attr("fill", "none")
          .attr("stroke", GENRE_COLORS[genre] || "#9CA3AF")
          .attr("stroke-width", 2)
          .attr("opacity", 0.85);

        // End label
        const last = genreData[genreData.length - 1];
        g.append("text")
          .attr("x", w + 8).attr("y", y(last.value))
          .attr("dy", "0.35em").attr("font-size", 10)
          .attr("fill", GENRE_COLORS[genre] || "#9CA3AF")
          .attr("font-weight", 600)
          .text(genre);
      }
    }

    // Axis labels
    g.append("text")
      .attr("x", w / 2).attr("y", h + 45)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#6b7280")
      .text("Time Period");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2).attr("y", -40)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#6b7280")
      .text(metric === "share" ? "Chart Share (%)" : metric === "avg_rank" ? "Average Rank" : "Average Streams");
  }, [aggregated, periods, selectedGenres, metric]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) {
        if (next.size > 1) next.delete(genre);
      } else {
        next.add(genre);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Genre selector */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Genres</p>
        <div className="flex flex-wrap gap-2">
          {allGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedGenres.has(genre)
                  ? "text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
              style={selectedGenres.has(genre) ? { backgroundColor: GENRE_COLORS[genre] || "#9CA3AF" } : undefined}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Metric */}
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Metric</p>
          {([
            ["share", "Chart Share"],
            ["avg_rank", "Avg Rank"],
            ["avg_streams", "Avg Streams"],
          ] as [MetricMode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                metric === key
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Granularity */}
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Time</p>
          {(["month", "quarter", "year"] as TimeGranularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                granularity === g
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative rounded-2xl border border-zinc-800 bg-[#181818] p-4">
        <svg ref={svgRef} className="w-full" />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute rounded-lg border border-zinc-700 bg-[#282828] px-3 py-2 text-xs shadow-lg opacity-0 transition-opacity"
          style={{ maxWidth: 200 }}
        />
      </div>

      {/* Insights */}
      <div className="rounded-xl bg-zinc-800/50 p-5">
        <h3 className="text-sm font-semibold">Key Insights</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>
            Hip Hop/Rap has steadily grown its chart share from 2017 to 2020, rivaling Pop
            as the dominant genre in streaming-era charts.
          </li>
          <li>
            Latin music shows consistent growth, reflecting the global streaming audience
            that platforms like Spotify enable.
          </li>
          <li>
            Switch to &quot;Avg Rank&quot; to see which genres chart higher — or &quot;Avg Streams&quot;
            to compare raw streaming power.
          </li>
        </ul>
      </div>
    </div>
  );
}
