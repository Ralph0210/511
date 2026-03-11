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
            <h3 className="mb-2 text-sm font-medium text-zinc-400">
              {cat.label}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cat.songs.map((song) => (
                <Link
                  key={song.track_id}
                  href={`/song/${song.track_id}`}
                  className="group flex gap-3 rounded-xl border border-zinc-800 bg-surface p-3 transition-all hover:border-accent/30 hover:shadow-md"
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                    {song.album_img ? (
                      <img
                        src={song.album_img}
                        alt={`${song.track_name} album art`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                        &#9835;
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {song.track_name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {song.artist_name}
                    </p>
                    {song.hook && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {song.hook}
                      </p>
                    )}
                  </div>
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
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
