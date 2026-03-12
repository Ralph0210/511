"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { LifespanByYear } from "@/lib/billboard-data";

type Props = {
  data: LifespanByYear[];
  /**
   * -1 = empty axes (before scroll)
   *  0 = empty axes only
   *  1 = line draws for pre-digital era (1958-1990)
   *  2 = line extends to present + era markers
   *  3 = streaming era highlight band + era averages
   *  4 = full annotations
   */
  beat: number;
};

const AMBER = "#D97706";
const AMBER_DARK = "#92400E";
const STREAMING_START = 2013;

export default function ChartLifespanScrolly({ data, beat }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);
  const prevBeatRef = useRef(-2);

  const preStreaming = useMemo(() => data.filter((d) => d.debut_year < STREAMING_START), [data]);
  const postStreaming = useMemo(() => data.filter((d) => d.debut_year >= STREAMING_START), [data]);
  const preDigitalData = useMemo(() => data.filter((d) => d.debut_year <= 1990), [data]);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;
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
      svg.attr("width", width).attr("height", height);

      const margin = { top: 20, right: 30, bottom: 50, left: 55 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain([d3.min(data, (d) => d.debut_year)!, d3.max(data, (d) => d.debut_year)!])
        .range([0, w]);

      const maxLifespan = d3.max(data, (d) => d.avg_lifespan)!;
      const y = d3.scaleLinear()
        .domain([0, Math.ceil(maxLifespan / 5) * 5])
        .range([h, 0]);

      // Grid lines
      y.ticks(6).forEach((tick) => {
        g.append("line")
          .attr("x1", 0).attr("x2", w)
          .attr("y1", y(tick)).attr("y2", y(tick))
          .attr("stroke", "#27272a").attr("stroke-dasharray", "3,3");
      });

      // X axis
      g.append("g")
        .attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(10))
        .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
        .call((sel) => sel.selectAll(".tick line").attr("stroke", "#3f3f46"))
        .call((sel) => sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12));

      // Y axis
      g.append("g")
        .call(d3.axisLeft(y).ticks(6))
        .call((sel) => sel.select(".domain").attr("stroke", "#3f3f46"))
        .call((sel) => sel.selectAll(".tick line").attr("stroke", "#3f3f46"))
        .call((sel) => sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12));

      // Axis labels
      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -h / 2).attr("y", -40)
        .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#71717a")
        .text("Avg. weeks on chart");

      g.append("text")
        .attr("x", w / 2).attr("y", h + 40)
        .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#71717a")
        .text("Debut year");

      // Generators
      const areaGen = d3.area<LifespanByYear>()
        .x((d) => x(d.debut_year))
        .y0(h).y1((d) => y(d.avg_lifespan))
        .curve(d3.curveMonotoneX);

      const lineGen = d3.line<LifespanByYear>()
        .x((d) => x(d.debut_year))
        .y((d) => y(d.avg_lifespan))
        .curve(d3.curveMonotoneX);

      // Beat 1: Pre-digital area + line (1958-1990)
      g.append("path").datum(preDigitalData).attr("d", areaGen)
        .attr("class", "lifespan-area-pre")
        .attr("fill", AMBER).attr("opacity", 0);

      g.append("path").datum(preDigitalData).attr("d", lineGen)
        .attr("class", "lifespan-line-pre")
        .attr("fill", "none").attr("stroke", AMBER).attr("stroke-width", 2.5)
        .attr("opacity", 0);

      // Beat 2: Full area + line (all data)
      g.append("path").datum(data).attr("d", areaGen)
        .attr("class", "lifespan-area-full")
        .attr("fill", AMBER).attr("opacity", 0);

      g.append("path").datum(data).attr("d", lineGen)
        .attr("class", "lifespan-line-full")
        .attr("fill", "none").attr("stroke", AMBER).attr("stroke-width", 2.5)
        .attr("opacity", 0);

      // Beat 2: Era markers
      const eras = [
        { year: 1991, label: "SoundScan" },
        { year: 2005, label: "Digital sales" },
        { year: 2012, label: "Streaming" },
      ];
      eras.forEach(({ year, label }) => {
        if (year > (d3.max(data, (d) => d.debut_year) || 2026)) return;
        g.append("line")
          .attr("class", "era-marker")
          .attr("x1", x(year)).attr("x2", x(year))
          .attr("y1", 0).attr("y2", h)
          .attr("stroke", AMBER_DARK).attr("stroke-dasharray", "4,3")
          .attr("stroke-width", 1).attr("opacity", 0);

        g.append("text")
          .attr("class", "era-marker")
          .attr("x", x(year) + 4).attr("y", 12)
          .attr("font-size", 12).attr("fill", AMBER_DARK).attr("font-weight", 500)
          .attr("opacity", 0)
          .text(label);
      });

      // Beat 3: Streaming band
      const streamingStartX = x(STREAMING_START);
      g.append("rect")
        .attr("class", "streaming-band")
        .attr("x", streamingStartX).attr("y", 0)
        .attr("width", w - streamingStartX).attr("height", h)
        .attr("fill", AMBER).attr("opacity", 0);

      // Beat 3: Era average lines
      if (preStreaming.length && postStreaming.length) {
        const preAvg = preStreaming.reduce((s, d) => s + d.avg_lifespan, 0) / preStreaming.length;
        const postAvg = postStreaming.reduce((s, d) => s + d.avg_lifespan, 0) / postStreaming.length;

        g.append("line")
          .attr("class", "pre-avg-line")
          .attr("x1", x(preStreaming[0].debut_year)).attr("x2", x(preStreaming[preStreaming.length - 1].debut_year))
          .attr("y1", y(preAvg)).attr("y2", y(preAvg))
          .attr("stroke", AMBER_DARK).attr("stroke-dasharray", "6,3")
          .attr("stroke-width", 1.5).attr("opacity", 0);

        g.append("text")
          .attr("class", "pre-avg-label")
          .attr("x", x(1975)).attr("y", y(preAvg) - 8)
          .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", AMBER_DARK).attr("font-weight", 600)
          .attr("opacity", 0)
          .text(`Pre-streaming avg: ${preAvg.toFixed(1)}w`);

        g.append("line")
          .attr("class", "post-avg-line")
          .attr("x1", streamingStartX).attr("x2", x(postStreaming[postStreaming.length - 1].debut_year))
          .attr("y1", y(postAvg)).attr("y2", y(postAvg))
          .attr("stroke", AMBER_DARK).attr("stroke-dasharray", "6,3")
          .attr("stroke-width", 1.5).attr("opacity", 0);

        g.append("text")
          .attr("class", "post-avg-label")
          .attr("x", x(STREAMING_START + (postStreaming[postStreaming.length - 1].debut_year - STREAMING_START) / 2))
          .attr("y", y(postAvg) - 8)
          .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", AMBER_DARK).attr("font-weight", 600)
          .attr("opacity", 0)
          .text(`Streaming avg: ${postAvg.toFixed(1)}w`);
      }

      // Beat 4: Peak year annotation
      const peakYear = data.reduce((best, d) => d.avg_lifespan > best.avg_lifespan ? d : best);
      g.append("circle")
        .attr("class", "peak-dot")
        .attr("cx", x(peakYear.debut_year)).attr("cy", y(peakYear.avg_lifespan))
        .attr("r", 6).attr("fill", AMBER).attr("stroke", "white").attr("stroke-width", 2)
        .attr("opacity", 0);

      g.append("text")
        .attr("class", "peak-label")
        .attr("x", x(peakYear.debut_year)).attr("y", y(peakYear.avg_lifespan) - 14)
        .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", 700).attr("fill", AMBER)
        .attr("opacity", 0)
        .text(`Peak: ${peakYear.avg_lifespan.toFixed(1)}w (${peakYear.debut_year})`);

      // Overall average line
      const overallAvg = data.reduce((s, d) => s + d.avg_lifespan, 0) / data.length;
      g.append("line")
        .attr("class", "overall-avg-line")
        .attr("x1", 0).attr("x2", w)
        .attr("y1", y(overallAvg)).attr("y2", y(overallAvg))
        .attr("stroke", "#9CA3AF").attr("stroke-dasharray", "8,4")
        .attr("stroke-width", 1).attr("opacity", 0);

      g.append("text")
        .attr("class", "overall-avg-label")
        .attr("x", w - 4).attr("y", y(overallAvg) - 6)
        .attr("text-anchor", "end").attr("font-size", 12).attr("fill", "#9CA3AF")
        .attr("opacity", 0)
        .text(`68-year avg: ${overallAvg.toFixed(1)}w`);
    }

    // --- Update visibility ---
    const g = svg.select("g");
    const shouldAnimate = beat > prevBeat;

    // Beat 1: Pre-digital line
    if (beat >= 1) {
      if (beat < 2) {
        if (shouldAnimate && prevBeat < 1) {
          g.select(".lifespan-area-pre").transition().duration(400).attr("opacity", 0.1);
          const path = g.select<SVGPathElement>(".lifespan-line-pre");
          const totalLength = path.node()?.getTotalLength() || 0;
          path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .attr("opacity", 1)
            .transition().duration(1500).ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0);
        } else {
          g.select(".lifespan-area-pre").attr("opacity", 0.1);
          g.select(".lifespan-line-pre")
            .attr("stroke-dasharray", null).attr("stroke-dashoffset", null).attr("opacity", 1);
        }
        g.select(".lifespan-area-full").attr("opacity", 0);
        g.select(".lifespan-line-full").attr("opacity", 0);
      } else {
        // Beat 2+: show full line, hide pre-digital
        g.select(".lifespan-area-pre").attr("opacity", 0);
        g.select(".lifespan-line-pre").attr("opacity", 0);

        if (shouldAnimate && prevBeat < 2) {
          g.select(".lifespan-area-full").transition().duration(400).attr("opacity", 0.1);
          const path = g.select<SVGPathElement>(".lifespan-line-full");
          const totalLength = path.node()?.getTotalLength() || 0;
          path
            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
            .attr("stroke-dashoffset", totalLength)
            .attr("opacity", 1)
            .transition().duration(1200).ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0);
        } else {
          g.select(".lifespan-area-full").attr("opacity", 0.1);
          g.select(".lifespan-line-full")
            .attr("stroke-dasharray", null).attr("stroke-dashoffset", null).attr("opacity", 1);
        }
      }
    } else {
      g.select(".lifespan-area-pre").attr("opacity", 0);
      g.select(".lifespan-line-pre").attr("opacity", 0);
      g.select(".lifespan-area-full").attr("opacity", 0);
      g.select(".lifespan-line-full").attr("opacity", 0);
    }

    // Beat 2: Era markers
    if (beat >= 2) {
      if (shouldAnimate && prevBeat < 2) {
        g.selectAll(".era-marker").transition().delay(200).duration(400).attr("opacity", 0.5);
      } else {
        g.selectAll(".era-marker").attr("opacity", 0.5);
      }
    } else {
      g.selectAll(".era-marker").attr("opacity", 0);
    }

    // Beat 3: Streaming band + era averages
    if (beat >= 3) {
      if (shouldAnimate && prevBeat < 3) {
        g.select(".streaming-band").transition().duration(500).attr("opacity", 0.06);
        g.select(".pre-avg-line").transition().delay(300).duration(400).attr("opacity", 0.5);
        g.select(".pre-avg-label").transition().delay(500).duration(300).attr("opacity", 0.8);
        g.select(".post-avg-line").transition().delay(400).duration(400).attr("opacity", 0.5);
        g.select(".post-avg-label").transition().delay(600).duration(300).attr("opacity", 0.8);
      } else {
        g.select(".streaming-band").attr("opacity", 0.06);
        g.select(".pre-avg-line").attr("opacity", 0.5);
        g.select(".pre-avg-label").attr("opacity", 0.8);
        g.select(".post-avg-line").attr("opacity", 0.5);
        g.select(".post-avg-label").attr("opacity", 0.8);
      }
    } else {
      g.select(".streaming-band").attr("opacity", 0);
      g.select(".pre-avg-line").attr("opacity", 0);
      g.select(".pre-avg-label").attr("opacity", 0);
      g.select(".post-avg-line").attr("opacity", 0);
      g.select(".post-avg-label").attr("opacity", 0);
    }

    // Beat 4: Peak annotation + overall average
    if (beat >= 4) {
      if (shouldAnimate && prevBeat < 4) {
        g.select(".peak-dot").transition().delay(200).duration(400).attr("opacity", 1);
        g.select(".peak-label").transition().delay(400).duration(300).attr("opacity", 1);
        g.select(".overall-avg-line").transition().delay(300).duration(400).attr("opacity", 0.4);
        g.select(".overall-avg-label").transition().delay(500).duration(300).attr("opacity", 0.6);
      } else {
        g.select(".peak-dot").attr("opacity", 1);
        g.select(".peak-label").attr("opacity", 1);
        g.select(".overall-avg-line").attr("opacity", 0.4);
        g.select(".overall-avg-label").attr("opacity", 0.6);
      }
    } else {
      g.select(".peak-dot").attr("opacity", 0);
      g.select(".peak-label").attr("opacity", 0);
      g.select(".overall-avg-line").attr("opacity", 0);
      g.select(".overall-avg-label").attr("opacity", 0);
    }
  }, [data, preDigitalData, preStreaming, postStreaming, beat]);

  useEffect(() => {
    drawnRef.current = false;
    prevBeatRef.current = -2;
  }, [data]);

  return (
    <div>
      <svg ref={svgRef} className="w-full" role="img" aria-label="Chart showing average song lifespan on Billboard Hot 100 over time" />
    </div>
  );
}
