import { createSupabaseClient } from "./supabase";

// ---------- Shared types ----------

export type SongTrajectory = {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_img: string | null;
  week: string;
  rank: number;
  streams: number | null;
  track_popularity: number | null;
  release_date: string | null;
};

export type SongSummary = {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_img: string | null;
  weeks_on_chart: number;
  peak_rank: number;
  max_streams: number | null;
  avg_streams: number | null;
  first_week: string;
  last_week: string;
  release_date: string | null;
  artist_genres: string | null;
};

export type WeeklyAttributes = {
  week: string;
  song_count: number;
  avg_duration: number | null;
  avg_danceability: number | null;
  avg_energy: number | null;
  avg_valence: number | null;
  avg_tempo: number | null;
  avg_acousticness: number | null;
  avg_speechiness: number | null;
  avg_loudness: number | null;
  avg_duration_top10: number | null;
  avg_duration_top50: number | null;
};

export type GenreRow = {
  week: string;
  rank: number;
  streams: number | null;
  artist_genres: string | null;
  duration: number | null;
  track_id: string;
  track_name: string;
  artist_name: string;
};

// ---------- Genre classification (shared) ----------
// Score-based classifier: parses individual tags, scores each against parent
// genres, and returns the genre with the highest cumulative weight.

type GenreScore = { genre: string; weight: number };

// Tier 1: Exact tag → weighted genre affiliations.
// Covers the ~200 most frequent tags in the Spotify Top 200 dataset.
const TAG_MAP = new Map<string, GenreScore[]>([
  // ── Pop family ──────────────────────────────────────────────
  ["pop",                   [{ genre: "Pop", weight: 1.0 }]],
  ["dance pop",             [{ genre: "Pop", weight: 1.0 }, { genre: "EDM/Dance", weight: 0.3 }]],
  ["post-teen pop",         [{ genre: "Pop", weight: 1.0 }]],
  ["electropop",            [{ genre: "Pop", weight: 1.0 }, { genre: "EDM/Dance", weight: 0.3 }]],
  ["uk pop",                [{ genre: "Pop", weight: 1.0 }]],
  ["canadian pop",          [{ genre: "Pop", weight: 1.0 }]],
  ["viral pop",             [{ genre: "Pop", weight: 1.0 }]],
  ["art pop",               [{ genre: "Pop", weight: 1.0 }]],
  ["indie poptimism",       [{ genre: "Pop", weight: 1.0 }]],
  ["boy band",              [{ genre: "Pop", weight: 1.0 }]],
  ["girl group",            [{ genre: "Pop", weight: 1.0 }]],
  ["europop",               [{ genre: "Pop", weight: 1.0 }]],
  ["scandipop",             [{ genre: "Pop", weight: 1.0 }]],
  ["australian pop",        [{ genre: "Pop", weight: 1.0 }]],
  ["swedish pop",           [{ genre: "Pop", weight: 1.0 }]],
  ["danish pop",            [{ genre: "Pop", weight: 1.0 }]],
  ["dutch pop",             [{ genre: "Pop", weight: 1.0 }]],
  ["norwegian pop",         [{ genre: "Pop", weight: 1.0 }]],
  ["nz pop",                [{ genre: "Pop", weight: 1.0 }]],
  ["colombian pop",         [{ genre: "Pop", weight: 0.7 }, { genre: "Latin", weight: 0.5 }]],
  ["mexican pop",           [{ genre: "Pop", weight: 0.7 }, { genre: "Latin", weight: 0.5 }]],
  ["puerto rican pop",      [{ genre: "Pop", weight: 0.6 }, { genre: "Latin", weight: 0.6 }]],
  ["barbadian pop",         [{ genre: "Pop", weight: 1.0 }]],
  ["panamanian pop",        [{ genre: "Pop", weight: 0.7 }, { genre: "Latin", weight: 0.5 }]],
  ["pop venezolano",        [{ genre: "Pop", weight: 0.6 }, { genre: "Latin", weight: 0.6 }]],
  ["pop nacional",          [{ genre: "Pop", weight: 0.7 }, { genre: "Latin", weight: 0.4 }]],
  ["pop urbaine",           [{ genre: "Pop", weight: 0.8 }, { genre: "Hip Hop/Rap", weight: 0.3 }]],
  ["pop dance",             [{ genre: "Pop", weight: 0.7 }, { genre: "EDM/Dance", weight: 0.5 }]],
  ["pop edm",               [{ genre: "Pop", weight: 0.5 }, { genre: "EDM/Dance", weight: 0.7 }]],
  ["pop house",             [{ genre: "Pop", weight: 0.5 }, { genre: "EDM/Dance", weight: 0.7 }]],
  ["pop rock",              [{ genre: "Pop", weight: 0.7 }, { genre: "Rock", weight: 0.5 }]],
  ["pop soul",              [{ genre: "Pop", weight: 0.6 }, { genre: "R&B", weight: 0.6 }]],
  ["pop r&b",               [{ genre: "Pop", weight: 0.5 }, { genre: "R&B", weight: 0.7 }]],
  ["pop reggaeton",         [{ genre: "Latin", weight: 0.8 }, { genre: "Pop", weight: 0.4 }]],
  ["hip pop",               [{ genre: "Pop", weight: 0.5 }, { genre: "Hip Hop/Rap", weight: 0.7 }]],
  ["indie pop",             [{ genre: "Pop", weight: 1.0 }, { genre: "Rock", weight: 0.2 }]],
  ["indie pop rap",         [{ genre: "Pop", weight: 0.5 }, { genre: "Hip Hop/Rap", weight: 0.5 }, { genre: "Rock", weight: 0.2 }]],
  ["bedroom pop",           [{ genre: "Pop", weight: 1.0 }]],
  ["shimmer pop",           [{ genre: "Pop", weight: 1.0 }]],
  ["social media pop",      [{ genre: "Pop", weight: 1.0 }]],
  ["new wave pop",          [{ genre: "Pop", weight: 0.8 }, { genre: "Rock", weight: 0.3 }]],
  ["synthpop",              [{ genre: "Pop", weight: 0.7 }, { genre: "EDM/Dance", weight: 0.5 }]],
  ["baroque pop",           [{ genre: "Pop", weight: 1.0 }]],
  ["chamber pop",           [{ genre: "Pop", weight: 1.0 }]],
  ["metropopolis",          [{ genre: "Pop", weight: 1.0 }]],
  ["etherpop",              [{ genre: "Pop", weight: 0.8 }, { genre: "EDM/Dance", weight: 0.3 }]],
  ["nyc pop",               [{ genre: "Pop", weight: 1.0 }]],
  ["jazz pop",              [{ genre: "Pop", weight: 0.7 }]],
  ["funk pop",              [{ genre: "Pop", weight: 0.8 }, { genre: "R&B", weight: 0.3 }]],
  ["folk-pop",              [{ genre: "Pop", weight: 0.8 }, { genre: "Rock", weight: 0.3 }]],
  ["neo mellow",            [{ genre: "Pop", weight: 0.8 }]],
  ["acoustic pop",          [{ genre: "Pop", weight: 1.0 }]],
  ["talent show",           [{ genre: "Pop", weight: 1.0 }]],
  ["swedish electropop",    [{ genre: "Pop", weight: 0.7 }, { genre: "EDM/Dance", weight: 0.5 }]],
  ["chinese electropop",    [{ genre: "Pop", weight: 0.7 }, { genre: "EDM/Dance", weight: 0.3 }]],
  ["latin viral pop",       [{ genre: "Pop", weight: 0.5 }, { genre: "Latin", weight: 0.7 }]],
  ["bubblegrunge",          [{ genre: "Pop", weight: 0.6 }, { genre: "Rock", weight: 0.5 }]],
  ["dream smp",             [{ genre: "Pop", weight: 0.8 }]],
  ["escape room",           [{ genre: "Pop", weight: 0.7 }, { genre: "EDM/Dance", weight: 0.3 }]],

  // ── Hip Hop/Rap family ──────────────────────────────────────
  ["hip hop",               [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["rap",                   [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["trap",                  [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["southern hip hop",      [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["pop rap",               [{ genre: "Hip Hop/Rap", weight: 0.7 }, { genre: "Pop", weight: 0.5 }]],
  ["melodic rap",           [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["atl hip hop",           [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["gangster rap",          [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["conscious hip hop",     [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["canadian hip hop",      [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["toronto rap",           [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["emo rap",               [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["viral rap",             [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["miami hip hop",         [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["dfw rap",               [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["chicago rap",           [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["atl trap",              [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["west coast rap",        [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["east coast hip hop",    [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["north carolina hip hop",[{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["detroit hip hop",       [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["queens hip hop",        [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["philly rap",            [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["ohio hip hop",          [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["memphis hip hop",       [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["new orleans rap",       [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["florida rap",           [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["kentucky hip hop",      [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["seattle hip hop",       [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["oakland hip hop",       [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["minnesota hip hop",     [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["mississippi hip hop",   [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["tennessee hip hop",     [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["houston rap",           [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["cali rap",              [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["nyc rap",               [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["dmv rap",               [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["baton rouge rap",       [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["pittsburgh rap",        [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["rhode island rap",      [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["dirty south rap",       [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["underground hip hop",   [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["deep underground hip hop", [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["lgbtq+ hip hop",        [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["canadian trap",         [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["brooklyn drill",        [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["drill",                 [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["vapor trap",            [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["pluggnb",               [{ genre: "Hip Hop/Rap", weight: 0.8 }, { genre: "R&B", weight: 0.4 }]],
  ["plugg",                 [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["sad rap",               [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["dark trap",             [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["trap soul",             [{ genre: "Hip Hop/Rap", weight: 0.6 }, { genre: "R&B", weight: 0.6 }]],
  ["aesthetic rap",         [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["meme rap",              [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["german hip hop",        [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["french hip hop",        [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["italian hip hop",       [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["australian hip hop",    [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["uk hip hop",            [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["rap conscient",         [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["rap latina",            [{ genre: "Hip Hop/Rap", weight: 0.7 }, { genre: "Latin", weight: 0.5 }]],
  ["rap dominicano",        [{ genre: "Hip Hop/Rap", weight: 0.7 }, { genre: "Latin", weight: 0.5 }]],
  ["rap marseille",         [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["canadian old school hip hop", [{ genre: "Hip Hop/Rap", weight: 1.0 }]],
  ["argentine hip hop",     [{ genre: "Hip Hop/Rap", weight: 0.7 }, { genre: "Latin", weight: 0.5 }]],
  ["grime",                 [{ genre: "Hip Hop/Rap", weight: 0.8 }]],

  // ── Latin family ────────────────────────────────────────────
  ["reggaeton",             [{ genre: "Latin", weight: 1.0 }]],
  ["trap latino",           [{ genre: "Latin", weight: 0.7 }, { genre: "Hip Hop/Rap", weight: 0.5 }]],
  ["reggaeton colombiano",  [{ genre: "Latin", weight: 1.0 }]],
  ["reggaeton flow",        [{ genre: "Latin", weight: 1.0 }]],
  ["latin hip hop",         [{ genre: "Latin", weight: 0.6 }, { genre: "Hip Hop/Rap", weight: 0.6 }]],
  ["latin pop",             [{ genre: "Latin", weight: 0.7 }, { genre: "Pop", weight: 0.5 }]],
  ["latin arena pop",       [{ genre: "Latin", weight: 0.6 }, { genre: "Pop", weight: 0.6 }]],
  ["trap boricua",          [{ genre: "Latin", weight: 0.8 }, { genre: "Hip Hop/Rap", weight: 0.4 }]],
  ["trap argentino",        [{ genre: "Latin", weight: 0.7 }, { genre: "Hip Hop/Rap", weight: 0.5 }]],
  ["trap triste",           [{ genre: "Latin", weight: 0.6 }, { genre: "Hip Hop/Rap", weight: 0.5 }]],
  ["moombahton",            [{ genre: "Latin", weight: 0.7 }, { genre: "EDM/Dance", weight: 0.5 }]],
  ["bachata",               [{ genre: "Latin", weight: 1.0 }]],
  ["dembow",                [{ genre: "Latin", weight: 1.0 }]],
  ["perreo",                [{ genre: "Latin", weight: 1.0 }]],
  ["cubaton",               [{ genre: "Latin", weight: 1.0 }]],
  ["champeta",              [{ genre: "Latin", weight: 1.0 }]],
  ["vallenato",             [{ genre: "Latin", weight: 1.0 }]],
  ["francoton",             [{ genre: "Latin", weight: 0.8 }]],
  ["electro latino",        [{ genre: "Latin", weight: 0.6 }, { genre: "EDM/Dance", weight: 0.6 }]],
  ["r&b en espanol",        [{ genre: "Latin", weight: 0.5 }, { genre: "R&B", weight: 0.7 }]],
  ["dominican pop",         [{ genre: "Latin", weight: 0.7 }, { genre: "Pop", weight: 0.5 }]],
  ["dancehall",             [{ genre: "Latin", weight: 0.7 }]],
  ["reggae fusion",         [{ genre: "Latin", weight: 0.6 }]],
  ["basshall",              [{ genre: "Latin", weight: 0.6 }, { genre: "EDM/Dance", weight: 0.5 }]],
  ["funk carioca",          [{ genre: "Latin", weight: 0.8 }]],
  ["brega funk",            [{ genre: "Latin", weight: 0.7 }]],
  ["sertanejo",             [{ genre: "Latin", weight: 0.7 }]],
  ["sertanejo universitario", [{ genre: "Latin", weight: 0.7 }]],
  ["sertanejo pop",         [{ genre: "Latin", weight: 0.6 }, { genre: "Pop", weight: 0.5 }]],
  ["pagode baiano",         [{ genre: "Latin", weight: 0.8 }]],
  ["forro",                 [{ genre: "Latin", weight: 0.8 }]],
  ["arrocha",               [{ genre: "Latin", weight: 0.8 }]],
  ["piseiro",               [{ genre: "Latin", weight: 0.8 }]],
  ["musica mexicana",       [{ genre: "Latin", weight: 1.0 }]],
  ["norteno",               [{ genre: "Latin", weight: 1.0 }]],
  ["banda",                 [{ genre: "Latin", weight: 1.0 }]],

  // ── R&B family ──────────────────────────────────────────────
  ["r&b",                   [{ genre: "R&B", weight: 1.0 }]],
  ["contemporary r&b",      [{ genre: "R&B", weight: 1.0 }]],
  ["canadian contemporary r&b", [{ genre: "R&B", weight: 1.0 }]],
  ["uk contemporary r&b",   [{ genre: "R&B", weight: 1.0 }]],
  ["urban contemporary",    [{ genre: "R&B", weight: 0.8 }, { genre: "Hip Hop/Rap", weight: 0.3 }]],
  ["neo soul",              [{ genre: "R&B", weight: 1.0 }]],
  ["soul",                  [{ genre: "R&B", weight: 1.0 }]],
  ["british soul",          [{ genre: "R&B", weight: 1.0 }]],
  ["bedroom soul",          [{ genre: "R&B", weight: 0.8 }]],
  ["chill r&b",             [{ genre: "R&B", weight: 1.0 }]],
  ["indie r&b",             [{ genre: "R&B", weight: 0.8 }]],
  ["alt z",                 [{ genre: "Pop", weight: 0.6 }, { genre: "R&B", weight: 0.4 }]],
  ["gospel",                [{ genre: "R&B", weight: 0.6 }]],

  // ── EDM/Dance family ───────────────────────────────────────
  ["edm",                   [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["house",                 [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["electro house",         [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["progressive house",     [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["progressive electro house", [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["deep house",            [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["deep euro house",       [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["dutch house",           [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["dutch edm",             [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["belgian edm",           [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["brazilian edm",         [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["tropical house",        [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["deep tropical house",   [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["slap house",            [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["brostep",               [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["trance",                [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["uk dance",              [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["uk funky",              [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["australian dance",      [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["german dance",          [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["german techno",         [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["italo dance",           [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["eurodance",             [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["electronic trap",       [{ genre: "EDM/Dance", weight: 0.7 }, { genre: "Hip Hop/Rap", weight: 0.4 }]],
  ["electro",               [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["filter house",          [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["complextro",            [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["big room",              [{ genre: "EDM/Dance", weight: 1.0 }]],
  ["indietronica",          [{ genre: "EDM/Dance", weight: 0.7 }, { genre: "Rock", weight: 0.4 }]],
  ["covertronica",          [{ genre: "EDM/Dance", weight: 0.8 }]],

  // ── Rock family ─────────────────────────────────────────────
  ["rock",                  [{ genre: "Rock", weight: 1.0 }]],
  ["classic rock",          [{ genre: "Rock", weight: 1.0 }]],
  ["modern rock",           [{ genre: "Rock", weight: 1.0 }]],
  ["modern alternative rock", [{ genre: "Rock", weight: 1.0 }]],
  ["alternative rock",      [{ genre: "Rock", weight: 1.0 }]],
  ["indie rock",            [{ genre: "Rock", weight: 1.0 }]],
  ["indie",                 [{ genre: "Rock", weight: 0.7 }]],
  ["soft rock",             [{ genre: "Rock", weight: 1.0 }]],
  ["album rock",            [{ genre: "Rock", weight: 1.0 }]],
  ["piano rock",            [{ genre: "Rock", weight: 1.0 }]],
  ["country rock",          [{ genre: "Rock", weight: 0.5 }, { genre: "Country", weight: 0.7 }]],
  ["art rock",              [{ genre: "Rock", weight: 1.0 }]],
  ["glam rock",             [{ genre: "Rock", weight: 1.0 }]],
  ["permanent wave",        [{ genre: "Rock", weight: 0.8 }]],
  ["britpop",               [{ genre: "Rock", weight: 0.8 }, { genre: "Pop", weight: 0.3 }]],
  ["madchester",            [{ genre: "Rock", weight: 0.8 }]],
  ["beatlesque",            [{ genre: "Rock", weight: 0.8 }]],
  ["neo-psychedelic",       [{ genre: "Rock", weight: 0.8 }]],
  ["australian psych",      [{ genre: "Rock", weight: 0.8 }]],
  ["rockabilly",            [{ genre: "Rock", weight: 1.0 }]],
  ["punk",                  [{ genre: "Rock", weight: 1.0 }]],
  ["metal",                 [{ genre: "Rock", weight: 1.0 }]],

  // ── Country family ─────────────────────────────────────────
  ["country",               [{ genre: "Country", weight: 1.0 }]],
  ["contemporary country",  [{ genre: "Country", weight: 1.0 }]],
  ["country pop",           [{ genre: "Country", weight: 0.7 }, { genre: "Pop", weight: 0.5 }]],
  ["modern country rock",   [{ genre: "Country", weight: 0.7 }, { genre: "Rock", weight: 0.4 }]],
  ["texas country",         [{ genre: "Country", weight: 1.0 }]],
  ["country road",          [{ genre: "Country", weight: 1.0 }]],

  // ── K-Pop family ───────────────────────────────────────────
  ["k-pop",                 [{ genre: "K-Pop", weight: 1.0 }]],
  ["kpop",                  [{ genre: "K-Pop", weight: 1.0 }]],
  ["k-pop boy group",       [{ genre: "K-Pop", weight: 1.0 }]],
  ["k-pop girl group",      [{ genre: "K-Pop", weight: 1.0 }]],

  // ── Afrobeats family ───────────────────────────────────────
  ["afrobeats",             [{ genre: "Afrobeats", weight: 1.0 }]],
  ["afropop",               [{ genre: "Afrobeats", weight: 0.8 }, { genre: "Pop", weight: 0.3 }]],
  ["afro dancehall",        [{ genre: "Afrobeats", weight: 1.0 }]],
  ["afroswing",             [{ genre: "Afrobeats", weight: 0.8 }, { genre: "Hip Hop/Rap", weight: 0.3 }]],
  ["azonto",                [{ genre: "Afrobeats", weight: 1.0 }]],
  ["nigerian pop",          [{ genre: "Afrobeats", weight: 0.8 }, { genre: "Pop", weight: 0.3 }]],
  ["nigerian hip hop",      [{ genre: "Afrobeats", weight: 0.7 }, { genre: "Hip Hop/Rap", weight: 0.5 }]],
  ["gqom",                  [{ genre: "Afrobeats", weight: 0.8 }]],
  ["alte",                  [{ genre: "Afrobeats", weight: 0.8 }]],

  // ── Niche → nearest parent (reduces "Other") ──────────────
  ["hollywood",             [{ genre: "Pop", weight: 0.3 }]],
  ["show tunes",            [{ genre: "Pop", weight: 0.3 }]],
  ["sad lo-fi",             [{ genre: "Hip Hop/Rap", weight: 0.5 }]],
  ["ninja",                 [{ genre: "Hip Hop/Rap", weight: 0.5 }]],
  ["bboy",                  [{ genre: "Hip Hop/Rap", weight: 0.5 }]],
  ["modern funk",           [{ genre: "R&B", weight: 0.6 }]],
  ["instrumental funk",     [{ genre: "R&B", weight: 0.5 }]],
  ["funk",                  [{ genre: "R&B", weight: 0.5 }]],
  ["black americana",       [{ genre: "R&B", weight: 0.5 }]],
]);

// Tier 2: Keyword fallback for tags not in TAG_MAP.
// Scanned in order; multiple keywords can match within one tag.
const KEYWORD_RULES: { kw: string; genre: string; weight: number }[] = [
  { kw: "hip hop",   genre: "Hip Hop/Rap", weight: 0.8 },
  { kw: "rap",       genre: "Hip Hop/Rap", weight: 0.8 },
  { kw: "trap",      genre: "Hip Hop/Rap", weight: 0.7 },
  { kw: "drill",     genre: "Hip Hop/Rap", weight: 0.7 },
  { kw: "reggaeton", genre: "Latin",       weight: 0.8 },
  { kw: "latin",     genre: "Latin",       weight: 0.7 },
  { kw: "r&b",       genre: "R&B",         weight: 0.7 },
  { kw: "soul",      genre: "R&B",         weight: 0.6 },
  { kw: "rock",      genre: "Rock",        weight: 0.7 },
  { kw: "metal",     genre: "Rock",        weight: 0.8 },
  { kw: "punk",      genre: "Rock",        weight: 0.7 },
  { kw: "country",   genre: "Country",     weight: 0.8 },
  { kw: "edm",       genre: "EDM/Dance",   weight: 0.8 },
  { kw: "house",     genre: "EDM/Dance",   weight: 0.7 },
  { kw: "techno",    genre: "EDM/Dance",   weight: 0.8 },
  { kw: "trance",    genre: "EDM/Dance",   weight: 0.8 },
  { kw: "dance",     genre: "EDM/Dance",   weight: 0.4 },
  { kw: "k-pop",     genre: "K-Pop",       weight: 0.9 },
  { kw: "kpop",      genre: "K-Pop",       weight: 0.9 },
  { kw: "afro",      genre: "Afrobeats",   weight: 0.6 },
  { kw: "pop",       genre: "Pop",         weight: 0.5 },
];

// Priority order for tiebreaking (lower index = higher priority)
const GENRE_PRIORITY: string[] = [
  "Pop", "Hip Hop/Rap", "Latin", "R&B", "Rock",
  "EDM/Dance", "Country", "K-Pop", "Afrobeats", "Other",
];

export function classifyGenre(raw: string | null): string {
  if (!raw) return "Other";

  // Parse: split by comma, trim, normalize, remove brackets/quotes
  const cleaned = raw.replace(/[\[\]"']/g, "");
  const tags = cleaned.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tags.length === 0) return "Other";

  // Accumulate scores per parent genre
  const scores: Record<string, number> = {};

  for (const tag of tags) {
    const exact = TAG_MAP.get(tag);
    if (exact) {
      for (const { genre, weight } of exact) {
        scores[genre] = (scores[genre] || 0) + weight;
      }
    } else {
      // Keyword fallback for unknown tags
      for (const { kw, genre, weight } of KEYWORD_RULES) {
        if (tag.includes(kw)) {
          scores[genre] = (scores[genre] || 0) + weight;
        }
      }
    }
  }

  // Pick winner (highest score, tiebreak by priority)
  const entries = Object.entries(scores);
  if (entries.length === 0) return "Other";

  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return GENRE_PRIORITY.indexOf(a[0]) - GENRE_PRIORITY.indexOf(b[0]);
  });

  return entries[0][0];
}

export const GENRE_COLORS: Record<string, string> = {
  "Pop": "#8B5CF6",
  "Hip Hop/Rap": "#EF4444",
  "Latin": "#F59E0B",
  "R&B": "#10B981",
  "EDM/Dance": "#3B82F6",
  "Rock": "#6366F1",
  "Country": "#D97706",
  "K-Pop": "#EC4899",
  "Afrobeats": "#F97316",
  "Other": "#9CA3AF",
};

// ---------- Paginated fetch helper ----------

async function paginatedFetch<T>(
  table: string,
  select: string,
  orderBy: string,
  maxRows = 100_000
): Promise<T[]> {
  const supabase = createSupabaseClient();
  const PAGE_SIZE = 1000;
  let rows: T[] = [];
  let offset = 0;

  while (rows.length < maxRows) {
    const { data: page, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    if (!page?.length) break;

    rows = rows.concat(page as T[]);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

// ---------- Deduplication ----------

/**
 * Deduplicate songs that share the same (track_name, artist_name) but have
 * different track_ids (e.g. clean vs explicit, single vs album version).
 * Keeps the entry with the most weeks on chart for richer context.
 */
export function deduplicateSummaries<T extends { track_name: string; artist_name: string; weeks_on_chart: number }>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.track_name.toLowerCase()}|${row.artist_name.toLowerCase()}`;
    const existing = best.get(key);
    if (!existing || row.weeks_on_chart > existing.weeks_on_chart) {
      best.set(key, row);
    }
  }
  return Array.from(best.values());
}

// ---------- Data fetchers ----------

export async function fetchSongSummaries(): Promise<SongSummary[]> {
  const raw = await paginatedFetch<SongSummary>(
    "song_summary",
    "track_id, track_name, artist_name, album_img, weeks_on_chart, peak_rank, max_streams, avg_streams, first_week, last_week, release_date, artist_genres",
    "peak_rank"
  );
  return deduplicateSummaries(raw);
}

export async function fetchSongTrajectories(trackIds: string[]): Promise<SongTrajectory[]> {
  const supabase = createSupabaseClient();
  const PAGE_SIZE = 1000;
  let rows: SongTrajectory[] = [];
  let offset = 0;

  while (true) {
    const { data: page, error } = await supabase
      .from("song_trajectories")
      .select("track_id, track_name, artist_name, album_img, week, rank, streams")
      .in("track_id", trackIds)
      .order("week", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!page?.length) break;

    rows = rows.concat(page as SongTrajectory[]);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function fetchWeeklyAttributes(): Promise<WeeklyAttributes[]> {
  return paginatedFetch<WeeklyAttributes>(
    "weekly_attribute_trends",
    "*",
    "week"
  );
}

export async function fetchGenreData(): Promise<GenreRow[]> {
  return paginatedFetch<GenreRow>(
    "weekly_genre_data",
    "week, rank, streams, artist_genres, duration, track_id, track_name, artist_name",
    "week"
  );
}

// ---------- Spotify lifespan context for song deep dive ----------

export type SpotifyLifespanBucket = { bucket: string; min: number; max: number; count: number };

export type SpotifyLifespanContext = {
  /** Distribution of weeks_on_chart for songs in the same year (equal 5-week bins) */
  yearDistribution: SpotifyLifespanBucket[];
  /** Distribution of weeks_on_chart for songs in the same genre+year */
  genreDistribution: SpotifyLifespanBucket[];
  /** Average weeks on chart for all songs that year */
  yearAvg: number;
  /** Average weeks on chart for songs in the same genre that year */
  genreAvg: number;
  /** Genre label */
  genreLabel: string;
  /** Total unique songs that charted that year */
  totalSongsInYear: number;
  /** Percentile: % of songs in that year with fewer weeks on chart */
  percentileInYear: number;
};

const SPOTIFY_BUCKET_RANGES = [
  { label: "1-5", min: 1, max: 5 },
  { label: "6-10", min: 6, max: 10 },
  { label: "11-15", min: 11, max: 15 },
  { label: "16-20", min: 16, max: 20 },
  { label: "21-25", min: 21, max: 25 },
  { label: "26-30", min: 26, max: 30 },
  { label: "31-35", min: 31, max: 35 },
  { label: "36-40", min: 36, max: 40 },
  { label: "41-45", min: 41, max: 45 },
];

function toSpotifyBucket(weeks: number): string | null {
  for (const b of SPOTIFY_BUCKET_RANGES) {
    if (weeks >= b.min && weeks <= b.max) return b.label;
  }
  return null; // beyond histogram range — song marker handles this
}

/**
 * Fetch Spotify lifespan context for a song: how its weeks_on_chart
 * compares to other songs in the same year and genre.
 */
export async function fetchSpotifyLifespanContext(
  songWeeks: number,
  firstWeek: string,
  genre: string,
): Promise<SpotifyLifespanContext> {
  const supabase = createSupabaseClient();
  const year = firstWeek.slice(0, 4);

  // Fetch all song summaries that first appeared in the same year
  const { data: rows } = await supabase
    .from("song_summary")
    .select("weeks_on_chart, artist_genres")
    .gte("first_week", `${year}-01-01`)
    .lte("first_week", `${year}-12-31`);

  if (!rows?.length) {
    return {
      yearDistribution: SPOTIFY_BUCKET_RANGES.map((b) => ({ bucket: b.label, min: b.min, max: b.max, count: 0 })),
      genreDistribution: SPOTIFY_BUCKET_RANGES.map((b) => ({ bucket: b.label, min: b.min, max: b.max, count: 0 })),
      yearAvg: 0,
      genreAvg: 0,
      genreLabel: genre,
      totalSongsInYear: 0,
      percentileInYear: 50,
    };
  }

  type Row = { weeks_on_chart: number; artist_genres: string | null };
  const typedRows = rows as Row[];

  // Overall year stats
  const allWeeks = typedRows.map((r) => r.weeks_on_chart);
  const totalSongsInYear = allWeeks.length;
  const yearAvg = allWeeks.reduce((a, b) => a + b, 0) / totalSongsInYear;

  // Percentile within year
  const fewerThan = allWeeks.filter((w) => w < songWeeks).length;
  const percentileInYear = Math.round((fewerThan / totalSongsInYear) * 100);

  // Build histogram (equal 5-week bins; songs beyond 45w are not binned)
  const bucketCounts = new Map<string, number>();
  for (const w of allWeeks) {
    const b = toSpotifyBucket(w);
    if (b) bucketCounts.set(b, (bucketCounts.get(b) || 0) + 1);
  }
  const yearDistribution: SpotifyLifespanBucket[] = SPOTIFY_BUCKET_RANGES.map((b) => ({
    bucket: b.label,
    min: b.min,
    max: b.max,
    count: bucketCounts.get(b.label) || 0,
  }));

  // Genre stats
  const genreRows = typedRows.filter((r) => classifyGenre(r.artist_genres) === genre);
  const genreAvg = genreRows.length
    ? genreRows.reduce((s, r) => s + r.weeks_on_chart, 0) / genreRows.length
    : yearAvg;

  // Genre distribution (same bins as year)
  const genreBucketCounts = new Map<string, number>();
  for (const r of genreRows) {
    const b = toSpotifyBucket(r.weeks_on_chart);
    if (b) genreBucketCounts.set(b, (genreBucketCounts.get(b) || 0) + 1);
  }
  const genreDistribution: SpotifyLifespanBucket[] = SPOTIFY_BUCKET_RANGES.map((b) => ({
    bucket: b.label,
    min: b.min,
    max: b.max,
    count: genreBucketCounts.get(b.label) || 0,
  }));

  return {
    yearDistribution,
    genreDistribution,
    yearAvg,
    genreAvg,
    genreLabel: genre,
    totalSongsInYear,
    percentileInYear,
  };
}

// ---------- Longevity classification: Impact × Endurance ----------
// Two continuous scores derive from peak_rank and weeks_on_chart.
// Quadrant position on these two axes determines the category label.

export type LongevityCategory = "viral" | "lasting" | "slow_burn" | "flash";

export const IMPACT_THRESHOLD = 0.35; // peak ~#14 or higher → "high impact"
export const ENDURANCE_THRESHOLD = 0.50; // ~10 weeks or more → "high endurance"

export function songImpactScore(peakRank: number): number {
  // #1 → 1.00, #14 → 0.50, #50 → 0.26, #200 → 0.00
  return Math.max(0, Math.min(1, 1 - Math.log(Math.max(peakRank, 1)) / Math.log(200)));
}

export function songEnduranceScore(weeks: number): number {
  // 1w → 0.00, 4w → 0.31, 8w → 0.46, 15w → 0.60, 50w → 0.87, 90w → 1.00
  return Math.max(0, Math.min(1, Math.log(Math.max(weeks, 1)) / Math.log(90)));
}

export function classifySongLongevity(summary: SongSummary): LongevityCategory {
  const impact = songImpactScore(summary.peak_rank);
  const endurance = songEnduranceScore(summary.weeks_on_chart);

  if (impact >= IMPACT_THRESHOLD && endurance < ENDURANCE_THRESHOLD) return "viral";
  if (impact >= IMPACT_THRESHOLD && endurance >= ENDURANCE_THRESHOLD) return "lasting";
  if (impact < IMPACT_THRESHOLD && endurance >= ENDURANCE_THRESHOLD) return "slow_burn";
  return "flash";
}

export const LONGEVITY_COLORS: Record<LongevityCategory, string> = {
  viral: "#EF4444",
  lasting: "#1DB954",
  slow_burn: "#3B82F6",
  flash: "#71717a",
};

export const LONGEVITY_LABELS: Record<LongevityCategory, string> = {
  viral: "Viral",
  lasting: "Lasting",
  slow_burn: "Slow Burn",
  flash: "Flash",
};

// ---------- Longevity category context for song deep dive ----------

export type LongevityCategoryStats = {
  category: string;
  count: number;
  avgWeeks: number;
  avgPeakRank: number;
};

export type LongevityCategoryContext = {
  categoryDistribution: LongevityCategoryStats[];
  songCategory: LongevityCategory;
  totalSongs: number;
  sameCategoryCount: number;
  percentileInCategory: number;
};

export async function fetchLongevityCategoryContext(
  songWeeks: number,
  songPeakRank: number,
): Promise<LongevityCategoryContext> {
  type Row = { weeks_on_chart: number; peak_rank: number };
  const typedRows = await paginatedFetch<Row>(
    "song_summary",
    "weeks_on_chart, peak_rank",
    "peak_rank",
  );

  if (!typedRows.length) {
    return {
      categoryDistribution: [],
      songCategory: "flash",
      totalSongs: 0,
      sameCategoryCount: 0,
      percentileInCategory: 50,
    };
  }

  const categorized = typedRows.map((r) => {
    const cat = classifySongLongevity({ peak_rank: r.peak_rank, weeks_on_chart: r.weeks_on_chart } as SongSummary);
    return { ...r, category: cat };
  });

  const catGroups = new Map<string, Row[]>();
  for (const row of categorized) {
    const arr = catGroups.get(row.category) || [];
    arr.push(row);
    catGroups.set(row.category, arr);
  }

  const categoryOrder: LongevityCategory[] = ["viral", "lasting", "slow_burn", "flash"];
  const categoryDistribution: LongevityCategoryStats[] = categoryOrder.map((cat) => {
    const group = catGroups.get(cat) || [];
    return {
      category: cat,
      count: group.length,
      avgWeeks: group.length ? group.reduce((s, r) => s + r.weeks_on_chart, 0) / group.length : 0,
      avgPeakRank: group.length ? group.reduce((s, r) => s + r.peak_rank, 0) / group.length : 0,
    };
  });

  const songCategory = classifySongLongevity({ peak_rank: songPeakRank, weeks_on_chart: songWeeks } as SongSummary);

  const sameCategory = categorized.filter((r) => r.category === songCategory);
  const fewerWeeks = sameCategory.filter((r) => r.weeks_on_chart < songWeeks).length;
  const percentileInCategory = sameCategory.length
    ? Math.round((fewerWeeks / sameCategory.length) * 100)
    : 50;

  return {
    categoryDistribution,
    songCategory,
    totalSongs: typedRows.length,
    sameCategoryCount: sameCategory.length,
    percentileInCategory,
  };
}
