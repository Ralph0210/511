import type { BubbleSong } from "@/lib/featured-exemplars";
import type { LensType } from "./BubbleLensSelector";
import { LONGEVITY_LABELS, type LongevityCategory } from "@/lib/spotify-data";

type Props = {
  lens: LensType;
  songs: BubbleSong[];
};

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

export default function BubbleInsightPanel({ lens, songs }: Props) {
  if (!songs.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-surface p-4">
      {lens === "all" && <AllInsight songs={songs} />}
      {lens === "genre" && <GenreInsight songs={songs} />}
      {lens === "longevity" && <LongevityInsight songs={songs} />}
      {lens === "streams" && <StreamsInsight songs={songs} />}
      {lens === "sound" && <SoundInsight songs={songs} />}
    </div>
  );
}

function AllInsight({ songs }: { songs: BubbleSong[] }) {
  const top = songs[0];
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
      <span className="text-[#B3B3B3]">
        <strong className="text-white">{songs.length.toLocaleString()}</strong> songs from Spotify Top 200
      </span>
      <span className="text-[#B3B3B3]">
        Sized by peak weekly streams
      </span>
      {top && (
        <span className="text-[#B3B3B3]">
          Top song: <strong className="text-white">{top.track_name}</strong> by {top.artist_name}
        </span>
      )}
    </div>
  );
}

function GenreInsight({ songs }: { songs: BubbleSong[] }) {
  const counts: Record<string, number> = {};
  for (const s of songs) counts[s.genre] = (counts[s.genre] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topGenre = sorted[0];

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
      <span className="text-[#B3B3B3]">
        <strong className="text-white">{topGenre[0]}</strong> dominates with{" "}
        {topGenre[1]} songs ({Math.round((topGenre[1] / songs.length) * 100)}%)
      </span>
      <span className="text-[#B3B3B3]">
        {sorted.length} genres represented
      </span>
    </div>
  );
}

function LongevityInsight({ songs }: { songs: BubbleSong[] }) {
  const counts: Record<string, number> = {};
  for (const s of songs) counts[s.longevity] = (counts[s.longevity] || 0) + 1;

  const cats: LongevityCategory[] = ["viral", "sustained", "slow_burn"];
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
      {cats.map((cat) => (
        <span key={cat} className="text-[#B3B3B3]">
          <strong className="text-white">{LONGEVITY_LABELS[cat]}:</strong>{" "}
          {counts[cat] || 0} songs (
          {Math.round(((counts[cat] || 0) / songs.length) * 100)}%)
        </span>
      ))}
    </div>
  );
}

function StreamsInsight({ songs }: { songs: BubbleSong[] }) {
  const streams = songs.map((s) => s.max_streams).sort((a, b) => b - a);
  const median = streams[Math.floor(streams.length / 2)];
  const top = songs[0];

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
      <span className="text-[#B3B3B3]">
        Top: <strong className="text-white">{fmtNum(streams[0])}</strong> peak weekly streams ({top.track_name})
      </span>
      <span className="text-[#B3B3B3]">
        Median: <strong className="text-white">{fmtNum(median)}</strong>
      </span>
    </div>
  );
}

function SoundInsight({ songs }: { songs: BubbleSong[] }) {
  const withFeatures = songs.filter((s) => s.energy != null && s.valence != null);
  if (!withFeatures.length) {
    return (
      <p className="text-sm text-[#B3B3B3]">
        Audio feature data unavailable.
      </p>
    );
  }

  const avgEnergy = withFeatures.reduce((s, d) => s + (d.energy ?? 0), 0) / withFeatures.length;
  const avgValence = withFeatures.reduce((s, d) => s + (d.valence ?? 0), 0) / withFeatures.length;

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
      <span className="text-[#B3B3B3]">
        X = Energy, Y = Valence (happiness)
      </span>
      <span className="text-[#B3B3B3]">
        Avg energy: <strong className="text-white">{avgEnergy.toFixed(2)}</strong>
      </span>
      <span className="text-[#B3B3B3]">
        Avg valence: <strong className="text-white">{avgValence.toFixed(2)}</strong>
      </span>
      <span className="text-[#B3B3B3]">
        Colored by genre to reveal sonic clustering
      </span>
    </div>
  );
}
