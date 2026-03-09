"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import StickyScrolly, { type ScrollBeat } from "@/components/StickyScrolly";
import ChartRiseScrolly from "@/components/ChartRiseScrolly";
import ChartSoundScrolly from "@/components/ChartSoundScrolly";
import ChartMomentScrolly from "@/components/ChartMomentScrolly";
import ChartStayingPowerScrolly from "@/components/ChartStayingPowerScrolly";
import type { SongStoryChapter } from "@/data/featured-songs";
import type { SongPageData } from "./page";
import type { SongClassification, PeerSong } from "@/lib/narrative-generator";

type Props = {
  trackName: string;
  chapters: {
    rise: SongStoryChapter;
    sound: SongStoryChapter;
    moment: SongStoryChapter;
    context?: SongStoryChapter;
    stayingPower?: SongStoryChapter;
  };
  outro: string;
  songData: SongPageData | null;
  genre: string;
  classification: { label: string; classification: SongClassification };
};

const CHAPTER_TITLES = ["The Rise", "The Sound", "The Moment", "The Staying Power"];

function chapterBeats(chapter: SongStoryChapter): ScrollBeat[] {
  if (chapter.beats?.length) {
    return chapter.beats.map((text, i) => ({
      id: `${chapter.title}-${i}`,
      text: <p className="leading-relaxed text-muted">{text}</p>,
    }));
  }
  const sentences = chapter.narrative.match(/[^.!?]+[.!?]+/g) || [chapter.narrative];
  const groups: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    groups.push(sentences.slice(i, i + 2).join("").trim());
  }
  while (groups.length < 4) groups.push(groups[groups.length - 1] || "");
  return groups.map((text, i) => ({
    id: `${chapter.title}-${i}`,
    text: <p className="leading-relaxed text-muted">{text}</p>,
  }));
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#181818] p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}

function ChapterHeader({ chapter, index, total }: { chapter: SongStoryChapter; index: number; total: number }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < index ? "w-1.5 bg-accent" : i === index ? "w-6 bg-accent" : "w-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>
        <p className="text-xs font-medium text-zinc-600">
          {index + 1} / {total}
        </p>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        {chapter.label}
      </p>
      <h2 className="mt-1 text-2xl font-bold">{chapter.title}</h2>
    </div>
  );
}

const CLASSIFICATION_COLORS: Record<SongClassification, string> = {
  "viral-spike": "#EF4444",
  "slow-burn": "#3B82F6",
  "steady-performer": "#1DB954",
  "genre-disruptor": "#8B5CF6",
  "comeback-king": "#F59E0B",
  "chart-topper": "#EC4899",
};

export default function SongStoryClient({ trackName, chapters, outro, songData, genre, classification }: Props) {
  const [riseBeat, setRiseBeat] = useState(-1);
  const [soundBeat, setSoundBeat] = useState(-1);
  const [momentBeat, setMomentBeat] = useState(-1);
  const [stayingBeat, setStayingBeat] = useState(-1);

  const handleRiseBeat = useCallback((i: number) => setRiseBeat(i), []);
  const handleSoundBeat = useCallback((i: number) => setSoundBeat(i), []);
  const handleMomentBeat = useCallback((i: number) => setMomentBeat(i), []);
  const handleStayingBeat = useCallback((i: number) => setStayingBeat(i), []);

  const riseBeats = chapterBeats(chapters.rise);
  const soundBeats = chapterBeats(chapters.sound);
  const momentBeats = chapterBeats(chapters.moment);
  const stayingPowerChapter = chapters.stayingPower;
  const stayingBeats = stayingPowerChapter ? chapterBeats(stayingPowerChapter) : [];

  const totalChapters = stayingPowerChapter ? 4 : 3;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 space-y-32">
      {/* Chapter 1: The Rise */}
      <section>
        <ChapterHeader chapter={chapters.rise} index={0} total={totalChapters} />
        {songData && songData.trajectory.length > 0 ? (
          <StickyScrolly beats={riseBeats} onBeatChange={handleRiseBeat}>
            <ChartRiseScrolly
              data={songData.trajectory}
              peakRank={songData.peakRank}
              chartRunInfo={songData.chartRunInfo}
              beat={riseBeat}
            />
          </StickyScrolly>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-700 text-sm text-muted">
            Rank trajectory data unavailable
          </div>
        )}
      </section>

      {/* Chapter 2: The Sound */}
      <section>
        <ChapterHeader chapter={chapters.sound} index={1} total={totalChapters} />
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
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-700 text-sm text-muted">
            Audio feature data unavailable
          </div>
        )}
      </section>

      {/* Chapter 3: The Moment */}
      <section>
        <ChapterHeader chapter={chapters.moment} index={2} total={totalChapters} />
        {songData ? (
          <StickyScrolly beats={momentBeats} onBeatChange={handleMomentBeat}>
            <ChartMomentScrolly
              peerSongs={songData.peerSongs}
              songTrackName={trackName}
              songPeakRank={songData.peakRank}
              songPeakStreams={songData.songPeakStreams}
              totalChartStreams={songData.totalChartStreams}
              genreShares={songData.genreShares}
              highlightGenre={genre}
              songFirstWeek={songData.firstWeek}
              songLastWeek={songData.lastWeek}
              beat={momentBeat}
            />
          </StickyScrolly>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-700 text-sm text-muted">
            Context data unavailable
          </div>
        )}
      </section>

      {/* Chapter 4: The Staying Power */}
      {stayingPowerChapter && songData && songData.spotifyLifespan && (
        <section>
          <ChapterHeader chapter={stayingPowerChapter} index={3} total={totalChapters} />
          <StickyScrolly beats={stayingBeats} onBeatChange={handleStayingBeat}>
            <ChartStayingPowerScrolly
              spotifyDistribution={songData.spotifyLifespan.yearDistribution}
              songWeeks={songData.weeksOnChart}
              yearAvg={songData.spotifyLifespan.yearAvg}
              genreAvg={songData.spotifyLifespan.genreAvg}
              genreLabel={songData.spotifyLifespan.genreLabel}
              percentileInYear={songData.spotifyLifespan.percentileInYear}
              billboardDistribution={songData.billboardData?.longevityDistribution}
              billboardWeeks={songData.billboardData?.totalWeeks}
              billboardPercentile={songData.billboardData?.longevityPercentile}
              beat={stayingBeat}
            />
          </StickyScrolly>
        </section>
      )}

      {/* Conclusion: The Verdict */}
      <section className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Conclusion</p>
          <h2 className="mt-1 text-2xl font-bold">The Verdict</h2>
        </div>

        {/* Classification badge */}
        <div className="mb-8 flex items-center gap-4">
          <div
            className="rounded-xl border px-5 py-3 text-center"
            style={{
              borderColor: CLASSIFICATION_COLORS[classification.classification] + "40",
              backgroundColor: CLASSIFICATION_COLORS[classification.classification] + "10",
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Classification</p>
            <p
              className="mt-0.5 text-lg font-bold"
              style={{ color: CLASSIFICATION_COLORS[classification.classification] }}
            >
              {classification.label}
            </p>
          </div>
        </div>

        {/* Key stats grid */}
        {songData && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Peak Rank" value={`#${songData.peakRank}`} sub={songData.peakRank <= 10 ? "Top 10" : songData.peakRank <= 50 ? "Top 50" : "Top 200"} />
            <StatCard label="Weeks on Chart" value={String(songData.weeksOnChart)} sub={songData.chartRunInfo.hasReentries ? `${songData.chartRunInfo.totalRuns} runs` : "continuous"} />
            {songData.maxStreams > 0 && (
              <StatCard label="Peak Streams" value={`${(songData.maxStreams / 1_000_000).toFixed(1)}M`} sub="per week" />
            )}
            {songData.spotifyLifespan && (
              <StatCard label="Outlasted" value={`${songData.spotifyLifespan.percentileInYear}%`} sub="of songs that year" />
            )}
            {songData.billboardData && (
              <StatCard label="Billboard" value={`#${songData.billboardData.peakRank}`} sub={`${songData.billboardData.totalWeeks}w on Hot 100`} />
            )}
          </div>
        )}

        {/* Narrative conclusion */}
        <div className="rounded-2xl bg-[#181818] p-8">
          <p className="text-base leading-relaxed text-muted">{outro}</p>
        </div>

        {/* Navigation */}
        <div className="mt-10 space-y-6">
          <div>
            <h3 className="text-sm font-semibold">Explore More</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/explore/longevity" className="rounded-lg bg-[#282828] px-4 py-2 text-sm transition-colors hover:bg-zinc-700">
                The Lifespan of a Hit
              </Link>
              <Link href="/explore/song-anatomy" className="rounded-lg bg-[#282828] px-4 py-2 text-sm transition-colors hover:bg-zinc-700">
                Anatomy of a Song
              </Link>
              <Link href="/explore/genre-pulse" className="rounded-lg bg-[#282828] px-4 py-2 text-sm transition-colors hover:bg-zinc-700">
                Genre Pulse
              </Link>
            </div>
          </div>

          {songData && songData.peerSongs.length > 0 && (
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-sm font-semibold">From the Same Week</h3>
              <p className="mt-1 text-xs text-zinc-500">Other songs charting at the same time — explore their stories</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {songData.peerSongs
                  .filter((peer) => peer.track_id && !peer.track_name.toLowerCase().includes(trackName.toLowerCase().slice(0, 10)))
                  .slice(0, 6)
                  .map((peer) => (
                    <Link
                      key={peer.track_id}
                      href={`/song/${peer.track_id}`}
                      className="group flex gap-3 rounded-xl border border-zinc-800 bg-[#181818] p-3 transition-all hover:border-accent/30 hover:shadow-md"
                    >
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                        {peer.album_img ? (
                          <img
                            src={peer.album_img}
                            alt={`${peer.track_name} album art`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">&#9835;</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{peer.track_name}</p>
                        <p className="truncate text-xs text-muted">{peer.artist_name}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">#{peer.rank} at peak week</p>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-zinc-600 transition-all group-hover:text-accent group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
