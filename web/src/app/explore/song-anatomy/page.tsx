import BackLink from "@/components/BackLink";
import ChartSongAnatomyExplorer from "@/components/ChartSongAnatomyExplorer";
import ExploreFeaturedSongs from "@/components/ExploreFeaturedSongs";
import { fetchWeeklyAttributes } from "@/lib/spotify-data";
import { fetchAnatomyExemplars } from "@/lib/featured-exemplars";

export const dynamic = "force-dynamic";

export default async function SongAnatomyPage() {
  try {
    const [data, exemplars] = await Promise.all([
      fetchWeeklyAttributes(),
      fetchAnatomyExemplars(),
    ]);

    if (!data.length) throw new Error("No data returned");

    return (
      <div className="mx-auto max-w-page px-6 py-12">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">Anatomy of a Song</h1>
        <p className="mt-2 max-w-2xl text-muted">
          How have song attributes evolved across {data.length.toLocaleString()} weeks of
          Spotify Top 200 data? Track duration, danceability, energy, and more over time.
        </p>
        <div className="mt-8">
          <ChartSongAnatomyExplorer data={data} />
        </div>
        <ExploreFeaturedSongs categories={exemplars} />
      </div>
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to load data";
    return (
      <div className="mx-auto max-w-page px-6 py-12">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">Anatomy of a Song</h1>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Could not load attribute data</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }
}
