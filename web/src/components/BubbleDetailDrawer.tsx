"use client";

import { useEffect, useCallback } from "react";
import type { BubbleSong } from "@/lib/featured-exemplars";
import { GENRE_COLORS, LONGEVITY_LABELS, LONGEVITY_COLORS } from "@/lib/spotify-data";

type Props = {
  song: BubbleSong | null;
  onClose: () => void;
};

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

export default function BubbleDetailDrawer({ song, onClose }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (song) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [song, handleKeyDown]);

  if (!song) return null;

  const longevityLabel = LONGEVITY_LABELS[song.longevity];
  const longevityColor = LONGEVITY_COLORS[song.longevity];
  const genreColor = GENRE_COLORS[song.genre] || "#9CA3AF";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-zinc-800 bg-[#181818] shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          aria-label="Close drawer"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto p-6 pt-14">
          {/* Album art */}
          <div className="mx-auto h-48 w-48 overflow-hidden rounded-2xl bg-zinc-700">
            {song.album_img ? (
              <img
                src={song.album_img}
                alt={`${song.track_name} album art`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-zinc-400">
                ♫
              </div>
            )}
          </div>

          {/* Song info */}
          <div className="mt-5 text-center">
            <h3 className="text-lg font-semibold">{song.track_name}</h3>
            <p className="mt-0.5 text-sm text-[#B3B3B3]">{song.artist_name}</p>
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: genreColor }}
            >
              {song.genre}
            </span>
            <span
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: longevityColor + "60",
                color: longevityColor,
                backgroundColor: longevityColor + "15",
              }}
            >
              {longevityLabel}
            </span>
          </div>

          {/* Stats grid */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatCard label="Peak Rank" value={`#${song.peak_rank}`} />
            <StatCard label="Weeks on Chart" value={String(song.weeks_on_chart)} />
            <StatCard
              label="Peak Streams"
              value={song.max_streams > 0 ? fmtNum(song.max_streams) : "—"}
            />
            <StatCard label="Genre" value={song.genre} />
          </div>

          {/* CTA */}
          <a
            href={`/song/${song.track_id}`}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#1ED760]"
          >
            See full story
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#121212] p-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-[#71717a]">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
