import ChartAvgLifespanOverTime from "@/components/ChartAvgLifespanOverTime";
import ChartLongevityStreamingEra from "@/components/ChartLongevityStreamingEra";
import ChartPeakVsLongevity from "@/components/ChartPeakVsLongevity";
import Q2MethodologySection from "@/components/Q2MethodologySection";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type LifespanByYear = { debut_year: number; avg_lifespan: number; song_count: number };
type DebutStats = { is_debut: boolean; avg_weeks: number; median_weeks: number; q1_weeks: number; q3_weeks: number; min_weeks: number; max_weeks: number; song_count: number };
type PeakLongevity = { peak_rank: number; weeks_on_board: number; song?: string; artist?: string };

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

type MethodologyStats = { groupLabel: string; avg_weeks: number; median_weeks: number; q1_weeks: number; q3_weeks: number; min_weeks: number; max_weeks: number; song_count: number };

async function getMethodologyData(supabase: ReturnType<typeof createSupabaseClient>) {
  const PAGE_SIZE = 1000; // Supabase default max per request

  const { count: totalRows } = await supabase
    .from("chart_entries")
    .select("date", { count: "exact", head: true });

  const MAX_ROWS = 100000;
  let rows: { date: string; rank: number; song: string; artist: string }[] = [];
  let offset = 0;
  while ((totalRows == null || rows.length < totalRows) && rows.length < MAX_ROWS) {
    const { data: page, error } = await supabase
      .from("chart_entries")
      .select("date, rank, song, artist")
      .order("date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error || !page?.length) break;
    rows = rows.concat(page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (!rows.length) return null;

  const isFullDataset = totalRows != null && rows.length >= totalRows;

  const dateRange = rows.length
    ? { min: rows[0]?.date ?? "", max: rows[rows.length - 1]?.date ?? "" }
    : null;

  const bySong: Record<string, { rows: { date: string; rank: number }[] }> = {};
  for (const r of rows) {
    const key = `${r.song}\x1f${r.artist}`;
    if (!bySong[key]) bySong[key] = { rows: [] };
    bySong[key].rows.push({ date: r.date, rank: r.rank });
  }

  const songData: { debutRank: number; weeksToPeak: number; maxWeeks: number; peakRank: number }[] = [];
  for (const { rows: songRows } of Object.values(bySong)) {
    const sorted = [...songRows].sort((a, b) => a.date.localeCompare(b.date));
    const debutRank = sorted[0]?.rank ?? 100;
    const bestRank = Math.min(...sorted.map((x) => x.rank));
    const peakIdx = sorted.findIndex((x) => x.rank === bestRank);
    const weeksToPeak = peakIdx >= 0 ? peakIdx : 0;
    const maxWeeks = sorted.length;
    songData.push({ debutRank, weeksToPeak, maxWeeks, peakRank: bestRank });
  }

  function boxFromWeeks(weeksArr: number[], label: string): MethodologyStats | null {
    if (!weeksArr.length) return null;
    const sorted = [...weeksArr].sort((a, b) => a - b);
    return {
      groupLabel: label,
      avg_weeks: weeksArr.reduce((a, b) => a + b, 0) / weeksArr.length,
      median_weeks: Math.round(percentile(sorted, 0.5)),
      q1_weeks: Math.round(percentile(sorted, 0.25)),
      q3_weeks: Math.round(percentile(sorted, 0.75)),
      min_weeks: sorted[0] ?? 0,
      max_weeks: sorted[sorted.length - 1] ?? 0,
      song_count: weeksArr.length,
    };
  }

  const optionA = {
    viral: songData.filter((s) => s.debutRank <= 10).map((s) => s.maxWeeks),
    slowBurn: songData.filter((s) => s.debutRank > 40).map((s) => s.maxWeeks),
  };
  const optionAStats: MethodologyStats[] = [
    boxFromWeeks(optionA.viral, "Viral (debut Top 10)"),
    boxFromWeeks(optionA.slowBurn, "Slow burn (debut below 40)"),
  ].filter((s): s is MethodologyStats => s !== null);

  const optionB = {
    viral: songData.filter((s) => s.weeksToPeak <= 2).map((s) => s.maxWeeks),
    slowBurn: songData.filter((s) => s.weeksToPeak > 5).map((s) => s.maxWeeks),
  };
  const optionBStats: MethodologyStats[] = [
    boxFromWeeks(optionB.viral, "Viral (peak ≤2 wks)"),
    boxFromWeeks(optionB.slowBurn, "Slow burn (peak >5 wks)"),
  ].filter((s): s is MethodologyStats => s !== null);

  const optionC = {
    viralBurst: songData.filter((s) => s.debutRank <= 10 || s.weeksToPeak <= 2).map((s) => s.maxWeeks),
    slowBurn: songData.filter((s) => s.debutRank > 40 && s.weeksToPeak > 5).map((s) => s.maxWeeks),
    steadyClimber: songData.filter(
      (s) =>
        s.debutRank > 10 &&
        s.debutRank <= 40 &&
        s.weeksToPeak >= 3 &&
        s.weeksToPeak <= 5
    ).map((s) => s.maxWeeks),
  };
  const optionCStats: MethodologyStats[] = [
    boxFromWeeks(optionC.viralBurst, "Viral burst"),
    boxFromWeeks(optionC.slowBurn, "Slow burn"),
    boxFromWeeks(optionC.steadyClimber, "Steady climber"),
  ].filter((s): s is MethodologyStats => s !== null);

  return {
    optionAStats,
    optionBStats,
    optionCStats,
    sampleInfo: {
      songCount: songData.length,
      rowCount: rows.length,
      totalRowsInDb: totalRows ?? undefined,
      dateRange,
      isFullDataset,
    },
  };
}

async function getAnalyticsFromChartEntries(supabase: ReturnType<typeof createSupabaseClient>) {
  const PAGE_SIZE = 1000;
  const MAX_ROWS = 100000;
  let rows: { date: string; song: string; artist: string; is_new: boolean | string; peak_rank: number; weeks_on_board: number }[] = [];
  let offset = 0;
  while (rows.length < MAX_ROWS) {
    const { data: page, error } = await supabase
      .from("chart_entries")
      .select("date, song, artist, is_new, peak_rank, weeks_on_board")
      .order("date", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!page?.length) break;
    rows = rows.concat(page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (!rows.length) return null;

  const bySong: Record<string, { firstDate: string; firstIsNew: boolean; maxWeeks: number; peakRank: number; song: string; artist: string }> = {};
  for (const r of rows) {
    const key = `${r.song}\x1f${r.artist}`;
    const isNew = r.is_new === true || r.is_new === "True" || r.is_new === "true";
    if (!bySong[key]) {
      bySong[key] = { firstDate: r.date, firstIsNew: isNew, maxWeeks: r.weeks_on_board, peakRank: r.peak_rank, song: r.song, artist: r.artist };
    } else {
      const s = bySong[key];
      if (r.date < s.firstDate) {
        s.firstDate = r.date;
        s.firstIsNew = isNew;
      }
      if (r.weeks_on_board > s.maxWeeks) s.maxWeeks = r.weeks_on_board;
      if (r.peak_rank < s.peakRank) s.peakRank = r.peak_rank;
    }
  }

  const songs = Object.values(bySong);

  const byYear: Record<number, number[]> = {};
  for (const s of songs) {
    const year = parseInt(s.firstDate.slice(0, 4), 10);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(s.maxWeeks);
  }
  const lifespanByYear: LifespanByYear[] = Object.entries(byYear)
    .filter(([y]) => parseInt(y, 10) < 2026)
    .map(([y, arr]) => ({
      debut_year: parseInt(y, 10),
      avg_lifespan: arr.reduce((a, b) => a + b, 0) / arr.length,
      song_count: arr.length,
    }))
    .sort((a, b) => a.debut_year - b.debut_year);

  const debutSongs = songs.filter((s) => s.firstIsNew).map((s) => s.maxWeeks);
  const gradualSongs = songs.filter((s) => !s.firstIsNew).map((s) => s.maxWeeks);

  const debutStats: DebutStats[] = [];
  if (debutSongs.length) {
    debutSongs.sort((a, b) => a - b);
    debutStats.push({
      is_debut: true,
      avg_weeks: debutSongs.reduce((a, b) => a + b, 0) / debutSongs.length,
      median_weeks: Math.round(percentile(debutSongs, 0.5)),
      q1_weeks: Math.round(percentile(debutSongs, 0.25)),
      q3_weeks: Math.round(percentile(debutSongs, 0.75)),
      min_weeks: debutSongs[0] ?? 0,
      max_weeks: debutSongs[debutSongs.length - 1] ?? 0,
      song_count: debutSongs.length,
    });
  }
  if (gradualSongs.length) {
    gradualSongs.sort((a, b) => a - b);
    debutStats.push({
      is_debut: false,
      avg_weeks: gradualSongs.reduce((a, b) => a + b, 0) / gradualSongs.length,
      median_weeks: Math.round(percentile(gradualSongs, 0.5)),
      q1_weeks: Math.round(percentile(gradualSongs, 0.25)),
      q3_weeks: Math.round(percentile(gradualSongs, 0.75)),
      min_weeks: gradualSongs[0] ?? 0,
      max_weeks: gradualSongs[gradualSongs.length - 1] ?? 0,
      song_count: gradualSongs.length,
    });
  }
  debutStats.sort((a, b) => (b.is_debut ? 1 : 0) - (a.is_debut ? 1 : 0));

  const peakLongevity: PeakLongevity[] = songs.slice(0, 1000).map((s) => ({ peak_rank: s.peakRank, weeks_on_board: s.maxWeeks, song: s.song, artist: s.artist }));

  const methodology = await getMethodologyData(supabase);

  return { lifespanByYear, debutStats, peakLongevity, methodology, isFallback: true };
}

async function fetchPeakLongevity(supabase: ReturnType<typeof createSupabaseClient>, limit: number) {
  const PAGE_SIZE = 1000;
  let rows: PeakLongevity[] = [];
  let offset = 0;
  while (rows.length < limit) {
    const { data: page, error } = await supabase
      .from("peak_longevity")
      .select("song, artist, peak_rank, weeks_on_board")
      .order("song", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error || !page?.length) break;
    rows = rows.concat(page as PeakLongevity[]);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows.slice(0, limit);
}

async function getAnalyticsData() {
  const supabase = createSupabaseClient();

  const [lifespanRes, debutRes] = await Promise.all([
    supabase.from("avg_lifespan_by_year").select("debut_year, avg_lifespan, song_count").order("debut_year", { ascending: true }),
    supabase.from("debut_vs_gradual_stats").select("*").order("is_debut", { ascending: false }),
  ]);

  const viewsExist = !lifespanRes.error && !debutRes.error;

  if (viewsExist) {
    const lifespanRaw = (lifespanRes.data ?? []) as LifespanByYear[];
    const [methodology, peakLongevity] = await Promise.all([
      getMethodologyData(supabase),
      fetchPeakLongevity(supabase, 1000),
    ]);
    return {
      lifespanByYear: lifespanRaw.filter((d) => d.debut_year < 2026),
      debutStats: (debutRes.data ?? []) as DebutStats[],
      peakLongevity,
      methodology,
      isFallback: false,
    };
  }

  const fallback = await getAnalyticsFromChartEntries(supabase);
  if (!fallback) throw new Error("chart_entries table is empty or not found");
  return fallback;
}

export default async function Home() {
  let data: Awaited<ReturnType<typeof getAnalyticsData>> | null = null;
  let error: string | null = null;

  try {
    data = await getAnalyticsData();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics data";
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-6 text-2xl font-bold">Billboard Charts Explorer</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Could not load analytics</p>
          <p className="mt-2 text-sm">{error ?? "No data returned"}</p>
          <p className="mt-4 text-sm">
            These charts require analytics views. Run the SQL in{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">supabase/migrations/002_analytics_views.sql</code>{" "}
            in your Supabase SQL Editor, then refresh.
          </p>
          <p className="mt-2 text-xs opacity-80">
            Ensure <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">chart_entries</code> exists and has data.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Billboard Charts Explorer</h1>
      <p className="mb-14 text-zinc-600 dark:text-zinc-400">
        Analytical visualizations answering key questions about Hot 100 chart dynamics
      </p>
      {data!.isFallback && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          Using fallback: analytics computed from <code>chart_entries</code> (sample). Run{" "}
          <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">supabase/migrations/002_analytics_views.sql</code>{" "}
          in Supabase for full-dataset accuracy.
        </div>
      )}

      {/* Q1 */}
      <section className="mb-16">
        <h2 className="mb-1 text-xl font-semibold">
          Q1. How has the average lifespan of songs on the Billboard Hot 100 changed over time?
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Axes:</strong> X = debut year (when the song first entered the chart). Y = average lifespan in weeks (max weeks each song stayed on the chart).
          Each point is the mean across all songs that debuted that year.
        </p>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>The story:</strong> Are songs burning brighter and shorter now, or sticking around longer? A declining line suggests chart turnover has sped up; a rising line suggests more enduring hits.
        </p>
        <ChartAvgLifespanOverTime data={data!.lifespanByYear} />
      </section>

      {/* Q2 */}
      <section className="mb-16">
        <h2 className="mb-1 text-xl font-semibold">
          Q2. Do viral songs (fast rise) vs slow-burn songs tend to have different chart longevity?
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Axes:</strong> X = methodology-defined groups (toggle below). Y = weeks on chart — total run per song. Box = IQR, line = median, whiskers = min to max.
        </p>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>The story:</strong> Compare different ways of defining &quot;viral&quot; vs &quot;slow burn.&quot; Does debut rank, climb speed, or trajectory shape better predict staying power?
        </p>
        <Q2MethodologySection methodology={data!.methodology} />
      </section>

      {/* Q3 */}
      <section className="mb-16">
        <h2 className="mb-1 text-xl font-semibold">
          Q3. What is the relationship between a song&apos;s peak rank and its chart longevity?
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Axes:</strong> X = peak rank (1 = reached #1, 100 = peaked near the bottom). Y = weeks on chart. Each point is one song. The red dashed line is the trend.
        </p>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>The story:</strong> A downward-sloping trend means higher-peaking songs (lower rank number) tend to stay longer — #1 hits and top-10 songs often have more staying power than songs that never cracked the upper half of the chart.
        </p>
        <ChartPeakVsLongevity data={data!.peakLongevity} />
      </section>

      {/* Q4 */}
      <section>
        <h2 className="mb-1 text-xl font-semibold">
          Q4. How has the longevity of Billboard Hot 100 songs changed over time, and what does this reveal about shifting chart dynamics in the streaming era?
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Axes:</strong> Same as Q1 — X = debut year, Y = average lifespan in weeks. The shaded band marks the streaming era (2013 onward), when on-demand streaming consumption began reshaping how hits climb and fade.
        </p>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>The story:</strong> Compare the gray dashed line (pre-streaming average) to the blue dashed line (streaming-era average). A lower streaming-era average suggests faster chart turnover—songs peak and drop quickly as algorithms and playlists drive bursts of attention. The trend within each era reveals whether longevity is still declining or has stabilized.
        </p>
        <ChartLongevityStreamingEra data={data!.lifespanByYear} />
      </section>
    </main>
  );
}
