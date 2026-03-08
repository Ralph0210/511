"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_img: string | null;
  peak_rank: number;
  weeks_on_chart: number;
};

export default function SongSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigateToSong = (trackId: string) => {
    setQuery("");
    setIsOpen(false);
    router.push(`/song/${trackId}`);
  };

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search any song in the Top 200..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-accent" />
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {results.map((song) => (
            <button
              key={song.track_id}
              onClick={() => navigateToSong(song.track_id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              {/* Album art */}
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700">
                {song.album_img ? (
                  <img src={song.album_img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                    ♫
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{song.track_name}</p>
                <p className="truncate text-xs text-muted">{song.artist_name}</p>
              </div>
              {/* Stats */}
              <div className="text-right text-xs text-muted">
                <p>#{song.peak_rank}</p>
                <p>{song.weeks_on_chart}w</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
