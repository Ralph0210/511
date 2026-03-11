import SongSearch from "@/components/SongSearch";
import BubbleExplorer from "@/components/BubbleExplorer";
import { fetchBubbleData, fetchBubbleAudioFeatures } from "@/lib/featured-exemplars";

export default async function Home() {
  const songs = await fetchBubbleData();
  // Fetch audio features in parallel after we have song list
  await fetchBubbleAudioFeatures(songs);

  return (
    <div className="mx-auto max-w-page px-6 py-12">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Explore the
          <br />
          <span className="text-accent">Spotify Top 200</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          {songs.length.toLocaleString()} songs from Spotify Top 200. Click a
          category to explore its songs — zoom deeper to discover more.
        </p>
        <SongSearch className="mt-6 max-w-md" />
      </div>

      {/* Bubble Explorer */}
      <BubbleExplorer songs={songs} />
    </div>
  );
}
