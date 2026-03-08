export type SongStoryChapter = {
  title: string;
  label: string;
  narrative: string;
  /** Per-beat text for scrollytelling (beat 0 uses title only, beats 1+ use these) */
  beats?: string[];
};

export type FeaturedSongData = {
  slug: string;
  trackName: string;
  artistName: string;
  genre: string;
  /** Used to find the song in Supabase — match against track_name */
  trackNameQuery: string;
  artistNameQuery: string;
  chapters: {
    rise: SongStoryChapter;
    sound: SongStoryChapter;
    context: SongStoryChapter;
  };
  outro: string;
};

export const FEATURED_SONGS: FeaturedSongData[] = [
  {
    slug: "blinding-lights-the-weeknd",
    trackName: "Blinding Lights",
    artistName: "The Weeknd",
    genre: "Pop",
    trackNameQuery: "Blinding Lights",
    artistNameQuery: "The Weeknd",
    chapters: {
      rise: {
        label: "Chapter 1",
        title: "The Rise",
        narrative:
          "Released in late November 2019, \"Blinding Lights\" didn't just debut — it planted a flag. Within weeks it was climbing the global charts, driven by its irresistible synth-wave hook and a Super Bowl halftime performance that cemented it as a cultural moment. But what makes this song remarkable isn't its peak — it's the fact that it never really left. Week after week, it held its ground in the Top 200, a sustained presence in an era where most songs spike and vanish. Its trajectory is the textbook definition of a sustained hit.",
      },
      sound: {
        label: "Chapter 2",
        title: "The Sound",
        narrative:
          "\"Blinding Lights\" is a sonic outlier in its era. While the charts in 2020 leaned heavily into hip hop production and trap-influenced beats, The Weeknd reached back to the 1980s — pulsing synths, a driving tempo, and a soaring falsetto chorus. Its energy and danceability scores sit above the chart average, but its acousticness is notably low — this is a fully produced, maximalist pop record. The high valence (musical positivity) is unusual for The Weeknd, whose catalog tends darker. The song carved its own lane.",
      },
      context: {
        label: "Chapter 3",
        title: "The Context",
        narrative:
          "When \"Blinding Lights\" charted, Pop was in a transitional moment. Hip Hop/Rap had been steadily eating into Pop's chart share since 2017, and Latin music was riding a post-\"Despacito\" wave. Yet here was a Pop song — one that sounded nothing like the TikTok-driven pop hits around it — dominating the charts. It served as proof that a well-crafted pop record could still cut through, even in hip hop's streaming-era dominance.",
      },
    },
    outro:
      "\"Blinding Lights\" is one of the most enduring chart presences of the streaming era — a sustained hit that defied the viral-and-vanish pattern dominating modern charts.",
  },
  {
    slug: "old-town-road-lil-nas-x",
    trackName: "Old Town Road",
    artistName: "Lil Nas X",
    genre: "Hip Hop/Country",
    trackNameQuery: "Old Town Road",
    artistNameQuery: "Lil Nas X",
    chapters: {
      rise: {
        label: "Chapter 1",
        title: "The Rise",
        narrative:
          "\"Old Town Road\" is the ultimate viral origin story. Starting as a meme on TikTok in early 2019, the song's absurd country-trap fusion caught fire before the music industry even knew what was happening. After being controversially removed from Billboard's Country chart, the ensuing discourse only fueled its virality. Lil Nas X recruited Billy Ray Cyrus for a remix, and the song rocketed to #1 on the Spotify charts where it camped for weeks. Its trajectory is a near-vertical spike — zero to global phenomenon in a matter of days.",
      },
      sound: {
        label: "Chapter 2",
        title: "The Sound",
        narrative:
          "Sonically, \"Old Town Road\" broke every rule. At just 1 minute and 53 seconds, it's dramatically shorter than the chart average. Its genre classification baffled the industry — banjo samples over a trap beat, country-inflected vocals over 808s. The song's danceability and energy are moderate, but its speechiness is elevated, reflecting the talk-singing style. It's a song that exists in the cracks between genres, and that ambiguity was part of its power.",
      },
      context: {
        label: "Chapter 3",
        title: "The Context",
        narrative:
          "\"Old Town Road\" arrived at a fascinating genre inflection point. Hip Hop/Rap had been the chart's dominant force, but Country was virtually absent from the global streaming Top 200. By blending the two, Lil Nas X created something that didn't fit neatly into any category — and in doing so, exposed the arbitrary nature of genre boundaries in the streaming age. The song's success arguably paved the way for more genre-fluid hits in the years that followed.",
      },
    },
    outro:
      "\"Old Town Road\" didn't just chart — it rewrote the rules of how songs go viral, how genres are defined, and how short a song can be while still dominating global streaming.",
  },
  {
    slug: "drivers-license-olivia-rodrigo",
    trackName: "drivers license",
    artistName: "Olivia Rodrigo",
    genre: "Pop",
    trackNameQuery: "drivers license",
    artistNameQuery: "Olivia Rodrigo",
    chapters: {
      rise: {
        label: "Chapter 1",
        title: "The Rise",
        narrative:
          "On January 8, 2021, a relatively unknown Disney+ actress released her debut single — and broke Spotify's record for most streams in a single day. \"drivers license\" arrived with a wave of parasocial intrigue (fans dissected the love triangle behind the lyrics in real time), but it was the raw emotional power of the songwriting that kept it at the top. The song debuted at #1 and held firm. This wasn't a slow burn — it was an instant supernova, powered by a perfect storm of social media buzz and genuine artistic quality.",
      },
      sound: {
        label: "Chapter 2",
        title: "The Sound",
        narrative:
          "\"drivers license\" is a ballad in a chart landscape dominated by upbeat, high-energy tracks. Its acousticness is significantly higher than the chart average, and its energy and danceability scores sit well below the norm. The song builds from a spare, piano-driven verse to a cathartic, distorted guitar bridge — a dynamic range that most streaming-optimized songs avoid. At 4 minutes and 2 seconds, it's also longer than the shrinking chart average, proving that emotional depth can still command attention.",
      },
      context: {
        label: "Chapter 3",
        title: "The Context",
        narrative:
          "By January 2021, Pop's chart share had been gradually declining as Hip Hop/Rap and Latin music expanded. \"drivers license\" represented a different kind of Pop breakthrough — not the polished, Max Martin-style hit factory, but a confessional singer-songwriter record that felt more like indie folk dressed in pop production. It arrived alongside a broader trend of emotional vulnerability in chart music, partly driven by the pandemic's influence on listening habits.",
      },
    },
    outro:
      "\"drivers license\" proved that in the age of algorithmic playlists and 30-second TikTok clips, a nearly four-minute heartbreak ballad could still be the biggest song in the world.",
  },
  {
    slug: "dance-monkey-tones-and-i",
    trackName: "Dance Monkey",
    artistName: "Tones and I",
    genre: "Pop/EDM",
    trackNameQuery: "Dance Monkey",
    artistNameQuery: "Tones and I",
    chapters: {
      rise: {
        label: "Chapter 1",
        title: "The Rise",
        narrative:
          "\"Dance Monkey\" is the quintessential slow burn. Released in May 2019 by an Australian busker, the song started as a modest chart entry before gradually climbing week after week. While \"Old Town Road\" was dominating headlines with its viral sprint, \"Dance Monkey\" was quietly building momentum — first in Australia, then Europe, then globally. It took months to reach its peak, but once there, it proved nearly impossible to dislodge. Its trajectory is a steady upward ramp rather than a spike — the anti-viral viral hit.",
      },
      sound: {
        label: "Chapter 2",
        title: "The Sound",
        narrative:
          "The song's most distinctive feature is Tones and I's vocal delivery — a high-pitched, almost cartoonish tone that divided listeners but proved undeniably catchy. Musically, \"Dance Monkey\" hits high marks for danceability and energy, with a tempo and beat structure designed for maximum repeatability. Its valence is high — this is an unambiguously upbeat song. The production is sparse but effective, built around a minimal beat and that unforgettable vocal hook. It's engineered for earworm status.",
      },
      context: {
        label: "Chapter 3",
        title: "The Context",
        narrative:
          "\"Dance Monkey\" charted during a period when the global Top 200 was increasingly dominated by American and Latin artists. As an Australian artist with no major label backing, Tones and I was an extreme outlier. The song's success highlighted how streaming platforms could enable truly global hits from outside traditional music industry power centers. Its genre — a blend of pop, electropop, and dance — sat comfortably in the EDM/Dance category that had been slowly losing chart share to Hip Hop. \"Dance Monkey\" was a reminder that genre trends don't tell the whole story.",
      },
    },
    outro:
      "\"Dance Monkey\" climbed patiently while others spiked and faded — a global phenomenon built on pure earworm power rather than viral mechanics.",
  },
];

// Homepage card data — editorial songs with album art and hooks
const CARD_META: Record<string, { albumImg: string; hook: string }> = {
  "blinding-lights-the-weeknd": {
    albumImg: "https://i.scdn.co/image/ab67616d00001e028863bc11d2aa12b54f5aeb36",
    hook: "Spent 90 weeks on the chart — the definition of sustained dominance",
  },
  "old-town-road-lil-nas-x": {
    albumImg: "https://i.scdn.co/image/ab67616d00001e02e73b5c4003a5a633eeab058e",
    hook: "Genre-bending viral hit that broke the record for weeks at #1",
  },
  "drivers-license-olivia-rodrigo": {
    albumImg: "https://i.scdn.co/image/ab67616d00001e02a91c10fe9472d9bd535571d7",
    hook: "Debuted at #1 with record-breaking first-week streams",
  },
  "dance-monkey-tones-and-i": {
    albumImg: "https://i.scdn.co/image/ab67616d00001e021b8ae67b3e59f1ad3340c22a",
    hook: "A slow-burn global phenomenon that climbed for months",
  },
};

export const FEATURED_SONG_CARDS = FEATURED_SONGS.map((song) => ({
  slug: song.slug,
  title: song.trackName,
  artist: song.artistName,
  albumImg: CARD_META[song.slug]?.albumImg ?? null,
  hook: CARD_META[song.slug]?.hook ?? "",
}));
