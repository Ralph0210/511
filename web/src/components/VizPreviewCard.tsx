"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ExemplarSong } from "@/lib/featured-exemplars";

type Props = {
  title: string;
  stat: string;
  href: string;
  accent: string;
  songs?: ExemplarSong[];
};

export default function VizPreviewCard({
  title,
  stat,
  href,
  accent,
  songs,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-zinc-800 bg-surface p-5 transition-colors hover:border-zinc-700"
    >
      {/* Header: accent bar + title/stat left, explore button right */}
      <div className="flex items-start gap-4">
        <div
          className="mt-0.5 w-1 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: accent }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-tight">{title}</p>
          <p className="mt-1 text-sm text-zinc-400">{stat}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
        >
          Explore
        </Link>
      </div>

      {/* Featured songs */}
      {songs && songs.length > 0 && (
        <div className="mt-4 border-t border-zinc-800/50 pt-4 grid gap-3 sm:grid-cols-2">
          {songs.slice(0, 2).map((song) => (
            <a
              key={song.track_id}
              href={`/song/${song.track_id}`}
              className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/40 p-3.5 transition-all hover:border-accent/40 hover:bg-zinc-800/80"
            >
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                {song.album_img ? (
                  <img
                    src={song.album_img}
                    alt={`${song.track_name} album art`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                    ♫
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{song.track_name}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-400">{song.hook}</p>
              </div>
              <svg
                className="h-4 w-4 shrink-0 text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}
