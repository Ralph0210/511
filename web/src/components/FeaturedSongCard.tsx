"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Props = {
  slug: string;
  title: string;
  artist: string;
  hook: string;
  albumImg: string | null;
  index: number;
};

export default function FeaturedSongCard({
  slug,
  title,
  artist,
  hook,
  albumImg,
  index,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 * index }}
    >
      <Link
        href={`/song/${slug}`}
        className="group flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-accent/30 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-accent/30"
      >
        {/* Album art */}
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700">
          {albumImg ? (
            <img
              src={albumImg}
              alt={`${title} album art`}
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
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted">{artist}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {hook}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center">
          <svg
            className="h-4 w-4 text-zinc-300 transition-all group-hover:text-accent group-hover:translate-x-0.5 dark:text-zinc-600"
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
        </div>
      </Link>
    </motion.div>
  );
}
