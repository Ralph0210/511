# ChartPulse Coding Guidelines

The cardinal rule: **No shortcuts. No patches. Think, plan, implement quality.**

When something breaks, don't duct-tape it. Understand WHY it broke, then fix the
root cause. A 30-minute quality fix saves hours of debugging later.

---

## 1. Core Principles

### Think Before You Code

Every change follows this sequence. No exceptions.

1. **Read** — Understand the existing code. Read the file. Read the imports.
   Understand what's there before touching anything.
2. **Plan** — Identify the root cause or the right approach. Consider edge cases.
   For non-trivial changes, outline the plan before writing code.
3. **Implement** — Write the solution. Follow the design system. Follow these
   guidelines.
4. **Verify** — Check types (`tsc --noEmit`), check the browser console, check
   the visual result. If you can't verify it, don't ship it.

### No Quick Patches

| Quick Patch (DON'T)                           | Quality Fix (DO)                                    |
|-----------------------------------------------|-----------------------------------------------------|
| Adding `!important` to fix a style conflict   | Finding the specificity issue and restructuring      |
| Wrapping in try/catch and swallowing the error| Understanding why the error occurs and handling it   |
| Adding `as any` to silence TypeScript         | Fixing the type properly, adding a correct assertion |
| Duplicating code to "just make it work"       | Extracting a shared utility or component             |
| Using `setTimeout` to fix a timing issue      | Understanding the lifecycle and using proper hooks   |
| Using `eslint-disable` without explanation    | Fixing the lint error or adding a justifying comment |

### Separation of Concerns

```
src/
  app/           → Routes and pages (data fetching, layout composition)
  components/    → Reusable UI components (presentation, interaction)
  lib/           → Business logic, data transforms, API clients
  data/          → Static data, constants, type definitions
  stories/       → Storybook stories (visual testing, documentation)
```

**Rules:**
- Pages fetch data and compose components. They don't contain business logic.
- Components receive props and render UI. They don't fetch data directly.
- Lib functions are pure where possible. They transform data, not DOM.
- Never put D3 rendering logic outside of component files.
- Never put Supabase queries inside component files.

---

## 2. TypeScript Standards

### Strict Mode Is Non-Negotiable

The project uses `strict: true`. Respect it.

```typescript
// NEVER do this
const value = data as any;
// @ts-ignore
someFunction(untypedThing);

// DO this
const value: TrajectoryRow = data;
const value = data as TrajectoryRow; // only with runtime guarantee
```

### Type Definitions

- Export types from the file where they're most relevant (e.g., `SongPageData`
  from `page.tsx`, `ChartRunInfo` from `narrative-generator.ts`).
- Prefer `type` over `interface` for data shapes. Use `interface` only when
  extending or implementing.
- Never use `any`. Use `unknown` if the type is truly unknown, then narrow.

### Null Handling

```typescript
// NEVER assume Supabase data is the right type
const streams = row.streams as number;  // WRONG: might be string or null

// ALWAYS coerce and guard
const streams = row.streams != null ? Number(row.streams) : null;
```

### Naming Conventions

```
Components:     PascalCase          ChartRiseScrolly, SongStoryClient
Types/Interfaces: PascalCase        SongPageData, TrajectoryRow
Functions:      camelCase           fetchSongDataByTrackId, classifyGenre
Constants:      UPPER_SNAKE_CASE    GAP_THRESHOLD_MS, OFF_CHART_RANK
Files:          PascalCase for components, kebab-case for utilities
                ChartRiseScrolly.tsx, narrative-generator.ts
CSS classes:    Tailwind utilities   (no custom CSS classes unless unavoidable)
```

---

## 3. React & Next.js Patterns

### Server vs Client Components

```
Server Components (default in app router):
  - Data fetching (Supabase queries)
  - Page layout and composition
  - Static content rendering
  - NO useState, useEffect, useRef, event handlers

Client Components ("use client"):
  - Interactive UI (scroll, click, hover)
  - D3.js visualizations (need DOM refs)
  - Form inputs and controlled state
  - Browser APIs (window, IntersectionObserver)
```

**Rule:** Keep the client boundary as low as possible. A page should be a server
component that passes data to client components.

### Component Structure

Every component file follows this order:

```typescript
"use client"; // only if needed

// 1. Imports (external → internal → types)
import { useState, useRef } from "react";
import * as d3 from "d3";
import type { SongPageData } from "./page";

// 2. Types (component-specific)
type Props = { /* ... */ };

// 3. Constants
const ANIMATION_DURATION = 500;

// 4. Helper functions (pure, no hooks)
function formatStreams(value: number): string { /* ... */ }

// 5. Component
export default function ChartRiseScrolly({ data, beat }: Props) {
  // hooks first
  // derived state
  // effects
  // handlers
  // render
}
```

### Key Prop for Route-Based Remounting

When the same component renders for different dynamic routes (e.g., `/song/[slug]`),
add a `key` prop to force React to remount on navigation:

```tsx
<SongStoryClient key={songData.trackId} {...props} />
```

### Loading States

Use Next.js `loading.tsx` for route-level loading states. This handles:
- Skeleton UI during server fetch
- Scroll-to-top on navigation
- Suspense boundary management

---

## 4. D3.js Visualization Standards

### Follow the Data Visualization Guide

All D3 code MUST follow `.claude/rules/data-visualization.md`. Key reminders:

- Use `viewBox` for responsive sizing
- Use standard margins `{ top: 28, right: 64, bottom: 56, left: 64 }`
- Minimum font size: 12px
- Always `.clamp(true)` on scales
- Always coerce Supabase values with `Number()`
- Always apply clipPath to data groups

### D3 + React Integration

```typescript
// Pattern: useRef for SVG, useEffect for D3 rendering
const svgRef = useRef<SVGSVGElement>(null);

// Track draw state to avoid unnecessary re-renders
const drawnRef = useRef(false);
const prevDataRef = useRef<DataPoint[] | null>(null);

useEffect(() => {
  if (!svgRef.current || !data.length) return;

  // Detect data changes INSIDE the effect (not in a separate effect)
  if (prevDataRef.current !== data) {
    prevDataRef.current = data;
    drawnRef.current = false;
  }

  // First draw vs update
  if (!drawnRef.current) {
    drawnRef.current = true;
    // Full SVG setup...
  }

  // Update visibility/transitions...
}, [data, beat, /* other deps */]);
```

**Rules:**
- Never use multiple `useEffect` hooks that depend on each other for the same
  chart. Effect ordering is fragile — combine into a single effect with internal
  state tracking.
- Never read `container.clientWidth` for sizing — use viewBox.
- Use `d3.select(svgRef.current)`, never `d3.select("#some-id")`.

---

## 5. Storybook Standards

### Every Component Gets a Story

Components in `src/components/` MUST have a corresponding story. Stories serve as:
- Visual regression tests
- Living documentation
- Development sandbox (isolate from data fetching)

### Story File Convention

Stories live as siblings to the component:

```
src/components/
  ChartRiseScrolly.tsx
  ChartRiseScrolly.stories.tsx    ← co-located
```

Or in the stories directory for page-level compositions:

```
src/stories/
  SongHero.stories.tsx
```

### Story Template

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartRiseScrolly from "@/components/ChartRiseScrolly";

const meta = {
  title: "Charts/ChartRiseScrolly",
  component: ChartRiseScrolly,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-4xl bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChartRiseScrolly>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {
  args: {
    data: MOCK_TRAJECTORY,
    peakRank: 3,
    beat: -1,
  },
};

// Each beat gets a story
export const Beat0_AxesOnly: Story = { args: { ...Default.args, beat: 0 } };
export const Beat1_LineAppears: Story = { args: { ...Default.args, beat: 1 } };
export const Beat2_PeakZoom: Story = { args: { ...Default.args, beat: 2 } };
export const Beat3_StreamBars: Story = { args: { ...Default.args, beat: 3 } };

// Edge cases
export const SingleDataPoint: Story = {
  args: { data: [MOCK_TRAJECTORY[0]], peakRank: 1, beat: 1 },
};
export const NoStreams: Story = {
  args: { data: MOCK_TRAJECTORY.map(d => ({ ...d, streams: null })), peakRank: 3, beat: 3 },
};
```

### Story Organization

```
Storybook sidebar structure:
  Charts/
    ChartRiseScrolly
    ChartSoundScrolly
    ChartMomentScrolly
    ChartStayingPowerScrolly
  Components/
    SongSearch
    SpotifyEmbed
    StatCard
    SongCard
  Pages/
    SongDeepDive
    HomePage
    ExploreLongevity
```

### Mock Data

Create reusable mock data in `src/stories/mocks/`:

```
src/stories/mocks/
  trajectory.ts     → mock trajectory data for ChartRise
  audio-features.ts → mock song features for ChartSound
  peer-songs.ts     → mock peer data for ChartMoment
  genre-shares.ts   → mock genre data
```

---

## 6. Debugging

### Frontend: Browser Console First

When something renders wrong:

1. **Open browser DevTools** (Console + Elements tabs)
2. **Check console for errors** — React errors, D3 NaN warnings, failed fetches
3. **Inspect the element** — Is it in the DOM? What are its computed styles?
4. **For SVG/D3 issues:** Inspect SVG elements directly. Check `transform`,
   `opacity`, `d` attributes. Look for `NaN` in attribute values.
5. **For data issues:** Add temporary `console.log` at the data boundary
   (where server component passes props to client component).

### Common D3 Debugging

```
Symptom: Element not visible
Check:   opacity attribute, display, clip-path bounds, transform position

Symptom: Element in wrong position
Check:   Scale domain/range, NaN in x/y attributes, margin offset

Symptom: Bars too tall / overflowing
Check:   Scale domain max, data type (string vs number), clamp setting

Symptom: Labels cropped
Check:   Margin values, clipPath bounds, text-anchor alignment

Symptom: Chart doesn't update on prop change
Check:   useEffect dependencies, drawnRef reset logic, key prop
```

### Type Checking

Run TypeScript compiler to catch errors early:

```bash
cd web && npx tsc --noEmit
```

### Linting

```bash
cd web && npm run lint
```

---

## 7. Git & Code Review

### Commit Messages

```
feat: add stream bars to ChartRiseScrolly
fix: coerce stream values to prevent scale overflow
refactor: extract axis styling utility
style: align chart margins to design system
docs: add Storybook stories for ChartMoment
```

Format: `type: lowercase imperative description`

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`

### What Belongs in a Single Commit

One logical change. If your commit message needs "and", it's two commits.

```
GOOD: "fix: coerce stream values to prevent scale overflow"
BAD:  "fix: coerce stream values and add right Y-axis and remove gap bands"
```

### Pre-Commit Checks

Before committing, verify:
1. `npx tsc --noEmit` — no type errors
2. `npm run lint` — no lint errors
3. Visual check in browser — does it look right?
4. Storybook check — do stories still render?

---

## 8. Performance

### React

- Memoize expensive computations with `useMemo` (e.g., data transforms, run
  detection).
- Use `useCallback` for event handlers passed as props.
- Never create objects/arrays in render that aren't memoized — they cause
  unnecessary re-renders in children.

### D3

- Keep SVG DOM nodes under 2,000 for smooth interaction.
- Use `requestAnimationFrame` for continuous animations.
- Batch attribute updates — don't call `.attr()` in a loop when `.selectAll()`
  works.
- Cache scale computations in refs, don't recreate on every render.

### Next.js

- Use `force-dynamic` only on pages that truly need fresh data every request.
- Images from external sources (album art) should use `<img>` with explicit
  width/height to prevent layout shift.
- Minimize client component boundaries — every "use client" is a serialization
  boundary.

---

## 9. Claude Code Workflow

### How to Work With Claude Code Effectively

**Explore before acting.** Before making changes, always read the relevant files.
"Read first, code second" prevents 70% of mistakes.

**One concern per prompt.** Don't ask for 5 things at once. Break complex tasks
into atomic steps:

```
BAD:  "Fix the chart, add a legend, update the colors, and write tests"
GOOD: "Fix the stream bar overflow in ChartRiseScrolly"
      (then separately) "Add a legend below the chart"
      (then separately) "Write Storybook stories for the component"
```

**Provide verification criteria.** Tell Claude what "done" looks like:

```
"After fixing this, the bars should never exceed 50% of chart height,
and the right Y-axis should show values in M/K format."
```

**Use Plan mode for architecture.** For new features or refactors, start with
`/plan` to design the approach before writing code.

### Rules for Claude Code in This Project

1. **Always follow the design system** (`.claude/rules/design-system.md`).
   Don't invent new colors, spacings, or font sizes.

2. **Always follow the data visualization guide**
   (`.claude/rules/data-visualization.md`). Don't create charts that violate
   the standards.

3. **Read before editing.** Never modify a file you haven't read in this
   session. Use the Read tool first.

4. **Verify after changing.** Run `tsc --noEmit` after code changes. Check
   for lint errors. If modifying a visual component, describe what the user
   should see.

5. **Don't over-engineer.** Make the minimal change that correctly solves the
   problem. Don't refactor surrounding code unless asked.

6. **Don't add comments to code you didn't write.** Don't add docstrings,
   type annotations, or comments to unchanged code.

7. **When fixing a bug, explain the root cause.** Don't just describe WHAT
   you changed — explain WHY the bug occurred and why this fix is correct.

8. **Prefer editing over creating.** Don't create new files when existing
   files can be extended. Don't create new utilities for one-time operations.

9. **Never silence errors.** No empty catch blocks, no `eslint-disable` without
   justification, no `@ts-ignore`.

10. **Test your assumptions.** If you think Supabase returns a number, verify it.
    If you think a scale range is correct, trace the math. "I think" is not
    verification.
