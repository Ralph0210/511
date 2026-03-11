import type { BubbleSong } from "@/lib/featured-exemplars";

type Props = {
  song: BubbleSong | null;
  position: { x: number; y: number };
};

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

export default function BubbleTooltip({ song, position }: Props) {
  if (!song) return null;

  return (
    <div
      className="pointer-events-none absolute z-50 w-56 rounded-xl border border-zinc-800 bg-[#282828] p-3 shadow-lg transition-opacity duration-150"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%) translateY(-12px)",
      }}
    >
      <div className="flex gap-3">
        {/* Album art */}
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
          {song.album_img ? (
            <img
              src={song.album_img}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
              ♫
            </div>
          )}
        </div>
        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{song.track_name}</p>
          <p className="truncate text-xs text-[#B3B3B3]">{song.artist_name}</p>
        </div>
      </div>
      {/* Stats */}
      <div className="mt-2 flex items-center gap-3 text-xs text-[#B3B3B3]">
        <span>#{song.peak_rank} peak</span>
        <span>{song.weeks_on_chart}w</span>
        {song.max_streams > 0 && <span>{fmtNum(song.max_streams)} streams</span>}
      </div>
      {/* Genre pill */}
      <span className="mt-1.5 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
        {song.genre}
      </span>
    </div>
  );
}
