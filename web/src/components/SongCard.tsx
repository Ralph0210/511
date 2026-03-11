import type { ExemplarSong } from "@/lib/featured-exemplars";

export function SongCard({ song }: { song: ExemplarSong }) {
  return (
    <a
      href={`/song/${song.track_id}`}
      className="group flex gap-4 rounded-xl border border-zinc-800 bg-surface p-4 transition-all hover:border-accent/30 hover:shadow-md"
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

export function SongGroup({ label, songs }: { label: string; songs: ExemplarSong[] }) {
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
