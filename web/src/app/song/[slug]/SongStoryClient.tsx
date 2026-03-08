"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import StickyScrolly, { type ScrollBeat } from "@/components/StickyScrolly";
import ChartRiseScrolly from "@/components/ChartRiseScrolly";
import ChartSoundScrolly from "@/components/ChartSoundScrolly";
import ChartContextScrolly from "@/components/ChartContextScrolly";
import { FEATURED_SONGS } from "@/data/featured-songs";
import type { SongStoryChapter } from "@/data/featured-songs";
import type { SongPageData } from "./page";

type Props = {
  trackName: string;
  chapters: { rise: SongStoryChapter; sound: SongStoryChapter; context: SongStoryChapter };
  outro: string;
  songData: SongPageData | null;
  genre: string;
};

/** Build ScrollBeat[] from a chapter's beats array, falling back to single narrative */
function chapterBeats(chapter: SongStoryChapter): ScrollBeat[] {
  if (chapter.beats?.length) {
    return chapter.beats.map((text, i) => ({
      id: `${chapter.title}-${i}`,
      text: <p className="leading-relaxed text-muted">{text}</p>,
    }));
  }
  // Fallback for editorial songs without beats — split narrative into one beat per sentence pair
  const sentences = chapter.narrative.match(/[^.!?]+[.!?]+/g) || [chapter.narrative];
  const groups: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    groups.push(sentences.slice(i, i + 2).join("").trim());
  }
  // Pad to 4 beats minimum
  while (groups.length < 4) groups.push(groups[groups.length - 1] || "");
  return groups.map((text, i) => ({
    id: `${chapter.title}-${i}`,
    text: <p className="leading-relaxed text-muted">{text}</p>,
  }));
}

function ChapterHeader({ chapter }: { chapter: SongStoryChapter }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        {chapter.label}
      </p>
      <h2 className="mt-1 text-2xl font-bold">{chapter.title}</h2>
    </div>
  );
}

export default function SongStoryClient({ trackName, chapters, outro, songData, genre }: Props) {
  const [riseBeat, setRiseBeat] = useState(-1);
  const [soundBeat, setSoundBeat] = useState(-1);
  const [contextBeat, setContextBeat] = useState(-1);

  const handleRiseBeat = useCallback((i: number) => setRiseBeat(i), []);
  const handleSoundBeat = useCallback((i: number) => setSoundBeat(i), []);
  const handleContextBeat = useCallback((i: number) => setContextBeat(i), []);

  const riseBeats = chapterBeats(chapters.rise);
  const soundBeats = chapterBeats(chapters.sound);
  const contextBeats = chapterBeats(chapters.context);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 space-y-32">
      {/* Chapter 1: The Rise */}
      <section>
        <ChapterHeader chapter={chapters.rise} />
        {songData && songData.trajectory.length > 0 ? (
          <StickyScrolly beats={riseBeats} onBeatChange={handleRiseBeat}>
            <ChartRiseScrolly
              data={songData.trajectory}
              peakRank={songData.peakRank}
              beat={riseBeat}
            />
          </StickyScrolly>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-sm text-muted dark:border-zinc-700">
            Rank trajectory data unavailable
          </div>
        )}
      </section>

      {/* Chapter 2: The Sound */}
      <section>
        <ChapterHeader chapter={chapters.sound} />
        {songData ? (
          <StickyScrolly beats={soundBeats} onBeatChange={handleSoundBeat}>
            <ChartSoundScrolly
              songFeatures={songData.songFeatures}
              eraAverage={songData.eraAverage}
              songName={trackName}
              beat={soundBeat}
            />
          </StickyScrolly>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-sm text-muted dark:border-zinc-700">
            Audio feature data unavailable
          </div>
        )}
      </section>

      {/* Chapter 3: The Context */}
      <section>
        <ChapterHeader chapter={chapters.context} />
        {songData && songData.genreShares.length > 0 ? (
          <StickyScrolly beats={contextBeats} onBeatChange={handleContextBeat}>
            <ChartContextScrolly
              data={songData.genreShares}
              highlightGenre={genre}
              songFirstWeek={songData.firstWeek}
              songLastWeek={songData.lastWeek}
              beat={contextBeat}
            />
          </StickyScrolly>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 text-sm text-muted dark:border-zinc-700">
            Genre context data unavailable
          </div>
        )}
      </section>

      {/* Outro */}
      <section className="mx-auto max-w-3xl rounded-2xl bg-zinc-50 p-8 dark:bg-zinc-900">
        <p className="leading-relaxed text-muted">{outro}</p>

        <div className="mt-8">
          <h3 className="text-sm font-semibold">Explore More</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/explore/longevity" className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-800">
              The Lifespan of a Hit
            </Link>
            <Link href="/explore/song-anatomy" className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-800">
              Anatomy of a Song
            </Link>
            <Link href="/explore/genre-pulse" className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-800">
              Genre Pulse
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <h3 className="text-sm font-semibold">Curated Song Stories</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {FEATURED_SONGS.map((other) => (
              <Link
                key={other.slug}
                href={`/song/${other.slug}`}
                className="rounded-lg bg-white px-4 py-2 text-sm shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-800"
              >
                {other.trackName}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
