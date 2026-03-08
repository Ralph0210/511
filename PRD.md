# PRD: ChartPulse — Music Industry Trends & Song Stories

## Vision

Transform the existing billboard-charts data analysis tool into a polished, customer-facing product where users explore music industry trends through interactive data visualizations and discover individual songs' historical context through scrollytelling narratives.

---

## Design Philosophy

**Clean, minimalistic.** Generous whitespace, restrained color palette, typography-driven hierarchy. The data and stories are the product — the UI stays out of the way.

---

## Information Architecture

```
/                       → Homepage (hero + 3 viz previews + featured songs)
/explore/longevity      → Q1: Viral vs Sustained popularity
/explore/song-anatomy   → Q2: Song length, structure & attribute trends
/explore/genre-pulse    → Q3: Genre popularity over time
/song/:slug             → Scrollytelling page for a featured song
```

---

## Pages

### 1. Homepage (`/`)

**Layout:** Two-column (2/3 left, 1/3 right) on desktop; stacks on mobile.

#### Left Column — Data Visualization Previews

Three cards, one per research question. Each card contains:

- A title + one-line subtitle framing the question
- A compact, read-only preview visualization (simplified version of the full viz with minimal hovering interaction)
- A "Explore →" CTA that links to the full exploration page

**Card 1 — "The Lifespan of a Hit"**
_Do viral songs sustain popularity, or do most fade fast?_
Preview viz: Small multiples sparklines showing 3–4 archetype trajectories (viral spike, slow burn, sustained hit, one-hit wonder).

**Card 2 — "Anatomy of a Song"**
_How have song length, structure, and attributes evolved?_
Preview viz: A mini timeline showing average song duration trend line (2017–2021) with a few notable outliers annotated.

**Card 3 — "Genre Pulse"**
_Which genres dominate — and how has that shifted?_
Preview viz: A compact stacked area chart or streamgraph showing genre share by year.

#### Right Column — Featured Songs

A curated list of 4 featured songs, each displayed as a card:

- Album art (from Spotify dataset `album_image`)
- Song title + artist name
- A one-line hook (e.g., "Debuted at #1, fell off in 3 weeks")
- The card links to the song's scrollytelling page (`/song/:slug`)

Featured songs are editorially chosen to represent interesting data stories — a viral hit that crashed, a sleeper that climbed, a genre-defying outlier, etc.

#### Header / Navigation

- Logo/wordmark: "ChartPulse" (or chosen brand name)
- Minimal nav: Home, Explore (dropdown: Longevity / Song Anatomy / Genre Pulse), About
- No auth/login needed (public, read-only product)

---

### 2. Exploration Pages (`/explore/:topic`)

Full-screen interactive data visualization with controls. Each page follows a shared layout:

```
┌─────────────────────────────────────────────┐
│  Title + Context paragraph                  │
├─────────────────────────────────────────────┤
│                                             │
│         Main Interactive Visualization      │
│                                             │
├─────────────────────────────────────────────┤
│  Controls: filters, toggles, time range     │
├─────────────────────────────────────────────┤
│  Insights panel (key takeaways, annotations)│
└─────────────────────────────────────────────┘
```

#### 2a. Longevity (`/explore/longevity`) — Q1

**Question:** Do all viral songs sustain high popularity over time, or do most decline rapidly after an initial peak? How does viral popularity compare to sustained hits?

**Variables:** Release date, Week, Rank

**Visualization ideas (to be refined):**

- Bump chart or rank-over-time line chart for selectable songs
- Overlay comparison: user picks a "viral" song and a "sustained" song to compare trajectories
- Heatmap of rank × weeks-on-chart density

**Controls:**

- Time range selector (year/era)
- Song search/select to add trajectories
- Toggle: show average trajectory overlays

---

#### 2b. Song Anatomy (`/explore/song-anatomy`) — Q2

**Question:** How does song length affect streams and popularity? How have song attributes (length, structure, genre shifts) evolved?

**Variables:** Rank, Streams, Duration, Week (+ audio features from Spotify: danceability, energy, valence, tempo, etc.)

**Visualization ideas:**

- Scatter plot: duration vs. streams, colored by rank tier
- Timeline: average song attributes over weeks/years (small multiples for each attribute)
- Distribution ridgeline: how duration distribution has shifted year over year

**Controls:**

- Attribute selector (duration, danceability, energy, tempo, valence, etc.)
- Year range filter
- Rank tier filter (Top 10 / Top 50 / Top 200)

---

#### 2c. Genre Pulse (`/explore/genre-pulse`) — Q3

**Question:** How does song popularity vary across artist genres over time?

**Variables:** Rank, Artist Genre, Week

**Visualization ideas:**

- Streamgraph or stacked area: genre share of chart over time
- Bubble chart: genre × avg rank × count, animated by year
- Small multiples: one sparkline per genre showing avg rank over time

**Controls:**

- Genre filter (multi-select)
- Time granularity (week / month / year)
- Metric toggle (count of songs in chart vs. average rank vs. total streams)

---

### 3. Song Storytelling Page (`/song/:slug`)

**Format:** Scrollytelling — as the user scrolls, narrative text and data visualizations animate in sequence.

**Structure per song:**

1. **Hero section**

   - Full-bleed album art (blurred background) + song title + artist
   - Key stat badges: peak rank, weeks on chart, total streams, genre

2. **Chapter 1 — "The Rise"**

   - Narrative: When the song debuted, what was happening in music at the time
   - Viz: Rank trajectory line chart, animated on scroll, with key moments annotated
   - Data tie-in to Q1 (longevity pattern: was this a viral spike or slow burn?)

3. **Chapter 2 — "The Sound"**

   - Narrative: What makes this song sonically distinctive
   - Viz: Radar chart of audio features (danceability, energy, valence, tempo, acousticness) compared to the average song of its era
   - Data tie-in to Q2 (how does this song's anatomy compare to trends?)

4. **Chapter 3 — "The Context"**

   - Narrative: Genre landscape when this song charted
   - Viz: Genre share streamgraph with this song's genre highlighted, showing its competitive context
   - Data tie-in to Q3 (was its genre rising or declining?)

5. **Outro**
   - Summary stats
   - "Explore more" links to related songs and the relevant exploration pages

**Featured songs (initial set — 4–6 to launch):**
To be curated based on data analysis. Candidates:

- A viral TikTok-era hit that peaked and crashed
- A slow-burn song that climbed over months
- A genre-crossing outlier
- A streaming-era record-breaker
- A nostalgic re-entry (old song that re-charted)

---

## Data Strategy

### Primary Dataset: Spotify Top 200 (`spotify_top200`)

The Spotify dataset is the sole data source for launch. It has all the variables needed for every research question, plus rich metadata for storytelling. Billboard data may be integrated later for historical depth (pre-2017), but the Spotify dataset stands on its own.

**Coverage:** ~74,660 rows · Weekly global Top 200 · 2017–2021
**Granularity:** One row per artist per chart entry per week (multi-artist tracks have multiple rows, linked by `track_id`, distinguished by `pivot` flag)

#### Available Fields & Variable Mapping

| Field | Type | Used In |
|-------|------|---------|
| `rank` | int (1–200) | Q1, Q2, Q3, Storytelling |
| `week` | date | Q1, Q2, Q3 (time axis for all) |
| `streams` | bigint | Q2, Storytelling |
| `track_id` | text | Song identity (group weeks for same song) |
| `track_name` | text | Display, search, storytelling |
| `track_popularity` | int (0–100) | Q1 (Spotify's own popularity score) |
| `release_date` | date | Q1 (age of song when it charted) |
| `album_img` | text (URL) | Featured song cards, storytelling hero |
| `album_name` | text | Storytelling context |
| `artist_name` | text | Display, search |
| `artist_names` | text | Full collab credit |
| `artist_genres` | text | Q3 (raw genre string, needs classification) |
| `artist_followers` | bigint | Storytelling (artist scale context) |
| `duration` | int (ms) | Q2 |
| `danceability` | float (0–1) | Q2, Storytelling radar |
| `energy` | float (0–1) | Q2, Storytelling radar |
| `valence` | float (0–1) | Q2, Storytelling radar |
| `tempo` | float (BPM) | Q2, Storytelling radar |
| `acousticness` | float (0–1) | Q2, Storytelling radar |
| `speechiness` | float (0–1) | Q2, Storytelling radar |
| `loudness` | float (dB) | Q2 |
| `instrumentalness` | float (0–1) | Q2 |
| `liveness` | float (0–1) | Q2 |
| `key` | int (0–11) | Q2 |
| `mode` | int (0/1) | Q2 |
| `time_signature` | int | Q2 |
| `explicit` | bool | Q2 (attribute trend) |
| `collab` | bool | Potential future analysis |
| `pivot` | bool | Dedup: filter `pivot = false` for primary artist rows |

#### Variable Operationalization per Question

**Q1 — Longevity: "Do viral songs sustain popularity?"**
- **Song identity:** Group by `track_id` across weeks
- **Trajectory:** For each song, plot `rank` (or `streams`) over `week`
- **Weeks on chart:** `COUNT(DISTINCT week)` per `track_id`
- **Peak rank:** `MIN(rank)` per `track_id` (rank 1 = best)
- **Viral vs sustained (proposed definition):**
  - *Viral:* Song reaches Top 20 within its first 2 weeks on chart, then drops below Top 100 within 6 weeks
  - *Sustained:* Song stays in Top 100 for 10+ weeks
  - *Slow burn:* Song takes 4+ weeks to reach its peak rank
  - These thresholds are tunable — we can expose controls to let users adjust them on the explore page
- **Key derived metric:** "Decay rate" = how quickly rank drops after peak (slope of rank after peak week)

**Q2 — Song Anatomy: "How do song attributes evolve?"**
- **Duration:** `duration` (ms → display as mm:ss). Bucket into: <2:30, 2:30–3:30, 3:30–4:30, >4:30
- **Attributes over time:** For each `week` (or month/year), compute avg of `danceability`, `energy`, `valence`, `tempo`, `acousticness`, `speechiness`, `duration` across all charting songs
- **Duration vs. streams:** Scatter of `duration` vs `streams`, faceted or colored by rank tier
- **Attribute clustering:** Songs can be compared by their audio feature vector (radar chart in storytelling)
- **Dedup:** Use `pivot = false` to avoid double-counting multi-artist tracks

**Q3 — Genre Pulse: "How does genre popularity shift?"**
- **Genre classification:** Apply regex rules to `artist_genres` (existing logic: Hip Hop/Rap, Latin, R&B, Rock, EDM/Dance, Country, Pop, Other)
- **Genre share:** For each time period, count songs per genre as % of total chart entries
- **Genre rank performance:** Avg `rank` per genre per time period
- **Genre streams:** Avg `streams` per genre per time period
- **Dedup:** Use `pivot = false` to count each track once under its primary artist's genre

#### Important Data Considerations

1. **Multi-artist dedup:** The dataset has one row per artist per track per week. For most analyses, filter to `pivot = false` (primary artist only) to avoid double-counting. Exception: genre analysis could optionally include all artists' genres for cross-genre coverage.

2. **Streams nulls:** Some rows have `NULL` streams — filter these out for streams-based analyses. Rank-based analyses can still include them.

3. **Genre coverage:** `artist_genres` is a comma-separated string of fine-grained Spotify genres (e.g., "dance pop, edm, electropop, pop"). The existing regex classifier covers major buckets. Some artists may have empty genres → falls to "Other".

4. **Time range:** 2017–2021 (roughly 4.5 years). This is a focused, modern-streaming-era window. Sufficient for trend analysis but not for decade-spanning narratives — that's a future opportunity for Billboard data.

### Data Enrichment Needed

- **Featured song metadata:** Curated editorial content (narrative text per chapter) stored in a local JSON/MDX file — no CMS needed for initial 4 songs
- **Genre normalization:** Current regex classifier is solid; may add K-Pop, Afrobeats, Folk as sub-genres emerge from data
- **Song slug generation:** Derive from `track_name` + `artist_name` (e.g., `blinding-lights-the-weeknd`) for URL routing

### New Supabase Views

```sql
-- Q1: Song trajectory (rank + streams over time per song)
-- Filters to primary artist only
CREATE VIEW song_trajectories AS
SELECT track_id, track_name, artist_name, album_img,
       week, rank, streams, track_popularity, release_date
FROM spotify_top200
WHERE pivot = false OR pivot IS NULL
ORDER BY track_id, week;

-- Q1: Song summary stats (for cards, search, featured songs)
CREATE VIEW song_summary AS
SELECT track_id,
       MIN(track_name) AS track_name,
       MIN(artist_name) AS artist_name,
       MIN(album_img) AS album_img,
       COUNT(DISTINCT week) AS weeks_on_chart,
       MIN(rank) AS peak_rank,
       MAX(streams) AS max_streams,
       MIN(week) AS first_week,
       MAX(week) AS last_week,
       MIN(artist_genres) AS artist_genres
FROM spotify_top200
WHERE pivot = false OR pivot IS NULL
GROUP BY track_id;

-- Q2: Weekly attribute averages (for trend lines)
CREATE VIEW weekly_attribute_trends AS
SELECT week,
       COUNT(*) AS song_count,
       AVG(duration) AS avg_duration,
       AVG(danceability) AS avg_danceability,
       AVG(energy) AS avg_energy,
       AVG(valence) AS avg_valence,
       AVG(tempo) AS avg_tempo,
       AVG(acousticness) AS avg_acousticness,
       AVG(speechiness) AS avg_speechiness,
       AVG(loudness) AS avg_loudness
FROM spotify_top200
WHERE pivot = false OR pivot IS NULL
GROUP BY week
ORDER BY week;

-- Q3: Genre classification happens in app code (regex on artist_genres)
-- but we can pre-aggregate rank/streams by week for the raw data
CREATE VIEW weekly_genre_data AS
SELECT week, rank, streams, artist_genres, duration, track_id
FROM spotify_top200
WHERE pivot = false OR pivot IS NULL;
```

### Billboard Data (Future Phase)

The Billboard Hot 100 dataset (`chart_entries`, ~352k rows, 1958–2026) offers historical depth that Spotify cannot:
- Pre-streaming era trends (vinyl → CD → digital → streaming transitions)
- Decades-long longevity comparisons
- Historical context for storytelling ("In 1999, the #1 song was...")

**Integration approach (when ready):**
- Fuzzy-match Billboard songs to Spotify `track_name` + `artist_name` for the overlap period (2017–2021)
- Use Billboard-only data for pre-2017 historical context sections
- Billboard's `weeks_on_board` and `peak_rank` are pre-computed and complement Spotify's weekly snapshots

---

## Tech Stack (Evolution from Current)

| Layer          | Current                 | Proposed                                                    |
| -------------- | ----------------------- | ----------------------------------------------------------- |
| Framework      | Next.js 14 (App Router) | **Keep** — Next.js 14+                                      |
| Styling        | Tailwind CSS            | **Keep** — extend with design tokens                        |
| Visualization  | D3.js                   | **Keep** — D3 for custom viz                                |
| Scrollytelling | —                       | **Add** — Scrollama or Intersection Observer based          |
| Animation      | —                       | **Add** — Framer Motion for page transitions + viz entrance |
| Database       | Supabase                | **Keep**                                                    |
| Fonts          | System defaults         | **Add** — Custom type pairing (e.g., Inter + serif accent)  |

### No New Backend Needed

All data is already in Supabase. New queries can be handled via:

- Additional Supabase views for pre-aggregated data
- Existing API route pattern (`/api/chart-data`) extended with new query types
- Static/ISR for song storytelling pages (content rarely changes)

---

## Design Tokens (Starting Point)

```
Colors:
  Background:    #FAFAFA (off-white)
  Surface:       #FFFFFF
  Text Primary:  #1A1A1A
  Text Secondary:#6B7280
  Accent:        #2563EB (blue) — for interactive elements
  Accent Warm:   #F59E0B (amber) — for highlights/featured
  Chart palette: 6-color categorical palette (TBD)

Typography:
  Headings:      Inter, 600/700 weight
  Body:          Inter, 400 weight
  Data/Labels:   Inter, 500 weight, slightly smaller

Spacing:
  Page max-width: 1280px
  Section gap:    64px
  Card padding:   24px
  Grid gap:       24px
```

---

## Phased Rollout

### Phase 1 — Foundation (Homepage + Navigation)

- New layout shell: header, footer, responsive grid
- Homepage with 3 viz preview cards (static/simplified versions)
- Featured songs sidebar with cards (linked to placeholder pages)
- Design system: colors, typography, spacing, card components

### Phase 2 — Exploration Pages

- `/explore/longevity` — full interactive Q1 visualization
- `/explore/song-anatomy` — full interactive Q2 visualization
- `/explore/genre-pulse` — full interactive Q3 visualization
- Shared controls component library (filters, selectors, toggles)
- New Supabase views for required aggregations

### Phase 3 — Scrollytelling

- Scrollytelling engine (Scrollama/Intersection Observer + Framer Motion)
- 4–6 curated song story pages
- Editorial content authoring (MDX or JSON-based)
- Song-to-data linking (cross-dataset matching)

### Phase 4 — Polish & Launch

- Responsive design pass (mobile, tablet)
- Performance optimization (ISR, lazy-load viz, skeleton states)
- SEO metadata + Open Graph images
- Analytics integration

---

## Open Questions (For Discussion)

1. **Brand name:** "ChartPulse" is a placeholder — what should the product be called?
2. **Viz specifics:** Exact chart types, color encoding, and interaction patterns for each Q — to be workshopped per exploration page.
3. **Viral thresholds:** The proposed viral/sustained/slow-burn definitions (Top 20 in 2 weeks, stays 10+ weeks, etc.) — do these feel right, or should they be adjustable by users?
4. **Featured song selection:** Which 4 specific songs to feature at launch? Should be data-driven + editorially interesting. Need to query the data to find compelling candidates.
5. **Mobile priority:** Is mobile a primary or secondary target for launch?
6. **Content authoring:** Who writes the song story narratives? Are we hardcoding the initial set in JSON/MDX?
