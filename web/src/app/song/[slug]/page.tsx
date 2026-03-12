import Link from "next/link";
import { FEATURED_SONGS } from "@/data/featured-songs";
import { createSupabaseClient } from "@/lib/supabase";
import { classifyGenre, GENRE_COLORS, fetchSpotifyLifespanContext, type SpotifyLifespanContext } from "@/lib/spotify-data";
import { generateNarrative, analyzeChartRuns, type ChartRunInfo, type PeerSong } from "@/lib/narrative-generator";
import { fetchBillboardForSong, type BillboardSongData } from "@/lib/billboard-data";
import SpotifyEmbed from "@/components/SpotifyEmbed";
import SongStoryClient from "./SongStoryClient";

export const dynamic = "force-dynamic";

// ---------- Types ----------

type TrajectoryRow = { week: string; rank: number; streams: number | null };

export type SongPageData = {
  trackId: string;
  trackName: string;
  artistName: string;
  albumImg: string | null;
  releaseDate: string | null;
  genre: string;
  trajectory: TrajectoryRow[];
  songFeatures: { danceability: number; energy: number; valence: number; acousticness: number; speechiness: number; tempo: number };
  eraAverage: { danceability: number; energy: number; valence: number; acousticness: number; speechiness: number; tempo: number };
  genreShares: { period: string; genre: string; share: number }[];
  peakRank: number;
  weeksOnChart: number;
  maxStreams: number;
  firstWeek: string;
  lastWeek: string;
  billboardData?: BillboardSongData | null;
  spotifyLifespan?: SpotifyLifespanContext | null;
  chartRunInfo: ChartRunInfo;
  peerSongs: PeerSong[];
  totalChartStreams: number;
  songPeakStreams: number;
};

const MAX_TEMPO = 220;

// ---------- Core fetch: given a track_id, get everything ----------

async function fetchSongDataByTrackId(trackId: string): Promise<SongPageData | null> {
  const supabase = createSupabaseClient();

  const { data: metaRows } = await supabase
    .from("spotify_top200")
    .select("track_id, track_name, artist_name, album_img, artist_genres, release_date, danceability, energy, valence, acousticness, speechiness, tempo, duration")
    .eq("track_id", trackId)
    .eq("pivot", false)
    .limit(1);

  if (!metaRows?.length) return null;
  const meta = metaRows[0];

  const { data: trajRows } = await supabase
    .from("spotify_top200")
    .select("week, rank, streams")
    .eq("track_id", trackId)
    .eq("pivot", false)
    .order("week", { ascending: true });

  const trajectory: TrajectoryRow[] = (trajRows || []).map((r: Record<string, unknown>) => ({
    week: r.week as string,
    rank: r.rank as number,
    streams: r.streams as number | null,
  }));

  if (!trajectory.length) return null;

  const firstWeek = trajectory[0].week;
  const year = firstWeek.slice(0, 4);
  const { data: eraRows } = await supabase
    .from("spotify_top200")
    .select("danceability, energy, valence, acousticness, speechiness, tempo")
    .eq("pivot", false)
    .gte("week", `${year}-01-01`)
    .lte("week", `${year}-12-31`)
    .limit(5000);

  let eraAverage = { danceability: 0.65, energy: 0.65, valence: 0.45, acousticness: 0.2, speechiness: 0.1, tempo: 0.5 };
  if (eraRows?.length) {
    const avg = (key: string) => {
      const vals = (eraRows as Record<string, number | null>[]).map((r) => r[key]).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    eraAverage = {
      danceability: avg("danceability"), energy: avg("energy"), valence: avg("valence"),
      acousticness: avg("acousticness"), speechiness: avg("speechiness"), tempo: avg("tempo") / MAX_TEMPO,
    };
  }

  const { data: genreRows } = await supabase
    .from("spotify_top200")
    .select("week, artist_genres")
    .eq("pivot", false)
    .order("week", { ascending: true });

  const genreShares: { period: string; genre: string; share: number }[] = [];
  if (genreRows?.length) {
    const buckets: Record<string, Record<string, number>> = {};
    for (const r of genreRows as { week: string; artist_genres: string | null }[]) {
      const period = r.week.slice(0, 7);
      const genre = classifyGenre(r.artist_genres);
      if (!buckets[period]) buckets[period] = {};
      buckets[period][genre] = (buckets[period][genre] || 0) + 1;
    }
    for (const [period, genres] of Object.entries(buckets)) {
      const total = Object.values(genres).reduce((a, b) => a + b, 0);
      for (const [genre, count] of Object.entries(genres)) {
        genreShares.push({ period, genre, share: (count / total) * 100 });
      }
    }
  }

  const peakRank = Math.min(...trajectory.map((t) => t.rank));
  const weeksOnChart = trajectory.length;
  const maxStreams = trajectory.reduce((max, t) => Math.max(max, t.streams || 0), 0);
  const chartRunInfo = analyzeChartRuns(trajectory);

  // Try to find this song on the Billboard Hot 100
  const genre = classifyGenre(meta.artist_genres);
  const billboardData = await fetchBillboardForSong(
    meta.track_name || "",
    meta.artist_name || "",
  ).catch(() => null);

  // Fetch Spotify lifespan context for the staying power chapter
  const spotifyLifespan = await fetchSpotifyLifespanContext(
    trajectory.length,
    trajectory[0].week,
    genre,
  ).catch(() => null);

  // Fetch peer songs at peak week (the competition)
  const peakWeekRow = trajectory.find((t) => t.rank === peakRank);
  const peakWeekDate = peakWeekRow?.week || trajectory[0].week;

  const { data: peerRows } = await supabase
    .from("spotify_top200")
    .select("track_id, track_name, artist_name, album_img, rank, streams")
    .eq("week", peakWeekDate)
    .eq("pivot", false)
    .order("rank", { ascending: true })
    .limit(10);

  const peerSongs: PeerSong[] = (peerRows || []).map((r: Record<string, unknown>) => ({
    track_id: r.track_id as string,
    track_name: r.track_name as string,
    artist_name: r.artist_name as string,
    album_img: r.album_img as string | null,
    rank: r.rank as number,
    streams: r.streams as number | null,
  }));

  // Calculate total chart streams at peak week for stream share
  const { data: totalStreamRows } = await supabase
    .from("spotify_top200")
    .select("streams")
    .eq("week", peakWeekDate)
    .eq("pivot", false);

  const totalChartStreams = (totalStreamRows || []).reduce(
    (sum: number, r: Record<string, unknown>) => sum + ((r.streams as number) || 0), 0
  );
  const songPeakStreams = peakWeekRow?.streams || 0;

  return {
    trackId,
    trackName: meta.track_name || "Unknown",
    artistName: meta.artist_name || "Unknown",
    albumImg: meta.album_img,
    releaseDate: meta.release_date,
    genre,
    trajectory,
    songFeatures: {
      danceability: meta.danceability || 0, energy: meta.energy || 0, valence: meta.valence || 0,
      acousticness: meta.acousticness || 0, speechiness: meta.speechiness || 0, tempo: (meta.tempo || 120) / MAX_TEMPO,
    },
    eraAverage,
    genreShares,
    peakRank,
    weeksOnChart,
    maxStreams,
    firstWeek: trajectory[0].week,
    lastWeek: trajectory[trajectory.length - 1].week,
    billboardData,
    spotifyLifespan,
    chartRunInfo,
    peerSongs,
    totalChartStreams,
    songPeakStreams,
  };
}

// ---------- Resolve slug: editorial slug OR track_id ----------

async function resolveAndFetch(slug: string) {
  const editorial = FEATURED_SONGS.find((s) => s.slug === slug);
  if (editorial) {
    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from("spotify_top200")
      .select("track_id")
      .ilike("track_name", `%${editorial.trackNameQuery}%`)
      .ilike("artist_name", `%${editorial.artistNameQuery}%`)
      .eq("pivot", false)
      .limit(1);
    if (data?.length) {
      const songData = await fetchSongDataByTrackId(data[0].track_id);
      return { songData, isEditorial: true };
    }
    return { songData: null, isEditorial: true };
  }
  const songData = await fetchSongDataByTrackId(slug);
  return { songData, isEditorial: false };
}

// ---------- Page ----------

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { songData, isEditorial } = await resolveAndFetch(slug);
  const editorialMeta = isEditorial ? FEATURED_SONGS.find((s) => s.slug === slug) : null;

  if (!songData) {
    return (
      <div className="mx-auto max-w-page px-6 py-12 text-center">
        <h1 className="text-2xl font-bold">Song not found</h1>
        <p className="mt-2 text-muted">This song wasn&apos;t found in the Spotify Top 200 dataset (2017&ndash;2021).</p>
        <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">Back to Home</Link>
      </div>
    );
  }

  const trackName = editorialMeta?.trackName ?? songData.trackName;
  const artistName = editorialMeta?.artistName ?? songData.artistName;
  const genre = songData.genre;

  const statsForNarrative = {
    trackName, artistName, genre,
    peakRank: songData.peakRank, weeksOnChart: songData.weeksOnChart, maxStreams: songData.maxStreams,
    firstWeek: songData.firstWeek, lastWeek: songData.lastWeek,
    songFeatures: songData.songFeatures, eraAverage: songData.eraAverage, trajectory: songData.trajectory,
    chartRunInfo: songData.chartRunInfo,
    billboardData: songData.billboardData ?? undefined,
    spotifyLifespan: songData.spotifyLifespan
      ? { yearAvg: songData.spotifyLifespan.yearAvg, genreAvg: songData.spotifyLifespan.genreAvg, percentileInYear: songData.spotifyLifespan.percentileInYear, totalSongsInYear: songData.spotifyLifespan.totalSongsInYear }
      : undefined,
    peerSongs: songData.peerSongs,
    totalChartStreams: songData.totalChartStreams,
    songPeakStreams: songData.songPeakStreams,
  };
  const generated = generateNarrative(statsForNarrative);
  const narrative = editorialMeta
    ? { chapters: { ...editorialMeta.chapters, moment: generated.chapters.moment, stayingPower: generated.chapters.stayingPower }, outro: editorialMeta.outro, thesis: generated.thesis, classification: generated.classification }
    : generated;

  const albumImg = songData.albumImg || "";

  const thesis = "thesis" in narrative ? narrative.thesis : generated.thesis;

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-zinc-900 text-white">
        <div className="absolute inset-0 scale-110 opacity-30 blur-3xl" style={{ backgroundImage: albumImg ? `url(${albumImg})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative mx-auto max-w-page px-6 py-20">
          <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to Home
          </Link>

          <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
            {albumImg && <img src={albumImg} alt={`${trackName} album art`} className="h-48 w-48 flex-shrink-0 rounded-2xl shadow-2xl sm:h-56 sm:w-56" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">Song Story</p>
                {isEditorial && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">Curated</span>
                )}
              </div>
              <h1 className="mt-2 text-4xl font-bold">{trackName}</h1>
              <p className="mt-1 text-xl text-zinc-300">{artistName}</p>
              <p className="mt-3 max-w-xl text-base italic text-zinc-300">{thesis}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: GENRE_COLORS[genre] || "#9CA3AF", color: "white" }}>{genre}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Peak #{songData.peakRank}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{songData.weeksOnChart} weeks</span>
                {songData.maxStreams > 0 && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{(songData.maxStreams / 1_000_000).toFixed(1)}M peak streams</span>}
              </div>
              <SpotifyEmbed trackId={songData.trackId} />
            </div>
          </div>
        </div>
      </div>

      <SongStoryClient
        key={songData.trackId}
        trackName={trackName}
        chapters={narrative.chapters}
        outro={narrative.outro}
        songData={songData}
        genre={genre}
      />
    </div>
  );
}
