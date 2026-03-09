import BackLink from "@/components/BackLink";
import ChartLongevityExplorer from "@/components/ChartLongevityExplorer";
import ExploreFeaturedSongs from "@/components/ExploreFeaturedSongs";
import LongViewSection from "@/components/LongViewSection";
import { fetchSongSummaries, fetchSongTrajectories } from "@/lib/spotify-data";
import { fetchLongevityExemplars } from "@/lib/featured-exemplars";
import { fetchLifespanByYear } from "@/lib/billboard-data";
import type { LifespanByYear } from "@/lib/billboard-data";

export const dynamic = "force-dynamic";

export default async function LongevityPage() {
  try {
    const [summaries, exemplars, lifespanByYear] = await Promise.all([
      fetchSongSummaries(),
      fetchLongevityExemplars(),
      fetchLifespanByYear().catch(() => [] as LifespanByYear[]),
    ]);

    if (!summaries.length) throw new Error("No data returned");

    const topSongIds = summaries
      .filter((s) => s.peak_rank <= 5)
      .slice(0, 20)
      .map((s) => s.track_id);
    const trajectories = topSongIds.length ? await fetchSongTrajectories(topSongIds) : [];

    return (
      <div className="mx-auto max-w-page px-6 py-12">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">The Lifespan of a Hit</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Do all viral songs sustain high popularity over time, or do most decline rapidly
          after an initial peak? Explore {summaries.length.toLocaleString()} songs from the
          Spotify Top 200 (2017&ndash;2021).
        </p>

        {/* Spotify section label */}
        <div className="mt-8 mb-4 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Spotify Global Top 200
          </span>
          <span className="text-xs text-muted">· Weekly streams · 2017–2021</span>
        </div>

        <div>
          <ChartLongevityExplorer summaries={summaries} initialTrajectories={trajectories} />
        </div>

        {/* Billboard "The Long View" section */}
        {lifespanByYear.length > 0 && (
          <section className="mt-24">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Billboard Hot 100
              </span>
              <span className="text-xs text-muted">· Radio + sales + streaming · US chart · Since 1958</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">The Long View</h2>
            <p className="mt-2 max-w-2xl text-muted">
              {lifespanByYear.length} years of chart data reveal how the lifespan of a hit has evolved
              from the radio era through streaming.
            </p>
            <div className="mt-8">
              <LongViewSection lifespanData={lifespanByYear} />
            </div>
          </section>
        )}

        <ExploreFeaturedSongs categories={exemplars} />
      </div>
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to load data";
    return (
      <div className="mx-auto max-w-page px-6 py-12">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">The Lifespan of a Hit</h1>
        <div className="mt-6 rounded-xl border border-amber-800 bg-amber-950 p-6 text-amber-200">
          <p className="font-medium">Could not load Spotify data</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }
}
