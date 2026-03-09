"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { SpotifyLifespanBucket } from "@/lib/spotify-data";
import type { LongevityBucket } from "@/lib/billboard-data";

type Props = {
  /** Spotify lifespan distribution for the song's debut year */
  spotifyDistribution: SpotifyLifespanBucket[];
  songWeeks: number;
  yearAvg: number;
  genreAvg: number;
  genreLabel: string;
  percentileInYear: number;
  /** Billboard longevity distribution (optional) */
  billboardDistribution?: LongevityBucket[];
  billboardWeeks?: number;
  billboardPercentile?: number;
  /**
   * -1 = empty axes (before scroll)
   *  0 = axes only
   *  1 = Spotify histogram + song marker + year avg line
   *  2 = Genre avg annotation added
   *  3 = Billboard comparison (if available) or summary
   */
  beat: number;
};

const BLUE = "#1DB954";
const AMBER = "#D97706";
const AMBER_DARK = "#92400E";

function findSpotifyBucket(weeks: number): string {
  if (weeks <= 3) return "1-3";
  if (weeks <= 6) return "4-6";
  if (weeks <= 10) return "7-10";
  if (weeks <= 15) return "11-15";
  if (weeks <= 25) return "16-25";
  if (weeks <= 40) return "26-40";
  return "41+";
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

export default function ChartStayingPowerScrolly({
  spotifyDistribution, songWeeks, yearAvg, genreAvg, genreLabel,
  percentileInYear, billboardDistribution, billboardWeeks,
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

      const container = svgRef.current.parentElement!;
      const width = container.clientWidth;
      const height = 400;
      svg.attr("width", width).attr("height", height);

      const margin = { top: 24, right: 40, bottom: 58, left: 60 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;

      // ===== SPOTIFY HISTOGRAM GROUP =====
      const gSpotify = svg.append("g")
        .attr("class", "spotify-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      if (spotifyDistribution.length) {
        const xBand = d3.scaleBand()
          .domain(spotifyDistribution.map((d) => d.bucket))
          .range([0, w])
          .padding(0.15);

        const maxCount = d3.max(spotifyDistribution, (d) => d.count) || 1;
        const yHist = d3.scaleLinear().domain([0, maxCount * 1.15]).range([h, 0]);

        // X axis
        gSpotify.append("g")
          .attr("transform", `translate(0,${h})`)
          .call(d3.axisBottom(xBand))
          .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick line").remove())
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 14));

        gSpotify.append("text")
          .attr("x", w / 2).attr("y", h + 40)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#71717a")
          .text("Weeks on Spotify Top 200");

        // Y axis
        gSpotify.append("g")
          .call(d3.axisLeft(yHist).ticks(5))
          .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick line").attr("stroke", "#27272a"))
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 14));

        gSpotify.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -h / 2).attr("y", -40)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#71717a")
          .text("Number of songs");

        const songBucket = findSpotifyBucket(songWeeks);

        // Bars
        gSpotify.selectAll(".sp-bar")
          .data(spotifyDistribution)
          .join("rect")
          .attr("class", "sp-bar")
          .attr("x", (d) => xBand(d.bucket)!)
          .attr("y", (d) => yHist(d.count))
          .attr("width", xBand.bandwidth())
          .attr("height", (d) => h - yHist(d.count))
          .attr("rx", 3)
          .attr("fill", (d) => d.bucket === songBucket ? BLUE : "#3f3f46")
          .attr("opacity", 0);

        // Song marker
        const bucketX = xBand(songBucket);
        if (bucketX !== undefined) {
          const markerX = bucketX + xBand.bandwidth() / 2;
          const bucketData = spotifyDistribution.find((d) => d.bucket === songBucket);
          const barTop = bucketData ? yHist(bucketData.count) : h;

          gSpotify.append("line")
            .attr("class", "sp-marker")
            .attr("x1", markerX).attr("x2", markerX)
            .attr("y1", barTop - 8).attr("y2", barTop - 30)
            .attr("stroke", BLUE).attr("stroke-width", 2).attr("opacity", 0);

          gSpotify.append("polygon")
            .attr("class", "sp-marker")
            .attr("points", `${markerX},${barTop - 6} ${markerX - 5},${barTop - 14} ${markerX + 5},${barTop - 14}`)
            .attr("fill", BLUE).attr("opacity", 0);

          gSpotify.append("text")
            .attr("class", "sp-marker")
            .attr("x", markerX).attr("y", barTop - 36)
            .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 700).attr("fill", BLUE)
            .attr("opacity", 0)
            .text(`${songWeeks}w · Top ${100 - percentileInYear}%`);
        }

        // Year average line
        // Find which bucket the average falls into and position within it
        const avgBucket = findSpotifyBucket(Math.round(yearAvg));
        const avgBucketX = xBand(avgBucket);
        if (avgBucketX !== undefined) {
          const avgLineX = avgBucketX + xBand.bandwidth() / 2;
          gSpotify.append("line")
            .attr("class", "sp-year-avg")
            .attr("x1", avgLineX).attr("x2", avgLineX)
            .attr("y1", 0).attr("y2", h)
            .attr("stroke", "#6B7280").attr("stroke-dasharray", "6,3")
            .attr("stroke-width", 1.5).attr("opacity", 0);

          gSpotify.append("text")
            .attr("class", "sp-year-avg")
            .attr("x", avgLineX + 4).attr("y", 14)
            .attr("font-size", 13).attr("fill", "#6B7280").attr("font-weight", 600)
            .attr("opacity", 0)
            .text(`Year avg: ${yearAvg.toFixed(1)}w`);
        }

        // Genre average line
        const genreAvgBucket = findSpotifyBucket(Math.round(genreAvg));
        const genreAvgBucketX = xBand(genreAvgBucket);
        if (genreAvgBucketX !== undefined) {
          const genreLineX = genreAvgBucketX + xBand.bandwidth() / 2;
          gSpotify.append("line")
            .attr("class", "sp-genre-avg")
            .attr("x1", genreLineX).attr("x2", genreLineX)
            .attr("y1", 0).attr("y2", h)
            .attr("stroke", "#8B5CF6").attr("stroke-dasharray", "4,4")
            .attr("stroke-width", 1.5).attr("opacity", 0);

          gSpotify.append("text")
            .attr("class", "sp-genre-avg")
            .attr("x", genreLineX + 4).attr("y", 28)
            .attr("font-size", 13).attr("fill", "#8B5CF6").attr("font-weight", 600)
            .attr("opacity", 0)
            .text(`${genreLabel} avg: ${genreAvg.toFixed(1)}w`);
        }
      }

      // ===== BILLBOARD HISTOGRAM GROUP =====
      const gBillboard = svg.append("g")
        .attr("class", "billboard-group")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("opacity", 0);

      if (billboardDistribution?.length && billboardWeeks != null) {
        const xBand = d3.scaleBand()
          .domain(billboardDistribution.map((d) => d.bucket))
          .range([0, w])
          .padding(0.15);

        const maxCount = d3.max(billboardDistribution, (d) => d.count) || 1;
        const yHist = d3.scaleLinear().domain([0, maxCount * 1.15]).range([h, 0]);

        // X axis
        gBillboard.append("g")
          .attr("transform", `translate(0,${h})`)
          .call(d3.axisBottom(xBand))
          .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick line").remove())
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 14));

        gBillboard.append("text")
          .attr("x", w / 2).attr("y", h + 40)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#71717a")
          .text("Weeks on Billboard Hot 100 (all time)");

        // Y axis
        gBillboard.append("g")
          .call(d3.axisLeft(yHist).ticks(5))
          .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick line").attr("stroke", "#27272a"))
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 14));

        gBillboard.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -h / 2).attr("y", -40)
          .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#71717a")
          .text("Number of songs");

        const songBucket = findBillboardBucket(billboardWeeks);

        // Bars
        gBillboard.selectAll(".bb-bar")
          .data(billboardDistribution)
          .join("rect")
          .attr("class", "bb-bar")
          .attr("x", (d) => xBand(d.bucket)!)
          .attr("y", (d) => yHist(d.count))
          .attr("width", xBand.bandwidth())
          .attr("height", (d) => h - yHist(d.count))
          .attr("rx", 3)
          .attr("fill", (d) => d.bucket === songBucket ? AMBER : "#52525b")
          .attr("opacity", (d) => d.bucket === songBucket ? 0.9 : 0.6);

        // Song marker
        const bucketX = xBand(songBucket);
        if (bucketX !== undefined) {
          const markerX = bucketX + xBand.bandwidth() / 2;
          const bucketData = billboardDistribution.find((d) => d.bucket === songBucket);
          const barTop = bucketData ? yHist(bucketData.count) : h;

          gBillboard.append("line")
            .attr("x1", markerX).attr("x2", markerX)
            .attr("y1", barTop - 8).attr("y2", barTop - 30)
            .attr("stroke", AMBER_DARK).attr("stroke-width", 2);

          gBillboard.append("polygon")
            .attr("points", `${markerX},${barTop - 6} ${markerX - 5},${barTop - 14} ${markerX + 5},${barTop - 14}`)
            .attr("fill", AMBER_DARK);

          gBillboard.append("text")
            .attr("x", markerX).attr("y", barTop - 36)
            .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 700).attr("fill", AMBER_DARK)
            .text(`${billboardWeeks}w · Top ${100 - (billboardPercentile ?? 50)}%`);
        }
      }
    }

    // --- Update visibility ---
    const shouldAnimate = beat > prevBeat;
    const gSpotify = svg.select(".spotify-group");
    const gBillboard = svg.select(".billboard-group");

    // Beat 1: Spotify histogram + song marker + year avg
    if (beat >= 1) {
      if (beat <= 2) {
        gSpotify.attr("display", null);

        if (shouldAnimate && prevBeat < 1) {
          gSpotify.selectAll(".sp-bar")
            .attr("opacity", 0)
            .transition().duration(400).delay((_, i) => i * 40)
            .attr("opacity", (d) => {
              const datum = d as SpotifyLifespanBucket;
              return datum.bucket === findSpotifyBucket(songWeeks) ? 0.9 : 0.5;
            });
          gSpotify.selectAll(".sp-marker")
            .transition().delay(300).duration(300).attr("opacity", 1);
          gSpotify.selectAll(".sp-year-avg")
            .transition().delay(400).duration(300).attr("opacity", 1);
        } else {
          gSpotify.selectAll(".sp-bar").attr("opacity", (d) => {
            const datum = d as SpotifyLifespanBucket;
            return datum.bucket === findSpotifyBucket(songWeeks) ? 0.9 : 0.5;
          });
          gSpotify.selectAll(".sp-marker").attr("opacity", 1);
          gSpotify.selectAll(".sp-year-avg").attr("opacity", 1);
        }
      }

      // Beat 2: add genre avg
      if (beat >= 2) {
        if (shouldAnimate && prevBeat < 2) {
          gSpotify.selectAll(".sp-genre-avg")
            .transition().duration(400).attr("opacity", 1);
        } else {
          gSpotify.selectAll(".sp-genre-avg").attr("opacity", 1);
        }
      } else {
        gSpotify.selectAll(".sp-genre-avg").attr("opacity", 0);
      }
    } else {
      gSpotify.selectAll(".sp-bar").attr("opacity", 0);
      gSpotify.selectAll(".sp-marker").attr("opacity", 0);
      gSpotify.selectAll(".sp-year-avg").attr("opacity", 0);
      gSpotify.selectAll(".sp-genre-avg").attr("opacity", 0);
    }

    // Beat 3: Billboard histogram (swap views)
    if (beat >= 3 && billboardDistribution?.length) {
      gSpotify.attr("display", "none");

      if (shouldAnimate && prevBeat < 3) {
        gBillboard.attr("display", null).attr("opacity", 0)
          .transition().duration(500).attr("opacity", 1);
      } else {
        gBillboard.attr("display", null).attr("opacity", 1);
      }
    } else {
      if (beat >= 1) {
        gSpotify.attr("display", null);
      }
      gBillboard.attr("display", "none").attr("opacity", 0);
    }
  }, [spotifyDistribution, songWeeks, yearAvg, genreAvg, genreLabel,
    percentileInYear, billboardDistribution, billboardWeeks, billboardPercentile, beat]);

  useEffect(() => {
    drawnRef.current = false;
    prevBeatRef.current = -2;
  }, [spotifyDistribution, billboardDistribution]);

  const hasBillboard = billboardDistribution && billboardDistribution.length > 0;
  const isBillboardBeat = beat >= 3 && hasBillboard;

  return (
    <div className={`rounded-2xl border p-4 ${isBillboardBeat ? "border-amber-800/40 bg-[#181818]" : "border-zinc-800 bg-[#181818]"}`}>
      <svg ref={svgRef} className="w-full" />
      <p className="mt-2 text-center text-xs text-muted">
        {isBillboardBeat ? (
          <span className="text-amber-400">Billboard Hot 100 · All songs since 1958</span>
        ) : (
          <span>Spotify Global Top 200 · {spotifyDistribution.length > 0 ? "Songs from same debut year" : "Lifespan distribution"}</span>
        )}
      </p>
    </div>
  );
}
