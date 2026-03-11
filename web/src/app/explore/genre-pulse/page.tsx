import BackLink from "@/components/BackLink";
import ChartGenrePulseExplorer from "@/components/ChartGenrePulseExplorer";
import ExploreFeaturedSongs from "@/components/ExploreFeaturedSongs";
import { fetchGenreData } from "@/lib/spotify-data";
import { fetchGenreExemplars } from "@/lib/featured-exemplars";

export const dynamic = "force-dynamic";

export default async function GenrePulsePage() {
  try {
    const [data, exemplars] = await Promise.all([
      fetchGenreData(),
      fetchGenreExemplars(),
    ]);

    if (!data.length) throw new Error("No data returned");

    return (
      <div className="mx-auto max-w-page px-6 py-12">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">Genre Breakdown</h1>
        <p className="mt-2 max-w-2xl text-muted">
          How does song popularity vary across genres over time?
          Explore {data.length.toLocaleString()} chart entries across the Spotify Top 200 (2017&ndash;2021).
        </p>
        <div className="mt-8">
          <ChartGenrePulseExplorer data={data} />
        </div>
        <ExploreFeaturedSongs categories={exemplars} />
      </div>
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to load data";
    return (
      <div className="mx-auto max-w-page px-6 py-12">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">Genre Breakdown</h1>
        <div className="mt-6 rounded-xl border border-amber-800 bg-amber-950 p-6 text-amber-200">
          <p className="font-medium">Could not load genre data</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }
}
