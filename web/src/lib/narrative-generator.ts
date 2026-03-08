import type { SongStoryChapter } from "@/data/featured-songs";

type SongStats = {
  trackName: string;
  artistName: string;
  genre: string;
  peakRank: number;
  weeksOnChart: number;
  maxStreams: number;
  firstWeek: string;
  lastWeek: string;
  songFeatures: {
    danceability: number;
    energy: number;
    valence: number;
    acousticness: number;
    speechiness: number;
    tempo: number;
  };
  eraAverage: {
    danceability: number;
    energy: number;
    valence: number;
    acousticness: number;
    speechiness: number;
    tempo: number;
  };
  trajectory: { week: string; rank: number }[];
};

// ---------- Helpers ----------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatStreams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function compareWord(val: number, avg: number): string {
  const diff = val - avg;
  const pct = avg > 0 ? Math.abs(diff / avg) : 0;
  if (pct < 0.05) return "right at";
  if (diff > 0) return pct > 0.25 ? "well above" : "above";
  return pct > 0.25 ? "well below" : "below";
}

function featureDescriptor(feature: string, value: number): string {
  const descriptors: Record<string, [string, string]> = {
    danceability: ["groove-driven and rhythmically infectious", "less dance-oriented"],
    energy: ["high-energy and intense", "restrained and mellow"],
    valence: ["upbeat and musically positive", "darker and more introspective"],
    acousticness: ["acoustically rich and organic", "heavily produced and electronic"],
    speechiness: ["vocal-forward and talk-driven", "melodically sung"],
    tempo: ["fast-paced", "slower and more deliberate"],
  };
  const [high, low] = descriptors[feature] || ["distinctive", "moderate"];
  return value > 0.6 ? high : value < 0.35 ? low : `moderate in ${feature}`;
}

// ---------- Chapter Generators ----------

function buildRiseNarrative(stats: SongStats): SongStoryChapter {
  const { trackName, artistName, peakRank, weeksOnChart, maxStreams, firstWeek, trajectory } = stats;
  const debutMonth = formatDate(firstWeek);
  const firstRank = trajectory[0]?.rank ?? 100;
  const peakWeekIdx = trajectory.findIndex((t) => t.rank === peakRank);
  const weeksToPeak = peakWeekIdx >= 0 ? peakWeekIdx + 1 : weeksOnChart;

  // Beat 0: Chapter intro (shown with empty axes)
  const beat0 = `In ${debutMonth}, "${trackName}" by ${artistName} entered the Spotify Global Top 200. Let\u2019s trace its journey through the chart.`;

  // Beat 1: Line draws — describe the trajectory shape
  let beat1: string;
  if (peakRank <= 10 && weeksToPeak <= 2) {
    beat1 = `The song exploded onto the chart at #${firstRank}${firstRank <= 10 ? " \u2014 an immediate top-10 entry" : ""}, climbing to #${peakRank} within ${weeksToPeak === 1 ? "its first week" : "just two weeks"}. ${weeksOnChart <= 8 ? "A classic viral spike pattern." : "An explosive debut that held on longer than most."}`;
  } else if (weeksToPeak >= 5 && peakRank <= 30) {
    beat1 = `Entering at #${firstRank}, the song took ${weeksToPeak} weeks of steady climbing to reach its peak \u2014 a textbook slow burn, building momentum through word of mouth and playlist placement.`;
  } else if (weeksOnChart >= 15) {
    beat1 = `The trajectory tells a story of endurance: ${weeksOnChart} weeks on the chart, holding position week after week. This is the kind of sustained presence that separates cultural staples from passing trends.`;
  } else {
    beat1 = `${trackName} spent ${weeksOnChart} weeks in the Top 200, ${weeksToPeak <= 3 ? "climbing quickly to its peak" : `taking ${weeksToPeak} weeks to find its stride`}. ${weeksOnChart > 10 ? "A solid chart run by any measure." : "A brief but notable appearance."}`;
  }

  // Beat 2: Peak annotation — highlight the peak moment
  const beat2 = `The peak: #${peakRank}. ${peakRank === 1 ? "The very top of the global chart \u2014 the most-streamed song in the world that week." : peakRank <= 10 ? `A top-10 position, placing it among the most-streamed songs globally.` : peakRank <= 50 ? `A strong showing in the upper half of the chart.` : `Fighting for position in a field of 200 of the world\u2019s most-streamed songs.`}`;

  // Beat 3: Streams overlay
  const beat3 = maxStreams > 0
    ? `At its peak, "${trackName}" was pulling ${formatStreams(maxStreams)} streams per week. The amber bars show streaming volume alongside chart position \u2014 ${maxStreams > 10_000_000 ? "massive numbers that reflect genuine cultural reach." : "solid streaming numbers that kept it on the chart."}`
    : `The chart position tells one side of the story. ${weeksOnChart >= 10 ? "Staying in the Top 200 for this long requires consistent streaming week after week." : "Even a short chart run means competing with the world\u2019s biggest songs."}`;

  const narrative = `In ${debutMonth}, "${trackName}" by ${artistName} entered the Spotify Global Top 200 at #${firstRank}. ${beat1} ${beat2}${maxStreams > 0 ? ` ${beat3}` : ""}`;

  return {
    label: "Chapter 1",
    title: "The Rise",
    narrative,
    beats: [beat0, beat1, beat2, beat3],
  };
}

function buildSoundNarrative(stats: SongStats): SongStoryChapter {
  const { trackName, songFeatures, eraAverage } = stats;
  const year = stats.firstWeek.slice(0, 4);

  const features = ["danceability", "energy", "valence", "acousticness", "speechiness"] as const;
  const deltas = features.map((f) => ({
    feature: f,
    value: songFeatures[f],
    avg: eraAverage[f],
    delta: Math.abs(songFeatures[f] - eraAverage[f]),
  }));
  deltas.sort((a, b) => b.delta - a.delta);

  // Overall character
  const character =
    songFeatures.energy > 0.7 && songFeatures.danceability > 0.7
      ? "a high-energy, dance-floor-ready track"
      : songFeatures.acousticness > 0.5
        ? "an acoustically driven record that stands apart from the heavily produced chart norm"
        : songFeatures.valence < 0.3
          ? "a sonically moody piece that leans into emotional weight"
          : "a song that carves its own sonic lane";

  // Beat 0: intro with empty radar
  const beat0 = `Every song has a sonic fingerprint. Let\u2019s break down the audio DNA of "${trackName}" and see how it compares to what else was charting in ${year}.`;

  // Beat 1: era average appears
  const beat1 = `The gray shape shows the average audio profile of songs in the ${year} Spotify Top 200. This is the sonic baseline \u2014 the "typical" charting song that year across six dimensions: danceability, energy, valence, acousticness, speechiness, and tempo.`;

  // Beat 2: song polygon overlays
  const beat2 = `Now here\u2019s "${trackName}" in blue. It\u2019s ${character}. Notice where the blue shape extends beyond or shrinks inside the gray \u2014 those are the dimensions where this song stands apart from the pack.`;

  // Beat 3: distinctive features highlighted
  const top2 = deltas.slice(0, 2);
  const featureDescs = top2.map((t) => {
    const cmp = compareWord(t.value, t.avg);
    return `${t.feature} (${t.value.toFixed(2)}) is ${cmp} the chart average of ${t.avg.toFixed(2)}, making it ${featureDescriptor(t.feature, t.value)}`;
  });
  const beat3 = `The most distinctive features: ${featureDescs.join("; and ")}. ${deltas[0].delta > 0.2 ? "These differences are significant \u2014 this song occupies a distinctly different sonic space than most of its chart neighbors." : "These subtle differences add up to a unique listening experience, even within a crowded chart."}`;

  const featureLines = deltas.slice(0, 3).map((t) => {
    const cmp = compareWord(t.value, t.avg);
    return `Its ${t.feature} (${t.value.toFixed(2)}) sits ${cmp} the ${year} chart average of ${t.avg.toFixed(2)} \u2014 making it ${featureDescriptor(t.feature, t.value)}.`;
  });
  const narrative = `"${trackName}" is ${character}. How does it compare to what else was charting? ${featureLines.join(" ")}`;

  return {
    label: "Chapter 2",
    title: "The Sound",
    narrative,
    beats: [beat0, beat1, beat2, beat3],
  };
}

function buildContextNarrative(stats: SongStats): SongStoryChapter {
  const { trackName, genre, firstWeek } = stats;
  const year = firstWeek.slice(0, 4);

  const genreContexts: Record<string, string> = {
    "Pop": `Pop has long been the chart\u2019s dominant force, but its share has been gradually shrinking as Hip Hop/Rap and Latin music expand.`,
    "Hip Hop/Rap": `By ${year}, Hip Hop/Rap had established itself as the streaming era\u2019s powerhouse genre, consistently commanding a growing share of the global Top 200.`,
    "Latin": `Latin music has been one of the streaming era\u2019s biggest growth stories, expanding from a niche presence to a chart staple.`,
    "R&B": `R&B occupies a steady but modest slice of the streaming charts \u2014 never dominant, but always present.`,
    "EDM/Dance": `EDM and Dance music peaked in chart presence around 2017-2018 before gradually losing ground to Hip Hop and Latin.`,
    "Rock": `Rock\u2019s presence in the global streaming Top 200 has been minimal \u2014 a genre whose audience lives more in album sales and concerts than playlist culture.`,
    "K-Pop": `K-Pop\u2019s global streaming presence has surged in the late 2010s, with dedicated fanbases driving coordinated streaming efforts.`,
    "Country": `Country music rarely appears in the global Spotify Top 200, which skews heavily toward pop, hip hop, and Latin.`,
  };

  const genreNote = genreContexts[genre] || `${genre} occupies its own niche in the global streaming landscape.`;

  // Beat 0: intro with empty axes
  const beat0 = `No song charts in a vacuum. Let\u2019s zoom out and see where "${trackName}" fits in the larger genre landscape of the Spotify Top 200.`;

  // Beat 1: all genres appear (equal opacity)
  const beat1 = `This stacked area chart shows how genre shares in the Top 200 shifted from 2017 to 2021. Each color represents a genre\u2019s share of the chart. The streaming era has reshuffled which genres dominate \u2014 and the shifts are dramatic.`;

  // Beat 2: highlight song's genre
  const beat2 = `Now let\u2019s highlight ${genre}. ${genreNote} When "${trackName}" charted in ${year}, it entered this competitive landscape as a ${genre} entry.`;

  // Beat 3: on-chart band
  const beat3 = `The blue band marks the exact period when "${trackName}" was on the chart. Notice ${genre}\u2019s share during that window \u2014 this is the genre context the song was competing in, and it shaped what listeners were discovering alongside it.`;

  const narrative = `${genreNote} When "${trackName}" charted, it entered a genre landscape shaped by these shifts. The stacked area chart shows how genre shares moved over time \u2014 with ${genre} highlighted. The blue band marks this song\u2019s time on chart.`;

  return {
    label: "Chapter 3",
    title: "The Context",
    narrative,
    beats: [beat0, beat1, beat2, beat3],
  };
}

// ---------- Main Export ----------

export function generateNarrative(stats: SongStats): {
  chapters: { rise: SongStoryChapter; sound: SongStoryChapter; context: SongStoryChapter };
  outro: string;
} {
  const chapters = {
    rise: buildRiseNarrative(stats),
    sound: buildSoundNarrative(stats),
    context: buildContextNarrative(stats),
  };

  const outro =
    stats.weeksOnChart >= 15
      ? `"${stats.trackName}" by ${stats.artistName} spent ${stats.weeksOnChart} weeks in the Spotify Global Top 200, peaking at #${stats.peakRank} \u2014 a sustained presence that speaks to the song\u2019s lasting impact.`
      : stats.peakRank <= 5
        ? `"${stats.trackName}" by ${stats.artistName} peaked at #${stats.peakRank} during its ${stats.weeksOnChart}-week chart run \u2014 reaching the top tier of global streaming.`
        : `"${stats.trackName}" by ${stats.artistName} charted for ${stats.weeksOnChart} weeks with a peak of #${stats.peakRank}, adding its own data point to the ever-shifting story of what the world listens to.`;

  return { chapters, outro };
}
