import VizPreviewCard from "@/components/VizPreviewCard";
import PreviewLongevity from "@/components/PreviewLongevity";
import PreviewSongAnatomy from "@/components/PreviewSongAnatomy";
import PreviewGenrePulse from "@/components/PreviewGenrePulse";
import SongSearch from "@/components/SongSearch";
import { fetchHomepageData, fetchAttributePreview, type ExemplarSong } from "@/lib/featured-exemplars";

function SongCard({ song }: { song: ExemplarSong }) {
  return (
    <a
      href={`/song/${song.track_id}`}
      className="group flex gap-4 rounded-xl border border-zinc-800 bg-[#181818] p-4 transition-all hover:border-accent/30 hover:shadow-md"
    >
      {/* Album art */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
        {song.album_img ? (
          <img
            src={song.album_img}
            alt={`${song.track_name} album art`}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-zinc-400">
            ♫
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{song.track_name}</p>
          {song.category && (
            <span className="hidden whitespace-nowrap rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline">
              {song.category}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted">{song.artist_name}</p>
        <p className="mt-1 text-xs text-zinc-400">
          {song.hook}
        </p>
      </div>

      {/* Arrow */}
      <div className="flex items-center">
        <svg
          className="h-4 w-4 text-zinc-600 transition-all group-hover:text-accent group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
}

function SongGroup({ label, songs }: { label: string; songs: ExemplarSong[] }) {
  if (!songs.length) return null;
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </h3>
      <div className="space-y-2">
        {songs.map((s) => (
          <SongCard key={s.track_id} song={s} />
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const [{ exemplars, preview }, attributeTrend] = await Promise.all([
    fetchHomepageData(),
    fetchAttributePreview(),
  ]);

  return (
    <div className="mx-auto max-w-page px-6 py-12">
      {/* Hero */}
      <div className="mb-14">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          How music charts
          <br />
          <span className="text-accent">tell their stories</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Explore the patterns behind hit songs — how they rise, how they sound,
          and how genres reshape the charts — through interactive data
          visualizations and song narratives.
        </p>
        <SongSearch className="mt-6 max-w-md" />
      </div>

      {/* Paired rows: viz card (2/3) + featured songs (1/3), vertically aligned */}
      <div className="space-y-8">
        {/* Row 1: Longevity */}
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VizPreviewCard
              title="The Lifespan of a Hit"
              subtitle="Do viral songs sustain popularity, or do most fade fast?"
              href="/explore/longevity"
            >
              <PreviewLongevity data={preview.longevityScatter} />
            </VizPreviewCard>
          </div>
          <SongGroup label="Lifespan" songs={exemplars.longevity} />
        </div>

        {/* Row 2: Song Anatomy */}
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VizPreviewCard
              title="Anatomy of a Song"
              subtitle="How have song attributes and characteristics evolved over time?"
              href="/explore/song-anatomy"
            >
              <PreviewSongAnatomy data={attributeTrend} />
            </VizPreviewCard>
          </div>
          <SongGroup label="Song Anatomy" songs={exemplars.songAnatomy} />
        </div>

        {/* Row 3: Genre Pulse */}
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <VizPreviewCard
              title="Genre Pulse"
              subtitle="Which genres dominate — and how has that shifted?"
              href="/explore/genre-pulse"
            >
              <PreviewGenrePulse data={preview.genreShares} />
            </VizPreviewCard>
          </div>
          <SongGroup label="Genre Pulse" songs={exemplars.genrePulse} />
        </div>
      </div>
    </div>
  );
}
