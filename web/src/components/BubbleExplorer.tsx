"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { BubbleSong } from "@/lib/featured-exemplars";
import { GENRE_COLORS, LONGEVITY_COLORS } from "@/lib/spotify-data";
import BubbleTooltip from "./BubbleTooltip";
import BubbleDetailDrawer from "./BubbleDetailDrawer";
import BubbleLensSelector, { type LensType } from "./BubbleLensSelector";
import BubbleInsightPanel from "./BubbleInsightPanel";

type Props = {
  songs: BubbleSong[];
};

// Node type extends BubbleSong with simulation fields
type BubbleNode = BubbleSong &
  d3.SimulationNodeDatum & {
    radius: number;
  };

const WIDTH = 800;
const HEIGHT = 600;
const MARGIN = { top: 28, right: 40, bottom: 28, left: 40 };
const W = WIDTH - MARGIN.left - MARGIN.right;
const H = HEIGHT - MARGIN.top - MARGIN.bottom;

// Semantic zoom thresholds
const ART_THRESHOLD = 16;
const LABEL_THRESHOLD = 28;

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text;
}

// --- Genre cluster layout (3x3 grid for up to 9 genres) ---
function computeGenreCenters(songs: BubbleSong[]): Record<string, { x: number; y: number }> {
  const genres = [...new Set(songs.map((s) => s.genre))];
  // Sort by count descending so most prominent genres get top-left positions
  const counts: Record<string, number> = {};
  for (const s of songs) counts[s.genre] = (counts[s.genre] || 0) + 1;
  genres.sort((a, b) => (counts[b] || 0) - (counts[a] || 0));

  const cols = Math.min(3, genres.length);
  const rows = Math.ceil(genres.length / cols);
  const cellW = W / cols;
  const cellH = H / rows;

  const centers: Record<string, { x: number; y: number }> = {};
  genres.forEach((g, i) => {
    centers[g] = {
      x: (i % cols + 0.5) * cellW,
      y: (Math.floor(i / cols) + 0.5) * cellH,
    };
  });
  return centers;
}

// --- Longevity column positions ---
const LONGEVITY_COLUMNS: Record<string, number> = {
  viral: W * 0.2,
  sustained: W * 0.5,
  slow_burn: W * 0.8,
  other: W * 0.5, // "other" goes to center
};

// Color function per lens
function getBubbleColor(d: BubbleNode, lens: LensType): string {
  if (lens === "longevity") return LONGEVITY_COLORS[d.longevity] || "#52525b";
  if (lens === "streams") return "#1DB954";
  return GENRE_COLORS[d.genre] || "#9CA3AF";
}

export default function BubbleExplorer({ songs }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<BubbleNode, undefined> | null>(null);
  const nodesRef = useRef<BubbleNode[]>([]);
  const circlesRef = useRef<d3.Selection<SVGCircleElement, BubbleNode, SVGGElement, unknown> | null>(null);
  const labelsGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // State
  const [activeLens, setActiveLens] = useState<LensType>("all");
  const [hoveredSong, setHoveredSong] = useState<BubbleSong | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedSong, setSelectedSong] = useState<BubbleSong | null>(null);

  const handleCloseDrawer = useCallback(() => setSelectedSong(null), []);

  // --- Main setup effect ---
  useEffect(() => {
    if (!svgRef.current || !songs.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = "ontouchstart" in window;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");

    const defs = svg.append("defs");
    defs
      .append("clipPath")
      .attr("id", "bubble-clip")
      .append("rect")
      .attr("width", W)
      .attr("height", H);

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const zoomGroup = g.append("g").attr("clip-path", "url(#bubble-clip)");
    const dataGroup = zoomGroup.append("g");

    // Lens label layer (outside clip for genre/longevity labels)
    const lensLabelGroup = g.append("g").attr("class", "lens-labels");
    labelsGroupRef.current = lensLabelGroup;

    // Radius scale
    const streamExtent = d3.extent(songs, (d) => d.max_streams) as [number, number];
    const r = d3
      .scaleSqrt()
      .domain([Math.max(1, streamExtent[0]), streamExtent[1]])
      .range([2, 24])
      .clamp(true);

    // Create nodes
    const seededRandom = d3.randomLcg(42);
    const nodes: BubbleNode[] = songs.map((song) => ({
      ...song,
      x: W / 2 + (seededRandom() - 0.5) * W * 0.6,
      y: H / 2 + (seededRandom() - 0.5) * H * 0.6,
      radius: r(song.max_streams),
    }));
    nodesRef.current = nodes;

    // Render circles
    const circles = dataGroup
      .selectAll<SVGCircleElement, BubbleNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("cx", (d) => d.x!)
      .attr("cy", (d) => d.y!)
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => GENRE_COLORS[d.genre] || "#9CA3AF")
      .attr("opacity", 0.7)
      .attr("stroke", "none")
      .style("cursor", "pointer");
    circlesRef.current = circles;

    // --- Interaction ---
    let currentTransform = d3.zoomIdentity;

    if (!isTouch) {
      // Desktop: hover for tooltip, click for drawer
      circles
        .on("mouseenter", function (_event: MouseEvent, d: BubbleNode) {
          d3.select(this)
            .attr("opacity", 1)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

          const svgEl = svgRef.current!;
          const containerEl = containerRef.current!;
          const svgRect = svgEl.getBoundingClientRect();
          const containerRect = containerEl.getBoundingClientRect();
          const scaleX = svgRect.width / WIDTH;
          const scaleY = svgRect.height / HEIGHT;
          const tx = currentTransform.applyX(d.x!);
          const ty = currentTransform.applyY(d.y!);
          const screenX = (MARGIN.left + tx) * scaleX + svgRect.left - containerRect.left;
          const screenY = (MARGIN.top + ty) * scaleY + svgRect.top - containerRect.top;

          setHoveredSong(d);
          setTooltipPos({ x: screenX, y: screenY });
        })
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 0.7).attr("stroke", "none");
          setHoveredSong(null);
        })
        .on("click", (_event: MouseEvent, d: BubbleNode) => {
          setSelectedSong(d);
          setHoveredSong(null);
        });
    } else {
      // Touch: tap opens drawer directly (no hover on touch devices)
      circles.on("click", (_event: MouseEvent, d: BubbleNode) => {
        setSelectedSong(d);
      });
    }

    // Art layer for semantic zoom
    const artGroup = dataGroup.append("g").attr("class", "art-layer");

    let semanticTimer: ReturnType<typeof setTimeout> | null = null;

    function updateSemanticZoom(k: number) {
      const artVisible = nodes.filter(
        (d) => d.radius * k >= ART_THRESHOLD && d.album_img
      );
      const artSel = artGroup
        .selectAll<SVGGElement, BubbleNode>(".bubble-art")
        .data(artVisible, (d) => d.track_id);
      artSel.exit().remove();

      artSel
        .enter()
        .append("g")
        .attr("class", "bubble-art")
        .attr("pointer-events", "none")
        .each(function (d) {
          const clipId = `art-clip-${d.track_id}`;
          const group = d3.select(this);
          group.append("clipPath").attr("id", clipId).append("circle").attr("r", d.radius);
          group
            .append("image")
            .attr("href", d.album_img!)
            .attr("width", d.radius * 2)
            .attr("height", d.radius * 2)
            .attr("x", -d.radius)
            .attr("y", -d.radius)
            .attr("clip-path", `url(#${clipId})`)
            .attr("preserveAspectRatio", "xMidYMid slice");
        });

      artGroup
        .selectAll<SVGGElement, BubbleNode>(".bubble-art")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      const labelVisible = nodes.filter((d) => d.radius * k >= LABEL_THRESHOLD);
      const labelSel = artGroup
        .selectAll<SVGTextElement, BubbleNode>(".bubble-label")
        .data(labelVisible, (d) => d.track_id);
      labelSel.exit().remove();

      labelSel
        .enter()
        .append("text")
        .attr("class", "bubble-label")
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .attr("font-size", 12 / k)
        .attr("font-weight", 600)
        .attr("dy", (d) => d.radius + 12 / k)
        .attr("pointer-events", "none")
        .text((d) => truncate(d.track_name, 18));

      artGroup
        .selectAll<SVGTextElement, BubbleNode>(".bubble-label")
        .attr("x", (d) => d.x!)
        .attr("y", (d) => d.y!)
        .attr("font-size", 12 / k)
        .attr("dy", (d) => d.radius + 12 / k);
    }

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [W, H]])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        currentTransform = event.transform;
        dataGroup.attr("transform", event.transform.toString());
        if (semanticTimer) clearTimeout(semanticTimer);
        semanticTimer = setTimeout(() => updateSemanticZoom(event.transform.k), 80);
      });

    svg.call(zoom);

    // Force simulation
    const simulation = d3
      .forceSimulation<BubbleNode>(nodes)
      .force("center", d3.forceCenter<BubbleNode>(W / 2, H / 2).strength(0.05))
      .force("collide", d3.forceCollide<BubbleNode>((d) => d.radius + 1).iterations(2))
      .force("charge", d3.forceManyBody<BubbleNode>().strength(-2))
      .force("x", null)
      .force("y", null)
      .alphaDecay(0.02);

    if (prefersReducedMotion) {
      // Run simulation to completion without animation
      simulation.stop();
      for (let i = 0; i < 300; i++) simulation.tick();
      for (const d of nodes) {
        d.x = Math.max(d.radius, Math.min(W - d.radius, d.x!));
        d.y = Math.max(d.radius, Math.min(H - d.radius, d.y!));
      }
      circles.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    } else {
      simulation.on("tick", () => {
        for (const d of nodes) {
          d.x = Math.max(d.radius, Math.min(W - d.radius, d.x!));
          d.y = Math.max(d.radius, Math.min(H - d.radius, d.y!));
        }
        circles.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
        artGroup
          .selectAll<SVGGElement, BubbleNode>(".bubble-art")
          .attr("transform", (d) => `translate(${d.x},${d.y})`);
        artGroup
          .selectAll<SVGTextElement, BubbleNode>(".bubble-label")
          .attr("x", (d) => d.x!)
          .attr("y", (d) => d.y!);
      });
    }

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      simulationRef.current = null;
      if (semanticTimer) clearTimeout(semanticTimer);
    };
  }, [songs]);

  // --- Lens switching effect ---
  useEffect(() => {
    const simulation = simulationRef.current;
    const circles = circlesRef.current;
    const nodes = nodesRef.current;
    const lensLabels = labelsGroupRef.current;
    if (!simulation || !circles || !nodes.length || !lensLabels) return;

    // Clear lens labels
    lensLabels.selectAll("*").remove();

    // Update circle colors
    circles
      .transition()
      .duration(500)
      .attr("fill", (d) => getBubbleColor(d, activeLens));

    // Streams scale for beeswarm lens
    const streamExtent = d3.extent(nodes, (d) => d.max_streams) as [number, number];
    const streamsY = d3
      .scaleLog()
      .domain([Math.max(1, streamExtent[0]), streamExtent[1]])
      .range([H - 20, 20])
      .clamp(true);

    // Reconfigure forces based on lens
    switch (activeLens) {
      case "all":
        simulation
          .force("center", d3.forceCenter<BubbleNode>(W / 2, H / 2).strength(0.05))
          .force("x", null)
          .force("y", null);
        break;

      case "genre": {
        const centers = computeGenreCenters(songs);
        simulation
          .force("center", null)
          .force("x", d3.forceX<BubbleNode>((d) => centers[d.genre]?.x ?? W / 2).strength(0.15))
          .force("y", d3.forceY<BubbleNode>((d) => centers[d.genre]?.y ?? H / 2).strength(0.15));

        // Add genre labels
        for (const [genre, pos] of Object.entries(centers)) {
          lensLabels
            .append("text")
            .attr("x", pos.x)
            .attr("y", pos.y - H / 6 + 8)
            .attr("text-anchor", "middle")
            .attr("font-size", 13)
            .attr("font-weight", 600)
            .attr("fill", GENRE_COLORS[genre] || "#9CA3AF")
            .attr("opacity", 0.8)
            .text(genre);
        }
        break;
      }

      case "longevity":
        simulation
          .force("center", null)
          .force("x", d3.forceX<BubbleNode>((d) => LONGEVITY_COLUMNS[d.longevity] ?? W / 2).strength(0.15))
          .force("y", d3.forceY<BubbleNode>(H / 2).strength(0.03));

        // Column headers
        const longevityHeaders: { key: string; label: string; x: number }[] = [
          { key: "viral", label: "Viral Spike", x: LONGEVITY_COLUMNS.viral },
          { key: "sustained", label: "Sustained Hit", x: LONGEVITY_COLUMNS.sustained },
          { key: "slow_burn", label: "Slow Burn", x: LONGEVITY_COLUMNS.slow_burn },
        ];
        for (const h of longevityHeaders) {
          lensLabels
            .append("text")
            .attr("x", h.x)
            .attr("y", 16)
            .attr("text-anchor", "middle")
            .attr("font-size", 13)
            .attr("font-weight", 600)
            .attr("fill", LONGEVITY_COLORS[h.key as keyof typeof LONGEVITY_COLORS] || "#9CA3AF")
            .text(h.label);
        }
        break;

      case "streams":
        simulation
          .force("center", null)
          .force("x", d3.forceX<BubbleNode>(W / 2).strength(0.05))
          .force("y", d3.forceY<BubbleNode>((d) => streamsY(Math.max(1, d.max_streams))).strength(0.15));

        // Axis labels
        lensLabels
          .append("text")
          .attr("x", 8)
          .attr("y", 16)
          .attr("font-size", 12)
          .attr("fill", "#71717a")
          .text("More streams");
        lensLabels
          .append("text")
          .attr("x", 8)
          .attr("y", H - 4)
          .attr("font-size", 12)
          .attr("fill", "#71717a")
          .text("Fewer streams");
        break;

      case "sound": {
        // X = energy (0-1), Y = valence (0-1)
        // Energy: left = low, right = high
        // Valence: top = happy, bottom = sad
        const energyScale = d3.scaleLinear().domain([0, 1]).range([40, W - 40]).clamp(true);
        const valenceScale = d3.scaleLinear().domain([0, 1]).range([H - 40, 40]).clamp(true);

        simulation
          .force("center", null)
          .force("x", d3.forceX<BubbleNode>((d) => energyScale(d.energy ?? 0.5)).strength(0.15))
          .force("y", d3.forceY<BubbleNode>((d) => valenceScale(d.valence ?? 0.5)).strength(0.15));

        // Axis labels
        lensLabels.append("text").attr("x", W / 2).attr("y", H + 4).attr("text-anchor", "middle")
          .attr("font-size", 12).attr("fill", "#71717a").text("Energy \u2192");
        lensLabels.append("text").attr("x", 0).attr("y", H + 4)
          .attr("font-size", 12).attr("fill", "#71717a").text("Chill");
        lensLabels.append("text").attr("x", W).attr("y", H + 4).attr("text-anchor", "end")
          .attr("font-size", 12).attr("fill", "#71717a").text("Intense");

        // Valence labels (vertical)
        lensLabels.append("text").attr("x", -4).attr("y", 16).attr("text-anchor", "end")
          .attr("font-size", 12).attr("fill", "#71717a").text("Happy");
        lensLabels.append("text").attr("x", -4).attr("y", H - 4).attr("text-anchor", "end")
          .attr("font-size", 12).attr("fill", "#71717a").text("Sad");

        // Quadrant labels (faint)
        const quadrants = [
          { label: "Chill & Happy", x: W * 0.15, y: 40 },
          { label: "Intense & Happy", x: W * 0.85, y: 40 },
          { label: "Chill & Sad", x: W * 0.15, y: H - 24 },
          { label: "Intense & Sad", x: W * 0.85, y: H - 24 },
        ];
        for (const q of quadrants) {
          lensLabels.append("text").attr("x", q.x).attr("y", q.y).attr("text-anchor", "middle")
            .attr("font-size", 12).attr("font-weight", 500).attr("fill", "#3f3f46").text(q.label);
        }
        break;
      }
    }

    // Restart simulation to animate transition
    simulation.alpha(0.6).restart();
  }, [activeLens, songs]);

  return (
    <div ref={containerRef} className="relative">
      <BubbleLensSelector
        activeLens={activeLens}
        onLensChange={setActiveLens}
        soundDisabled={!songs.some((s) => s.energy != null)}
      />
      <div className="mt-3 rounded-2xl border border-zinc-800 bg-surface p-4">
        <svg
          ref={svgRef}
          className="w-full"
          role="img"
          aria-label="Interactive bubble explorer showing top 1000 songs sized by streams and colored by genre"
        />
      </div>
      <BubbleTooltip song={hoveredSong} position={tooltipPos} />
      <BubbleDetailDrawer song={selectedSong} onClose={handleCloseDrawer} />
      <BubbleInsightPanel lens={activeLens} songs={songs} />
    </div>
  );
}
