"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import * as d3 from "d3"
import type { BubbleSong } from "@/lib/featured-exemplars"
import {
  GENRE_COLORS,
  LONGEVITY_COLORS,
  LONGEVITY_LABELS,
} from "@/lib/spotify-data"
import type { LongevityCategory } from "@/lib/spotify-data"
import BubbleTooltip from "./BubbleTooltip"
import BubbleDetailDrawer from "./BubbleDetailDrawer"
import BubbleLensSelector, {
  type LensType,
  type DepthAxisType,
} from "./BubbleLensSelector"
import BubbleInsightPanel from "./BubbleInsightPanel"

type Props = {
  songs: BubbleSong[]
}

// --- Category type for Level 1 ---
type Category = {
  key: string
  label: string
  color: string
  songs: BubbleSong[]
  exemplar: BubbleSong
}

type CategoryNode = Category & d3.SimulationNodeDatum & { radius: number }

// --- 3D song node for Level 2 ---
type Song3D = BubbleSong & {
  wx: number // world x (from force layout)
  wy: number // world y
  wz: number // world z (from depth axis)
  baseRadius: number
  // Projected (computed each frame)
  px: number
  py: number
  pr: number
  visible: boolean
  imgLoaded: boolean
  img: HTMLImageElement | null
  blurCanvas: HTMLCanvasElement | null // pre-rendered blurred album art
}

const VIEW_W = 800
const MARGIN = { top: 28, right: 40, bottom: 28, left: 40 }

const FOCAL_LENGTH = 600 // perspective strength for 3D projection

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text
}

// Check if point (px,py) is inside a horizontal pill/capsule of size w×h, inset by margin
function pillContains(
  px: number,
  py: number,
  w: number,
  h: number,
  inset = 0,
): boolean {
  const r = h / 2 - inset
  if (r <= 0) return false
  const hw = Math.max(0, w / 2 - h / 2) // half-width of straight section
  const dx = Math.abs(px - w / 2) - hw
  const dy = py - h / 2
  if (dx <= 0) return Math.abs(dy) <= r
  return dx * dx + dy * dy <= r * r
}

// Scale point toward center of pill until it's inside (with margin)
function clampToPillCenter(
  px: number,
  py: number,
  w: number,
  h: number,
  inset = 0,
): [number, number] {
  if (pillContains(px, py, w, h, inset)) return [px, py]
  const cx = w / 2
  const cy = h / 2
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (pillContains(cx + (px - cx) * mid, cy + (py - cy) * mid, w, h, inset))
      lo = mid
    else hi = mid
  }
  return [cx + (px - cx) * lo, cy + (py - cy) * lo]
}

// --- Build categories for each lens ---
function getCategoriesForLens(lens: LensType, songs: BubbleSong[]): Category[] {
  const groupBy = (
    keyFn: (s: BubbleSong) => string,
    colorFn: (key: string) => string,
    labelFn?: (key: string) => string,
  ) => {
    const groups: Record<string, BubbleSong[]> = {}
    for (const s of songs) {
      const k = keyFn(s)
      if (!groups[k]) groups[k] = []
      groups[k].push(s)
    }
    return Object.entries(groups)
      .filter(([, arr]) => arr.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([key, arr]) => {
        const sorted = [...arr].sort((a, b) => b.max_streams - a.max_streams)
        return {
          key,
          label: labelFn ? labelFn(key) : key,
          color: colorFn(key),
          songs: sorted,
          exemplar: sorted[0],
        }
      })
  }

  switch (lens) {
    case "genre":
      return groupBy(
        (s) => s.genre,
        (k) => GENRE_COLORS[k] || "#9CA3AF",
      )
    case "longevity":
      return groupBy(
        (s) => s.longevity,
        (k) => LONGEVITY_COLORS[k as LongevityCategory] || "#52525b",
        (k) => LONGEVITY_LABELS[k as LongevityCategory] || k,
      )
    case "streams": {
      const tiers = [
        {
          key: "50m+",
          label: "50M+ Streams",
          min: 50_000_000,
          max: Infinity,
          color: "#1DB954",
        },
        {
          key: "20-50m",
          label: "20-50M Streams",
          min: 20_000_000,
          max: 50_000_000,
          color: "#16a34a",
        },
        {
          key: "5-20m",
          label: "5-20M Streams",
          min: 5_000_000,
          max: 20_000_000,
          color: "#3B82F6",
        },
        {
          key: "1-5m",
          label: "1-5M Streams",
          min: 1_000_000,
          max: 5_000_000,
          color: "#8B5CF6",
        },
        {
          key: "<1m",
          label: "<1M Streams",
          min: 0,
          max: 1_000_000,
          color: "#6B7280",
        },
      ]
      return tiers
        .map((t) => {
          const tierSongs = songs
            .filter((s) => s.max_streams >= t.min && s.max_streams < t.max)
            .sort((a, b) => b.max_streams - a.max_streams)
          if (tierSongs.length < 3) return null
          return {
            key: t.key,
            label: t.label,
            color: t.color,
            songs: tierSongs,
            exemplar: tierSongs[0],
          }
        })
        .filter((c): c is Category => c !== null)
    }
    case "sound": {
      const quadrants = [
        {
          key: "high-e-happy",
          label: "Intense & Happy",
          eMin: 0.5,
          eMax: 1,
          vMin: 0.5,
          vMax: 1,
          color: "#F59E0B",
        },
        {
          key: "high-e-sad",
          label: "Intense & Melancholy",
          eMin: 0.5,
          eMax: 1,
          vMin: 0,
          vMax: 0.5,
          color: "#EF4444",
        },
        {
          key: "low-e-happy",
          label: "Chill & Happy",
          eMin: 0,
          eMax: 0.5,
          vMin: 0.5,
          vMax: 1,
          color: "#1DB954",
        },
        {
          key: "low-e-sad",
          label: "Chill & Melancholy",
          eMin: 0,
          eMax: 0.5,
          vMin: 0,
          vMax: 0.5,
          color: "#3B82F6",
        },
      ]
      return quadrants
        .map((q) => {
          const qSongs = songs
            .filter(
              (s) =>
                s.energy != null &&
                s.valence != null &&
                s.energy >= q.eMin &&
                s.energy < q.eMax &&
                s.valence >= q.vMin &&
                s.valence < q.vMax,
            )
            .sort((a, b) => b.max_streams - a.max_streams)
          if (qSongs.length < 3) return null
          return {
            key: q.key,
            label: q.label,
            color: q.color,
            songs: qSongs,
            exemplar: qSongs[0],
          }
        })
        .filter((c): c is Category => c !== null)
    }
  }
}

// --- Depth axis value extractor ---
function depthValue(song: BubbleSong, axis: DepthAxisType): number {
  switch (axis) {
    case "streams":
      return song.max_streams
    case "weeks":
      return song.weeks_on_chart
    case "peak":
      return 201 - song.peak_rank
  }
}

// ============================================================
// Main Component
// ============================================================

export default function BubbleExplorer({ songs }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartWrapRef = useRef<HTMLDivElement>(null)
  const labelOverlayRef = useRef<HTMLDivElement>(null)

  // State
  const [activeLens, setActiveLens] = useState<LensType>("genre")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [depthAxis, setDepthAxis] = useState<DepthAxisType>("streams")
  const [hoveredSong, setHoveredSong] = useState<BubbleSong | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedSong, setSelectedSong] = useState<BubbleSong | null>(null)

  const handleCloseDrawer = useCallback(() => setSelectedSong(null), [])

  const categories = useMemo(
    () => getCategoriesForLens(activeLens, songs),
    [activeLens, songs],
  )

  const categorySongs = useMemo(() => {
    if (!activeCategory) return []
    const cat = categories.find((c) => c.key === activeCategory)
    return cat ? cat.songs : []
  }, [activeCategory, categories])

  const handleLensChange = useCallback((lens: LensType) => {
    setActiveLens(lens)
    setActiveCategory(null)
    setHoveredSong(null)
    setSelectedSong(null)
  }, [])

  const handleBack = useCallback(() => {
    setActiveCategory(null)
    setHoveredSong(null)
    setSelectedSong(null)
  }, [])

  // ============================================================
  // LEVEL 1: Category bubbles (SVG)
  // ============================================================
  useEffect(() => {
    if (activeCategory !== null) return
    if (!svgRef.current || !chartWrapRef.current || !categories.length) return

    const wrapRect = chartWrapRef.current.getBoundingClientRect()
    const containerW = wrapRect.width
    const containerH = wrapRect.height
    const aspect = containerH / containerW
    const WIDTH = VIEW_W
    const HEIGHT = Math.round(VIEW_W * aspect)
    const W = WIDTH - MARGIN.left - MARGIN.right
    const H = HEIGHT - MARGIN.top - MARGIN.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg
      .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "100%")

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)

    const countExtent = d3.extent(categories, (c) => c.songs.length) as [
      number,
      number,
    ]
    const r = d3
      .scaleSqrt()
      .domain([Math.max(1, countExtent[0]), countExtent[1]])
      .range([Math.min(40, W / 10), Math.min(100, W / 5)])
      .clamp(true)

    const nodes: CategoryNode[] = categories.map((cat, i) => ({
      ...cat,
      x: W / 2 + Math.cos((2 * Math.PI * i) / categories.length) * W * 0.2,
      y: H / 2 + Math.sin((2 * Math.PI * i) / categories.length) * H * 0.2,
      radius: r(cat.songs.length),
    }))

    const defs = svg.append("defs")
    for (const node of nodes) {
      defs
        .append("clipPath")
        .attr("id", `cat-clip-${node.key}`)
        .append("circle")
        .attr("r", node.radius)
    }

    const bubbleGroups = g
      .selectAll<SVGGElement, CategoryNode>(".cat-bubble")
      .data(nodes)
      .join("g")
      .attr("class", "cat-bubble")
      .style("cursor", "pointer")

    bubbleGroups
      .append("image")
      .attr("href", (d) => d.exemplar.album_img || "")
      .attr("width", (d) => d.radius * 2)
      .attr("height", (d) => d.radius * 2)
      .attr("x", (d) => -d.radius)
      .attr("y", (d) => -d.radius)
      .attr("clip-path", (d) => `url(#cat-clip-${d.key})`)
      .attr("preserveAspectRatio", "xMidYMid slice")

    bubbleGroups
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.45)

    bubbleGroups
      .append("circle")
      .attr("class", "ring")
      .attr("r", (d) => d.radius)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 3)
      .attr("opacity", 0.8)

    bubbleGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.3em")
      .attr("fill", "#fff")
      .attr("font-size", (d) => Math.max(12, Math.min(18, d.radius / 3.5)))
      .attr("font-weight", 700)
      .attr("pointer-events", "none")
      .text((d) => d.label)

    bubbleGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("fill", "#B3B3B3")
      .attr("font-size", (d) => Math.max(10, Math.min(13, d.radius / 4.5)))
      .attr("font-weight", 500)
      .attr("pointer-events", "none")
      .text((d) => `${d.songs.length} songs`)

    bubbleGroups
      .on("mouseenter", function () {
        d3.select(this)
          .select(".ring")
          .transition()
          .duration(150)
          .attr("stroke-width", 5)
          .attr("opacity", 1)
        d3.select(this)
          .transition()
          .duration(150)
          .attr("transform", function () {
            const d = d3.select(this).datum() as CategoryNode
            return `translate(${d.x},${d.y}) scale(1.06)`
          })
      })
      .on("mouseleave", function () {
        d3.select(this)
          .select(".ring")
          .transition()
          .duration(150)
          .attr("stroke-width", 3)
          .attr("opacity", 0.8)
        d3.select(this)
          .transition()
          .duration(150)
          .attr("transform", function () {
            const d = d3.select(this).datum() as CategoryNode
            return `translate(${d.x},${d.y}) scale(1)`
          })
      })
      .on("click", (_event: MouseEvent, d: CategoryNode) => {
        setActiveCategory(d.key)
      })

    const simulation = d3
      .forceSimulation<CategoryNode>(nodes)
      .force("center", d3.forceCenter<CategoryNode>(W / 2, H / 2))
      .force(
        "collide",
        d3.forceCollide<CategoryNode>((d) => d.radius + 16).iterations(3),
      )
      .force("charge", d3.forceManyBody<CategoryNode>().strength(-80))

    simulation.stop()
    for (let i = 0; i < 200; i++) simulation.tick()
    for (const d of nodes) {
      // Clamp to pill shape of the viewBox
      const [cx, cy] = clampToPillCenter(d.x!, d.y!, W, H, d.radius + 4)
      d.x = cx
      d.y = cy
    }
    bubbleGroups.attr("transform", (d) => `translate(${d.x},${d.y})`)

    return () => {
      simulation.stop()
    }
  }, [categories, activeCategory])

  // ============================================================
  // LEVEL 2: DNA single-strand helix (Canvas 2D)
  // ============================================================
  useEffect(() => {
    if (activeCategory === null) return
    if (!canvasRef.current || !chartWrapRef.current || !categorySongs.length)
      return
    const canvas = canvasRef.current
    const wrap = chartWrapRef.current

    const cat = categories.find((c) => c.key === activeCategory)
    const catColor = cat?.color || "#9CA3AF"

    const rect = wrap.getBoundingClientRect()
    const cw = rect.width
    const ch = rect.height
    const dpr = window.devicePixelRatio || 1
    canvas.width = cw * dpr
    canvas.height = ch * dpr
    canvas.style.width = `${cw}px`
    canvas.style.height = `${ch}px`

    const ctx = canvas.getContext("2d")!
    ctx.scale(dpr, dpr)

    const centerX = cw / 2
    const centerY = ch / 2

    // --- Helix geometry ---
    // Songs sorted by metric (highest first = position 0 on helix)
    const sortedSongs = [...categorySongs].sort(
      (a, b) => depthValue(b, depthAxis) - depthValue(a, depthAxis),
    )
    const N = sortedSongs.length

    // Radius scale: bubble size proportional to sqrt of metric value
    const values = sortedSongs.map((s) => depthValue(s, depthAxis))
    const maxVal = Math.max(1, values[0])
    const minVal = Math.max(1, values[N - 1])
    const rScale = d3
      .scaleSqrt()
      .domain([minVal, maxVal])
      .range([6, 45])
      .clamp(true)

    // Helix parameters — camera looks down the helix axis (Z)
    // Bubbles orbit in X/Y, Z position reflects the chosen depth metric
    const HELIX_RADIUS = Math.min(cw, ch) * 0.28
    const TURNS = Math.max(3, N / 12)
    const HELIX_LENGTH = N * 50

    // Map metric value → Z position (highest value = nearest, lowest = farthest)
    const zScale = d3
      .scaleLinear()
      .domain([maxVal, minVal]) // high metric → low Z (close), low metric → high Z (far)
      .range([0, HELIX_LENGTH])
      .clamp(true)

    const nodes: Song3D[] = sortedSongs.map((song, i) => {
      const t = i / Math.max(1, N - 1) // 0..1 for helix angle
      const angle = t * TURNS * 2 * Math.PI
      const wx = Math.cos(angle) * HELIX_RADIUS
      const wy = Math.sin(angle) * HELIX_RADIUS
      const wz = zScale(depthValue(song, depthAxis)) // Z from metric value

      return {
        ...song,
        wx,
        wy,
        wz,
        baseRadius: rScale(depthValue(song, depthAxis)),
        px: 0,
        py: 0,
        pr: 0,
        visible: false,
        imgLoaded: false,
        img: null,
        blurCanvas: null,
      }
    })

    // Preload album art — largest bubbles first
    const withArt = [...nodes]
      .filter((n) => n.album_img)
      .sort((a, b) => b.baseRadius - a.baseRadius)

    function loadImage(node: Song3D) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        node.img = img
        node.imgLoaded = true
        const size = 128
        const off = document.createElement("canvas")
        off.width = size
        off.height = size
        const offCtx = off.getContext("2d")!
        offCtx.filter = "blur(16px)"
        offCtx.drawImage(img, -20, -20, size + 40, size + 40)
        offCtx.filter = "none"
        node.blurCanvas = off
      }
      img.src = node.album_img!
    }

    const immediate = withArt.slice(0, 80)
    const deferred = withArt.slice(80)
    for (const node of immediate) loadImage(node)

    const batchTimers: ReturnType<typeof setTimeout>[] = []
    const BATCH_SIZE = 40
    for (let i = 0; i < deferred.length; i += BATCH_SIZE) {
      const batch = deferred.slice(i, i + BATCH_SIZE)
      const timer = setTimeout(() => {
        for (const node of batch) loadImage(node)
      }, 500 + (i / BATCH_SIZE) * 300)
      batchTimers.push(timer)
    }

    // Camera state: scroll advances along Z (helix axis), drag pans X/Y
    let cameraZ = -200 // camera Z position — starts just before helix
    let targetCameraZ = -200
    let panX = 0 // lateral pan (drag)
    let targetPanX = 0
    let panY = 0
    let targetPanY = 0
    let animFrameId = 0
    let hoveredNode: Song3D | null = null
    let isDragging = false
    let dragStartX = 0
    let dragStartY = 0
    let dragStartPanX = 0
    let dragStartPanY = 0

    // Perspective projection
    const FL = FOCAL_LENGTH
    const CAM_OFFSET = 100 // how far behind cameraZ the eye sits

    const MAX_RENDER = 60 // max bubbles to render per frame
    const MAX_DEPTH = FL * 5 // don't project nodes beyond this distance

    function projectNodes() {
      const eyeZ = cameraZ - CAM_OFFSET // actual eye position
      for (const n of nodes) {
        const dz = n.wz - eyeZ
        // Early cull: behind camera or too far ahead
        if (dz <= 10 || dz > MAX_DEPTH) {
          n.visible = false
          n.pr = 0
          continue
        }
        // Lateral offset from drag
        const wx = n.wx - panX
        const wy = n.wy - panY
        const scale = FL / dz
        n.px = centerX + wx * scale
        n.py = centerY + wy * scale
        n.pr = n.baseRadius * scale

        n.visible =
          n.pr > 0.5 &&
          n.px > -n.pr * 2 &&
          n.px < cw + n.pr * 2 &&
          n.py > -n.pr * 2 &&
          n.py < ch + n.pr * 2
      }
    }

    function draw() {
      ctx.clearRect(0, 0, cw, ch)
      projectNodes()

      // Sort by depth (far to near) for painter's algorithm
      const sorted = nodes
        .filter((n) => n.visible)
        .sort((a, b) => b.wz - a.wz) // far bubbles first
        .slice(0, MAX_RENDER) // cap render count for performance

      for (const n of sorted) {
        const isHovered = n === hoveredNode

        // Depth-based fade: farther bubbles are dimmer
        const eyeZ = cameraZ - CAM_OFFSET
        const distFromEye = n.wz - eyeZ
        const maxVisible = FL * 6
        const depthFade = Math.max(0.15, Math.min(1, 1 - distFromEye / maxVisible))

        ctx.save()
        ctx.globalAlpha = depthFade

        if (n.imgLoaded && n.img && n.pr >= 16) {
          // Clip to circle
          ctx.beginPath()
          ctx.arc(n.px, n.py, n.pr, 0, Math.PI * 2)
          ctx.save()
          ctx.clip()

          // Blurred album art background
          if (n.blurCanvas) {
            ctx.drawImage(n.blurCanvas, n.px - n.pr, n.py - n.pr, n.pr * 2, n.pr * 2)
          } else {
            ctx.drawImage(n.img, n.px - n.pr, n.py - n.pr, n.pr * 2, n.pr * 2)
          }

          // Dark overlay
          ctx.fillStyle = "rgba(0,0,0,0.45)"
          ctx.fillRect(n.px - n.pr, n.py - n.pr, n.pr * 2, n.pr * 2)

          // Sharp album art
          const hasLabel = n.pr >= 36
          const artSize = n.pr * (hasLabel ? 1.05 : 1.3)
          const artR = artSize / 2
          const artOffsetY = hasLabel ? -n.pr * 0.18 : 0
          const rx = n.px - artR
          const ry = n.py - artR + artOffsetY
          const cornerR = artSize * 0.12
          ctx.beginPath()
          ctx.moveTo(rx + cornerR, ry)
          ctx.lineTo(rx + artSize - cornerR, ry)
          ctx.arcTo(rx + artSize, ry, rx + artSize, ry + cornerR, cornerR)
          ctx.lineTo(rx + artSize, ry + artSize - cornerR)
          ctx.arcTo(rx + artSize, ry + artSize, rx + artSize - cornerR, ry + artSize, cornerR)
          ctx.lineTo(rx + cornerR, ry + artSize)
          ctx.arcTo(rx, ry + artSize, rx, ry + artSize - cornerR, cornerR)
          ctx.lineTo(rx, ry + cornerR)
          ctx.arcTo(rx, ry, rx + cornerR, ry, cornerR)
          ctx.closePath()
          ctx.clip()
          ctx.drawImage(n.img, rx, ry, artSize, artSize)

          ctx.restore()

          // Category tint
          ctx.beginPath()
          ctx.arc(n.px, n.py, n.pr, 0, Math.PI * 2)
          ctx.fillStyle = catColor + "25"
          ctx.fill()

          // 3D shading
          ctx.beginPath()
          ctx.arc(n.px, n.py, n.pr, 0, Math.PI * 2)
          const shading = ctx.createRadialGradient(
            n.px - n.pr * 0.3, n.py - n.pr * 0.3, n.pr * 0.1,
            n.px, n.py, n.pr,
          )
          shading.addColorStop(0, "rgba(255,255,255,0.08)")
          shading.addColorStop(0.6, "rgba(0,0,0,0)")
          shading.addColorStop(1, "rgba(0,0,0,0.35)")
          ctx.fillStyle = shading
          ctx.fill()

          // Rim ring
          ctx.beginPath()
          ctx.arc(n.px, n.py, n.pr - 0.5, 0, Math.PI * 2)
          ctx.strokeStyle = "rgba(255,255,255,0.1)"
          ctx.lineWidth = 1
          ctx.stroke()
        } else if (n.blurCanvas && n.pr >= 3) {
          ctx.beginPath()
          ctx.arc(n.px, n.py, n.pr, 0, Math.PI * 2)
          ctx.save()
          ctx.clip()
          ctx.drawImage(n.blurCanvas, n.px - n.pr, n.py - n.pr, n.pr * 2, n.pr * 2)
          ctx.fillStyle = "rgba(0,0,0,0.3)"
          ctx.fillRect(n.px - n.pr, n.py - n.pr, n.pr * 2, n.pr * 2)
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.arc(n.px, n.py, n.pr, 0, Math.PI * 2)
          ctx.fillStyle = catColor
          ctx.globalAlpha = depthFade * 0.5
          ctx.fill()
        }

        // Hover ring
        if (isHovered) {
          ctx.beginPath()
          ctx.arc(n.px, n.py, n.pr, 0, Math.PI * 2)
          ctx.strokeStyle = "#fff"
          ctx.lineWidth = 2
          ctx.stroke()
        }

        ctx.restore()
      }

      // HUD
      const pillR = ch / 2
      const safeL = pillR * 0.35
      const safeB = ch * 0.12
      ctx.save()
      ctx.fillStyle = "#9CA3AF"
      ctx.font = "500 12px Inter, system-ui, sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "bottom"
      const depthLabel =
        depthAxis === "streams"
          ? "Peak Streams"
          : depthAxis === "weeks"
            ? "Weeks on Chart"
            : "Peak Rank"
      const progress = Math.round((Math.max(0, cameraZ) / HELIX_LENGTH) * 100)
      ctx.fillText(`${depthLabel} · ${Math.min(100, Math.max(0, progress))}%`, safeL, ch - safeB)

      if (cameraZ < 50) {
        ctx.fillStyle = "#3f3f46"
        ctx.textAlign = "center"
        ctx.textBaseline = "bottom"
        ctx.fillText("Scroll to travel along the strand", cw / 2, ch - safeB - 16)
      }
      ctx.restore()
    }

    // --- DOM overlay for text labels ---
    const overlay = labelOverlayRef.current
    const labelPool: Map<string, HTMLDivElement> = new Map()

    function updateLabelOverlay() {
      if (!overlay) return
      const visible = nodes.filter(
        (n) => n.visible && n.pr >= 36 && n.imgLoaded,
      )
      const visibleIds = new Set(visible.map((n) => n.track_id))

      for (const [id, el] of labelPool) {
        if (!visibleIds.has(id)) {
          el.remove()
          labelPool.delete(id)
        }
      }

      // Near bubbles get label priority
      visible.sort((a, b) => a.wz - b.wz)
      const placedBubbles: Song3D[] = []

      for (const n of visible) {
        const labelCx = n.px
        const labelCy = n.py + n.pr * 0.40
        let occluded = false
        for (const placed of placedBubbles) {
          const dx = labelCx - placed.px
          const dy = labelCy - placed.py
          if (dx * dx + dy * dy < placed.pr * placed.pr) {
            occluded = true
            break
          }
        }
        placedBubbles.push(n)

        const eyeZL = cameraZ - CAM_OFFSET
        const distFromEyeL = n.wz - eyeZL
        const maxVisibleL = FL * 6
        const depthFade = Math.max(0.15, Math.min(1, 1 - distFromEyeL / maxVisibleL))

        if (depthFade < 0.15 || occluded) {
          const existing = labelPool.get(n.track_id)
          if (existing) existing.style.opacity = "0"
          continue
        }

        let el = labelPool.get(n.track_id)
        if (!el) {
          el = document.createElement("div")
          el.style.position = "absolute"
          el.style.pointerEvents = "none"
          el.style.textAlign = "center"
          el.style.willChange = "transform, opacity"
          el.style.left = "0"
          el.style.top = "0"
          el.innerHTML = `<div class="bubble-title"></div><div class="bubble-artist"></div>`
          overlay.appendChild(el)
          labelPool.set(n.track_id, el)
        }

        const titleSize = Math.max(9, n.pr / 6)
        const artistSize = Math.max(8, n.pr / 7.5)
        const labelY = n.pr * 0.40
        const chordHalf = Math.sqrt(Math.max(0, n.pr * n.pr - labelY * labelY))
        const maxW = chordHalf * 2 - 4

        const titleEl = el.firstElementChild as HTMLDivElement
        const artistEl = el.lastElementChild as HTMLDivElement

        titleEl.textContent = truncate(n.track_name, 18)
        titleEl.style.fontSize = `${titleSize}px`
        titleEl.style.fontWeight = "600"
        titleEl.style.color = "#fff"
        titleEl.style.lineHeight = "1.2"
        titleEl.style.overflow = "hidden"
        titleEl.style.textOverflow = "ellipsis"
        titleEl.style.whiteSpace = "nowrap"
        titleEl.style.maxWidth = `${maxW * 0.85}px`
        titleEl.style.textShadow = "0 1px 4px rgba(0,0,0,0.8)"

        artistEl.textContent = truncate(n.artist_name, 20)
        artistEl.style.fontSize = `${artistSize}px`
        artistEl.style.fontWeight = "400"
        artistEl.style.color = "#B3B3B3"
        artistEl.style.lineHeight = "1.2"
        artistEl.style.overflow = "hidden"
        artistEl.style.textOverflow = "ellipsis"
        artistEl.style.whiteSpace = "nowrap"
        artistEl.style.maxWidth = `${maxW * 0.85}px`
        artistEl.style.textShadow = "0 1px 4px rgba(0,0,0,0.8)"

        el.style.transform = `translate(${n.px}px, ${n.py + n.pr * 0.40}px) translate(-50%, 0)`
        el.style.opacity = String(depthFade)
      }
    }

    // Animation loop
    function animate() {
      cameraZ += (targetCameraZ - cameraZ) * 0.12
      if (Math.abs(cameraZ - targetCameraZ) < 0.5) cameraZ = targetCameraZ
      panX += (targetPanX - panX) * 0.12
      if (Math.abs(panX - targetPanX) < 0.5) panX = targetPanX
      panY += (targetPanY - panY) * 0.12
      if (Math.abs(panY - targetPanY) < 0.5) panY = targetPanY

      draw()
      updateLabelOverlay()
      animFrameId = requestAnimationFrame(animate)
    }

    animFrameId = requestAnimationFrame(animate)

    // Scroll → advance camera along helix axis (Z)
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const delta = e.deltaY * 1.5
      targetCameraZ = Math.max(-200, Math.min(HELIX_LENGTH + 200, targetCameraZ + delta))
    }

    // Drag to pan
    function handleMouseDown(e: MouseEvent) {
      if (e.button === 0 || e.button === 1) {
        isDragging = true
        dragStartX = e.clientX
        dragStartY = e.clientY
        dragStartPanX = targetPanX
        dragStartPanY = targetPanY
        if (e.button === 1) e.preventDefault()
      }
    }

    function handleMouseMove(e: MouseEvent) {
      if (isDragging) {
        const dx = e.clientX - dragStartX
        const dy = e.clientY - dragStartY
        targetPanX = dragStartPanX - dx * 0.5
        targetPanY = dragStartPanY - dy * 0.5
        canvas.style.cursor = "grabbing"
        setHoveredSong(null)
        hoveredNode = null
        return
      }

      // Hit test
      const r = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top

      const hoverable = nodes.filter(
        (n) => n.visible && n.pr >= 8 && n.imgLoaded,
      )
      // Near bubbles (low wz) drawn on top — check them first
      hoverable.sort((a, b) => a.wz - b.wz)

      let hit: Song3D | null = null
      for (const n of hoverable) {
        const ddx = mx - n.px
        const ddy = my - n.py
        if (ddx * ddx + ddy * ddy <= n.pr * n.pr) {
          hit = n
          break
        }
      }

      hoveredNode = hit
      canvas.style.cursor = hit ? "pointer" : "grab"

      if (hit) {
        const wrapR = wrap.getBoundingClientRect()
        const canvasR = canvas.getBoundingClientRect()
        setHoveredSong(hit)
        setTooltipPos({
          x: hit.px + canvasR.left - wrapR.left + 16,
          y: hit.py + canvasR.top - wrapR.top,
        })
      } else {
        setHoveredSong(null)
      }
    }

    function handleMouseUp(e: MouseEvent) {
      if (!isDragging) return
      const dx = Math.abs(e.clientX - dragStartX)
      const dy = Math.abs(e.clientY - dragStartY)
      const wasDrag = dx > 4 || dy > 4

      isDragging = false
      canvas.style.cursor = "grab"

      if (!wasDrag && e.button === 0 && hoveredNode) {
        const r = canvas.getBoundingClientRect()
        const mx = e.clientX - r.left
        const my = e.clientY - r.top
        const visible = nodes.filter((n) => n.visible && n.pr > 3)
        visible.sort((a, b) => a.wz - b.wz)
        for (const n of visible) {
          const ddx = mx - n.px
          const ddy = my - n.py
          if (ddx * ddx + ddy * ddy <= n.pr * n.pr) {
            setSelectedSong(n)
            setHoveredSong(null)
            break
          }
        }
      }
    }

    // Touch support
    let touchStartX = 0
    let touchStartY = 0
    let touchStartCameraZ = 0
    let touchStartPanX = 0
    let touchIsDrag = false

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      touchStartX = t.clientX
      touchStartY = t.clientY
      touchStartCameraZ = targetCameraZ
      touchStartPanX = targetPanX
      touchIsDrag = false
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return
      e.preventDefault()
      const t = e.touches[0]
      const dx = t.clientX - touchStartX
      const dy = t.clientY - touchStartY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) touchIsDrag = true
      if (touchIsDrag) {
        // Vertical swipe = advance along helix, horizontal = lateral pan
        targetCameraZ = Math.max(-200, Math.min(HELIX_LENGTH + 200, touchStartCameraZ + dy * 1.5))
        targetPanX = touchStartPanX - dx * 0.5
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (touchIsDrag || e.changedTouches.length !== 1) return
      const touch = e.changedTouches[0]
      const r = canvas.getBoundingClientRect()
      const mx = touch.clientX - r.left
      const my = touch.clientY - r.top

      const visible = nodes.filter((n) => n.visible && n.pr > 3)
      visible.sort((a, b) => a.wz - b.wz)
      for (const n of visible) {
        const ddx = mx - n.px
        const ddy = my - n.py
        if (ddx * ddx + ddy * ddy <= n.pr * n.pr) {
          setSelectedSong(n)
          break
        }
      }
    }

    function handleContextMenu(e: MouseEvent) {
      if (e.button === 1) e.preventDefault()
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mouseleave", () => {
      isDragging = false
    })
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true })
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
    canvas.addEventListener("touchend", handleTouchEnd)
    canvas.addEventListener("auxclick", handleContextMenu)
    canvas.style.cursor = "grab"

    return () => {
      cancelAnimationFrame(animFrameId)
      for (const t of batchTimers) clearTimeout(t)
      canvas.removeEventListener("wheel", handleWheel)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)
      canvas.removeEventListener("auxclick", handleContextMenu)
      for (const [, el] of labelPool) el.remove()
      labelPool.clear()
    }
  }, [activeCategory, categorySongs, depthAxis, categories, activeLens])

  const activeCat = categories.find((c) => c.key === activeCategory)

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-col"
      style={{ height: "calc(100dvh - 7rem)" }}
    >
      <BubbleLensSelector
        activeLens={activeLens}
        onLensChange={handleLensChange}
        soundDisabled={!songs.some((s) => s.energy != null)}
        activeCategory={activeCategory}
        depthAxis={depthAxis}
        onDepthChange={setDepthAxis}
      />

      <div
        ref={chartWrapRef}
        className="relative mt-3 flex-1 overflow-hidden rounded-[999px] border border-zinc-800 bg-surface"
      >
        {/* Back button (Level 2 only) */}
        {activeCategory && (
          <button
            onClick={handleBack}
            className="absolute left-[12%] top-8 z-10 flex items-center gap-2 rounded-full border border-zinc-700 bg-surface/90 px-3 py-1.5 text-sm font-medium text-[#B3B3B3] backdrop-blur transition-colors hover:border-zinc-600 hover:text-white"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        )}

        {/* Category title (Level 2 only) */}
        {activeCat && (
          <div className="absolute right-[12%] top-8 z-10 text-right">
            <p className="text-lg font-bold" style={{ color: activeCat.color }}>
              {activeCat.label}
            </p>
            <p className="text-xs text-zinc-500">
              {activeCat.songs.length} songs
            </p>
          </div>
        )}

        {/* SVG for Level 1 */}
        <svg
          ref={svgRef}
          className="h-full w-full"
          style={{ display: activeCategory ? "none" : "block" }}
          role="img"
          aria-label={`${categories.length} category bubbles for ${activeLens} lens`}
        />

        {/* Canvas for Level 2 z-axis zoom */}
        <canvas
          ref={canvasRef}
          style={{ display: activeCategory ? "block" : "none" }}
          role="img"
          aria-label={
            activeCategory
              ? `Songs in ${activeCat?.label || activeCategory} — scroll to fly deeper`
              : undefined
          }
        />

        {/* DOM overlay for jitter-free text labels over canvas */}
        <div
          ref={labelOverlayRef}
          style={{
            display: activeCategory ? "block" : "none",
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        />
      </div>

      <BubbleTooltip song={hoveredSong} position={tooltipPos} />
      <BubbleDetailDrawer song={selectedSong} onClose={handleCloseDrawer} />
      <BubbleInsightPanel
        lens={activeLens}
        songs={activeCategory ? categorySongs : songs}
      />
    </div>
  )
}
