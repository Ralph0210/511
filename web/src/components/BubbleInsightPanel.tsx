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
      {lens === "genre" && <GenreInsight songs={songs} />}
      {lens === "longevity" && <LongevityInsight songs={songs} />}
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

  const cats: LongevityCategory[] = ["viral", "lasting", "slow_burn"];
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

