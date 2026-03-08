import BackLink from "@/components/BackLink";
import ChartLongevityExplorer from "@/components/ChartLongevityExplorer";
import ExploreFeaturedSongs from "@/components/ExploreFeaturedSongs";
import { fetchSongSummaries, fetchSongTrajectories } from "@/lib/spotify-data";
import { fetchLongevityExemplars } from "@/lib/featured-exemplars";

export const dynamic = "force-dynamic";

export default async function LongevityPage() {
  try {
    const [summaries, exemplars] = await Promise.all([
      fetchSongSummaries(),
      fetchLongevityExemplars(),
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
        <div className="mt-8">
          <ChartLongevityExplorer summaries={summaries} initialTrajectories={trajectories} />
        </div>
        <ExploreFeaturedSongs categories={exemplars} />
      </div>
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to load data";
    return (
      <div className="mx-auto max-w-page px-6 py-12">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">The Lifespan of a Hit</h1>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Could not load Spotify data</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }
}
