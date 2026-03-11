# Data Visualization Principles & Standards

This is the canonical guide for all D3.js visualizations in ChartPulse.
Every chart component MUST follow these rules. No exceptions.

---

## Part 1: Philosophy — Why We Visualize

### Principle 1: Visualization = Insight That Changes Behavior

We do NOT show data. We show **insights that influence what the user does or thinks next.**

Bad: "This song peaked at #3."
Good: "This song outperformed 97% of songs in its genre — it's a statistical anomaly."

Before building any visualization, answer:
1. **What should the user understand after seeing this?** (the insight)
2. **What should they do or feel differently?** (the behavior change)
3. **What's the single most important takeaway?** (the headline)

If you can't answer these, you're decorating, not communicating.

### Principle 2: Context Over Isolated Data

A single data point is noise. **Context creates signal.**

| Isolated (useless)                  | Contextualized (useful)                                    |
|-------------------------------------|------------------------------------------------------------|
| "Peak rank: #3"                     | "Peaked at #3 — top 1.5% of all charting songs"           |
| "42 weeks on chart"                 | "42 weeks — 3x longer than the average hit that year"     |
| "Danceability: 0.82"               | "More danceable than 89% of songs in its era"             |
| "Streams: 12M"                      | "12M peak streams — declining 8% week-over-week"          |

**Implementation rule:** Every data point shown to the user must have at least one of:
- A **comparison** (vs. average, vs. peers, vs. historical)
- A **trend** (direction over time, trajectory)
- A **rank/percentile** (where it sits in a distribution)

Never render a number without context. A thermometer without a scale is meaningless.

### Principle 3: Progressive Disclosure Through Scrollytelling

Our charts use a "beats" system (scroll-triggered states). Each beat must:

1. **Add exactly one new insight** — never two things at once
2. **Build on the previous beat** — the story is cumulative
3. **Have a clear narrative purpose** — if removing the beat loses nothing, remove it

Beat progression pattern:
```
Beat 0: Structure only (axes, grid) — "here's the stage"
Beat 1: Primary data appears — "here's what happened"
Beat 2: Annotation/zoom — "here's what matters"
Beat 3: Context layer — "here's what it means"
```

### Principle 4: Respect Human Perception

Design for how humans actually process visual information:

- **Pre-attentive processing (<200ms):** A limited set of visual properties are detected without conscious effort. If a feature "pops out" regardless of the number of distractors, it's preattentive. Preattentive features include: color hue, color intensity, size, orientation, length, width, curvature, enclosure, line terminators, intersection, closure, flicker, and stereoscopic depth. Use these properties to encode the MOST IMPORTANT data dimension.
- **Effectiveness ranking (most → least accurate):** Position on common scale > Position on non-aligned scale > Length > Slope/Angle > Area > Volume > Color value > Color hue. **Always encode your primary quantitative variable using position.** Reserve color for nominal/categorical data.
- **Integral vs. separable dimensions:** Some visual properties are perceived holistically (width + height = area — integral), others independently (position + color — separable). Integral dimensions cause interference when encoding different variables. **Rule:** Encode independent data variables on separable dimensions (e.g., x-position + color), never on integral dimensions (e.g., width + height of the same element).
- **Cognitive load (Miller's Law):** 7 ± 2 items in working memory. Never show more than 5-7 data series simultaneously. Use "chunking" — group related data visually so users perceive clusters, not individual points. Experts chunk better than novices; design for novices.
- **Change blindness:** Any interruption in a scene causes viewers to miss significant changes. When transitioning between beats, animate the CHANGING element. Static elements should stay static — don't re-render things that haven't changed. Max 4-5 objects can be tracked simultaneously during animation (Cavanagh & Alvarez, 2005).
- **Selective attention:** Users filter information to focus on the most relevant signal. Design the primary insight to be the most visually salient element. De-emphasize everything else. If secondary data competes for attention, it's too prominent.
- **Gestalt principles:**
  - *Proximity:* Elements close together are perceived as related. Use whitespace to separate unrelated data groups.
  - *Similarity:* Elements that share color/shape/size are perceived as belonging to the same category.
  - *Connectedness:* Lines connecting elements create the strongest grouping — stronger than proximity, color, or shape.
  - *Enclosure:* A boundary around elements groups them even if they differ in other properties.

---

## Part 2: Technical Standards — D3.js Implementation

### 2.1 Responsive Sizing with viewBox

ALL charts MUST use `viewBox` for responsive scaling. Never use fixed width/height from container.

```typescript
// CORRECT: viewBox-based responsive chart
const WIDTH = 800;  // design width
const HEIGHT = 400; // design height

svg.attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
   .attr("preserveAspectRatio", "xMidYMid meet")
   .style("width", "100%")
   .style("height", "auto");
```

```typescript
// WRONG: Container-measured sizing (fragile, breaks on resize)
const width = container.clientWidth;
const height = 400;
svg.attr("width", width).attr("height", height);
```

Design at a canonical 800x400 viewport. The viewBox scales everything proportionally.

### 2.2 Margin Convention

Use consistent margins across ALL charts:

```typescript
// Standard margins for all ChartPulse visualizations
const MARGIN = { top: 28, right: 64, bottom: 56, left: 64 };
const W = WIDTH - MARGIN.left - MARGIN.right;   // inner width
const H = HEIGHT - MARGIN.top - MARGIN.bottom;   // inner height

const g = svg.append("g")
  .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
```

**Why these values:**
- `top: 28` — room for peak annotations above data
- `right: 64` — room for right-side axis labels (streams) and tier labels
- `bottom: 56` — room for x-axis labels + axis title without cropping
- `left: 64` — room for y-axis labels + axis title

**Adjust only when justified:**
- Radar/polar charts: center with `translate(W/2, H/2)`, no margins
- If right axis unused: `right: 40` is acceptable
- If rotated x-labels needed: `bottom: 80`

### 2.3 Typography Scale

Use exactly these font sizes. No other sizes.

| Role             | Size   | Weight | Color    | Usage                              |
|------------------|--------|--------|----------|------------------------------------|
| Axis tick labels | 12px   | 400    | #9CA3AF  | Numbers/dates on axes              |
| Axis titles      | 13px   | 500    | #71717a  | "Chart Rank", "Weekly Streams"     |
| Annotations      | 13px   | 600    | varies   | "Peak: #3", "Re-entry"            |
| Callouts         | 14px   | 600    | varies   | Feature highlights, key stats      |
| Chart title      | 16px   | 700    | white    | Only if chart needs standalone title |

**Rules:**
- NEVER use font-size below 12px. Period. 11px is unreadable on most screens.
- All text must have `fill` set explicitly — don't rely on SVG inheritance.
- Use `dy="0.35em"` for vertical centering of labels alongside elements.
- Tick labels: `text-anchor` must match axis position (start/middle/end).

### 2.4 Axis Configuration

```typescript
// Standard axis styling utility — use everywhere
function styleAxis(sel: d3.Selection<SVGGElement, unknown, null, undefined>) {
  sel.select(".domain").attr("stroke", "#3f3f46");
  sel.selectAll(".tick line").attr("stroke", "#3f3f46");
  sel.selectAll(".tick text").attr("fill", "#9CA3AF").attr("font-size", 12);
}

// X-axis: max 6 ticks, clean formatting
const xAxis = d3.axisBottom(x)
  .ticks(6)
  .tickSizeOuter(0)
  .tickPadding(8);

// Y-axis: explicit tick values when possible
const yAxis = d3.axisLeft(y)
  .tickValues([1, 10, 50, 100, 200])
  .tickSizeOuter(0)
  .tickPadding(8)
  .tickFormat(d => `#${d}`);
```

**Tick rules:**
- Max 6 ticks on x-axis, 5 on y-axis
- Always use `tickSizeOuter(0)` — the outer tick is visual noise
- Always use `tickPadding(8)` — D3's default of 3px is too tight
- Remove domain line when possible: `sel.select(".domain").remove()`
- Prefer clean round numbers: use `.nice()` on scales

### 2.5 Number Formatting

```typescript
// Standard formatter for large numbers
function fmtNum(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1_000)         return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

// Standard formatter for percentages
function fmtPct(v: number): string {
  return `${Math.round(v)}%`;
}

// Date axis formatter
d3.timeFormat("%b '%y")  // "Jan '21"
```

**Rules:**
- Never show raw large numbers (12345678 -> "12.3M")
- Percentages: always round to integers unless <1%
- Dates: abbreviated month + 2-digit year
- Always coerce Supabase values with `Number()` before scaling

### 2.6 Clipping

ALL charts with data elements MUST use clipPath to prevent overflow:

```typescript
svg.append("defs").append("clipPath").attr("id", "chart-clip")
  .append("rect").attr("width", W).attr("height", H);

const dataGroup = g.append("g")
  .attr("class", "data-group")
  .attr("clip-path", "url(#chart-clip)");
```

**Clip boundary:** `(0, 0, W, H)` — exactly the inner chart area. No extra padding.

**When NOT to clip:** Annotations and labels that intentionally extend beyond the chart area (e.g., peak label above the line). Place these in a separate unclipped group.

### 2.7 Label Collision Prevention

Labels overlap when the chart is too dense. Handle it:

**Strategy 1: Reduce density**
```typescript
// Show every Nth tick when there are too many
const tickInterval = Math.ceil(data.length / 6);
axis.tickValues(data.filter((_, i) => i % tickInterval === 0));
```

**Strategy 2: Rotate (last resort)**
```typescript
// Only when labels are long strings (e.g., song names)
sel.selectAll(".tick text")
  .attr("transform", "rotate(-35)")
  .attr("text-anchor", "end")
  .attr("dx", "-0.5em")
  .attr("dy", "0.2em");
```

**Strategy 3: Abbreviate**
```typescript
// Truncate long labels with ellipsis
function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "\u2026" : text;
}
```

**Strategy 4: Offset alternating labels**
```typescript
sel.selectAll(".tick text")
  .attr("dy", (_, i) => i % 2 === 0 ? "1em" : "2.5em");
```

Priority order: reduce density > abbreviate > offset > rotate. Rotation is the worst option.

### 2.8 Color System

```typescript
// Chart colors — consistent across all visualizations
const COLORS = {
  accent:    "#1DB954",  // Spotify green — primary data, current song
  secondary: "#F59E0B",  // Amber — secondary data layer (streams)
  negative:  "#EF4444",  // Red — off-chart, re-entries, warnings
  purple:    "#8B5CF6",  // Purple — genre/category highlights
  pink:      "#EC4899",  // Pink — special annotations

  axis:      "#3f3f46",  // Axis lines and domain
  tick:      "#9CA3AF",  // Tick label text
  muted:     "#71717a",  // Axis titles, secondary text
  grid:      "#27272a",  // Grid lines (dashed)
  bg:        "#181818",  // Chart background
};
```

**Rules:**
- Max 3 colors per chart. One primary, one secondary, one for annotation.
- Use opacity for layering (0.06 for area fills, 0.3-0.4 for bars, 1.0 for lines).
- Never use color alone to convey meaning — always pair with position, pattern, or label.

### 2.9 Animation & Transitions

```typescript
const DURATION = {
  fast:    300,   // opacity changes, small reveals
  medium:  500,   // element appearances, beat transitions
  slow:    800,   // axis zoom, major state changes
  draw:   1200,   // line drawing animation (stroke-dashoffset)
};
```

**Rules:**
- Use `d3.easeCubicOut` for enters, `d3.easeCubicInOut` for transforms.
- Stagger sequential reveals: `delay(i * 30)` per element, max 15 elements.
- Never animate more than one property simultaneously on the same element (except x+y for position).
- When zooming axes, transition axes FIRST, then transition data elements 100ms later.

### 2.10 Scale Safety

Always protect against bad data:

```typescript
// Coerce Supabase values (may arrive as strings from bigint/numeric columns)
const sorted = [...data].map(d => ({
  ...d,
  streams: d.streams != null ? Number(d.streams) : null,
  rank: Number(d.rank),
}));

// Safe max calculation (never use d3.max with || fallback on mixed types)
const values = sorted.map(d => d.streams).filter((s): s is number => s != null && s > 0);
const maxVal = values.length ? Math.max(...values) : 1;

// Clamp scales to prevent overflow
const yStreams = d3.scaleLinear()
  .domain([0, maxVal])
  .range([h, h * 0.5])
  .clamp(true);  // ALWAYS clamp
```

---

## Part 3: UX Principles for Data Visualization

### 3.1 Information Hierarchy (What the Eye Sees First)

Every chart has a visual hierarchy. Control it intentionally:

1. **Primary:** The main data story (rank line, primary bars) — full opacity, accent color
2. **Secondary:** Supporting context (stream bars, era average) — reduced opacity, muted color
3. **Tertiary:** Reference lines, grid, axes — lowest opacity, neutral color

**The 5-second test:** If a user glances at the chart for 5 seconds, they should understand the primary insight. If they need to read labels to get any meaning, the visual encoding has failed.

### 3.2 Annotation > Decoration

Every visual element must earn its place:

- **Grid lines:** Use sparingly (3-5 horizontal lines max). Dashed, very low opacity. Remove vertical grid lines unless comparing time points.
- **Legends:** Avoid if possible. Use direct labeling (place the label next to the data). If a legend is required, max 5 items.
- **Tooltips:** For exploration, not primary insight delivery. The chart should communicate without hover.
- **Reference lines:** Use for comparisons (average, threshold). Always label inline, never in a separate legend.

### 3.3 Accessibility Baseline

- **Contrast:** All text must meet WCAG AA (4.5:1 for body text, 3:1 for large text). #9CA3AF on #181818 = ~4.6:1. Acceptable.
- **Color independence:** Never rely on color alone. Pair with: shape, pattern, position, or label.
- **Motion:** Respect `prefers-reduced-motion`. Skip animations, show final state.
- **Screen readers:** Add `aria-label` to the SVG element describing the chart insight in plain text.

```typescript
svg.attr("role", "img")
   .attr("aria-label", `Chart showing ${trackName} peaked at #${peakRank} over ${weeks} weeks`);
```

### 3.4 Empty and Error States

Never show a broken chart. Handle every state:

| State         | What to show                                    |
|---------------|-------------------------------------------------|
| No data       | Gray placeholder with "Data unavailable" text   |
| Loading       | Skeleton animation matching chart dimensions     |
| Partial data  | Show what exists, annotate gaps ("No stream data for this period") |
| Single point  | Show the point with annotation, no line/trend    |
| All zeros     | "No chart activity recorded" instead of flat line at bottom |

### 3.5 Cognitive Load Budget

Each chart gets a budget. Spend it wisely:

| Element type        | Cost  | Max per chart |
|---------------------|-------|---------------|
| Data series (lines) | High  | 2-3           |
| Annotation labels   | Medium| 3-5           |
| Axis tick labels    | Low   | 5-6 per axis  |
| Grid lines          | Low   | 3-5           |
| Color categories    | Medium| 3-4           |

**Total budget:** ~20 distinct visual elements per chart view.
If you're exceeding this, split into multiple beats or simplify.

---

## Part 5: Data Encoding Theory

*Based on Mackinlay's expressiveness/effectiveness framework and Munzner's data typology.*

### 5.1 Data Type Classification

Before encoding ANY variable, classify it:

| Type         | Test                                    | Examples in ChartPulse                           |
|--------------|-----------------------------------------|--------------------------------------------------|
| **Nominal**  | Can you tell the difference? (= / ≠)   | Genre, artist name, song title, classification   |
| **Ordinal**  | Is there an order? (< / > / ≤ / ≥)     | Chart tier (top 10/40/100), rating, era label    |
| **Quantitative (Interval)** | Can you measure the difference? (+ / −)  | Calendar date, chart week number     |
| **Quantitative (Ratio)**    | Is there a true zero? (× / ÷)           | Streams, weeks on chart, peak rank, danceability |

**Why this matters:** The data type determines which visual encodings are *expressive* (valid) and *effective* (perceptually optimal).

### 5.2 Expressiveness Principle

A visualization is **expressive** if it communicates ALL the facts in the data, and ONLY the facts in the data.

Violations:
- Using ordered color (light→dark) for nominal data → implies a ranking that doesn't exist
- Using unordered color hues for quantitative data → can't determine "which is greater"
- Truncating an axis without indication → implies a zero baseline that doesn't exist

**Rule:** Match the visual encoding's perceptual properties to the data type. Ordered encodings (position, length, value) for ordered data. Categorical encodings (hue, shape) for categorical data.

### 5.3 Effectiveness Principle

A visualization is **effective** when the information is more readily perceived than in any alternative encoding.

**Encoding selection for ChartPulse data:**

| Data variable       | Type   | Best encoding           | Avoid                     |
|---------------------|--------|-------------------------|---------------------------|
| Chart rank          | Ratio  | Y-position              | Color value, area         |
| Weeks on chart      | Ratio  | X-position (time axis)  | Pie slice, area           |
| Streams             | Ratio  | Bar height / Y-position | Bubble area, color value  |
| Genre               | Nominal| Color hue               | Position, length          |
| Audio features (0-1)| Ratio  | Radial position / bar   | Color alone               |
| Peak tier           | Ordinal| Ordered color value     | Unordered hue             |
| Song comparison     | Nominal| Separate lines / small multiples | Overlapping areas |

### 5.4 Log Scales

Use logarithmic scales when data spans multiple orders of magnitude (e.g., streams from 1K to 100M). A linear scale compresses low values into invisibility.

```typescript
// When to use log scale
const range = maxVal / minVal;
if (range > 100) {
  // Consider log scale
  const y = d3.scaleLog().domain([minVal, maxVal]).range([H, 0]).clamp(true);
}
```

**Rules:**
- Always label log scales clearly — users assume linear by default
- Never use log scales for data that includes zero (log(0) is undefined)
- Use for: stream counts, play counts, cross-era comparisons
- Avoid for: ranks (already bounded 1-200), percentages, audio features (0-1)

---

## Part 6: Graphical Integrity

*Based on Tufte's principles of graphical excellence and integrity.*

### 6.1 Data-Ink Ratio

Maximize the share of ink devoted to data. Erase non-data ink. Erase redundant data ink. Then revise.

```
data-ink ratio = ink used to show data / total ink
```

**In practice for ChartPulse:**
- Remove decorative gridlines that don't aid reading
- Remove axis domain lines when ticks are sufficient
- Remove redundant legends when direct labels exist
- Remove chart borders/boxes that add no information
- Never add 3D effects, gradients for decoration, or drop shadows on data elements

### 6.2 Lie Factor

```
lie factor = size of effect in graphic / size of effect in data
```

A truthful graphic has a lie factor between 0.95 and 1.05 (within 5% error). Common violations:

| Distortion                          | How it lies                                       |
|-------------------------------------|---------------------------------------------------|
| Area/bubble encoding for 1D data    | Area grows as square of radius — exaggerates       |
| Truncated Y-axis without indication | Small differences appear enormous                  |
| 3D perspective on bars              | Foreshortening distorts perceived height            |
| Non-uniform axis intervals          | Implies equal spacing where gaps differ             |
| Dual Y-axes with mismatched scales  | Creates false correlations between unrelated series |

**Rules for ChartPulse:**
- Chart rank axis: ALWAYS start at 1 (or the actual minimum), never truncate
- Stream bars: ALWAYS start at zero — bar charts must have a zero baseline
- When using dual axes (rank + streams): clearly label both, use different visual forms (line vs. bar), acknowledge the scales are independent
- Never use area/bubble size as the primary encoding for a single quantitative variable
- Adjust for temporal context: when comparing streams across eras, note that streaming volumes have grown exponentially over time

### 6.3 Graphical Excellence (Tufte's Criteria)

A well-designed chart achieves:
- The **greatest number of ideas**
- In the **shortest time**
- With the **least ink**
- In the **smallest space**

**Self-assessment for every chart:** Does this chart show the data clearly? Does it induce the viewer to think about the *substance* rather than the methodology or design? Is it closely integrated with the narrative text around it?

---

## Part 7: Chart Type Selection

*Choose the right chart form based on the analytical task.*

### 7.1 Task → Chart Type Mapping

| Analytical task       | Chart type                  | ChartPulse usage                              |
|-----------------------|-----------------------------|-----------------------------------------------|
| **Nominal comparison**| Horizontal bar              | Comparing songs by peak rank, weeks on chart  |
| **Time series**       | Line chart                  | Rank trajectory over weeks (primary chart)     |
| **Ranking**           | Ordered bar / bump chart    | Song rankings within a genre or era            |
| **Part-to-whole**     | Stacked bar / treemap       | Genre share of chart over time                 |
| **Deviation**         | Diverging bar / bullet      | Variance vs. average (performance comparison)  |
| **Distribution**      | Histogram / box plot        | Distribution of weeks on chart, audio features |
| **Correlation**       | Scatter plot                | Danceability vs. streams, tempo vs. chart life |
| **Multivariate**      | Small multiples / parallel coords / heatmap | Audio feature profiles, multi-song comparison |
| **Hierarchical**      | Treemap / sunburst          | Genre → subgenre → songs breakdown             |
| **Network/flow**      | Sankey / arc diagram        | Artist collaborations, genre crossover          |

### 7.2 Pie Chart Policy

**Do not use pie charts.** They encode quantity as angle and area — both low-accuracy channels. Humans are poor at comparing arc lengths and angles.

Exceptions (rare): When comparing a single category to the whole AND the value is near 25% or 50% (perceptually easy fractions). Even then, prefer a stacked bar.

### 7.3 Small Multiples

When comparing the same measure across categories (e.g., rank trajectory for multiple songs), use small multiples rather than overlapping lines on one chart.

**Rules:**
- Same scales across all panels — the whole point is direct comparison
- Max 9 panels (3×3 grid) before cognitive overload
- Label each panel clearly with the category name
- Shared axis labels — don't repeat on every panel

### 7.4 Multivariate Display

When showing 3+ quantitative variables simultaneously:

| Technique             | Best for                          | Max variables | Watch out for            |
|-----------------------|-----------------------------------|---------------|--------------------------|
| **Small multiples**   | Same measure, different groups    | 1 per panel   | Space consumption        |
| **Layering**          | Related measures on shared axis   | 2-3           | Occlusion, false correlation |
| **Heatmap**           | Dense matrix of values            | Many          | Requires color legend     |
| **Parallel coordinates** | Finding patterns across dimensions | 5-10       | Line crossings, clutter  |
| **Radar/polar**       | Comparing profiles (audio features)| 5-8          | Area distortion           |

**Avoid:** Chernoff faces, star glyphs — empirically shown to produce slow, inaccurate answers with low confidence (Lee, Reilly, Butavicius, 2003).

---

## Part 8: Interaction Design

*Based on Shneiderman's information-seeking mantra and Munzner's action-target taxonomy.*

### 8.1 The Visual Information-Seeking Mantra

> "Overview first, zoom and filter, then details-on-demand." — Shneiderman, 1996

Every interactive visualization should support this flow:

1. **Overview:** Show the full dataset / time range at a glance (Beat 0-1 in our scrollytelling)
2. **Zoom & Filter:** Let users focus on regions of interest (beat transitions, axis zoom)
3. **Details-on-demand:** Reveal specifics when requested (tooltips, annotations, click-to-expand)

Plus: **relate** (see relationships), **history** (track actions/insights), **extract** (capture data).

### 8.2 Actions & Targets Framework

When designing interactions, map user goals to action types:

**Actions:**
| Action    | Description                         | ChartPulse example                                |
|-----------|-------------------------------------|---------------------------------------------------|
| Lookup    | Known target, known location        | "Show me week 12 rank"                            |
| Browse    | Unknown target, known location      | Scrolling through the timeline                     |
| Locate    | Known target, unknown location      | "Find the re-entry point"                          |
| Explore   | Unknown target, unknown location    | "What's interesting about this song's trajectory?" |

**Targets:**
| Target      | What users look for              | ChartPulse example                          |
|-------------|----------------------------------|---------------------------------------------|
| Trends      | Direction over time              | "Is this song rising or falling?"           |
| Outliers    | Exceptional values               | "This week's stream spike"                  |
| Features    | Structural patterns              | "The plateau period", "the re-entry"        |
| Correlation | Relationship between variables   | "Do streams predict rank recovery?"         |
| Distribution| Spread of values                 | "How do most songs in this genre perform?"  |
| Extremes    | Min/max values                   | "Peak rank", "lowest point"                 |

### 8.3 Interaction Techniques

| Technique               | Purpose                            | Implementation                              |
|--------------------------|------------------------------------|--------------------------------------------|
| **Brushing & linking**   | Highlight related data across views| Hover on one chart highlights same data point in another |
| **Dynamic filtering**    | Reduce data to focus area          | Genre filter, era filter, rank tier filter  |
| **Semantic zoom**        | Show more detail at closer zoom    | Axis zoom reveals weekly annotations        |
| **Focus + context**      | Detail in one area, overview elsewhere | Magnified section with minimap           |
| **Direct manipulation**  | Grab and adjust parameters         | Draggable time range selector               |

**Rules:**
- Every interaction must be discoverable — no hidden gestures
- Hover states provide preview; click provides commitment
- Always provide a way to reset / return to overview
- Transitions between states must be animated to maintain spatial context (see 8.4)

### 8.4 Maintaining Context During Transitions

Animation exists to help users maintain a sense of context between states. It is NOT decoration.

When a chart changes state (beat transition, filter applied, axis zoom):
- Animate ONLY the elements that change
- Keep stable elements in place — they serve as reference anchors
- Users can track max 4-5 moving objects simultaneously
- If more elements change, stagger the animation or move groups together

---

## Part 9: Storytelling with Data

*Based on narrative visualization theory and Segel & Heer's storytelling framework.*

### 9.1 Three Pillars of Data Storytelling

Every data story in ChartPulse uses three complementary strategies:

**1. Guiding Users**
- **Selection of data + views:** Choose what to show and what to omit. Not all data is story.
- **Layout & composition:** Arrange elements to create a reading flow (top→bottom, left→right).
- **Sequence & flow:** Order the reveals to build understanding cumulatively.
- **Highlighting:** Draw the eye to the key insight with color, size, or annotation.
- **Sequential reveal:** Our scrollytelling beats — each one adds exactly one layer.

**2. Providing Context**
- **Headlines & captions:** Every chart MUST have a headline that states the insight, not just the topic. "Shape of You dominated for 33 weeks" not "Chart Performance Over Time".
- **Annotations:** Mark the moments that matter — peak week, re-entry, viral spike. Label with WHY it matters, not just WHAT happened.
- **Comparative measures:** Reference lines for averages, era benchmarks, genre peers.
- **Related events:** Real-world context ("Album release", "TikTok viral", "Grammy nomination").

**3. Creating Understanding**
- **Direct labeling over legends:** Place the label next to the data. If users have to look back and forth between legend and chart, you've failed.
- **Explanatory text:** Brief prose between charts that connects insights. The chart shows, the text explains.
- **Contextual framing:** Three types of context (from HCDE 511):
  - *Quantitative context:* How does this value compare to the distribution?
  - *Historical context:* How does this compare to what happened before?
  - *Relational context:* How does this relate to other variables or entities?

### 9.2 Author-Driven vs. Reader-Driven Balance

Our scrollytelling approach is a hybrid:

```
Author-driven (guided)              Reader-driven (exploratory)
├── Scrollytelling beats            ├── Hover tooltips
├── Narrative text                  ├── Filter controls
├── Pre-selected annotations        ├── Song search / comparison
└── Curated story arc              └── Explore pages
```

**Song story pages** = primarily author-driven (curated narrative with beats).
**Explore pages** = primarily reader-driven (user chooses what to investigate).

The balance: be opinionated enough to tell a clear story, but provide enough interaction for users who want to go deeper.

### 9.3 Animation Principles for Data

Adapted from the 12 principles of animation (Disney) for information visualization:

| Principle           | Data viz application                                              |
|---------------------|-------------------------------------------------------------------|
| **Staging**         | Direct attention to the most important change. De-emphasize everything else. |
| **Anticipation**    | Brief pause or subtle cue before a major transition. Prepares the viewer. |
| **Follow-through**  | Elements settle into final position with slight overshoot. Feels natural. |
| **Slow in/out**     | Ease transitions — fast in the middle, slow at start/end. Use `easeCubicInOut`. |
| **Timing**          | Duration conveys importance. Major state changes = longer (800ms). Minor = shorter (300ms). |
| **Secondary action**| Supporting elements react to the primary animation (e.g., labels fade in after line draws). |
| **One at a time**   | Never animate multiple independent changes simultaneously. Stage them. |

**Key research finding:** Animation can be less accurate and slower than static comparison for analytical tasks, BUT it is more engaging and memorable (Robertson et al., 2008). Use animation for storytelling beats (engagement matters), use static small multiples for analytical comparison (accuracy matters).

### 9.4 Presentation vs. Exploration

| Aspect          | Presentation (story pages)      | Exploration (explore pages)       |
|-----------------|----------------------------------|-----------------------------------|
| **Goal**        | Communicate specific insight     | Enable open-ended discovery       |
| **Control**     | Author controls sequence         | User controls what they see       |
| **Annotations** | Pre-placed, curated              | Dynamic, context-sensitive        |
| **Animation**   | Sequenced reveals per beat       | Responsive to user interaction    |
| **Data scope**  | Focused subset                   | Full dataset available            |
| **Text**        | Narrative prose                  | Labels and tooltips only          |

**Rule:** Never mix presentation and exploration in the same view. A scrollytelling beat should not also have open-ended filter controls. Finish the story, THEN offer exploration.

---

## Part 10: Evaluation & Critique Framework

*Based on Tufte's critique methodology and the HCDE 511 evaluation checklist.*

Before shipping any visualization, evaluate it against these questions:

### Does it work?
1. Is the primary insight immediately understandable (5-second test)?
2. Does it reveal trends, patterns, gaps, or outliers that weren't obvious from raw data?
3. Does it provide insight better than an alternative visualization would?
4. Does it enable the comparisons and evaluations users need?

### Is it honest?
5. Does it distort the data? Is any transformation misleading or helpfully simplifying?
6. Does it omit important information?
7. Are visual encodings appropriate for the data types (nominal → hue, quantitative → position)?
8. Does it use area/volume encoding that exaggerates differences?

### Is it clear?
9. Does it highlight important information while providing context?
10. Is it memorable? Will the user recall the key insight?
11. Are labels and annotations used appropriately (direct labeling over legends)?
12. Can it stand alone without external explanation?

---

## Part 11: Checklist

Before merging any chart component, verify:

### Layout
- [ ] Uses `viewBox` (not fixed width/height from container)
- [ ] Uses standard margins `{ top: 28, right: 64, bottom: 56, left: 64 }`
- [ ] clipPath applied to data group
- [ ] No elements cropped at chart boundaries
- [ ] Chart renders correctly at 320px and 1440px widths

### Typography
- [ ] No font-size below 12px
- [ ] Tick labels: 12px, annotations: 13px, callouts: 14px
- [ ] All text has explicit `fill` color
- [ ] No labels overlapping at any viewport size
- [ ] Long labels truncated or abbreviated

### Data Integrity
- [ ] All numeric values coerced with `Number()`
- [ ] Scales use `.clamp(true)`
- [ ] Max/min computed with `Math.max/min`, not `d3.max` with `||` fallback
- [ ] Empty/null data handled gracefully

### Encoding Correctness (Part 5)
- [ ] Each data variable classified by type (nominal/ordinal/quantitative)
- [ ] Visual encoding matches data type (expressiveness check)
- [ ] Primary quantitative variable uses position (most effective channel)
- [ ] Nominal variables use hue, not ordered encodings
- [ ] No integral-dimension conflicts (independent variables on separable channels)
- [ ] Bar charts have a zero baseline (no truncated bar axes)

### Graphical Integrity (Part 6)
- [ ] Lie factor between 0.95 and 1.05 — no exaggerated visual effects
- [ ] No unnecessary non-data ink (decorative gridlines, borders, 3D effects)
- [ ] Dual axes (if used) are clearly labeled with independent visual forms
- [ ] Temporal comparisons acknowledge era differences (streaming growth, etc.)

### Insight & Storytelling (Parts 1, 9)
- [ ] Every data point has context (comparison, trend, or percentile)
- [ ] Primary insight visible within 5 seconds without reading labels
- [ ] Each scrollytelling beat adds exactly one new insight
- [ ] Annotation labels explain WHY, not just WHAT
- [ ] Chart headline states the insight, not just the topic
- [ ] Direct labeling used instead of legends where possible
- [ ] Context provided: quantitative, historical, or relational

### Interaction (Part 8)
- [ ] Supports overview → zoom → details-on-demand flow
- [ ] All interactions are discoverable (no hidden gestures)
- [ ] State transitions are animated to preserve spatial context
- [ ] Reset / return to overview is always available

### Accessibility
- [ ] SVG has `role="img"` and `aria-label`
- [ ] Color is never the sole indicator of meaning
- [ ] Text meets WCAG AA contrast ratios
- [ ] Animations respect `prefers-reduced-motion`
