"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { ChartRunInfo } from "@/lib/narrative-generator";

type DataPoint = { week: string; rank: number; streams: number | null };

type Props = {
  data: DataPoint[];
  peakRank: number;
  chartRunInfo?: ChartRunInfo;
  /**
   * -1 = axes only (before scroll)
   *  0 = axes only
   *  1 = line appears (with gap indicators if re-entries)
   *  2 = peak annotation + axis zoom into peak region
   *  3 = streams bars + zoom back out
   */
  beat: number;
};

const GAP_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000;
const OFF_CHART_RANK = 210;

// viewBox dimensions — wide rectangle
const WIDTH = 1200;
const HEIGHT = 340;
const MARGIN = { top: 28, right: 64, bottom: 56, left: 64 };
const W = WIDTH - MARGIN.left - MARGIN.right;
const H = HEIGHT - MARGIN.top - MARGIN.bottom;

function styleAxis(sel: d3.Selection<SVGGElement, unknown, null, undefined>) {
  sel.select(".domain").attr("stroke", "#3f3f46");
  sel.selectAll(".tick line").attr("stroke", "#3f3f46");
  sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12);
}

export default function ChartRiseScrolly({ data, peakRank, chartRunInfo, beat }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);
  const prevBeatRef = useRef(-2);

  const prevDataRef = useRef<DataPoint[] | null>(null);

  const stateRef = useRef<{
    x: d3.ScaleTime<number, number>;
    y: d3.ScaleLinear<number, number>;
    yStreams: d3.ScaleLinear<number, number>;
    xFull: [Date, Date];
    yFull: [number, number];
    xZoomed: [Date, Date];
    yZoomed: [number, number];
    sorted: DataPoint[];
    parseDate: (s: string) => Date | null;
    prefersReducedMotion: boolean;
  } | null>(null);

  const { runs, hasReentries } = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.week.localeCompare(b.week));
    if (sorted.length < 2) return { runs: [sorted], hasReentries: false };

    const segments: DataPoint[][] = [];
    let current: DataPoint[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].week + "T00:00:00").getTime();
      const curr = new Date(sorted[i].week + "T00:00:00").getTime();
      if (curr - prev > GAP_THRESHOLD_MS) {
        segments.push(current);
        current = [];
      }
      current.push(sorted[i]);
    }
    segments.push(current);

    return { runs: segments, hasReentries: segments.length > 1 };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Empty state
    if (!data.length) {
      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%").style("height", "auto");
      svg.append("text")
        .attr("x", WIDTH / 2).attr("y", HEIGHT / 2)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#71717a")
        .text("Data unavailable");
      return;
    }

    // Reset when data changes (new song)
    if (prevDataRef.current !== data) {
      prevDataRef.current = data;
      drawnRef.current = false;
      prevBeatRef.current = -2;
      stateRef.current = null;
    }

    const isFirstDraw = !drawnRef.current;
    const prevBeat = prevBeatRef.current;
    prevBeatRef.current = beat;

    // Detect reduced motion preference
    const prefersReducedMotion = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isFirstDraw) {
      drawnRef.current = true;
      svg.selectAll("*").remove();

      // viewBox-based responsive sizing
      svg.attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%").style("height", "auto");

      const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      svg.append("defs").append("clipPath").attr("id", "rise-clip")
        .append("rect").attr("x", -2).attr("y", -2).attr("width", W + 4).attr("height", H + 4);

      const parseDate = d3.timeParse("%Y-%m-%d");
      const sorted = [...data]
        .map((d) => ({ ...d, streams: d.streams != null ? Number(d.streams) : null }))
        .sort((a, b) => a.week.localeCompare(b.week));
      const dates = sorted.map((d) => parseDate(d.week)!);
      const xExtent = d3.extent(dates) as [Date, Date];

      const yMax = hasReentries ? OFF_CHART_RANK : 200;
      const x = d3.scaleTime().domain(xExtent).range([0, W]).clamp(true);
      const y = d3.scaleLinear().domain([yMax, 1]).range([H, 0]).clamp(true);
      const numericStreams = sorted.map((d) => d.streams).filter((s): s is number => s != null && s > 0);
      const maxStreams = numericStreams.length ? Math.max(...numericStreams) : 1;
      const yStreams = d3.scaleLinear().domain([0, maxStreams]).range([H, H * 0.5]).clamp(true);

      // Compute zoom domains around peak
      const peakPoint = sorted.reduce((best, d) => d.rank < best.rank ? d : best);
      const peakDate = parseDate(peakPoint.week)!;
      const peakIdx = sorted.findIndex((d) => d.week === peakPoint.week);

      const zoomPadWeeks = Math.max(5, Math.ceil(sorted.length * 0.15));
      const zoomStartIdx = Math.max(0, peakIdx - zoomPadWeeks);
      const zoomEndIdx = Math.min(sorted.length - 1, peakIdx + zoomPadWeeks);
      const xZoomStart = parseDate(sorted[zoomStartIdx].week)!;
      const xZoomEnd = parseDate(sorted[zoomEndIdx].week)!;

      const yZoomBottom = Math.min(yMax, peakRank + Math.max(30, Math.round(peakRank * 0.5)));
      const yZoomTop = Math.max(1, peakRank - Math.max(5, Math.round(peakRank * 0.15)));

      stateRef.current = {
        x, y, yStreams, sorted, parseDate, prefersReducedMotion,
        xFull: xExtent,
        yFull: [yMax, 1],
        xZoomed: [xZoomStart, xZoomEnd],
        yZoomed: [yZoomBottom, yZoomTop],
      };

      // X axis
      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${H})`)
        .call(
          d3.axisBottom(x).ticks(6).tickSizeOuter(0).tickPadding(8)
            .tickFormat(d3.timeFormat("%b '%y") as (d: Date | d3.NumberValue) => string)
        )
        .call(styleAxis);

      // Y axis
      g.append("g")
        .attr("class", "y-axis")
        .call(
          d3.axisLeft(y).tickValues([1, 10, 50, 100, 200]).tickSizeOuter(0).tickPadding(8)
            .tickFormat((d) => `#${d}`)
        )
        .call(styleAxis);

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -H / 2).attr("y", -48)
        .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 500).attr("fill", "#71717a")
        .text("Chart Rank");

      // Grid lines
      g.append("g").attr("class", "grid-lines");
      [1, 10, 50, 100, 200].forEach((tick) => {
        g.select(".grid-lines").append("line")
          .attr("class", "grid-line")
          .attr("x1", 0).attr("x2", W)
          .attr("y1", y(tick)).attr("y2", y(tick))
          .attr("stroke", "#27272a").attr("stroke-dasharray", "3,3")
          .attr("data-rank", tick);
      });

      // Tier labels (right side)
      [
        { rank: 1, label: "#1" }, { rank: 10, label: "Top 10" },
        { rank: 50, label: "Top 50" }, { rank: 100, label: "Top 100" },
      ].forEach(({ rank, label }) => {
        g.append("text")
          .attr("class", "tier-label")
          .attr("x", W + 8).attr("y", y(rank))
          .attr("dy", "0.35em").attr("font-size", 12).attr("fill", "#52525b")
          .attr("data-rank", rank)
          .text(label);
      });

      // Data group (clipped)
      const dataG = g.append("g").attr("class", "data-group").attr("clip-path", "url(#rise-clip)");

      // Gap indicators
      if (hasReentries) {
        for (let i = 0; i < runs.length - 1; i++) {
          const prevRun = runs[i];
          const nextRun = runs[i + 1];
          const lastPt = prevRun[prevRun.length - 1];
          const firstPt = nextRun[0];
          const x1 = x(parseDate(lastPt.week)!);
          const x2 = x(parseDate(firstPt.week)!);
          const gapW = x2 - x1;

          const ld = [
            { px: x1, py: y(lastPt.rank) },
            { px: x1 + gapW * 0.15, py: y(OFF_CHART_RANK) },
            { px: x2 - gapW * 0.15, py: y(OFF_CHART_RANK) },
            { px: x2, py: y(firstPt.rank) },
          ];
          dataG.append("path").attr("class", "gap-connector")
            .attr("d", d3.line<typeof ld[0]>().x((d) => d.px).y((d) => d.py).curve(d3.curveBasis)(ld)!)
            .attr("fill", "none").attr("stroke", "#EF4444").attr("stroke-width", 1.5).attr("stroke-dasharray", "4,4").attr("opacity", 0)
            .attr("data-week1", lastPt.week).attr("data-week2", firstPt.week)
            .attr("data-rank1", lastPt.rank).attr("data-rank2", firstPt.rank);

          dataG.append("text").attr("class", "gap-label")
            .attr("x", (x1 + x2) / 2).attr("y", y(OFF_CHART_RANK) + 16)
            .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#EF4444").attr("font-weight", 500).attr("opacity", 0)
            .attr("data-week1", lastPt.week).attr("data-week2", firstPt.week)
            .text("Off chart");

          dataG.append("circle").attr("class", "reentry-dot")
            .attr("cx", x2).attr("cy", y(firstPt.rank))
            .attr("r", 5).attr("fill", "#EF4444").attr("stroke", "#181818").attr("stroke-width", 2).attr("opacity", 0)
            .attr("data-week", firstPt.week).attr("data-rank", firstPt.rank);

          if (i === 0) {
            dataG.append("text").attr("class", "reentry-label")
              .attr("x", x2 + 10).attr("y", y(firstPt.rank) - 6)
              .attr("font-size", 13).attr("fill", "#EF4444").attr("font-weight", 600).attr("opacity", 0)
              .attr("data-week", firstPt.week).attr("data-rank", firstPt.rank)
              .text("Re-entry");
          }
        }
      }

      // Line and area per run
      const areaGen = d3.area<DataPoint>()
        .x((d) => x(parseDate(d.week)!)).y0(H).y1((d) => y(d.rank)).curve(d3.curveMonotoneX);
      const lineGen = d3.line<DataPoint>()
        .x((d) => x(parseDate(d.week)!)).y((d) => y(d.rank)).curve(d3.curveMonotoneX);

      runs.forEach((run, ri) => {
        dataG.append("path").datum(run).attr("d", areaGen)
          .attr("class", "rise-area").attr("data-run", ri)
          .attr("fill", "#1DB954").attr("opacity", 0);
        const path = dataG.append("path").datum(run).attr("d", lineGen)
          .attr("class", "rise-line").attr("data-run", ri)
          .attr("fill", "none").attr("stroke", "#1DB954").attr("stroke-width", 2.5).attr("opacity", 0);
        path.attr("data-total-length", path.node()?.getTotalLength() || 0);
      });

      // Peak annotation
      const peakX = x(peakDate);
      const peakY = y(peakPoint.rank);
      dataG.append("circle").attr("class", "rise-peak-dot")
        .attr("cx", peakX).attr("cy", peakY)
        .attr("r", 7).attr("fill", "#1DB954").attr("stroke", "#181818").attr("stroke-width", 2.5).attr("opacity", 0);
      dataG.append("text").attr("class", "rise-peak-label")
        .attr("x", peakX).attr("y", peakY - 18)
        .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 600).attr("fill", "#1DB954").attr("opacity", 0)
        .text(`Peak: #${peakPoint.rank}`);

      // Streams bars + right Y-axis
      const hasStreams = sorted.some((d) => d.streams && d.streams > 0);
      if (hasStreams) {
        const barWidth = Math.max(2, W / sorted.length - 1);
        dataG.selectAll(".stream-bar")
          .data(sorted.filter((d) => d.streams && d.streams > 0))
          .join("rect").attr("class", "stream-bar")
          .attr("x", (d) => x(parseDate(d.week)!) - barWidth / 2)
          .attr("y", (d) => yStreams(d.streams!))
          .attr("width", barWidth)
          .attr("height", (d) => H - yStreams(d.streams!))
          .attr("fill", "#F59E0B").attr("opacity", 0);

        // Right Y-axis for streams
        const fmtStreams = (d: number | d3.NumberValue) => {
          const v = +d;
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
          return String(v);
        };
        g.append("g").attr("class", "y-axis-streams")
          .attr("transform", `translate(${W},0)`)
          .call(d3.axisRight(yStreams).ticks(3).tickSizeOuter(0).tickPadding(8).tickFormat(fmtStreams as (d: d3.NumberValue) => string))
          .call((sel) => sel.select(".domain").remove())
          .call((sel) => sel.selectAll(".tick line").attr("stroke", "#F59E0B").attr("opacity", 0.3))
          .call((sel) => sel.selectAll(".tick text").attr("fill", "#F59E0B").attr("font-size", 12).attr("opacity", 0.7))
          .attr("opacity", 0);

        g.append("text").attr("class", "stream-label")
          .attr("x", W).attr("y", H + 40)
          .attr("text-anchor", "end").attr("font-size", 13).attr("font-weight", 500).attr("fill", "#F59E0B").attr("opacity", 0)
          .text("Weekly streams \u25B2");
      }
    }

    // --- Update visibility & axis-based zoom ---
    const g = svg.select("g");
    const dataG = g.select(".data-group");
    const state = stateRef.current;
    const noMotion = state?.prefersReducedMotion ?? false;
    const shouldAnimate = !noMotion && beat > prevBeat;

    if (state) {
      const { x, y, sorted, parseDate: pd } = state;
      const dur = 800; // slow: major state change

      const xDomain: [Date, Date] = beat === 2 ? state.xZoomed : state.xFull;
      const yDomain: [number, number] = beat === 2 ? state.yZoomed : state.yFull;
      const doTransition = shouldAnimate && ((beat === 2 && prevBeat < 2) || (beat !== 2 && prevBeat === 2));

      x.domain(xDomain);
      y.domain(yDomain);

      const areaGen = d3.area<DataPoint>()
        .x((d) => x(pd(d.week)!)).y0(H).y1((d) => y(d.rank)).curve(d3.curveMonotoneX);
      const lineGen = d3.line<DataPoint>()
        .x((d) => x(pd(d.week)!)).y((d) => y(d.rank)).curve(d3.curveMonotoneX);

      // Axes
      const xAxis = d3.axisBottom(x).ticks(6).tickSizeOuter(0).tickPadding(8)
        .tickFormat(d3.timeFormat("%b '%y") as (d: Date | d3.NumberValue) => string);
      const yTickVals = beat === 2
        ? [yDomain[1], Math.round((yDomain[0] + yDomain[1]) / 2), yDomain[0]].filter((v, i, a) => a.indexOf(v) === i)
        : [1, 10, 50, 100, 200];
      const yAxis = d3.axisLeft(y).tickValues(yTickVals).tickSizeOuter(0).tickPadding(8)
        .tickFormat((d) => `#${d}`);

      if (doTransition) {
        // Axes first
        g.select<SVGGElement>(".x-axis").transition().duration(dur).ease(d3.easeCubicInOut)
          .call(xAxis).on("end", function () { styleAxis(d3.select(this)); });
        g.select<SVGGElement>(".y-axis").transition().duration(dur).ease(d3.easeCubicInOut)
          .call(yAxis).on("end", function () { styleAxis(d3.select(this)); });

        // Data elements 100ms after axes
        const dataDelay = 100;
        dataG.selectAll<SVGPathElement, DataPoint[]>(".rise-area").transition().delay(dataDelay).duration(dur)
          .ease(d3.easeCubicInOut).attr("d", areaGen as unknown as string);
        dataG.selectAll<SVGPathElement, DataPoint[]>(".rise-line").transition().delay(dataDelay).duration(dur)
          .ease(d3.easeCubicInOut).attr("d", lineGen as unknown as string);
      } else {
        g.select<SVGGElement>(".x-axis").call(xAxis); styleAxis(g.select<SVGGElement>(".x-axis"));
        g.select<SVGGElement>(".y-axis").call(yAxis); styleAxis(g.select<SVGGElement>(".y-axis"));
        dataG.selectAll<SVGPathElement, DataPoint[]>(".rise-area").attr("d", areaGen as unknown as string);
        dataG.selectAll<SVGPathElement, DataPoint[]>(".rise-line").attr("d", lineGen as unknown as string);
      }

      // Grid + tier labels
      g.selectAll<SVGLineElement, unknown>(".grid-line").each(function () {
        const el = d3.select(this);
        const rank = parseInt(el.attr("data-rank") || "0");
        const ny = y(rank);
        if (doTransition) el.transition().duration(dur).ease(d3.easeCubicInOut).attr("y1", ny).attr("y2", ny);
        else el.attr("y1", ny).attr("y2", ny);
      });
      g.selectAll<SVGTextElement, unknown>(".tier-label").each(function () {
        const el = d3.select(this);
        const rank = parseInt(el.attr("data-rank") || "0");
        if (doTransition) el.transition().duration(dur).ease(d3.easeCubicInOut).attr("y", y(rank));
        else el.attr("y", y(rank));
      });

      // Peak position
      const peakPoint = sorted.reduce((best, d) => d.rank < best.rank ? d : best);
      const npx = x(pd(peakPoint.week)!);
      const npy = y(peakPoint.rank);
      if (doTransition) {
        const dataDelay = 100;
        dataG.select(".rise-peak-dot").transition().delay(dataDelay).duration(dur)
          .ease(d3.easeCubicInOut).attr("cx", npx).attr("cy", npy);
        dataG.select(".rise-peak-label").transition().delay(dataDelay).duration(dur)
          .ease(d3.easeCubicInOut).attr("x", npx).attr("y", npy - 18);
      } else {
        dataG.select(".rise-peak-dot").attr("cx", npx).attr("cy", npy);
        dataG.select(".rise-peak-label").attr("x", npx).attr("y", npy - 18);
      }

      // Stream bars
      const barWidth = Math.max(2, W / sorted.length - 1);
      const sb = dataG.selectAll<SVGRectElement, DataPoint>(".stream-bar");
      if (doTransition) {
        sb.transition().delay(100).duration(dur).ease(d3.easeCubicInOut)
          .attr("x", (d) => x(pd(d.week)!) - barWidth / 2).attr("width", barWidth);
      } else {
        sb.attr("x", (d) => x(pd(d.week)!) - barWidth / 2).attr("width", barWidth);
      }

      // Gap indicators
      if (hasReentries) {
        dataG.selectAll<SVGPathElement, unknown>(".gap-connector").each(function () {
          const el = d3.select(this);
          const nx1 = x(pd(el.attr("data-week1")!)!);
          const nx2 = x(pd(el.attr("data-week2")!)!);
          const r1 = parseInt(el.attr("data-rank1")!);
          const r2 = parseInt(el.attr("data-rank2")!);
          const gw = nx2 - nx1;
          const ld = [
            { px: nx1, py: y(r1) }, { px: nx1 + gw * 0.15, py: y(OFF_CHART_RANK) },
            { px: nx2 - gw * 0.15, py: y(OFF_CHART_RANK) }, { px: nx2, py: y(r2) },
          ];
          const np = d3.line<typeof ld[0]>().x((d) => d.px).y((d) => d.py).curve(d3.curveBasis)(ld)!;
          if (doTransition) el.transition().delay(100).duration(dur).ease(d3.easeCubicInOut).attr("d", np);
          else el.attr("d", np);
        });
        dataG.selectAll<SVGTextElement, unknown>(".gap-label").each(function () {
          const el = d3.select(this);
          const nx1 = x(pd(el.attr("data-week1")!)!);
          const nx2 = x(pd(el.attr("data-week2")!)!);
          if (doTransition) el.transition().delay(100).duration(dur).ease(d3.easeCubicInOut).attr("x", (nx1 + nx2) / 2).attr("y", y(OFF_CHART_RANK) + 16);
          else el.attr("x", (nx1 + nx2) / 2).attr("y", y(OFF_CHART_RANK) + 16);
        });
        dataG.selectAll<SVGCircleElement, unknown>(".reentry-dot").each(function () {
          const el = d3.select(this);
          if (doTransition) el.transition().delay(100).duration(dur).ease(d3.easeCubicInOut).attr("cx", x(pd(el.attr("data-week")!)!)).attr("cy", y(parseInt(el.attr("data-rank")!)));
          else el.attr("cx", x(pd(el.attr("data-week")!)!)).attr("cy", y(parseInt(el.attr("data-rank")!)));
        });
        dataG.selectAll<SVGTextElement, unknown>(".reentry-label").each(function () {
          const el = d3.select(this);
          if (doTransition) el.transition().delay(100).duration(dur).ease(d3.easeCubicInOut).attr("x", x(pd(el.attr("data-week")!)!) + 10).attr("y", y(parseInt(el.attr("data-rank")!)) - 6);
          else el.attr("x", x(pd(el.attr("data-week")!)!) + 10).attr("y", y(parseInt(el.attr("data-rank")!)) - 6);
        });
      }
    }

    // Visibility
    if (beat >= 1) {
      dataG.selectAll<SVGPathElement, DataPoint[]>(".rise-area").each(function () {
        const el = d3.select(this);
        if (shouldAnimate && prevBeat < 1) el.transition().duration(400).attr("opacity", 0.06);
        else el.attr("opacity", 0.06);
      });
      dataG.selectAll<SVGPathElement, DataPoint[]>(".rise-line").each(function () {
        const el = d3.select(this);
        if (shouldAnimate && prevBeat < 1) {
          const tl = parseFloat(el.attr("data-total-length") || "0");
          const ri2 = parseInt(el.attr("data-run") || "0");
          el.attr("opacity", 1).attr("stroke-dasharray", `${tl} ${tl}`).attr("stroke-dashoffset", tl)
            .transition().duration(1200).delay(ri2 * 300).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
        } else {
          el.attr("opacity", 1).attr("stroke-dasharray", "none");
        }
      });
      if (hasReentries) {
        if (shouldAnimate && prevBeat < 1) {
          dataG.selectAll(".gap-connector").transition().delay(500).duration(400).attr("opacity", 0.6);
          dataG.selectAll(".gap-label").transition().delay(600).duration(300).attr("opacity", 0.8);
          dataG.selectAll(".reentry-dot").transition().delay(700).duration(300).attr("opacity", 1);
          dataG.selectAll(".reentry-label").transition().delay(800).duration(300).attr("opacity", 1);
        } else {
          dataG.selectAll(".gap-connector").attr("opacity", 0.6);
          dataG.selectAll(".gap-label").attr("opacity", 0.8);
          dataG.selectAll(".reentry-dot").attr("opacity", 1);
          dataG.selectAll(".reentry-label").attr("opacity", 1);
        }
      }
    } else {
      dataG.selectAll(".rise-area, .rise-line, .gap-connector, .gap-label, .reentry-dot, .reentry-label").attr("opacity", 0);
    }

    if (beat >= 2) {
      if (shouldAnimate && prevBeat < 2) {
        dataG.select(".rise-peak-dot").attr("r", 0).attr("opacity", 1).transition().duration(400).ease(d3.easeCubicOut).attr("r", 7);
        dataG.select(".rise-peak-label").attr("opacity", 0).transition().delay(200).duration(300).attr("opacity", 1);
      } else {
        dataG.select(".rise-peak-dot").attr("r", 7).attr("opacity", 1);
        dataG.select(".rise-peak-label").attr("opacity", 1);
      }
    } else {
      dataG.select(".rise-peak-dot").attr("opacity", 0);
      dataG.select(".rise-peak-label").attr("opacity", 0);
    }

    if (beat >= 3) {
      if (shouldAnimate && prevBeat < 3) {
        dataG.selectAll(".stream-bar").attr("opacity", 0).transition().duration(400).delay((_, i) => Math.min(i * 10, 450)).attr("opacity", 0.4);
        g.select(".stream-label").attr("opacity", 0).transition().delay(300).duration(300).attr("opacity", 1);
        g.select(".y-axis-streams").attr("opacity", 0).transition().delay(200).duration(400).attr("opacity", 1);
      } else {
        dataG.selectAll(".stream-bar").attr("opacity", 0.4);
        g.select(".stream-label").attr("opacity", 1);
        g.select(".y-axis-streams").attr("opacity", 1);
      }
    } else {
      dataG.selectAll(".stream-bar").attr("opacity", 0);
      g.select(".stream-label").attr("opacity", 0);
      g.select(".y-axis-streams").attr("opacity", 0);
    }
  }, [data, beat, peakRank, runs, hasReentries]);

  return (
    <div>
      <svg ref={svgRef} className="w-full" role="img" aria-label={`Chart showing rank trajectory with peak at #${peakRank}`} />
    </div>
  );
}
