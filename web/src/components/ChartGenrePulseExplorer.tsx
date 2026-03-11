"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { type GenreRow, classifyGenre, GENRE_COLORS } from "@/lib/spotify-data";

type Props = {
  data: GenreRow[];
};

const DEFAULT_SELECTED = new Set(["Pop", "Hip Hop/Rap", "Latin", "R&B", "EDM/Dance", "Rock"]);

type MetricType = "share" | "avg_rank" | "avg_streams";
type Granularity = "month" | "quarter" | "year";

const METRIC_OPTIONS: { key: MetricType; label: string; yLabel: string }[] = [
  { key: "share", label: "Chart Share", yLabel: "Rank by Chart Share" },
  { key: "avg_rank", label: "Avg Chart Position", yLabel: "Rank by Avg Position" },
  { key: "avg_streams", label: "Avg Streams", yLabel: "Rank by Avg Streams" },
];

const GRANULARITY_OPTIONS: { key: Granularity; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

const WIDTH = 800;
const HEIGHT = 380;
const MARGIN = { top: 28, right: 100, bottom: 56, left: 64 };
const W = WIDTH - MARGIN.left - MARGIN.right;
const H = HEIGHT - MARGIN.top - MARGIN.bottom;

type PeriodData = {
  period: string;
  genre: string;
  value: number;
  rank: number;
};

function fmtNum(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtPeriod(period: string): string {
  if (period.length === 7) {
    const [yr, mo] = period.split("-");
    return `${MONTH_NAMES[parseInt(mo, 10) - 1]} '${yr.slice(2)}`;
  }
  if (period.includes("-Q")) {
    const [yr, q] = period.split("-");
    return `${q} '${yr.slice(2)}`;
  }
  return period;
}

function styleAxis(sel: d3.Selection<SVGGElement, unknown, null, undefined>) {
  sel.select(".domain").attr("stroke", "#3f3f46");
  sel.selectAll(".tick line").attr("stroke", "#3f3f46");
  sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12);
}

function assignRanks(
  period: string,
  entries: { genre: string; value: number }[],
  ascending = false
): PeriodData[] {
  const sorted = ascending
    ? [...entries].sort((a, b) => a.value - b.value)
    : [...entries].sort((a, b) => b.value - a.value);
  return sorted.map((e, i) => ({
    period,
    genre: e.genre,
    value: e.value,
    rank: i + 1,
  }));
}

function toPeriod(week: string, granularity: Granularity): string {
  if (granularity === "month") return week.slice(0, 7);
  if (granularity === "quarter") {
    const month = parseInt(week.slice(5, 7));
    return `${week.slice(0, 4)}-Q${Math.ceil(month / 3)}`;
  }
  return week.slice(0, 4);
}

export default function ChartGenrePulseExplorer({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<MetricType>("share");
  const [granularity, setGranularity] = useState<Granularity>("year");
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const drawnKeyRef = useRef<string | null>(null);

  // All unique genres in the dataset
  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    for (const row of data) {
      genres.add(classifyGenre(row.artist_genres));
    }
    return Array.from(genres).sort();
  }, [data]);

  const totalGenres = allGenres.length;

  // Aggregate ALL genres (rankings computed against full set), by chosen granularity
  const { periods, byShare, byRank, byStreams } = useMemo(() => {
    const buckets: Record<string, Record<string, { count: number; ranks: number[]; streams: number[] }>> = {};

    for (const row of data) {
      const genre = classifyGenre(row.artist_genres);
      const period = toPeriod(row.week, granularity);

      if (!buckets[period]) buckets[period] = {};
      if (!buckets[period][genre]) buckets[period][genre] = { count: 0, ranks: [], streams: [] };
      buckets[period][genre].count++;
      buckets[period][genre].ranks.push(Number(row.rank));
      if (row.streams != null) buckets[period][genre].streams.push(Number(row.streams));
    }

    const allPeriods = Object.keys(buckets).sort();

    function rankByMetric(
      getValue: (stats: { count: number; ranks: number[]; streams: number[] }, totalCount: number) => number,
      ascending = false
    ): PeriodData[] {
      const result: PeriodData[] = [];
      for (const period of allPeriods) {
        const genres = buckets[period];
        const totalCount = Object.values(genres).reduce((a, g) => a + g.count, 0);
        const entries = Object.entries(genres).map(([genre, stats]) => ({
          genre,
          value: getValue(stats, totalCount),
        }));
        result.push(...assignRanks(period, entries, ascending));
      }
      return result;
    }

    const shareData = rankByMetric((stats, totalCount) => (stats.count / totalCount) * 100);
    const rankData = rankByMetric(
      (stats) => stats.ranks.length ? stats.ranks.reduce((a, b) => a + b, 0) / stats.ranks.length : 200,
      true
    );
    const streamsData = rankByMetric(
      (stats) => stats.streams.length ? stats.streams.reduce((a, b) => a + b, 0) / stats.streams.length : 0
    );

    return { periods: allPeriods, byShare: shareData, byRank: rankData, byStreams: streamsData };
  }, [data, granularity]);

  const currentData = metric === "share" ? byShare : metric === "avg_rank" ? byRank : byStreams;
  const currentOption = METRIC_OPTIONS.find((o) => o.key === metric)!;

  // Toggle genre selection (min 1)
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

  // Draw bump chart
  useEffect(() => {
    if (!svgRef.current || !periods.length || !currentData.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drawKey = `${metric}-${granularity}`;
    const isFirstDraw = drawnKeyRef.current === null;
    drawnKeyRef.current = drawKey;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const CLIP_PAD = 8;
    svg.append("defs").append("clipPath").attr("id", "genre-clip")
      .append("rect").attr("x", 0).attr("y", -CLIP_PAD).attr("width", W).attr("height", H + CLIP_PAD * 2);
    const dataGroup = g.append("g").attr("clip-path", "url(#genre-clip)");
    const labelGroup = g.append("g");

    // Y scale spans full genre count (ranks are global)
    const x = d3.scalePoint<string>().domain(periods).range([0, W]).padding(0.08);
    const y = d3.scaleLinear().domain([1, totalGenres]).range([0, H]).clamp(true);

    // Grid lines — show a subset so it's not too dense
    const gridTicks = totalGenres <= 6
      ? d3.range(1, totalGenres + 1)
      : [1, Math.round(totalGenres / 3), Math.round(totalGenres * 2 / 3), totalGenres];
    g.append("g")
      .selectAll("line")
      .data(gridTicks)
      .join("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
      .attr("stroke", "#27272a").attr("stroke-dasharray", "4,4").attr("opacity", 0.3);

    // X axis — max 6 ticks
    const tickInterval = Math.max(1, Math.ceil(periods.length / 6));
    const xTickValues = periods.filter((_, i) => i % tickInterval === 0);
    g.append("g")
      .attr("transform", `translate(0,${H + 8})`)
      .call(
        d3.axisBottom(x)
          .tickValues(xTickValues)
          .tickSizeOuter(0)
          .tickSize(0)
          .tickPadding(8)
          .tickFormat((d) => fmtPeriod(d))
      )
      .call(styleAxis)
      .call((sel) => sel.select(".domain").remove());

    // Y axis
    const yTickValues = totalGenres <= 6
      ? d3.range(1, totalGenres + 1)
      : [1, Math.round(totalGenres / 2), totalGenres];
    g.append("g")
      .call(
        d3.axisLeft(y)
          .tickValues(yTickValues)
          .tickSizeOuter(0)
          .tickPadding(8)
          .tickFormat((d) => `#${d as number}`)
      )
      .call(styleAxis)
      .call((sel) => sel.select(".domain").remove());

    const tooltip = d3.select(tooltipRef.current);

    function tooltipText(genre: string, d: PeriodData): string {
      const val =
        metric === "share" ? `${d.value.toFixed(1)}% share` :
        metric === "avg_rank" ? `avg rank #${Math.round(d.value)}` :
        `avg ${fmtNum(d.value)} streams`;
      return `<strong>${genre}</strong> — ${fmtPeriod(d.period)}<br/>#${d.rank} of ${totalGenres}, ${val}`;
    }

    const showDots = periods.length <= 20;

    const line = d3
      .line<PeriodData>()
      .x((d) => x(d.period)!)
      .y((d) => y(d.rank))
      .curve(d3.curveMonotoneX);

    // Draw ALL genres — unselected as faint background, selected as prominent
    // Background (unselected) first so selected lines render on top
    for (const genre of allGenres) {
      const genreData = periods
        .map((p) => currentData.find((r) => r.period === p && r.genre === genre))
        .filter(Boolean) as PeriodData[];

      if (!genreData.length) continue;

      const isSelected = selectedGenres.has(genre);
      const color = GENRE_COLORS[genre] || "#9CA3AF";

      if (!isSelected) {
        // Faint background line — provides context
        dataGroup.append("path")
          .datum(genreData)
          .attr("d", line)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.12)
          .on("mouseenter", function (event) {
            const last = genreData[genreData.length - 1];
            tooltip
              .style("opacity", "1")
              .style("left", `${event.offsetX + 12}px`)
              .style("top", `${event.offsetY - 10}px`)
              .html(tooltipText(genre, last));
            d3.select(this).attr("opacity", 0.5).attr("stroke-width", 2.5);
          })
          .on("mousemove", (event) => {
            tooltip.style("left", `${event.offsetX + 12}px`).style("top", `${event.offsetY - 10}px`);
          })
          .on("mouseleave", function () {
            tooltip.style("opacity", "0");
            d3.select(this).attr("opacity", 0.12).attr("stroke-width", 1.5);
          });
      }
    }

    // Selected genres on top — full prominence
    for (const genre of allGenres) {
      if (!selectedGenres.has(genre)) continue;

      const genreData = periods
        .map((p) => currentData.find((r) => r.period === p && r.genre === genre))
        .filter(Boolean) as PeriodData[];

      if (!genreData.length) continue;

      const color = GENRE_COLORS[genre] || "#9CA3AF";

      const path = dataGroup.append("path")
        .datum(genreData)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2.5)
        .attr("opacity", 1)
        .on("mouseenter", function (event) {
          const last = genreData[genreData.length - 1];
          tooltip
            .style("opacity", "1")
            .style("left", `${event.offsetX + 12}px`)
            .style("top", `${event.offsetY - 10}px`)
            .html(tooltipText(genre, last));
          d3.select(this).attr("stroke-width", 4);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", `${event.offsetX + 12}px`).style("top", `${event.offsetY - 10}px`);
        })
        .on("mouseleave", function () {
          tooltip.style("opacity", "0");
          d3.select(this).attr("stroke-width", 2.5);
        });

      if (!reducedMotion && isFirstDraw) {
        const totalLength = (path.node() as SVGPathElement).getTotalLength();
        path
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(800)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }

      if (showDots) {
        dataGroup.selectAll(`.dot-${genre.replace(/[^a-zA-Z]/g, "")}`)
          .data(genreData)
          .join("circle")
          .attr("cx", (d) => x(d.period)!)
          .attr("cy", (d) => y(d.rank))
          .attr("r", 3.5)
          .attr("fill", color)
          .attr("stroke", "#181818")
          .attr("stroke-width", 1.5)
          .on("mouseenter", function (event, d) {
            tooltip
              .style("opacity", "1")
              .style("left", `${event.offsetX + 12}px`)
              .style("top", `${event.offsetY - 10}px`)
              .html(tooltipText(genre, d));
            d3.select(this).attr("r", 6);
          })
          .on("mousemove", (event) => {
            tooltip.style("left", `${event.offsetX + 12}px`).style("top", `${event.offsetY - 10}px`);
          })
          .on("mouseleave", function () {
            tooltip.style("opacity", "0");
            d3.select(this).attr("r", 3.5);
          });
      }

      // End label
      const last = genreData[genreData.length - 1];
      labelGroup.append("text")
        .attr("x", W + 8).attr("y", y(last.rank))
        .attr("dy", "0.35em").attr("font-size", 12)
        .attr("fill", color)
        .attr("font-weight", 600)
        .text(genre);
    }

    // Y axis title
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -H / 2).attr("y", -48)
      .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#71717a")
      .text(currentOption.yLabel);
  }, [currentData, periods, metric, granularity, selectedGenres, allGenres, totalGenres, currentOption.yLabel]);

  // Headline insight
  const headline = useMemo(() => {
    if (!byShare.length || !periods.length) return null;
    const first = periods[0];
    const last = periods[periods.length - 1];

    const firstLeader = byShare.find((r) => r.period === first && r.rank === 1);
    const lastLeader = byShare.find((r) => r.period === last && r.rank === 1);

    if (firstLeader && lastLeader && firstLeader.genre !== lastLeader.genre) {
      return `${lastLeader.genre} overtook ${firstLeader.genre} as the dominant streaming genre by ${fmtPeriod(last)}.`;
    }
    if (lastLeader) {
      return `${lastLeader.genre} held the top chart share position through ${fmtPeriod(last)}.`;
    }
    return null;
  }, [byShare, periods]);

  const allSelected = selectedGenres.size === allGenres.length;

  return (
    <div className="space-y-6">
      {headline && (
        <p className="text-sm text-muted">{headline}</p>
      )}

      {/* Genre pills */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Genres</p>
          <button
            onClick={() => {
              if (allSelected) {
                setSelectedGenres(new Set(DEFAULT_SELECTED));
              } else {
                setSelectedGenres(new Set(allGenres));
              }
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {allSelected ? "Reset" : "Select all"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {allGenres.map((genre) => {
            const isSelected = selectedGenres.has(genre);
            return (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
                style={isSelected ? { backgroundColor: GENRE_COLORS[genre] || "#9CA3AF" } : undefined}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Rank by</p>
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMetric(opt.key)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                metric === opt.key
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Time</p>
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setGranularity(opt.key)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                granularity === opt.key
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative rounded-2xl border border-zinc-800 bg-surface p-4">
        <svg
          ref={svgRef}
          className="w-full"
          role="img"
          aria-label={`Bump chart showing genre rankings by ${currentOption.label.toLowerCase()}`}
        />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute rounded-lg border border-zinc-800 bg-surface-hover px-3 py-2 text-xs shadow-lg opacity-0 transition-opacity"
          style={{ maxWidth: 240 }}
        />
      </div>
    </div>
  );
}
