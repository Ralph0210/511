import BubbleExplorer from "@/components/BubbleExplorer";
import VizPreviewCard from "@/components/VizPreviewCard";
import {
  fetchBubbleData,
  fetchBubbleAudioFeatures,
  fetchHomepageData,
} from "@/lib/featured-exemplars";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [songs, { exemplars, stats }] = await Promise.all([
    fetchBubbleData().then(async (s) => {
      await fetchBubbleAudioFeatures(s);
      return s;
    }),
    fetchHomepageData(),
  ]);

  // Pick 2 most contrasting songs per viz
  const longevitySongs = exemplars.longevity.slice(0, 2);
  const anatomySongs = exemplars.songAnatomy.slice(0, 2);
  const genreSongs = exemplars.genrePulse.slice(0, 2);

  return (
    <div className="mx-auto max-w-page px-6">
      {/* Hero — scrolls away */}
      <div className="py-12 pb-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Explore the
          <br />
          <span className="text-accent">Spotify Top 200</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          {songs.length.toLocaleString()} songs from Spotify Top 200. Click a
          category to explore its songs — zoom deeper to discover more.
        </p>
      </div>

      {/* Bubble Explorer — sticks after hero scrolls out */}
      <BubbleExplorer songs={songs} />

      {/* Explore sections with integrated featured songs */}
      <div className="mt-16 pb-16">
        <h2 className="text-2xl font-bold tracking-tight">
          What&apos;s hiding in the charts?
        </h2>

        <div className="mt-6 space-y-3">
          <VizPreviewCard
            title="The Lifespan of a Hit"
            stat={stats.longevityStat}
            href="/explore/longevity"
            accent="#1DB954"
            songs={longevitySongs}
          />
          <VizPreviewCard
            title="Anatomy of a Song"
            stat={stats.anatomyStat}
            href="/explore/song-anatomy"
            accent="#F59E0B"
            songs={anatomySongs}
          />
          <VizPreviewCard
            title="Genre Breakdown"
            stat={stats.genreStat}
            href="/explore/genre-pulse"
            accent="#8B5CF6"
            songs={genreSongs}
          />
        </div>
      </div>
    </div>
  );
}
