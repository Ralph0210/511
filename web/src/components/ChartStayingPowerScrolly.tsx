"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { SpotifyLifespanBucket } from "@/lib/spotify-data";
import type { LongevityCategoryStats } from "@/lib/spotify-data";
import type { LongevityCategory } from "@/lib/spotify-data";
import type { LongevityBucket } from "@/lib/billboard-data";

const LONGEVITY_COLORS: Record<string, string> = {
  viral: "#EF4444",
  lasting: "#1DB954",
  slow_burn: "#3B82F6",
  flash: "#71717a",
};

const LONGEVITY_LABELS: Record<string, string> = {
  viral: "Viral",
  lasting: "Lasting",
  slow_burn: "Slow Burn",
  flash: "Flash",
};

type Props = {
  spotifyDistribution: SpotifyLifespanBucket[];
  genreDistribution?: SpotifyLifespanBucket[];
  songWeeks: number;
  yearAvg: number;
  genreAvg: number;
  genreLabel: string;
  percentileInYear: number;
  /** Longevity category data (full 2017-2021 dataset) */
  categoryDistribution?: LongevityCategoryStats[];
  songCategory?: LongevityCategory;
  sameCategoryCount?: number;
  percentileInCategory?: number;
  totalSongs?: number;
  /** Billboard longevity distribution (optional) */
  billboardDistribution?: LongevityBucket[];
  billboardWeeks?: number;
  billboardPercentile?: number;
  /**
   * -1 = empty (before scroll)
   *  0 = axes only
   *  1 = Spotify histogram + song marker + year avg
   *  2 = Longevity category bars (viral/lasting/slow_burn/flash) + song highlight
   *  3 = Billboard comparison (if available)
   *  4 = Genre avg annotation
   */
  beat: number;
};

// viewBox dimensions — wide rectangle (matches ChartRiseScrolly)
const WIDTH = 1200;
const HEIGHT = 340;
const MARGIN = { top: 28, right: 64, bottom: 56, left: 64 };
const W = WIDTH - MARGIN.left - MARGIN.right;
const H = HEIGHT - MARGIN.top - MARGIN.bottom;

function findSpotifyBin(weeks: number, bins: SpotifyLifespanBucket[]): SpotifyLifespanBucket | null {
  return bins.find((b) => weeks >= b.min && weeks <= b.max) ?? null;
}

function findBillboardBucket(weeks: number): string {
  if (weeks <= 5) return "1-5";
  if (weeks <= 10) return "6-10";
  if (weeks <= 15) return "11-15";
  if (weeks <= 20) return "16-20";
  if (weeks <= 30) return "21-30";
  if (weeks <= 40) return "31-40";
  return "41+";
}

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

function styleAxis(sel: d3.Selection<SVGGElement, unknown, null, undefined>) {
  sel.select(".domain").attr("stroke", "#3f3f46");
  sel.selectAll(".tick line").attr("stroke", "#3f3f46");
  sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12);
}

export default function ChartStayingPowerScrolly({
  spotifyDistribution, genreDistribution, songWeeks, yearAvg, genreAvg, genreLabel,
  percentileInYear, categoryDistribution, songCategory, sameCategoryCount,
  percentileInCategory, totalSongs, billboardDistribution, billboardWeeks,
  billboardPercentile, beat,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);
  const prevBeatRef = useRef(-2);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const isFirstDraw = !drawnRef.current;
    const prevBeat = prevBeatRef.current;
    prevBeatRef.current = beat;

    if (isFirstDraw) {
      drawnRef.current = true;
      svg.selectAll("*").remove();

      svg.attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%").style("height", "auto");

      // ===== GROUP 1: SPOTIFY HISTOGRAM (linear x-axis, equal-width bins) =====
      const gSpotify = svg.append("g")
        .attr("class", "spotify-group")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      if (spotifyDistribution.length) {
        const lastBinMax = Math.max(...spotifyDistribution.map((d) => d.max));
        const xMax = Math.max(lastBinMax + 5, songWeeks * 1.08);
        const xLin = d3.scaleLinear().domain([0, xMax]).range([0, W]).clamp(true);

        const maxCount = d3.max(spotifyDistribution, (d) => d.count) || 1;
        const yHist = d3.scaleLinear().domain([0, maxCount * 1.15]).range([H, 0]).clamp(true);

        // Clip path
        svg.append("defs").append("clipPath").attr("id", "sp-clip")
          .append("rect").attr("width", W).attr("height", H);

        // X axis
        gSpotify.append("g")
          .attr("transform", `translate(0,${H})`)
          .call(d3.axisBottom(xLin).ticks(6).tickSizeOuter(0).tickPadding(8)
            .tickFormat((d) => `${d}w`))
          .call(styleAxis);

        gSpotify.append("text")
          .attr("x", W / 2).attr("y", H + 42)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 500).attr("fill", "#71717a")
          .text("Weeks on Spotify Top 200");

        // Y axis
        gSpotify.append("g")
          .call(d3.axisLeft(yHist).ticks(5).tickSizeOuter(0).tickPadding(8))
          .call(styleAxis);

        gSpotify.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -H / 2).attr("y", -48)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 500).attr("fill", "#71717a")
          .text("Number of songs");

        const songBin = findSpotifyBin(songWeeks, spotifyDistribution);
        const barPad = 2; // px gap between bars

        // Bars — positioned on linear scale, width proportional to bin range
        const clipped = gSpotify.append("g").attr("clip-path", "url(#sp-clip)");
        clipped.selectAll(".sp-bar")
          .data(spotifyDistribution)
          .join("rect").attr("class", "sp-bar")
          .attr("x", (d) => xLin(d.min - 1) + barPad)
          .attr("y", (d) => yHist(d.count))
          .attr("width", (d) => Math.max(0, xLin(d.max) - xLin(d.min - 1) - barPad * 2))
          .attr("height", (d) => H - yHist(d.count))
          .attr("rx", 3)
          .attr("fill", (d) => songBin && d.bucket === songBin.bucket ? "#1DB954" : "#3f3f46")
          .attr("opacity", 0);

        // Song marker — at actual week position on linear scale
        const markerX = xLin(songWeeks);

        // Vertical dashed line from x-axis up
        gSpotify.append("line").attr("class", "sp-marker")
          .attr("x1", markerX).attr("x2", markerX)
          .attr("y1", H).attr("y2", MARGIN.top > 28 ? 0 : -8)
          .attr("stroke", "#1DB954").attr("stroke-dasharray", "4,3")
          .attr("stroke-width", 1.5).attr("opacity", 0);

        // Arrow pointing down at x-axis
        gSpotify.append("polygon").attr("class", "sp-marker")
          .attr("points", `${markerX},${H} ${markerX - 5},${H - 10} ${markerX + 5},${H - 10}`)
          .attr("fill", "#1DB954").attr("opacity", 0);

        // Label above
        const labelAnchor = markerX > W * 0.8 ? "end" : "middle";
        const labelDx = markerX > W * 0.8 ? -4 : 0;
        gSpotify.append("text").attr("class", "sp-marker")
          .attr("x", markerX + labelDx).attr("y", -14)
          .attr("text-anchor", labelAnchor).attr("font-size", 14).attr("font-weight", 700).attr("fill", "#1DB954")
          .attr("opacity", 0)
          .text(`${songWeeks}w · Top ${100 - percentileInYear}%`);

        // Year average vertical line — at actual position
        const yearAvgX = xLin(yearAvg);
        gSpotify.append("line").attr("class", "sp-year-avg")
          .attr("x1", yearAvgX).attr("x2", yearAvgX)
          .attr("y1", 0).attr("y2", H)
          .attr("stroke", "#6B7280").attr("stroke-dasharray", "6,3")
          .attr("stroke-width", 1.5).attr("opacity", 0);

        gSpotify.append("text").attr("class", "sp-year-avg")
          .attr("x", yearAvgX + 6).attr("y", 14)
          .attr("font-size", 13).attr("fill", "#6B7280").attr("font-weight", 600)
          .attr("opacity", 0)
          .text(`Year avg: ${yearAvg.toFixed(1)}w`);

        // Genre distribution overlay bars (beat 4) — same axes, purple fill
        if (genreDistribution?.length) {
          const genreMaxCount = d3.max(genreDistribution, (d) => d.count) || 1;
          // Scale genre bars relative to year bars using same y-axis
          // but if genre counts are much smaller, we rescale to make them visible
          const genreScale = maxCount > 0 ? Math.min(1, (maxCount * 0.8) / genreMaxCount) : 1;

          clipped.selectAll(".sp-genre-bar")
            .data(genreDistribution)
            .join("rect").attr("class", "sp-genre-bar")
            .attr("x", (d) => xLin(d.min - 1) + barPad)
            .attr("y", (d) => yHist(d.count * genreScale))
            .attr("width", (d) => Math.max(0, xLin(d.max) - xLin(d.min - 1) - barPad * 2))
            .attr("height", (d) => H - yHist(d.count * genreScale))
            .attr("rx", 3)
            .attr("fill", "#8B5CF6")
            .attr("opacity", 0);
        }

        // Genre average vertical line (beat 4)
        const genreAvgX = xLin(genreAvg);
        gSpotify.append("line").attr("class", "sp-genre-avg")
          .attr("x1", genreAvgX).attr("x2", genreAvgX)
          .attr("y1", 0).attr("y2", H)
          .attr("stroke", "#8B5CF6").attr("stroke-dasharray", "4,4")
          .attr("stroke-width", 1.5).attr("opacity", 0);

        gSpotify.append("text").attr("class", "sp-genre-avg")
          .attr("x", genreAvgX + 6).attr("y", 28)
          .attr("font-size", 13).attr("fill", "#8B5CF6").attr("font-weight", 600)
          .attr("opacity", 0)
          .text(`${genreLabel} avg: ${genreAvg.toFixed(1)}w`);
      }

      // ===== GROUP 2: LONGEVITY CATEGORY BARS =====
      const CAT_LEFT = 110; // wider left margin for "Slow Burn" label
      const catW = WIDTH - CAT_LEFT - MARGIN.right;
      const gCategory = svg.append("g")
        .attr("class", "category-group")
        .attr("transform", `translate(${CAT_LEFT},${MARGIN.top})`)
        .attr("opacity", 0);

      if (categoryDistribution?.length && songCategory) {
        const categories = categoryDistribution;

        // Horizontal bar chart: categories on Y, avg weeks on X
        const yBand = d3.scaleBand()
          .domain(categories.map((d) => d.category))
          .range([0, H]).padding(0.3);

        const maxWeeks = Math.max(d3.max(categories, (d) => d.avgWeeks) || 1, songWeeks);
        const xScale = d3.scaleLinear().domain([0, maxWeeks * 1.2]).range([0, catW]).clamp(true);

        // X axis (weeks)
        gCategory.append("g")
          .attr("transform", `translate(0,${H})`)
          .call(d3.axisBottom(xScale).ticks(6).tickSizeOuter(0).tickPadding(8)
            .tickFormat((d) => `${d}w`))
          .call(styleAxis);

        gCategory.append("text")
          .attr("x", catW / 2).attr("y", H + 42)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 500).attr("fill", "#71717a")
          .text("Avg weeks on chart");

        // Y axis (category labels)
        gCategory.append("g")
          .call(d3.axisLeft(yBand).tickSizeOuter(0).tickPadding(8)
            .tickFormat((d) => LONGEVITY_LABELS[d] || d))
          .call(styleAxis)
          .call((g) => g.select(".domain").remove())
          .selectAll(".tick text")
          .attr("fill", (d) => LONGEVITY_COLORS[d as string] || "#9CA3AF")
          .attr("font-weight", 600).attr("font-size", 13);

        // Horizontal bars
        gCategory.selectAll(".cat-bar")
          .data(categories)
          .join("rect").attr("class", "cat-bar")
          .attr("x", 0)
          .attr("y", (d) => yBand(d.category)!)
          .attr("width", (d) => xScale(d.avgWeeks))
          .attr("height", yBand.bandwidth())
          .attr("rx", 4)
          .attr("fill", (d) => LONGEVITY_COLORS[d.category] || "#3f3f46")
          .attr("opacity", (d) => d.category === songCategory ? 0.9 : 0.35);

        // Labels at end of bars: count + avg weeks
        gCategory.selectAll(".cat-count")
          .data(categories)
          .join("text").attr("class", "cat-count")
          .attr("x", (d) => xScale(d.avgWeeks) + 8)
          .attr("y", (d) => yBand(d.category)! + yBand.bandwidth() / 2)
          .attr("dy", "0.35em")
          .attr("font-size", 13).attr("font-weight", 600)
          .attr("fill", (d) => LONGEVITY_COLORS[d.category] || "#9CA3AF")
          .text((d) => `${fmtNum(d.count)} songs · ${d.avgWeeks.toFixed(0)}w avg`);

        // Song's weeks vertical marker line
        const songXPos = xScale(songWeeks);
        gCategory.append("line").attr("class", "cat-song-line")
          .attr("x1", songXPos).attr("x2", songXPos)
          .attr("y1", -8).attr("y2", H)
          .attr("stroke", LONGEVITY_COLORS[songCategory] || "#1DB954")
          .attr("stroke-dasharray", "6,3").attr("stroke-width", 1.5);

        gCategory.append("text").attr("class", "cat-song-line")
          .attr("x", songXPos).attr("y", -14)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 700)
          .attr("fill", LONGEVITY_COLORS[songCategory] || "#1DB954")
          .text(`This song: ${songWeeks}w`);

        // Arrow on song's category bar
        const songBarY = yBand(songCategory);
        if (songBarY !== undefined) {
          const color = LONGEVITY_COLORS[songCategory] || "#1DB954";
          const arrowY = songBarY + yBand.bandwidth() / 2;
          const pctLabel = percentileInCategory != null
            ? `Top ${100 - percentileInCategory}% of ${LONGEVITY_LABELS[songCategory]}`
            : LONGEVITY_LABELS[songCategory];

          gCategory.append("text").attr("class", "cat-marker")
            .attr("x", songXPos).attr("y", arrowY - yBand.bandwidth() / 2 - 6)
            .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 600)
            .attr("fill", color)
            .text(pctLabel);
        }
      }

      // ===== GROUP 3: BILLBOARD HISTOGRAM =====
      const gBillboard = svg.append("g")
        .attr("class", "billboard-group")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)
        .attr("opacity", 0);

      if (billboardDistribution?.length && billboardWeeks != null) {
        const xBand = d3.scaleBand()
          .domain(billboardDistribution.map((d) => d.bucket))
          .range([0, W]).padding(0.15);

        const maxCount = d3.max(billboardDistribution, (d) => d.count) || 1;
        const yHist = d3.scaleLinear().domain([0, maxCount * 1.15]).range([H, 0]).clamp(true);

        // X axis
        gBillboard.append("g")
          .attr("transform", `translate(0,${H})`)
          .call(d3.axisBottom(xBand).tickSizeOuter(0).tickPadding(8))
          .call(styleAxis);

        gBillboard.append("text")
          .attr("x", W / 2).attr("y", H + 42)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 500).attr("fill", "#71717a")
          .text("Weeks on Billboard Hot 100 (all time)");

        // Y axis
        gBillboard.append("g")
          .call(d3.axisLeft(yHist).ticks(5).tickSizeOuter(0).tickPadding(8))
          .call(styleAxis);

        gBillboard.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -H / 2).attr("y", -48)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 500).attr("fill", "#71717a")
          .text("Number of songs");

        const songBucket = findBillboardBucket(billboardWeeks);

        // Bars
        gBillboard.selectAll(".bb-bar")
          .data(billboardDistribution)
          .join("rect").attr("class", "bb-bar")
          .attr("x", (d) => xBand(d.bucket)!)
          .attr("y", (d) => yHist(d.count))
          .attr("width", xBand.bandwidth())
          .attr("height", (d) => H - yHist(d.count))
          .attr("rx", 3)
          .attr("fill", (d) => d.bucket === songBucket ? "#D97706" : "#52525b")
          .attr("opacity", (d) => d.bucket === songBucket ? 0.9 : 0.5);

        // Song marker
        const bucketX = xBand(songBucket);
        if (bucketX !== undefined) {
          const markerX = bucketX + xBand.bandwidth() / 2;
          const bucketData = billboardDistribution.find((d) => d.bucket === songBucket);
          const barTop = bucketData ? yHist(bucketData.count) : H;

          gBillboard.append("line")
            .attr("x1", markerX).attr("x2", markerX)
            .attr("y1", barTop - 8).attr("y2", barTop - 30)
            .attr("stroke", "#92400E").attr("stroke-width", 2);

          gBillboard.append("polygon")
            .attr("points", `${markerX},${barTop - 6} ${markerX - 5},${barTop - 14} ${markerX + 5},${barTop - 14}`)
            .attr("fill", "#92400E");

          gBillboard.append("text")
            .attr("x", markerX).attr("y", barTop - 36)
            .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 700).attr("fill", "#92400E")
            .text(`${billboardWeeks}w · Top ${100 - (billboardPercentile ?? 50)}%`);
        }
      }
    }

    // --- Update visibility ---
    const shouldAnimate = beat > prevBeat;
    const gSpotify = svg.select(".spotify-group");
    const gCategory = svg.select(".category-group");
    const gBillboard = svg.select(".billboard-group");

    // Helper: show one group, hide others
    function showGroup(target: string) {
      [gSpotify, gCategory, gBillboard].forEach((g) => {
        const cls = g.attr("class");
        if (!cls) return;
        if (cls.includes(target)) {
          if (shouldAnimate) {
            g.attr("display", null).transition().duration(500).attr("opacity", 1);
          } else {
            g.attr("display", null).attr("opacity", 1);
          }
        } else {
          if (shouldAnimate) {
            g.transition().duration(300).attr("opacity", 0).on("end", function () {
              d3.select(this).attr("display", "none");
            });
          } else {
            g.attr("display", "none").attr("opacity", 0);
          }
        }
      });
    }

    // Beat 1: Spotify histogram + song marker + year avg
    if (beat >= 1 && beat < 2) {
      showGroup("spotify");

      const songBin = findSpotifyBin(songWeeks, spotifyDistribution);
      if (shouldAnimate && prevBeat < 1) {
        gSpotify.selectAll(".sp-bar")
          .attr("opacity", 0)
          .transition().duration(400).delay((_, i) => i * 40)
          .attr("opacity", (d) => {
            const datum = d as SpotifyLifespanBucket;
            return songBin && datum.bucket === songBin.bucket ? 0.9 : 0.5;
          });
        gSpotify.selectAll(".sp-marker")
          .transition().delay(300).duration(300).attr("opacity", 1);
        gSpotify.selectAll(".sp-year-avg")
          .transition().delay(400).duration(300).attr("opacity", 1);
      } else {
        gSpotify.selectAll(".sp-bar").attr("opacity", (d) => {
          const datum = d as SpotifyLifespanBucket;
          return songBin && datum.bucket === songBin.bucket ? 0.9 : 0.5;
        });
        gSpotify.selectAll(".sp-marker").attr("opacity", 1);
        gSpotify.selectAll(".sp-year-avg").attr("opacity", 1);
      }
      gSpotify.selectAll(".sp-genre-avg").attr("opacity", 0);
      gSpotify.selectAll(".sp-genre-bar").attr("opacity", 0);
    }

    // Beat 2: Longevity category breakdown
    if (beat >= 2 && beat < 3) {
      showGroup("category");
    }

    // Beat 3: Billboard comparison
    if (beat >= 3 && beat < 4) {
      if (billboardDistribution?.length) {
        showGroup("billboard");
      } else {
        // No billboard data — stay on category view
        showGroup("category");
      }
    }

    // Beat 4: Back to Spotify histogram with genre overlay + genre avg
    if (beat >= 4) {
      showGroup("spotify");

      // Dim year bars to make room for genre overlay
      if (shouldAnimate && prevBeat < 4) {
        gSpotify.selectAll(".sp-bar")
          .transition().duration(400)
          .attr("opacity", 0.15);
        gSpotify.selectAll(".sp-genre-bar")
          .transition().delay(300).duration(400)
          .attr("opacity", 0.6);
        gSpotify.selectAll(".sp-genre-avg")
          .transition().delay(500).duration(400).attr("opacity", 1);
      } else {
        gSpotify.selectAll(".sp-bar").attr("opacity", 0.15);
        gSpotify.selectAll(".sp-genre-bar").attr("opacity", 0.6);
        gSpotify.selectAll(".sp-genre-avg").attr("opacity", 1);
      }
      gSpotify.selectAll(".sp-marker").attr("opacity", 1);
      gSpotify.selectAll(".sp-year-avg").attr("opacity", 0.4);
    }

    // Beat 0 or -1: hide everything
    if (beat < 1) {
      gSpotify.attr("display", null).attr("opacity", 1);
      gSpotify.selectAll(".sp-bar").attr("opacity", 0);
      gSpotify.selectAll(".sp-marker").attr("opacity", 0);
      gSpotify.selectAll(".sp-year-avg").attr("opacity", 0);
      gSpotify.selectAll(".sp-genre-avg").attr("opacity", 0);
      gSpotify.selectAll(".sp-genre-bar").attr("opacity", 0);
      gCategory.attr("display", "none").attr("opacity", 0);
      gBillboard.attr("display", "none").attr("opacity", 0);
    }
  }, [spotifyDistribution, genreDistribution, songWeeks, yearAvg, genreAvg, genreLabel,
    percentileInYear, categoryDistribution, songCategory, sameCategoryCount,
    percentileInCategory, totalSongs, billboardDistribution, billboardWeeks,
    billboardPercentile, beat]);

  useEffect(() => {
    drawnRef.current = false;
    prevBeatRef.current = -2;
  }, [spotifyDistribution, genreDistribution, billboardDistribution, categoryDistribution]);

  return (
    <div>
      <svg ref={svgRef} className="w-full" role="img" aria-label={`Histogram showing song lifespan of ${songWeeks} weeks compared to distribution`} />
    </div>
  );
}
