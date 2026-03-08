"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CategorizedExemplars } from "@/lib/featured-exemplars";

type Props = {
  categories: CategorizedExemplars[];
};

export default function ExploreFeaturedSongs({ categories }: Props) {
  if (!categories.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-12"
    >
      <h2 className="text-lg font-semibold tracking-tight">
        Songs that tell this story
      </h2>
      <p className="mt-1 text-sm text-muted">
        Explore individual songs that showcase each pattern in the data.
      </p>

      <div className="mt-6 space-y-6">
        {categories.map((cat) => (
          <div key={cat.label}>
            <h3 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {cat.label}
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {cat.songs.map((song) => (
                <Link
                  key={song.track_id}
                  href={`/song/${song.track_id}`}
                  className="group flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2.5 transition-all hover:border-accent/30 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-accent/30"
                >
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700">
                    {song.album_img ? (
                      <img
                        src={song.album_img}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                        ♫
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {song.track_name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {song.artist_name}
                    </p>
                  </div>
                  <p className="hidden max-w-[180px] truncate text-xs text-zinc-400 sm:block">
                    {song.hook}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
