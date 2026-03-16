"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { GENRE_COLORS } from "@/lib/spotify-data";
import type { PeerSong } from "@/lib/narrative-generator";

type GenreShare = { period: string; genre: string; share: number };

type Props = {
  peerSongs: PeerSong[];
  songTrackName: string;
  songPeakRank: number;
  songPeakStreams: number;
  totalChartStreams: number;
  genreShares: GenreShare[];
  highlightGenre: string;
  songFirstWeek: string;
  songLastWeek: string;
  /**
   * -1 = nothing (before scroll)
   *  0 = peer leaderboard empty
   *  1 = peer leaderboard populated with stream share
   *  2 = transition to genre landscape, all genres
   *  3 = highlight genre + on-chart band
   */
  beat: number;
};

export default function ChartMomentScrolly({
  peerSongs, songTrackName, songPeakRank, songPeakStreams, totalChartStreams,
  genreShares, highlightGenre, songFirstWeek, songLastWeek, beat,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);
  const prevBeatRef = useRef(-2);

  const genres = useMemo(
    () => Array.from(new Set(genreShares.map((d) => d.genre))).sort(),
    [genreShares],
  );
  const periods = useMemo(
    () => Array.from(new Set(genreShares.map((d) => d.period))).sort(),
    [genreShares],
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
      const height = 500;
      svg.attr("width", width).attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      // ===== PEER LEADERBOARD GROUP =====
      const gPeers = svg.append("g").attr("class", "peers-group");
      if (peerSongs.length > 0) {
        const margin = { top: 24, right: 30, bottom: 20, left: 30 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;
        const rowH = Math.min(36, h / peerSongs.length);
        const barMaxW = w * 0.45;

        const maxStreams = d3.max(peerSongs, (d) => d.streams || 0) || 1;
        const xScale = d3.scaleLinear().domain([0, maxStreams]).range([0, barMaxW]);

        // Title
        gPeers.append("text")
          .attr("x", width / 2).attr("y", 16)
          .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#71717a")
          .attr("font-weight", 600)
          .text("Top 10 — Peak Week");

        const rows = gPeers.append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        peerSongs.forEach((peer, i) => {
          const y = i * rowH;
          const isSelf = peer.rank === songPeakRank &&
            peer.track_name.toLowerCase().includes(songTrackName.toLowerCase().slice(0, 10));

          const row = rows.append("g")
            .attr("class", "peer-row")
            .attr("transform", `translate(0,${y})`)
            .attr("opacity", 0)
            .attr("data-index", i);

          // Rank number
          row.append("text")
            .attr("x", 0).attr("y", rowH / 2)
            .attr("dy", "0.35em").attr("font-size", 14)
            .attr("font-weight", isSelf ? 700 : 500)
            .attr("fill", isSelf ? "#1DB954" : "#9CA3AF")
            .text(`#${peer.rank}`);

          // Song name
          const nameX = 42;
          const maxNameW = w * 0.45;
          row.append("text")
            .attr("x", nameX).attr("y", rowH / 2)
            .attr("dy", "0.35em").attr("font-size", 14)
            .attr("font-weight", isSelf ? 700 : 400)
            .attr("fill", isSelf ? "#1DB954" : "#E4E4E7")
            .text(peer.track_name.length > 28 ? peer.track_name.slice(0, 26) + "\u2026" : peer.track_name)
            .each(function () {
              const el = d3.select(this);
              const node = el.node();
              if (node && node.getComputedTextLength() > maxNameW) {
                let t = peer.track_name;
                while (t.length > 5 && node.getComputedTextLength() > maxNameW) {
                  t = t.slice(0, -1);
                  el.text(t + "\u2026");
                }
              }
            });

          // Artist (smaller, muted)
          row.append("text")
            .attr("x", nameX).attr("y", rowH / 2 + 14)
            .attr("font-size", 12)
            .attr("fill", isSelf ? "#1DB95480" : "#71717a")
            .text(peer.artist_name.length > 30 ? peer.artist_name.slice(0, 28) + "\u2026" : peer.artist_name);

          // Stream bar
          const barX = w * 0.52;
          const barW = peer.streams ? xScale(peer.streams) : 0;

          row.append("rect")
            .attr("x", barX).attr("y", rowH / 2 - 5)
            .attr("width", 0).attr("height", 10)
            .attr("rx", 3)
            .attr("fill", isSelf ? "#1DB954" : "#3f3f46")
            .attr("class", "peer-bar")
            .attr("data-target-w", barW);

          // Stream count
          if (peer.streams) {
            const streamText = peer.streams >= 1_000_000
              ? `${(peer.streams / 1_000_000).toFixed(1)}M`
              : `${(peer.streams / 1_000).toFixed(0)}K`;

            row.append("text")
              .attr("class", "peer-stream-label")
              .attr("x", barX + barW + 6).attr("y", rowH / 2)
              .attr("dy", "0.35em").attr("font-size", 12)
              .attr("fill", isSelf ? "#1DB954" : "#71717a")
              .attr("opacity", 0)
              .text(streamText);
          }

          // Highlight background for the song itself
          if (isSelf) {
            row.insert("rect", ":first-child")
              .attr("x", -8).attr("y", -2)
              .attr("width", w + 16).attr("height", rowH + 4)
              .attr("rx", 6)
              .attr("fill", "#1DB954").attr("opacity", 0.06);
          }
        });

        // Stream share donut (shown at beat 1)
        if (totalChartStreams > 0 && songPeakStreams > 0) {
          const sharePercent = (songPeakStreams / totalChartStreams) * 100;
          const donutR = 28;
          const donutCX = width - 60;
          const donutCY = height - 50;

          const gDonut = gPeers.append("g")
            .attr("class", "stream-share-donut")
            .attr("transform", `translate(${donutCX},${donutCY})`)
            .attr("opacity", 0);

          const arc = d3.arc<{ startAngle: number; endAngle: number }>()
            .innerRadius(donutR - 6).outerRadius(donutR);

          // Background arc
          gDonut.append("path")
            .attr("d", arc({ startAngle: 0, endAngle: 2 * Math.PI })!)
            .attr("fill", "#27272a");

          // Song share arc
          gDonut.append("path")
            .attr("class", "share-arc")
            .attr("d", arc({ startAngle: 0, endAngle: 0 })!)
            .attr("fill", "#1DB954")
            .attr("data-target-angle", (sharePercent / 100) * 2 * Math.PI);

          // Center text
          gDonut.append("text")
            .attr("text-anchor", "middle").attr("dy", "0.1em")
            .attr("font-size", 13).attr("font-weight", 700).attr("fill", "#1DB954")
            .text(`${sharePercent.toFixed(1)}%`);

          gDonut.append("text")
            .attr("text-anchor", "middle").attr("dy", "1.3em")
            .attr("font-size", 12).attr("fill", "#71717a")
            .text("of streams");
        }
      }

      // ===== GENRE LANDSCAPE GROUP =====
      const gGenre = svg.append("g").attr("class", "genre-group").attr("opacity", 0);
      if (periods.length > 0) {
        const margin = { top: 20, right: 100, bottom: 44, left: 50 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;
        const g = gGenre.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        svg.append("defs").append("clipPath").attr("id", "moment-clip")
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

        const zoomG = g.append("g").attr("class", "genre-zoom-group").attr("clip-path", "url(#moment-clip)");

        // Build stacked data
        const stackData = periods.map((p) => {
          const obj: Record<string, number> = {};
          for (const genre of genres) {
            const match = genreShares.find((d) => d.period === p && d.genre === genre);
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

        zoomG.selectAll(".genre-area")
          .data(series)
          .join("path")
          .attr("class", "genre-area")
          .attr("d", area as unknown as string)
          .attr("fill", (d) => GENRE_COLORS[d.key] || "#52525b")
          .attr("opacity", 0.4)
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
            .attr("opacity", 0.7)
            .attr("data-genre", s.key)
            .text(s.key);
        });

        // On-chart band
        const songStart = songFirstWeek.slice(0, 7);
        const songEnd = songLastWeek.slice(0, 7);
        const startIdx = periods.findIndex((p) => p >= songStart);
        const endIdx = periods.findIndex((p) => p > songEnd);

        if (startIdx >= 0) {
          const x1 = x(periods[startIdx])!;
          const x2 = endIdx >= 0 ? x(periods[endIdx])! : w;
          const bandW = Math.max(x2 - x1, 4);

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
    }

    // --- Update visibility ---
    const shouldAnimate = beat > prevBeat;
    const gPeers = svg.select(".peers-group");
    const gGenre = svg.select(".genre-group");

    // Beats 0-1: Peer leaderboard
    if (beat <= 1) {
      // Show peers, hide genre
      if (shouldAnimate && prevBeat >= 2) {
        gGenre.transition().duration(400).attr("opacity", 0);
        gPeers.transition().delay(200).duration(400).attr("opacity", 1);
      } else {
        gPeers.attr("opacity", 1);
        gGenre.attr("opacity", 0);
      }

      if (beat >= 0) {
        // Animate rows in
        gPeers.selectAll(".peer-row").each(function () {
          const el = d3.select(this);
          const idx = parseInt(el.attr("data-index") || "0");
          if (shouldAnimate && prevBeat < 0) {
            el.transition().duration(300).delay(idx * 60).attr("opacity", 1);
          } else {
            el.attr("opacity", 1);
          }
        });
      }

      if (beat >= 1) {
        // Animate stream bars + share donut
        gPeers.selectAll(".peer-bar").each(function () {
          const el = d3.select(this);
          const targetW = parseFloat(el.attr("data-target-w") || "0");
          if (shouldAnimate && prevBeat < 1) {
            el.transition().duration(500).attr("width", targetW);
          } else {
            el.attr("width", targetW);
          }
        });

        gPeers.selectAll(".peer-stream-label").each(function () {
          const el = d3.select(this);
          if (shouldAnimate && prevBeat < 1) {
            el.transition().delay(400).duration(300).attr("opacity", 1);
          } else {
            el.attr("opacity", 1);
          }
        });

        // Stream share donut
        const donut = gPeers.select(".stream-share-donut");
        if (!donut.empty()) {
          if (shouldAnimate && prevBeat < 1) {
            donut.transition().duration(400).attr("opacity", 1);
            const shareArc = donut.select(".share-arc");
            const targetAngle = parseFloat(shareArc.attr("data-target-angle") || "0");
            const arcGen = d3.arc<{ startAngle: number; endAngle: number }>()
              .innerRadius(22).outerRadius(28);
            shareArc.transition().duration(800).ease(d3.easeCubicOut)
              .attrTween("d", () => {
                const interp = d3.interpolate(0, targetAngle);
                return (t: number) => arcGen({ startAngle: 0, endAngle: interp(t) })!;
              });
          } else {
            donut.attr("opacity", 1);
            const shareArc = donut.select(".share-arc");
            const targetAngle = parseFloat(shareArc.attr("data-target-angle") || "0");
            const arcGen = d3.arc<{ startAngle: number; endAngle: number }>()
              .innerRadius(22).outerRadius(28);
            shareArc.attr("d", arcGen({ startAngle: 0, endAngle: targetAngle }));
          }
        }
      } else {
        gPeers.selectAll(".peer-bar").attr("width", 0);
        gPeers.selectAll(".peer-stream-label").attr("opacity", 0);
        gPeers.select(".stream-share-donut").attr("opacity", 0);
      }
    }

    // Beats 2-3: Genre landscape
    if (beat >= 2) {
      // Show genre, hide peers
      if (shouldAnimate && prevBeat < 2) {
        gPeers.transition().duration(400).attr("opacity", 0);
        gGenre.transition().delay(200).duration(600).attr("opacity", 1);
      } else {
        gPeers.attr("opacity", 0);
        gGenre.attr("opacity", 1);
      }

      const isHighlight = beat >= 3;
      const paths = gGenre.selectAll<SVGPathElement, d3.Series<Record<string, number>, string>>(".genre-area");

      if (isHighlight) {
        if (shouldAnimate && prevBeat < 3) {
          paths.each(function () {
            const el = d3.select(this);
            const genre = el.attr("data-genre");
            el.transition().duration(400)
              .attr("opacity", genre === highlightGenre ? 0.85 : 0.15);
          });
        } else {
          paths.each(function () {
            const el = d3.select(this);
            const genre = el.attr("data-genre");
            el.attr("opacity", genre === highlightGenre ? 0.85 : 0.15);
          });
        }
      } else {
        paths.attr("opacity", 0.4);
      }

      // Genre labels
      gGenre.selectAll<SVGTextElement, unknown>(".genre-label").each(function () {
        const el = d3.select(this);
        const genre = el.attr("data-genre");
        if (isHighlight) {
          el.attr("opacity", genre === highlightGenre ? 1 : 0.4)
            .attr("font-weight", genre === highlightGenre ? 700 : 400);
        } else {
          el.attr("opacity", 0.7).attr("font-weight", 400);
        }
      });

      // On-chart band (beat 3)
      if (beat >= 3) {
        if (shouldAnimate && prevBeat < 3) {
          gGenre.select(".onchart-band").transition().duration(500).attr("opacity", 0.08);
          gGenre.select(".onchart-line-start").transition().delay(300).duration(300).attr("opacity", 0.7);
          gGenre.select(".onchart-label").transition().delay(400).duration(300).attr("opacity", 1);
          gGenre.select(".onchart-line-end").transition().delay(400).duration(300).attr("opacity", 0.5);
        } else {
          gGenre.select(".onchart-band").attr("opacity", 0.08);
          gGenre.select(".onchart-line-start").attr("opacity", 0.7);
          gGenre.select(".onchart-label").attr("opacity", 1);
          gGenre.select(".onchart-line-end").attr("opacity", 0.5);
        }
      } else {
        gGenre.selectAll(".onchart-band, .onchart-line-start, .onchart-label, .onchart-line-end")
          .attr("opacity", 0);
      }
    }
  }, [peerSongs, songTrackName, songPeakRank, songPeakStreams, totalChartStreams,
    genreShares, genres, periods, highlightGenre, songFirstWeek, songLastWeek, beat]);

  useEffect(() => {
    drawnRef.current = false;
    prevBeatRef.current = -2;
  }, [peerSongs, genreShares, highlightGenre]);


  return (
    <div>
      <svg ref={svgRef} className="w-full" role="img" aria-label={`Chart showing peer comparison and genre landscape for ${songTrackName}`} />
    </div>
  );
}
