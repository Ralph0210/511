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

// --- Category descriptions for Layer 1 tooltips ---
const CATEGORY_DESCRIPTIONS: Record<string, Record<string, string>> = {
  genre: {
    Pop: "Catchy hooks and sing-along melodies built for the widest audience",
    "Hip Hop/Rap": "Beats, bars, and wordplay — from trap bangers to lyrical storytelling",
    Latin: "Reggaeton, bachata, and Latin pop driving a global takeover",
    "R&B": "Smooth vocals and soulful production rooted in rhythm and blues",
    Rock: "Guitars and grit — from indie anthems to arena-sized riffs",
    "EDM/Dance": "Synth-driven drops and four-on-the-floor beats made for the dancefloor",
    Country: "Storytelling, steel guitar, and heartland americana",
    "K-Pop": "Precision choreography and high-gloss production from South Korea",
    Afrobeats: "Infectious West African rhythms crossing over worldwide",
  },
  longevity: {
    viral: "Shot to the top 10, gone within weeks",
    lasting: "Charted high and stayed for months",
    slow_burn: "Took weeks to peak, but kept climbing",
    flash: "Came and went below the radar",
  },
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
  const [hoveredCategory, setHoveredCategory] = useState<CategoryNode | null>(null)
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
  // LEVEL 1: Category bubbles (SVG) — force-animated, bouncing
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
      x: W / 2 + Math.cos((2 * Math.PI * i) / categories.length) * W * 0.25,
      y: H / 2 + Math.sin((2 * Math.PI * i) / categories.length) * H * 0.25,
      radius: r(cat.songs.length),
    }))

    // Sanitize keys for valid SVG ids (no slashes, spaces, etc.)
    const svgId = (key: string) => key.replace(/[^a-zA-Z0-9_-]/g, "_")

    // --- Defs: clipPaths, blur filter, radial gradient for 3D shading ---
    const defs = svg.append("defs")

    // Shared blur filter for background album art
    const blurFilter = defs.append("filter").attr("id", "bg-blur")
    blurFilter.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", 12)

    for (const node of nodes) {
      const id = svgId(node.key)

      // Circle clip for full bubble
      defs
        .append("clipPath")
        .attr("id", `cat-clip-${id}`)
        .append("circle")
        .attr("r", node.radius)

      // Rounded rect clip for sharp album art (upper portion)
      const artSize = node.radius * 0.9
      const cornerR = artSize * 0.12
      const artOffsetY = -node.radius * 0.18
      defs
        .append("clipPath")
        .attr("id", `cat-art-clip-${id}`)
        .append("rect")
        .attr("x", -artSize / 2)
        .attr("y", -artSize / 2 + artOffsetY)
        .attr("width", artSize)
        .attr("height", artSize)
        .attr("rx", cornerR)
        .attr("ry", cornerR)

      // Radial gradient for 3D shading
      const grad = defs
        .append("radialGradient")
        .attr("id", `cat-shade-${id}`)
        .attr("cx", "35%")
        .attr("cy", "35%")
        .attr("r", "65%")
      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "rgba(255,255,255,0.08)")
      grad
        .append("stop")
        .attr("offset", "60%")
        .attr("stop-color", "rgba(0,0,0,0)")
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "rgba(0,0,0,0.35)")
    }

    // --- Build bubble groups ---
    const bubbleGroups = g
      .selectAll<SVGGElement, CategoryNode>(".cat-bubble")
      .data(nodes)
      .join("g")
      .attr("class", "cat-bubble")
      .style("cursor", "pointer")

    // 1) Blurred album art background (fills entire circle)
    bubbleGroups
      .append("image")
      .attr("href", (d) => d.exemplar.album_img || "")
      .attr("width", (d) => d.radius * 2.4)
      .attr("height", (d) => d.radius * 2.4)
      .attr("x", (d) => -d.radius * 1.2)
      .attr("y", (d) => -d.radius * 1.2)
      .attr("clip-path", (d) => `url(#cat-clip-${svgId(d.key)})`)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .attr("filter", "url(#bg-blur)")

    // 2) Dark overlay on blurred background
    bubbleGroups
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", "rgba(0,0,0,0.5)")

    // 3) Sharp album art (rounded rect, offset upward like Layer 2)
    bubbleGroups
      .append("image")
      .attr("href", (d) => d.exemplar.album_img || "")
      .attr("width", (d) => d.radius * 0.9)
      .attr("height", (d) => d.radius * 0.9)
      .attr("x", (d) => (-d.radius * 0.9) / 2)
      .attr("y", (d) => (-d.radius * 0.9) / 2 + -d.radius * 0.18)
      .attr("clip-path", (d) => `url(#cat-art-clip-${svgId(d.key)})`)
      .attr("preserveAspectRatio", "xMidYMid slice")

    // 4) Category tint overlay
    bubbleGroups
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color + "20")

    // 5) 3D shading gradient
    bubbleGroups
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => `url(#cat-shade-${svgId(d.key)})`)

    // 6) Rim ring
    bubbleGroups
      .append("circle")
      .attr("class", "ring")
      .attr("r", (d) => d.radius - 0.5)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 1)

    // 7) Label: category name (below album art)
    bubbleGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius * 0.55)
      .attr("fill", "#fff")
      .attr("font-size", (d) => Math.max(10, Math.min(14, d.radius / 5)))
      .attr("font-weight", 700)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 4px rgba(0,0,0,0.8)")
      .text((d) => d.label)

    // 8) Label: song count (below category name)
    bubbleGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr(
        "dy",
        (d) =>
          d.radius * 0.55 + Math.max(10, Math.min(14, d.radius / 5)) * 1.15,
      )
      .attr("fill", "#B3B3B3")
      .attr("font-size", (d) => Math.max(9, Math.min(11, d.radius / 6)))
      .attr("font-weight", 500)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 4px rgba(0,0,0,0.8)")
      .text((d) => `${d.songs.length} songs`)

    // --- Hover interactions ---
    bubbleGroups
      .on("mouseenter", function (_event: MouseEvent, d: CategoryNode) {
        d3.select(this)
          .select(".ring")
          .transition()
          .duration(150)
          .attr("stroke", "rgba(255,255,255,0.3)")
          .attr("stroke-width", 2)
        d3.select(this)
          .transition()
          .duration(150)
          .attr("transform", function () {
            const nd = d3.select(this).datum() as CategoryNode
            return `translate(${nd.x},${nd.y}) scale(1.06)`
          })

        // Show category tooltip at bubble position
        if (svgRef.current && containerRef.current) {
          const svgEl = svgRef.current
          const contR = containerRef.current.getBoundingClientRect()
          const svgR = svgEl.getBoundingClientRect()
          const scaleX = svgR.width / WIDTH
          const scaleY = svgR.height / HEIGHT
          const px = MARGIN.left + (d.x ?? 0)
          const py = MARGIN.top + (d.y ?? 0) - (d.radius ?? 0)
          setHoveredCategory(d)
          setTooltipPos({
            x: svgR.left - contR.left + px * scaleX,
            y: svgR.top - contR.top + py * scaleY,
          })
        }
      })
      .on("mouseleave", function () {
        d3.select(this)
          .select(".ring")
          .transition()
          .duration(150)
          .attr("stroke", "rgba(255,255,255,0.1)")
          .attr("stroke-width", 1)
        d3.select(this)
          .transition()
          .duration(150)
          .attr("transform", function () {
            const d = d3.select(this).datum() as CategoryNode
            return `translate(${d.x},${d.y}) scale(1)`
          })
        setHoveredCategory(null)
      })
      .on("click", (_event: MouseEvent, d: CategoryNode) => {
        setActiveCategory(d.key)
      })

    // --- Force simulation: live animation with bouncing ---
    const simulation = d3
      .forceSimulation<CategoryNode>(nodes)
      .force(
        "center",
        d3.forceCenter<CategoryNode>(W / 2, H / 2).strength(0.05),
      )
      .force(
        "collide",
        d3
          .forceCollide<CategoryNode>((d) => d.radius + 12)
          .iterations(6)
          .strength(1),
      )
      .force("charge", d3.forceManyBody<CategoryNode>().strength(-60))
      .alphaDecay(0.015)
      .velocityDecay(0.3)
      .on("tick", () => {
        for (const d of nodes) {
          const [cx, cy] = clampToPillCenter(d.x!, d.y!, W, H, d.radius + 4)
          d.x = cx
          d.y = cy
        }
        bubbleGroups.attr("transform", (d) => `translate(${d.x},${d.y})`)
      })

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

    const values = sortedSongs.map((s) => depthValue(s, depthAxis))
    const maxVal = Math.max(1, values[0])
    const minVal = Math.max(1, values[N - 1])

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
        baseRadius: 28, // uniform size — depth encodes the metric
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
      const timer = setTimeout(
        () => {
          for (const node of batch) loadImage(node)
        },
        500 + (i / BATCH_SIZE) * 300,
      )
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

    // HUD geometry (shared between draw and mouse handlers)
    const hudX = cw * 0.88 + 12
    const hudTop = ch * 0.22
    const hudBot = ch * 0.82
    const hudH = hudBot - hudTop
    const hudHelixR = 8
    const hudHitW = 40 // wider hit area for drag
    let isDraggingHud = false

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

      // Keep nearest bubbles (most important), then sort far-to-near for painter's algorithm
      const visible = nodes.filter((n) => n.visible)
      visible.sort((a, b) => a.wz - b.wz) // nearest first
      // Mark culled nodes as not visible so labels also hide
      for (let i = MAX_RENDER; i < visible.length; i++)
        visible[i].visible = false
      const kept = visible.slice(0, MAX_RENDER)
      kept.sort((a, b) => b.wz - a.wz) // re-sort: far bubbles drawn first (behind)
      const sorted = kept

      for (const n of sorted) {
        const isHovered = n === hoveredNode

        // Depth-based fade: farther bubbles are dimmer
        const eyeZ = cameraZ - CAM_OFFSET
        const distFromEye = n.wz - eyeZ
        const maxVisible = FL * 6
        const depthFade = Math.max(
          0.15,
          Math.min(1, 1 - distFromEye / maxVisible),
        )

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
            ctx.drawImage(
              n.blurCanvas,
              n.px - n.pr,
              n.py - n.pr,
              n.pr * 2,
              n.pr * 2,
            )
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
          ctx.arcTo(
            rx + artSize,
            ry + artSize,
            rx + artSize - cornerR,
            ry + artSize,
            cornerR,
          )
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
            n.px - n.pr * 0.3,
            n.py - n.pr * 0.3,
            n.pr * 0.1,
            n.px,
            n.py,
            n.pr,
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
          ctx.drawImage(
            n.blurCanvas,
            n.px - n.pr,
            n.py - n.pr,
            n.pr * 2,
            n.pr * 2,
          )
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

      // HUD — right-side helix depth indicator
      const hudTurns = 14
      const hudSteps = 160

      ctx.save()

      // Draw single helix strand
      ctx.beginPath()
      ctx.strokeStyle = catColor + "40"
      ctx.lineWidth = 1.5
      for (let s = 0; s <= hudSteps; s++) {
        const st = s / hudSteps
        const sy = hudTop + st * hudH
        const sx = hudX + Math.sin(st * hudTurns * Math.PI * 2) * hudHelixR
        if (s === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      }
      ctx.stroke()

      // Bubble position dots on the strand (all songs)
      for (const n of nodes) {
        const t = n.wz / HELIX_LENGTH
        const dotY = hudTop + t * hudH
        const dotX = hudX + Math.sin(t * hudTurns * Math.PI * 2) * hudHelixR
        ctx.beginPath()
        ctx.arc(dotX, dotY, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = catColor + "90"
        ctx.fill()
      }

      // Metric formatter
      const fmtMetric = (v: number): string => {
        if (depthAxis === "peak") {
          const rank = 201 - v
          return `#${Math.round(Math.max(1, rank))}`
        }
        if (v >= 1_000_000) return `${(v / 1e6).toFixed(1)}M`
        if (v >= 1_000) return `${(v / 1e3).toFixed(0)}K`
        return String(Math.round(v))
      }

      // Camera → metric: invert zScale (maxVal→0, minVal→HELIX_LENGTH)
      // Clamp to data range so triangle stays within HUD bounds
      const camZClamped = Math.max(0, Math.min(HELIX_LENGTH, cameraZ))
      const currentMetric =
        maxVal + (minVal - maxVal) * (camZClamped / HELIX_LENGTH)

      // HUD progress: 0 = at maxVal (top), 1 = at minVal (bottom)
      const camProgress = Math.max(
        0,
        Math.min(1, (maxVal - currentMetric) / (maxVal - minVal)),
      )

      const triY = hudTop + camProgress * hudH
      const triX = hudX - hudHelixR - 8

      // Triangle indicator
      ctx.beginPath()
      ctx.moveTo(triX, triY - 5)
      ctx.lineTo(triX + 7, triY)
      ctx.lineTo(triX, triY + 5)
      ctx.closePath()
      ctx.fillStyle = catColor
      ctx.fill()

      // Current metric value label next to triangle
      ctx.fillStyle = "#fff"
      ctx.font = "600 11px Inter, system-ui, sans-serif"
      ctx.textAlign = "right"
      ctx.textBaseline = "middle"
      ctx.fillText(fmtMetric(currentMetric), triX - 4, triY)

      // Top label = max metric value
      ctx.fillStyle = "#71717a"
      ctx.font = "500 10px Inter, system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText(fmtMetric(maxVal), hudX, hudTop - 6)

      // Bottom label = min metric value
      ctx.textBaseline = "top"
      ctx.fillText(fmtMetric(minVal), hudX, hudBot + 6)

      // Depth axis label
      const depthLabel =
        depthAxis === "streams"
          ? "Peak Streams"
          : depthAxis === "weeks"
            ? "Weeks on Chart"
            : "Peak Rank"
      ctx.fillStyle = "#52525b"
      ctx.font = "500 9px Inter, system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText(depthLabel, hudX, hudTop - 18)

      // Scroll hint
      if (cameraZ < 50) {
        ctx.fillStyle = "#3f3f46"
        ctx.textAlign = "center"
        ctx.textBaseline = "bottom"
        ctx.font = "500 12px Inter, system-ui, sans-serif"
        ctx.fillText("Scroll to explore", cw / 2, ch * 0.88)
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
        const labelCy = n.py + n.pr * 0.4
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
        const depthFade = Math.max(
          0.15,
          Math.min(1, 1 - distFromEyeL / maxVisibleL),
        )

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
        const labelY = n.pr * 0.4
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

        el.style.transform = `translate(${n.px}px, ${n.py + n.pr * 0.4}px) translate(-50%, 0)`
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
      targetCameraZ = Math.max(
        -200,
        Math.min(HELIX_LENGTH + 200, targetCameraZ + delta),
      )
    }

    // Helper: check if mouse is in HUD drag zone
    function isInHudZone(mx: number, my: number): boolean {
      return (
        mx >= hudX - hudHitW / 2 &&
        mx <= hudX + hudHitW / 2 &&
        my >= hudTop - 10 &&
        my <= hudBot + 10
      )
    }

    // Helper: convert HUD Y position to camera Z
    function hudYToCameraZ(my: number): number {
      const t = Math.max(0, Math.min(1, (my - hudTop) / hudH))
      return t * HELIX_LENGTH
    }

    // Drag to pan / HUD drag
    function handleMouseDown(e: MouseEvent) {
      if (e.button !== 0 && e.button !== 1) return
      const r = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top

      // Check HUD hit first
      if (e.button === 0 && isInHudZone(mx, my)) {
        isDraggingHud = true
        targetCameraZ = hudYToCameraZ(my)
        canvas.style.cursor = "ns-resize"
        e.preventDefault()
        return
      }

      isDragging = true
      dragStartX = e.clientX
      dragStartY = e.clientY
      dragStartPanX = targetPanX
      dragStartPanY = targetPanY
      if (e.button === 1) e.preventDefault()
    }

    function handleMouseMove(e: MouseEvent) {
      const r = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top

      // HUD dragging
      if (isDraggingHud) {
        targetCameraZ = hudYToCameraZ(my)
        canvas.style.cursor = "ns-resize"
        return
      }

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

      // Show resize cursor when hovering HUD
      if (isInHudZone(mx, my)) {
        canvas.style.cursor = "ns-resize"
        setHoveredSong(null)
        hoveredNode = null
        return
      }

      // Hit test (r, mx, my already declared above)
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
        const contR = containerRef.current!.getBoundingClientRect()
        const canvasR = canvas.getBoundingClientRect()
        setHoveredSong(hit)
        setTooltipPos({
          x: hit.px + canvasR.left - contR.left + 16,
          y: hit.py + canvasR.top - contR.top,
        })
      } else {
        setHoveredSong(null)
      }
    }

    function handleMouseUp(e: MouseEvent) {
      if (isDraggingHud) {
        isDraggingHud = false
        canvas.style.cursor = "grab"
        return
      }
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
        targetCameraZ = Math.max(
          -200,
          Math.min(HELIX_LENGTH + 200, touchStartCameraZ + dy * 1.5),
        )
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
      isDraggingHud = false
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
      className="relative flex min-h-0 flex-col overflow-visible"
      style={{ height: "calc(100dvh - 8rem)" }}
    >
      <BubbleLensSelector
        activeLens={activeLens}
        onLensChange={handleLensChange}
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
            className="absolute left-[18%] top-8 z-10 flex items-center gap-2 rounded-full border border-zinc-700 bg-surface/90 px-3 py-1.5 text-sm font-medium text-[#B3B3B3] backdrop-blur transition-colors hover:border-zinc-600 hover:text-white"
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

        {/* Category title (Level 2 only) — top center */}
        {activeCat && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 text-center">
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

      {/* Layer 2 song tooltip */}
      <BubbleTooltip song={hoveredSong} position={tooltipPos} />

      {/* Layer 1 category tooltip */}
      {hoveredCategory && (
        <div
          className="pointer-events-none absolute w-56 rounded-xl border border-zinc-800 bg-[#282828] p-3 shadow-lg transition-opacity duration-150"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, -100%) translateY(-12px)",
            zIndex: 99999,
          }}
        >
          <p className="text-sm font-semibold" style={{ color: hoveredCategory.color }}>
            {hoveredCategory.label}
          </p>
          <p className="mt-1 text-xs text-[#B3B3B3]">
            {CATEGORY_DESCRIPTIONS[activeLens]?.[hoveredCategory.key] ?? ""}
          </p>
          <p className="mt-1.5 text-xs text-zinc-500">
            {hoveredCategory.songs.length} songs &middot; Click to explore
          </p>
        </div>
      )}
      <BubbleDetailDrawer song={selectedSong} onClose={handleCloseDrawer} />
    </div>
  )
}
