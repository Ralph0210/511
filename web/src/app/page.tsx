import VizPreviewCard from "@/components/VizPreviewCard";
import PreviewLongevity from "@/components/PreviewLongevity";
import PreviewSongAnatomy from "@/components/PreviewSongAnatomy";
import PreviewGenrePulse from "@/components/PreviewGenrePulse";
import SongSearch from "@/components/SongSearch";
import { SongGroup } from "@/components/SongCard";
import { fetchHomepageData, fetchAttributePreview } from "@/lib/featured-exemplars";

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
