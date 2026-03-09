"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { BillboardTrajectoryPoint, LongevityBucket } from "@/lib/billboard-data";

type Props = {
  trajectory: BillboardTrajectoryPoint[];
  peakRank: number;
  distribution: LongevityBucket[];
  songWeeks: number;
  percentile: number;
  /**
   * -1 = empty axes (before scroll)
   *  0 = Billboard trajectory: empty axes
   *  1 = Billboard trajectory: line draws + peak annotation
   *  2 = Longevity percentile histogram
   */
  beat: number;
};

const AMBER = "#D97706";
const AMBER_DARK = "#92400E";

function findBucket(weeks: number): string {
  if (weeks <= 5) return "1-5";
  if (weeks <= 10) return "6-10";
  if (weeks <= 15) return "11-15";
  if (weeks <= 20) return "16-20";
  if (weeks <= 30) return "21-30";
  if (weeks <= 40) return "31-40";
  return "41+";
}

export default function ChartBillboardScrolly({
  trajectory, peakRank, distribution, songWeeks, percentile, beat,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);
  const prevBeatRef = useRef(-2);

  // Pre-sort trajectory
  const sorted = useMemo(
    () => [...trajectory].sort((a, b) => a.date.localeCompare(b.date)),
    [trajectory],
  );

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
      const height = 380;
      svg.attr("width", width).attr("height", height);

      const margin = { top: 20, right: 30, bottom: 50, left: 55 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;

      // ===== TRAJECTORY GROUP =====
      const gTraj = svg.append("g")
        .attr("class", "traj-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const parseDate = d3.timeParse("%Y-%m-%d");
      const dates = sorted.map((d) => parseDate(d.date)!).filter(Boolean);

      if (dates.length) {
        const x = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]).range([0, w]);
        const y = d3.scaleLinear().domain([100, 1]).range([h, 0]);

        // Grid lines
        [1, 10, 25, 50, 100].forEach((tick) => {
          gTraj.append("line")
            .attr("x1", 0).attr("x2", w)
            .attr("y1", y(tick)).attr("y2", y(tick))
            .attr("stroke", "#27272a").attr("stroke-dasharray", "3,3");
        });

        // Rank tier labels
        [
          { rank: 1, label: "#1" }, { rank: 10, label: "Top 10" },
          { rank: 50, label: "Top 50" }, { rank: 100, label: "#100" },
        ].forEach(({ rank, label }) => {
          gTraj.append("text")
            .attr("x", w + 4).attr("y", y(rank))
            .attr("dy", "0.35em").attr("font-size", 8).attr("fill", "#52525b")
            .text(label);
        });

        // X axis
        gTraj.append("g")
          .attr("transform", `translate(0,${h})`)
          .call(d3.axisBottom(x).ticks(6))
          .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick line").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 10));

        // Y axis
        gTraj.append("g")
          .call(d3.axisLeft(y).tickValues([1, 10, 25, 50, 100]))
          .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick line").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 10));

        gTraj.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -h / 2).attr("y", -35)
          .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#71717a")
          .text("Hot 100 Rank");

        // Area + line
        const area = d3.area<(typeof sorted)[0]>()
          .x((d) => x(parseDate(d.date)!))
          .y0(h).y1((d) => y(d.rank))
          .curve(d3.curveMonotoneX);

        gTraj.append("path").datum(sorted).attr("d", area)
          .attr("class", "traj-area")
          .attr("fill", AMBER).attr("opacity", 0);

        const line = d3.line<(typeof sorted)[0]>()
          .x((d) => x(parseDate(d.date)!))
          .y((d) => y(d.rank))
          .curve(d3.curveMonotoneX);

        gTraj.append("path").datum(sorted).attr("d", line)
          .attr("class", "traj-line")
          .attr("fill", "none").attr("stroke", AMBER).attr("stroke-width", 2.5)
          .attr("opacity", 0);

        // Peak annotation
        const peakPoint = sorted.reduce((best, d) => d.rank < best.rank ? d : best);
        const peakDate = parseDate(peakPoint.date)!;

        gTraj.append("circle")
          .attr("class", "traj-peak-dot")
          .attr("cx", x(peakDate)).attr("cy", y(peakPoint.rank))
          .attr("r", 6).attr("fill", AMBER).attr("stroke", "white").attr("stroke-width", 2)
          .attr("opacity", 0);

        gTraj.append("text")
          .attr("class", "traj-peak-label")
          .attr("x", x(peakDate)).attr("y", y(peakPoint.rank) - 14)
          .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", AMBER)
          .attr("opacity", 0)
          .text(`Peak: #${peakRank}`);
      }

      // ===== HISTOGRAM GROUP =====
      const gHist = svg.append("g")
        .attr("class", "hist-group")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("opacity", 0);

      if (distribution.length) {
        const xBand = d3.scaleBand()
          .domain(distribution.map((d) => d.bucket))
          .range([0, w])
          .padding(0.15);

        const maxCount = d3.max(distribution, (d) => d.count) || 1;
        const yHist = d3.scaleLinear().domain([0, maxCount]).range([h, 0]);

        // X axis
        gHist.append("g")
          .attr("transform", `translate(0,${h})`)
          .call(d3.axisBottom(xBand))
          .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick line").remove())
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 10));

        gHist.append("text")
          .attr("x", w / 2).attr("y", h + 40)
          .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#71717a")
          .text("Weeks on chart");

        // Y axis
        gHist.append("g")
          .call(d3.axisLeft(yHist).ticks(5))
          .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
          .call((sel) => sel.selectAll(".tick line").attr("stroke", "#27272a"))
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#71717a").attr("font-size", 10));

        gHist.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -h / 2).attr("y", -40)
          .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#71717a")
          .text("Number of songs");

        const songBucket = findBucket(songWeeks);

        // Bars (drawn at full height)
        gHist.selectAll(".bar")
          .data(distribution)
          .join("rect")
          .attr("class", "bar")
          .attr("x", (d) => xBand(d.bucket)!)
          .attr("y", (d) => yHist(d.count))
          .attr("width", xBand.bandwidth())
          .attr("height", (d) => h - yHist(d.count))
          .attr("rx", 3)
          .attr("fill", (d) => d.bucket === songBucket ? AMBER : "#E5E7EB")
          .attr("opacity", (d) => d.bucket === songBucket ? 0.9 : 0.6);

        // Song marker
        const bucketX = xBand(songBucket);
        if (bucketX !== undefined) {
          const markerX = bucketX + xBand.bandwidth() / 2;
          const bucketData = distribution.find((d) => d.bucket === songBucket);
          const barTop = bucketData ? yHist(bucketData.count) : h;

          gHist.append("line")
            .attr("class", "hist-marker")
            .attr("x1", markerX).attr("x2", markerX)
            .attr("y1", barTop - 8).attr("y2", barTop - 30)
            .attr("stroke", AMBER_DARK).attr("stroke-width", 2);

          gHist.append("polygon")
            .attr("class", "hist-marker")
            .attr("points", `${markerX},${barTop - 6} ${markerX - 5},${barTop - 14} ${markerX + 5},${barTop - 14}`)
            .attr("fill", AMBER_DARK);

          gHist.append("text")
            .attr("class", "hist-marker")
            .attr("x", markerX).attr("y", barTop - 36)
            .attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", 700).attr("fill", AMBER_DARK)
            .text(`${songWeeks}w · Top ${100 - percentile}%`);
        }
      }
    }

    // --- Update visibility ---
    const shouldAnimate = beat > prevBeat;
    const gTraj = svg.select(".traj-group");
    const gHist = svg.select(".hist-group");

    // Trajectory view (beats 0-1)
    if (beat <= 1) {
      gTraj.attr("display", null);

      if (beat >= 1) {
        if (shouldAnimate && prevBeat < 1) {
          gTraj.select(".traj-area").transition().duration(400).attr("opacity", 0.1);
          const path = gTraj.select<SVGPathElement>(".traj-line");
          const totalLength = path.node()?.getTotalLength() || 0;
          path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .attr("opacity", 1)
            .transition().duration(1200).ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0);

          gTraj.select(".traj-peak-dot")
            .transition().delay(800).duration(400).attr("opacity", 1);
          gTraj.select(".traj-peak-label")
            .transition().delay(900).duration(300).attr("opacity", 1);
        } else {
          gTraj.select(".traj-area").attr("opacity", 0.1);
          gTraj.select<SVGPathElement>(".traj-line")
            .attr("stroke-dasharray", null).attr("stroke-dashoffset", null).attr("opacity", 1);
          gTraj.select(".traj-peak-dot").attr("opacity", 1);
          gTraj.select(".traj-peak-label").attr("opacity", 1);
        }
      } else {
        // Beat 0 or -1: just axes, hide data elements
        gTraj.select(".traj-area").attr("opacity", 0);
        gTraj.select(".traj-line").attr("opacity", 0);
        gTraj.select(".traj-peak-dot").attr("opacity", 0);
        gTraj.select(".traj-peak-label").attr("opacity", 0);
      }

      gHist.attr("display", "none");
    } else {
      // Beat 2: show histogram, hide trajectory
      gTraj.attr("display", "none");

      if (shouldAnimate && prevBeat < 2) {
        gHist.attr("display", null).attr("opacity", 0)
          .transition().duration(500).attr("opacity", 1);
      } else {
        gHist.attr("display", null).attr("opacity", 1);
      }
    }
  }, [sorted, peakRank, distribution, songWeeks, percentile, beat]);

  useEffect(() => {
    drawnRef.current = false;
    prevBeatRef.current = -2;
  }, [trajectory, distribution]);

  return (
    <div className="rounded-2xl border border-amber-800/40 bg-[#181818] p-4">
      <svg ref={svgRef} className="w-full" />
      <p className="mt-2 text-center text-xs text-amber-400">
        Billboard Hot 100 · Radio + sales + streaming · US chart · Since 1958
      </p>
    </div>
  );
}
