# ChartPulse Design System

Canonical design tokens and visual standards for all ChartPulse UI.
Aligned with Spotify's design language. Every component MUST use these tokens.

---

## 1. Color System

### Core Palette

```
Background hierarchy (darkest → lightest):
  --background:     #121212    body background, page canvas
  --surface:        #181818    cards, chart containers, panels
  --surface-hover:  #282828    hover states, raised surfaces, dropdowns
  --surface-active: #333333    pressed states, active selections

Foreground hierarchy (brightest → dimmest):
  --text-primary:   #FFFFFF    headings, primary text
  --text-secondary: #B3B3B3    body text, descriptions (Spotify's subdued)
  --text-tertiary:  #71717A    captions, timestamps, axis titles (zinc-500)
  --text-disabled:  #52525B    disabled text, placeholder (zinc-600)

Borders:
  --border-default: #27272A    subtle dividers, card borders (zinc-800)
  --border-hover:   #3F3F46    hover borders, focus rings (zinc-700)
  --border-active:  #52525B    active/selected borders (zinc-600)
```

### Accent Colors

```
Primary accent (Spotify green):
  --accent:         #1DB954    primary actions, current song, positive data
  --accent-hover:   #1ED760    hover on accent elements (Spotify's official green)
  --accent-muted:   #1DB95420  subtle backgrounds, badges (12% opacity)
  --accent-border:  #1DB95440  accent borders (25% opacity)

Semantic accents:
  --amber:          #F59E0B    secondary data (streams), warnings
  --amber-muted:    #F59E0B20  amber backgrounds
  --red:            #EF4444    off-chart, re-entries, errors, destructive
  --red-muted:      #EF444420  red backgrounds
  --purple:         #8B5CF6    genre highlights, categories
  --pink:           #EC4899    special annotations, chart-topper classification
  --blue:           #3B82F6    slow-burn classification, informational
```

### Genre Colors (fixed mapping)

```
Pop:           #EC4899  (pink)
Hip-Hop/Rap:   #8B5CF6  (purple)
Rock:          #EF4444  (red)
R&B/Soul:      #F59E0B  (amber)
Latin:         #F97316  (orange)
Electronic:    #06B6D4  (cyan)
Country:       #84CC16  (lime)
Other:         #6B7280  (gray)
```

### Opacity Scale

```
For layering data in D3 charts:
  Area fills:     0.06 - 0.10
  Bar charts:     0.30 - 0.50
  Lines/strokes:  0.80 - 1.00
  Grid lines:     0.15 - 0.20
  Hover overlays: 0.08
  Disabled:       0.40
```

### Tailwind Usage

Always use semantic tokens, never raw hex in components:

```tsx
// CORRECT
className="bg-surface text-muted border-zinc-800"

// WRONG
className="bg-[#181818] text-[#B3B3B3] border-[#27272A]"
```

Exception: D3.js code uses hex strings directly since it operates outside Tailwind.

---

## 2. Typography

### Font Stack

```
Primary:    Inter, system-ui, -apple-system, sans-serif
Monospace:  "SF Mono", "Fira Code", "Cascadia Code", monospace  (stats, data)
```

Per Spotify's guidelines: use platform default sans-serif. We use Inter as our
primary with system-ui fallback, which aligns with their recommendation.

### Type Scale

Base unit: 1rem = 16px. All sizes from Tailwind's default scale.

| Token         | Tailwind      | Size   | Weight    | Line Height | Usage                                    |
|---------------|---------------|--------|-----------|-------------|------------------------------------------|
| display       | text-5xl      | 48px   | bold 700  | 1.1         | Homepage hero headline only              |
| h1            | text-4xl      | 36px   | bold 700  | 1.15        | Page titles, song name in hero           |
| h2            | text-2xl      | 24px   | bold 700  | 1.25        | Section headings, chapter titles         |
| h3            | text-lg       | 18px   | semibold 600 | 1.35     | Card titles, subsection heads            |
| body          | text-base     | 16px   | normal 400 | 1.6        | Narrative text, descriptions, paragraphs |
| body-sm       | text-sm       | 14px   | normal 400 | 1.5        | Secondary descriptions, metadata         |
| caption       | text-xs       | 12px   | medium 500 | 1.4        | Labels, timestamps, axis ticks, badges   |
| overline      | text-xs       | 12px   | semibold 600 | 1.4      | Section labels, chapter markers (UPPERCASE + tracking-wider) |
| micro         | text-[10px]   | 10px   | semibold 600 | 1.3      | ONLY for badges inside hero (Curated, classification) |

### Rules

- **Minimum body text: 14px (text-sm).** Never use text-xs for readable prose.
- **Minimum interactive label: 12px (text-xs).** Buttons, pills, tags.
- **10px (text-[10px]) is ONLY for non-essential badges** inside the song hero. Nowhere else.
- **Headings are always bold (700) or semibold (600).** Never use regular weight for headings.
- **Body text is always normal (400) or medium (500).** Never bold body paragraphs.
- **Line height for body text: 1.5-1.6.** Tailwind's `leading-relaxed` (1.625).
- **Max line length: 65ch** for narrative text. Use `max-w-xl` or `max-w-2xl`.

### Tracking (Letter Spacing)

```
Overline/labels:  tracking-wider   (0.05em)   UPPERCASE text only
Headings:         tracking-tight   (-0.02em)  Large headings (h1, display)
Body:             tracking-normal  (0)        Default for everything else
```

---

## 3. Spacing

### Base-4 Scale

All spacing uses Tailwind's default 4px grid. These are the primary tokens:

| Token | Value | Tailwind | Usage                                    |
|-------|-------|----------|------------------------------------------|
| 1     | 4px   | p-1      | Tight internal gaps                      |
| 1.5   | 6px   | p-1.5    | Icon padding, badge internal             |
| 2     | 8px   | p-2      | Compact element spacing                  |
| 3     | 12px  | p-3      | Card internal padding (compact)          |
| 4     | 16px  | p-4      | Standard card padding, chart container   |
| 5     | 20px  | p-5      | Hero section internal                    |
| 6     | 24px  | p-6      | Page horizontal padding (px-6)           |
| 8     | 32px  | p-8      | Section gaps, large card padding         |
| 10    | 40px  | gap-10   | Between major page sections              |
| 12    | 48px  | py-12    | Page top/bottom padding                  |
| 16    | 64px  | py-16    | Chapter spacing (space-y-32 in story)    |
| 20    | 80px  | py-20    | Hero section vertical padding            |

### Section Rhythm

```
Hero padding:           py-20 (80px top/bottom)
Between chapters:       space-y-32 (128px)
Between sections:       space-y-16 (64px) or mt-10 (40px)
Inside cards:           p-4 (16px) standard, p-8 (32px) for conclusion
Page horizontal:        px-6 (24px)
Max content width:      max-w-6xl (72rem / 1152px) for story
Max page width:         max-w-page (1280px) for hero
```

### Component Spacing

```
Card padding:           p-3 (compact) or p-4 (standard)
Button padding:         px-4 py-2 (standard) or px-3 py-1 (small)
Badge padding:          px-2 py-0.5 (tight) or px-2.5 py-0.5 (standard)
Pill padding:           px-3 py-1 or px-3 py-1.5
Input padding:          px-3 py-2
Gap between pills:      gap-3
Gap in card grid:       gap-2 or gap-3
Gap in stat grid:       gap-3
```

---

## 4. Border Radius

| Token       | Value | Tailwind    | Usage                                  |
|-------------|-------|-------------|----------------------------------------|
| none        | 0     | rounded-none| Divider lines, flat edges              |
| sm          | 4px   | rounded     | Small pills, badges, checkboxes        |
| md          | 6px   | rounded-md  | Buttons, inputs, tags                  |
| lg          | 8px   | rounded-lg  | Small cards, dropdowns, search results |
| xl          | 12px  | rounded-xl  | Standard cards, song cards             |
| 2xl         | 16px  | rounded-2xl | Chart containers, hero album art, panels|
| full        | 9999px| rounded-full| Pills, avatars, genre tags, dots       |

### Inner Radius Rule

When a child element is inside a padded parent, reduce the child's radius:
```
Parent radius - parent padding = child radius
rounded-2xl (16px) - p-4 (16px) = rounded-none or rounded-sm
rounded-xl (12px) - p-3 (12px) = rounded-none
```

### Album Art

Per Spotify's guidelines:
- Small/medium: `rounded-lg` (8px) — aligns with Spotify's 4-8px spec
- Large (hero): `rounded-2xl` (16px)

---

## 5. Elevation & Depth

Dark themes don't use shadow for elevation — they use **surface brightness**.
Lighter surface = higher elevation.

| Level    | Background  | Border       | Usage                          |
|----------|-------------|--------------|--------------------------------|
| Base     | #121212     | none         | Page background                |
| Level 1  | #181818     | border-zinc-800 | Cards, chart containers     |
| Level 2  | #282828     | border-zinc-700 | Hover cards, dropdowns, tooltips |
| Level 3  | #333333     | border-zinc-600 | Active/pressed states       |

### Shadow Usage (Sparingly)

```
Tooltips:       shadow-lg (only floating elements)
Hover cards:    shadow-md (subtle lift on interaction)
Hero album art: shadow-2xl (dramatic, single use)
Default:        No shadow. Use surface brightness instead.
```

---

## 6. Interactive States

### Buttons & Links

```
Default:    bg-surface  text-white     border-zinc-800
Hover:      bg-surface-hover           border-zinc-700
Active:     bg-[#333333]              border-zinc-600
Disabled:   opacity-40  cursor-not-allowed

Accent:     bg-accent   text-black     (primary CTA only)
Accent hover: bg-accent-hover          (#1ED760)
```

### Cards (Song cards, peer cards)

```
Default:    bg-surface  border-zinc-800
Hover:      border-accent/30  shadow-md
            Album art: scale-105 (group-hover)
Transition: transition-all (color + shadow + border)
```

### Focus

```
All interactive elements: focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]
```

---

## 7. Layout Patterns

### Page Structure

```
<body>  (bg #121212)
  <header>  (sticky, bg-[#121212]/80 backdrop-blur)
  <main>
    <hero>  (bg-zinc-900, overflow-hidden, blurred album bg)
      max-w-page, px-6, py-20
    </hero>
    <story>  (max-w-6xl, px-6, py-16, space-y-32)
      <chapter> (section)
        <chapter-header>
        <sticky-scrolly>
          <chart-container>  (rounded-2xl, border, bg-surface, p-4)
      </chapter>
    </story>
  </main>
</body>
```

### Responsive Breakpoints

```
sm:   640px    2-column card grids
md:   768px    Side-by-side layouts
lg:   1024px   Full navigation, wider margins
xl:   1280px   Max content width reached
```

### Grid Patterns

```
Stat cards:     grid grid-cols-2 sm:grid-cols-4 gap-3
Peer songs:     grid sm:grid-cols-2 gap-2
Explore links:  flex flex-wrap gap-3
Genre pills:    flex flex-wrap gap-2
```

---

## 8. Chart Container Standard

Every D3 visualization is wrapped in a consistent container:

```tsx
<div className="rounded-2xl border border-zinc-800 bg-surface p-4">
  <svg ref={svgRef} className="w-full" />
  {/* Optional: legend, caption below */}
</div>
```

- Always `rounded-2xl` for chart wrappers
- Always `border border-zinc-800`
- Always `bg-surface` (#181818)
- Always `p-4` internal padding
- SVG is `w-full` — sizing handled by viewBox (see data-visualization.md)

---

## 9. Component Catalog

### Badge / Pill

```tsx
// Genre tag (colored)
<span className="rounded-full px-3 py-1 text-xs font-medium"
  style={{ backgroundColor: GENRE_COLORS[genre], color: "white" }}>
  {genre}
</span>

// Stat pill (neutral)
<span className="rounded-full bg-white/10 px-3 py-1 text-xs">
  Peak #{rank}
</span>

// Classification badge (accent-tinted)
<span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
  {label}
</span>
```

### Stat Card

```tsx
<div className="rounded-xl border border-zinc-800 bg-surface p-4 text-center">
  <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
  <p className="mt-1 text-2xl font-bold">{value}</p>
  <p className="mt-0.5 text-xs text-muted">{sub}</p>
</div>
```

### Song Card (Clickable)

```tsx
<Link className="group flex gap-3 rounded-xl border border-zinc-800 bg-surface p-3
  transition-all hover:border-accent/30 hover:shadow-md">
  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
    <img className="h-full w-full object-cover transition-transform group-hover:scale-105" />
  </div>
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-semibold">{name}</p>
    <p className="truncate text-xs text-muted">{artist}</p>
  </div>
</Link>
```

### Chapter Header

```tsx
<div className="mb-6">
  {/* Progress dots */}
  <div className="mb-3 flex items-center gap-3">
    <div className="flex gap-1.5">
      {dots.map((_, i) => (
        <div className={`h-1.5 rounded-full transition-all ${
          i < current ? "w-1.5 bg-accent" : i === current ? "w-6 bg-accent" : "w-1.5 bg-zinc-700"
        }`} />
      ))}
    </div>
    <p className="text-xs font-medium text-zinc-600">{current + 1} / {total}</p>
  </div>
  <p className="text-xs font-semibold uppercase tracking-wider text-accent">{label}</p>
  <h2 className="mt-1 text-2xl font-bold">{title}</h2>
</div>
```

---

## 10. Motion & Animation

### Duration Scale

```
instant:    0ms      State toggles (no transition needed)
fast:       150ms    Opacity changes, color shifts
normal:     300ms    Most UI transitions (hover, focus)
medium:     500ms    Element reveals, beat transitions
slow:       700ms    Axis zooms, major state changes
dramatic:   1200ms   Line drawing animations (stroke-dashoffset)
```

### Easing

```
Default:    ease / cubic-bezier(0.4, 0, 0.2, 1)   Most transitions
Enter:      ease-out / cubic-bezier(0, 0, 0.2, 1)  Elements appearing
Exit:       ease-in / cubic-bezier(0.4, 0, 1, 1)   Elements disappearing
Bounce:     cubic-bezier(0.34, 1.56, 0.64, 1)      Playful emphasis (rare)
```

### Tailwind Transitions

```
Standard card:  transition-all duration-300
Color only:     transition-colors duration-150
Transform:      transition-transform duration-300
```

### Rules

- Respect `prefers-reduced-motion`: skip D3 animations, show final state
- Never animate layout (width/height changes that cause reflow)
- Stagger reveals: max 15 items, 30ms delay between each
- Scrollytelling beats: one property change per beat, 500-700ms

---

## 11. Spotify Brand Compliance

Per Spotify's developer design guidelines:

### Required

- Attribute Spotify content with logo or icon
- Link metadata back to Spotify
- Display explicit content badges for applicable markets
- Use Spotify green (#1ED760 per their spec) only on black, white, or non-duotoned photography

### Prohibited

- App name cannot include "Spotify" or sound similar
- App logo cannot resemble Spotify's logo (green circle + waves)
- No co-branding with Spotify
- No modification of album artwork (cropping, overlays, text, animation)
- No metadata manipulation

### Our Adaptations

We use #1DB954 (slightly darker than Spotify's #1ED760) as our accent to create
visual distinction while staying in the green family. This is intentional — we are
NOT a Spotify product, we are an analytics tool that uses Spotify data.

### Metadata Display Limits (from Spotify)

```
Playlist/album name:  25 characters max
Artist name:          18 characters max
Track name:           23 characters max
```

Always use `truncate` (text-overflow: ellipsis) on metadata text.

---

## 12. Checklist — Before Shipping Any UI

### Color
- [ ] No raw hex values in Tailwind classes (use semantic tokens)
- [ ] Surface hierarchy respected (darker = lower, lighter = higher)
- [ ] Accent color used sparingly (1-2 elements per view)
- [ ] Text meets WCAG AA contrast on its background

### Typography
- [ ] No font size below 12px except hero badges
- [ ] Headings use bold/semibold, body uses normal/medium
- [ ] Narrative text has max-width constraint (max-w-xl)
- [ ] Metadata text uses `truncate` class

### Spacing
- [ ] All values from the 4px grid (no odd values like 13px, 22px)
- [ ] Consistent padding within component type (all cards same)
- [ ] Section rhythm follows the established pattern

### Components
- [ ] Cards use rounded-xl or rounded-2xl with border-zinc-800
- [ ] Interactive elements have hover + focus states
- [ ] Transitions use standard duration (150ms-300ms for UI)
- [ ] Album art uses rounded-lg (small) or rounded-2xl (large)
