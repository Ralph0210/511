import type { SongStoryChapter } from "@/data/featured-songs";

export type PeerSong = {
  track_id?: string;
  track_name: string;
  artist_name: string;
  album_img?: string | null;
  rank: number;
  streams: number | null;
};

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
    duration: number;
    acousticness: number;
    speechiness: number;
    tempo: number;
  };
  eraAverage: {
    danceability: number;
    energy: number;
    duration: number;
    acousticness: number;
    speechiness: number;
    tempo: number;
  };
  trajectory: { week: string; rank: number }[];
  chartRunInfo?: ChartRunInfo;
  billboardData?: {
    peakRank: number;
    totalWeeks: number;
    longevityPercentile: number;
  };
  spotifyLifespan?: {
    yearAvg: number;
    genreAvg: number;
    percentileInYear: number;
    totalSongsInYear: number;
  };
  peerSongs?: PeerSong[];
  totalChartStreams?: number;
  songPeakStreams?: number;
};

// ---------- Chart run analysis ----------

export type ChartRun = {
  startWeek: string;
  endWeek: string;
  weeks: number;
  peakRank: number;
};

export type ChartRunInfo = {
  runs: ChartRun[];
  totalRuns: number;
  hasReentries: boolean;
  longestGapWeeks: number;
  longestRunWeeks: number;
};

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const GAP_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000;

export function analyzeChartRuns(trajectory: { week: string; rank: number }[]): ChartRunInfo {
  if (!trajectory.length) {
    return { runs: [], totalRuns: 0, hasReentries: false, longestGapWeeks: 0, longestRunWeeks: 0 };
  }

  const sorted = [...trajectory].sort((a, b) => a.week.localeCompare(b.week));
  const runs: ChartRun[] = [];
  let runStart = 0;

  for (let i = 1; i <= sorted.length; i++) {
    const isEnd = i === sorted.length;
    let isGap = false;
    if (!isEnd) {
      const prev = new Date(sorted[i - 1].week + "T00:00:00").getTime();
      const curr = new Date(sorted[i].week + "T00:00:00").getTime();
      isGap = curr - prev > GAP_THRESHOLD_MS;
    }

    if (isEnd || isGap) {
      const runSlice = sorted.slice(runStart, i);
      runs.push({
        startWeek: runSlice[0].week,
        endWeek: runSlice[runSlice.length - 1].week,
        weeks: runSlice.length,
        peakRank: Math.min(...runSlice.map((d) => d.rank)),
      });
      runStart = i;
    }
  }

  let longestGapWeeks = 0;
  for (let i = 1; i < runs.length; i++) {
    const prevEnd = new Date(runs[i - 1].endWeek + "T00:00:00").getTime();
    const nextStart = new Date(runs[i].startWeek + "T00:00:00").getTime();
    const gapWeeks = Math.round((nextStart - prevEnd) / ONE_WEEK_MS);
    longestGapWeeks = Math.max(longestGapWeeks, gapWeeks);
  }

  return {
    runs,
    totalRuns: runs.length,
    hasReentries: runs.length > 1,
    longestGapWeeks,
    longestRunWeeks: Math.max(...runs.map((r) => r.weeks)),
  };
}

// ---------- Song classification ----------

export type SongClassification = "viral-spike" | "slow-burn" | "steady-performer" | "genre-disruptor" | "comeback-king" | "chart-topper";

export function classifySong(stats: SongStats): { label: string; classification: SongClassification } {
  const runInfo = stats.chartRunInfo ?? analyzeChartRuns(stats.trajectory);
  const features = ["danceability", "energy", "duration", "acousticness", "speechiness"] as const;
  const maxDelta = Math.max(...features.map((f) => Math.abs(stats.songFeatures[f] - stats.eraAverage[f])));

  if (runInfo.hasReentries && runInfo.totalRuns >= 3) return { label: "Comeback King", classification: "comeback-king" };
  if (stats.peakRank === 1 && stats.weeksOnChart >= 10) return { label: "Chart Topper", classification: "chart-topper" };
  if (maxDelta > 0.25 && stats.weeksOnChart >= 8) return { label: "Genre Disruptor", classification: "genre-disruptor" };

  const peakWeekIdx = stats.trajectory.findIndex((t) => t.rank === stats.peakRank);
  const weeksToPeak = peakWeekIdx >= 0 ? peakWeekIdx + 1 : stats.weeksOnChart;

  if (stats.weeksOnChart <= 6 && stats.peakRank <= 20) return { label: "Viral Spike", classification: "viral-spike" };
  if (weeksToPeak >= 5 && stats.weeksOnChart >= 12) return { label: "Slow Burn", classification: "slow-burn" };
  if (stats.weeksOnChart >= 15) return { label: "Steady Performer", classification: "steady-performer" };
  if (stats.peakRank <= 5) return { label: "Chart Topper", classification: "chart-topper" };
  if (stats.weeksOnChart <= 8) return { label: "Viral Spike", classification: "viral-spike" };
  return { label: "Steady Performer", classification: "steady-performer" };
}

// ---------- Thesis statement ----------

export function generateThesis(stats: SongStats): string {
  const { peakRank, weeksOnChart, trackName } = stats;
  const { label } = classifySong(stats);
  const runInfo = stats.chartRunInfo ?? analyzeChartRuns(stats.trajectory);

  if (runInfo.hasReentries) {
    return `A #${peakRank} peak, ${runInfo.totalRuns} chart runs, and ${weeksOnChart} total weeks \u2014 "${trackName}" refused to stay gone.`;
  }
  if (peakRank === 1) {
    return `${weeksOnChart} weeks on the world\u2019s biggest chart, all the way to #1. What made "${trackName}" unstoppable?`;
  }
  if (weeksOnChart >= 20) {
    return `A #${peakRank} peak across ${weeksOnChart} weeks \u2014 a ${label.toLowerCase()} that outlasted almost everything around it.`;
  }
  if (peakRank <= 5) {
    return `#${peakRank} on the global chart in ${weeksOnChart} weeks. What does the data reveal about "${trackName}"?`;
  }
  if (weeksOnChart <= 5) {
    return `A brief, bright flash \u2014 #${peakRank} in just ${weeksOnChart} weeks. The data tells the full story.`;
  }
  return `A #${peakRank} peak, ${weeksOnChart} weeks on chart. Here\u2019s the complete data story of "${trackName}."`;
}

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

const FEATURE_DEFINITIONS: Record<string, string> = {
  danceability: "how suitable a track is for dancing, based on tempo, rhythm stability, and beat strength",
  energy: "the intensity and activity level — loud, fast, noisy tracks score high",
  duration: "the length of the track — shorter songs dominate streaming, longer songs suggest more complex arrangements",
  acousticness: "how acoustic (vs. electronic) the track sounds",
  speechiness: "how much spoken word (vs. singing) is in the track — think rap, poetry, or talk shows",
  tempo: "the speed of the track in beats per minute",
};

function featureDescriptor(feature: string, value: number): string {
  const descriptors: Record<string, [string, string]> = {
    danceability: ["groove-driven and rhythmically infectious", "less dance-oriented"],
    energy: ["high-energy and intense", "restrained and mellow"],
    duration: ["longer than typical chart hits", "short and stream-friendly"],
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
  const runInfo = stats.chartRunInfo ?? analyzeChartRuns(trajectory);

  let beat0: string;
  if (runInfo.hasReentries) {
    beat0 = `In ${debutMonth}, "${trackName}" by ${artistName} entered the Spotify Global Top 200. But this wasn\u2019t a simple rise and fall \u2014 the song had ${runInfo.totalRuns} separate chart runs. Let\u2019s trace the full journey.`;
  } else {
    beat0 = `In ${debutMonth}, "${trackName}" by ${artistName} entered the Spotify Global Top 200. Let\u2019s trace its journey through the chart.`;
  }

  let beat1: string;
  if (runInfo.hasReentries) {
    const firstRun = runInfo.runs[0];
    const bestRun = runInfo.runs.reduce((best, r) => r.peakRank < best.peakRank ? r : best);
    const reentryContext = runInfo.longestGapWeeks > 8
      ? `After falling off the chart, it returned ${runInfo.longestGapWeeks} weeks later \u2014 ${runInfo.longestGapWeeks > 20 ? "a remarkable comeback" : "a notable re-entry"}.`
      : `The dashed gaps mark off-chart periods before each re-entry.`;
    beat1 = `The first run lasted ${firstRun.weeks} weeks, peaking at #${firstRun.peakRank}. But the song didn\u2019t stay gone \u2014 it re-entered the chart ${runInfo.totalRuns - 1} ${runInfo.totalRuns === 2 ? "time" : "times"}. ${reentryContext} ${bestRun !== firstRun ? `The strongest run peaked at #${bestRun.peakRank}, lasting ${bestRun.weeks} weeks.` : ""}`;
  } else if (peakRank <= 10 && weeksToPeak <= 2) {
    beat1 = `The song exploded onto the chart at #${firstRank}${firstRank <= 10 ? " \u2014 an immediate top-10 entry" : ""}, climbing to #${peakRank} within ${weeksToPeak === 1 ? "its first week" : "just two weeks"}. ${weeksOnChart <= 8 ? "A classic viral spike pattern." : "An explosive debut that held on longer than most."}`;
  } else if (weeksToPeak >= 5 && peakRank <= 30) {
    beat1 = `Entering at #${firstRank}, the song took ${weeksToPeak} weeks of steady climbing to reach its peak \u2014 a textbook slow burn, building momentum through word of mouth and playlist placement.`;
  } else if (weeksOnChart >= 15) {
    beat1 = `The trajectory tells a story of endurance: ${weeksOnChart} weeks on the chart, holding position week after week. This is the kind of sustained presence that separates cultural staples from passing trends.`;
  } else {
    beat1 = `${trackName} spent ${weeksOnChart} weeks in the Top 200, ${weeksToPeak <= 3 ? "climbing quickly to its peak" : `taking ${weeksToPeak} weeks to find its stride`}. ${weeksOnChart > 10 ? "A solid chart run by any measure." : "A brief but notable appearance."}`;
  }

  const beat2 = `The peak: #${peakRank}. ${peakRank === 1 ? "The very top of the global chart \u2014 the most-streamed song in the world that week." : peakRank <= 10 ? `A top-10 position, placing it among the most-streamed songs globally.` : peakRank <= 50 ? `A strong showing in the upper half of the chart.` : `Fighting for position in a field of 200 of the world\u2019s most-streamed songs.`}`;

  const beat3 = maxStreams > 0
    ? `At its peak, "${trackName}" was pulling ${formatStreams(maxStreams)} streams per week. The amber bars show streaming volume alongside chart position \u2014 ${maxStreams > 10_000_000 ? "massive numbers that reflect genuine cultural reach." : "solid streaming numbers that kept it on the chart."} But what about the song itself made it stand out?`
    : `The chart position tells one side of the story. ${weeksOnChart >= 10 ? "Staying in the Top 200 for this long requires consistent streaming week after week." : "Even a short chart run means competing with the world\u2019s biggest songs."} But what about the song itself made it stand out?`;

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

  const features = ["danceability", "energy", "duration", "acousticness", "speechiness"] as const;
  const deltas = features.map((f) => ({
    feature: f,
    value: songFeatures[f],
    avg: eraAverage[f],
    delta: Math.abs(songFeatures[f] - eraAverage[f]),
  }));
  deltas.sort((a, b) => b.delta - a.delta);

  const character =
    songFeatures.energy > 0.7 && songFeatures.danceability > 0.7
      ? "a high-energy, dance-floor-ready track"
      : songFeatures.acousticness > 0.5
        ? "an acoustically driven record that stands apart from the heavily produced chart norm"
        : songFeatures.duration > 0.6
          ? "a longer-form track that bucks the streaming-era trend toward brevity"
          : "a song that carves its own sonic lane";

  const beat0 = `Its chart trajectory shows how it performed. Now let\u2019s hear what it sounded like \u2014 and how it compared to everything else on the chart in ${year}.`;

  const beat1 = `The gray shape shows the average audio profile of ${year}\u2019s Spotify Top 200. Each axis measures a different quality: danceability (${FEATURE_DEFINITIONS.danceability}), energy (${FEATURE_DEFINITIONS.energy}), duration (${FEATURE_DEFINITIONS.duration}), and more. This is what a "typical" charting song sounded like that year.`;

  const beat2 = `Now here\u2019s "${trackName}" in green. It\u2019s ${character}. Where the green shape extends beyond the gray, the song scores higher than average; where it shrinks inside, it scores lower.`;

  const top2 = deltas.slice(0, 2);
  const featureDescs = top2.map((t) => {
    const cmp = compareWord(t.value, t.avg);
    const def = FEATURE_DEFINITIONS[t.feature] || t.feature;
    return `${t.feature} \u2014 ${def} \u2014 is ${cmp} the chart average (${(t.value * 100).toFixed(0)}% vs ${(t.avg * 100).toFixed(0)}%), making it ${featureDescriptor(t.feature, t.value)}`;
  });
  const beat3 = `The biggest differences: ${featureDescs.join(". Also, its ")}. ${deltas[0].delta > 0.2 ? "This song occupies a distinctly different sonic space than most of its chart neighbors." : "Subtle differences that add up to a unique listening experience."}`;

  const featureLines = deltas.slice(0, 3).map((t) => {
    const cmp = compareWord(t.value, t.avg);
    return `Its ${t.feature} (${(t.value * 100).toFixed(0)}%) sits ${cmp} the ${year} chart average of ${(t.avg * 100).toFixed(0)}% \u2014 making it ${featureDescriptor(t.feature, t.value)}.`;
  });
  const narrative = `"${trackName}" is ${character}. How does it compare to what else was charting? ${featureLines.join(" ")}`;

  return {
    label: "Chapter 2",
    title: "The Sound",
    narrative,
    beats: [beat0, beat1, beat2, beat3],
  };
}

function buildMomentNarrative(stats: SongStats): SongStoryChapter {
  const { trackName, genre, firstWeek, peakRank, peerSongs, totalChartStreams, songPeakStreams } = stats;
  const year = firstWeek.slice(0, 4);
  const peakWeek = stats.trajectory.find((t) => t.rank === peakRank);
  const peakWeekDate = peakWeek ? formatDate(peakWeek.week) : formatDate(firstWeek);

  const genreContexts: Record<string, string> = {
    "Pop": `Pop has long been the chart\u2019s dominant force, but its share was gradually shrinking as Hip Hop/Rap and Latin music expanded.`,
    "Hip Hop/Rap": `Hip Hop/Rap had established itself as the streaming era\u2019s powerhouse genre, commanding a growing share of the global Top 200.`,
    "Latin": `Latin music was one of the streaming era\u2019s biggest growth stories, expanding from niche presence to chart staple.`,
    "R&B": `R&B occupied a steady but modest slice of the streaming charts \u2014 never dominant, but always present.`,
    "EDM/Dance": `EDM and Dance music had peaked in chart presence and was gradually losing ground to Hip Hop and Latin.`,
    "Rock": `Rock\u2019s presence in the global streaming Top 200 was minimal \u2014 a genre whose audience lived more in album sales and concerts.`,
    "K-Pop": `K-Pop\u2019s global streaming presence was surging, with dedicated fanbases driving coordinated streaming efforts.`,
    "Country": `Country music rarely appeared in the global Spotify Top 200, which skews heavily toward pop, hip hop, and Latin.`,
  };

  const genreNote = genreContexts[genre] || `${genre} occupied its own niche in the global streaming landscape.`;

  // Beat 0: peer competition intro
  let beat0: string;
  if (peerSongs?.length) {
    const topPeer = peerSongs.find((p) => p.rank === 1) || peerSongs[0];
    beat0 = `No song charts in a vacuum. The week "${trackName}" peaked at #${peakRank}, the #1 song in the world was "${topPeer.track_name}" by ${topPeer.artist_name}. Here\u2019s the full competitive picture.`;
  } else {
    beat0 = `No song charts in a vacuum. Let\u2019s zoom out and see the competitive landscape "${trackName}" was navigating in ${peakWeekDate}.`;
  }

  // Beat 1: peer leaderboard reveal
  let beat1: string;
  if (peerSongs?.length) {
    const peerCount = peerSongs.length;
    const topNames = peerSongs.slice(0, 3).map((p) => `"${p.track_name}"`).join(", ");
    beat1 = `This was the Top ${peerCount} the week "${trackName}" hit its peak. Names like ${topNames} filled the chart. ${peakRank <= 10 ? `At #${peakRank}, it was right in the thick of the biggest songs on the planet.` : peakRank <= 50 ? `At #${peakRank}, it held its own against the biggest songs on Earth.` : `At #${peakRank}, it was fighting for attention in a fiercely competitive field.`}`;
  } else {
    beat1 = `The chart was packed with competition. At #${peakRank}, "${trackName}" ${peakRank <= 20 ? "was among the elite" : "was carving out its space"} in a field of 200 of the world\u2019s most-streamed songs.`;
  }

  // Beat 2: stream share context
  let beat2: string;
  if (totalChartStreams && songPeakStreams && totalChartStreams > 0) {
    const sharePercent = ((songPeakStreams / totalChartStreams) * 100).toFixed(1);
    beat2 = `That week, the entire Top 200 generated ${formatStreams(totalChartStreams)} streams. "${trackName}" accounted for ${sharePercent}% of that total \u2014 ${parseFloat(sharePercent) >= 2 ? "a significant share of global listening" : parseFloat(sharePercent) >= 1 ? "a solid share of the global ear" : "a slice of an enormous streaming pie"}. Now let\u2019s look at the genre landscape it entered.`;
  } else {
    beat2 = `Let\u2019s look at the broader genre landscape. ${genreNote} When "${trackName}" charted in ${year}, it entered this shifting terrain as a ${genre} entry.`;
  }

  // Beat 3: genre landscape with on-chart band
  const beat3 = totalChartStreams
    ? `This stacked area shows how genre shares in the Top 200 shifted from 2017 to 2021. ${genreNote} The green band marks "${trackName}"\u2019s time on chart \u2014 you can see exactly what the genre landscape looked like during its run.`
    : `The green band marks the exact period when "${trackName}" was on the chart. ${genreNote} This is the genre context the song was competing in. But the real question is: how long did it last?`;

  const narrative = `${genreNote} When "${trackName}" charted, it entered a competitive landscape shaped by these forces.`;

  return {
    label: "Chapter 3",
    title: "The Moment",
    narrative,
    beats: [beat0, beat1, beat2, beat3],
  };
}

function buildStayingPowerNarrative(stats: SongStats): SongStoryChapter {
  const { trackName, weeksOnChart, genre, firstWeek } = stats;
  const year = firstWeek.slice(0, 4);
  const sp = stats.spotifyLifespan;
  const bb = stats.billboardData;

  // Beat 0: intro / transition
  const beat0 = `We\u2019ve heard how "${trackName}" sounded. Now let\u2019s measure how long it lasted \u2014 and what that means compared to every other song on the chart.`;

  // Beat 1: Spotify histogram + song marker + year avg
  let beat1: string;
  if (sp) {
    const comparison = weeksOnChart > sp.yearAvg
      ? `above the ${year} average of ${sp.yearAvg.toFixed(1)} weeks`
      : weeksOnChart < sp.yearAvg
        ? `below the ${year} average of ${sp.yearAvg.toFixed(1)} weeks`
        : `right at the ${year} average of ${sp.yearAvg.toFixed(1)} weeks`;
    beat1 = `This histogram shows every song that debuted on the Spotify Top 200 in ${year}. With ${weeksOnChart} weeks, "${trackName}" sits ${comparison}, outlasting ${sp.percentileInYear}% of the ${sp.totalSongsInYear} songs that charted that year.`;
  } else {
    beat1 = `"${trackName}" spent ${weeksOnChart} weeks on the Spotify Global Top 200. Each bar shows how many songs lasted that long \u2014 the highlighted bar is where this song falls.`;
  }

  // Beat 2: Longevity categories (viral/lasting/slow_burn/flash)
  const beat2 = `Across the full 2017\u20132021 dataset, every charting song falls into one of four categories based on impact and endurance. "${trackName}" is classified as a song with ${weeksOnChart >= 15 ? "staying power that few songs achieve" : weeksOnChart >= 8 ? "a solid chart presence" : "a brief but notable appearance"}. The highlighted bar shows where it lands.`;

  // Beat 3: Billboard comparison
  let beat3: string;
  if (bb) {
    const bbPeakDesc = bb.peakRank === 1
      ? "reached #1"
      : bb.peakRank <= 10
        ? `peaked at #${bb.peakRank}`
        : `reached #${bb.peakRank}`;

    const percentileDesc = bb.longevityPercentile >= 90
      ? `outlasting ${bb.longevityPercentile}% of every song in 68 years of chart history`
      : bb.longevityPercentile >= 70
        ? `outlasting ${bb.longevityPercentile}% of all Hot 100 entries since 1958`
        : bb.longevityPercentile >= 50
          ? `above the historical median, outlasting ${bb.longevityPercentile}% of all entries`
          : `outlasting ${bb.longevityPercentile}% of all entries since 1958`;

    beat3 = `The Billboard Hot 100 tells a longer story. On America\u2019s definitive chart \u2014 blending radio, sales, and streaming since 1958 \u2014 "${trackName}" ${bbPeakDesc} and spent ${bb.totalWeeks} weeks on chart, ${percentileDesc}.`;
  } else {
    beat3 = `${weeksOnChart >= 15
      ? `${weeksOnChart} weeks on the Spotify Top 200 is a sustained run that reflects genuine staying power. Most songs are gone within a few weeks \u2014 this one built an audience that kept coming back.`
      : weeksOnChart >= 8
        ? `${weeksOnChart} weeks is a solid chart run. In a chart where most songs disappear within a few weeks, maintaining position this long requires consistent listener interest.`
        : `Even ${weeksOnChart} weeks on the Spotify Top 200 means competing with the world\u2019s most-streamed songs. The chart moves fast \u2014 a few weeks of chart presence is still a notable achievement.`}`;
  }

  // Beat 4: Genre distribution overlay on Spotify histogram
  let beat4: string;
  if (sp) {
    const genreCompare = weeksOnChart > sp.genreAvg
      ? `longer than the typical ${genre} song (${sp.genreAvg.toFixed(1)} weeks)`
      : weeksOnChart < sp.genreAvg
        ? `shorter than the typical ${genre} song (${sp.genreAvg.toFixed(1)} weeks)`
        : `right in line with the typical ${genre} song (${sp.genreAvg.toFixed(1)} weeks)`;
    const overallCompare = sp.genreAvg > sp.yearAvg
      ? `${genre} songs tend to last longer than average on the chart`
      : sp.genreAvg < sp.yearAvg
        ? `${genre} songs tend to have shorter chart runs than average`
        : `${genre} songs last about as long as the chart average`;
    beat4 = `Now let\u2019s overlay just ${genre} songs (in purple) on the same chart. "${trackName}" lasted ${genreCompare}. ${overallCompare} in ${year} \u2014 notice how the purple bars shift compared to the overall distribution. This song ${weeksOnChart > sp.genreAvg ? "exceeded" : "fell within"} that genre pattern.`;
  } else {
    beat4 = `Among ${genre} songs on the chart, this run ${weeksOnChart >= 10 ? "stands out as a solid showing" : "was a brief appearance"}.`;
  }

  const narrative = `"${trackName}" spent ${weeksOnChart} weeks on the Spotify Global Top 200. ${beat1} ${beat4}`;

  return {
    label: "Chapter 3",
    title: "The Staying Power",
    narrative,
    beats: [beat0, beat1, beat2, beat3, beat4],
  };
}

// ---------- Main Export ----------

export function generateNarrative(stats: SongStats): {
  chapters: { rise: SongStoryChapter; sound: SongStoryChapter; moment: SongStoryChapter; stayingPower: SongStoryChapter };
  thesis: string;
  classification: { label: string; classification: SongClassification };
  outro: string;
} {
  const chapters = {
    rise: buildRiseNarrative(stats),
    sound: buildSoundNarrative(stats),
    moment: buildMomentNarrative(stats),
    stayingPower: buildStayingPowerNarrative(stats),
  };

  const thesis = generateThesis(stats);
  const classification = classifySong(stats);

  // Build conclusion
  const runInfo = stats.chartRunInfo ?? analyzeChartRuns(stats.trajectory);

  const openingLine = stats.weeksOnChart >= 15
    ? `"${stats.trackName}" by ${stats.artistName} spent ${stats.weeksOnChart} weeks in the Spotify Global Top 200, peaking at #${stats.peakRank} \u2014 a sustained presence that speaks to the song\u2019s lasting impact.`
    : stats.peakRank <= 5
      ? `"${stats.trackName}" by ${stats.artistName} peaked at #${stats.peakRank} during its ${stats.weeksOnChart}-week chart run \u2014 reaching the top tier of global streaming.`
      : `"${stats.trackName}" by ${stats.artistName} charted for ${stats.weeksOnChart} weeks with a peak of #${stats.peakRank}, adding its own data point to the ever-shifting story of what the world listens to.`;

  const features = ["danceability", "energy", "duration", "acousticness", "speechiness"] as const;
  const topDelta = features
    .map((f) => ({ f, delta: Math.abs(stats.songFeatures[f] - stats.eraAverage[f]) }))
    .sort((a, b) => b.delta - a.delta)[0];
  const soundVerdict = topDelta.delta > 0.2
    ? `Sonically, it stood apart from its era \u2014 most notably in ${topDelta.f}, where it diverged significantly from the chart average.`
    : `Its sonic profile fit comfortably within the era\u2019s chart sound, without extreme departures in any dimension.`;

  let longevityVerdict = "";
  if (stats.spotifyLifespan) {
    const sp = stats.spotifyLifespan;
    longevityVerdict = sp.percentileInYear >= 80
      ? `It outlasted ${sp.percentileInYear}% of all songs that charted that year \u2014 a top-tier run by any measure.`
      : sp.percentileInYear >= 50
        ? `It outlasted ${sp.percentileInYear}% of its year\u2019s chart entries \u2014 above the median, a solid showing.`
        : `Its chart run was shorter than most songs that year, but reaching the Top 200 at all is an achievement.`;
  }

  let reentryVerdict = "";
  if (runInfo.hasReentries) {
    reentryVerdict = `The song had ${runInfo.totalRuns} separate chart runs \u2014 proof that it kept finding new audiences even after falling off.`;
  }

  let billboardVerdict = "";
  if (stats.billboardData) {
    const bb = stats.billboardData;
    billboardVerdict = bb.longevityPercentile >= 70
      ? `On the Billboard Hot 100, it outlasted ${bb.longevityPercentile}% of every song in 68 years of chart history.`
      : `On the Billboard Hot 100, it spent ${bb.totalWeeks} weeks \u2014 outlasting ${bb.longevityPercentile}% of all entries since 1958.`;
  }

  const conclusionParts = [openingLine, soundVerdict, longevityVerdict, reentryVerdict, billboardVerdict]
    .filter(Boolean);

  const outro = conclusionParts.join(" ");

  return { chapters, thesis, classification, outro };
}
