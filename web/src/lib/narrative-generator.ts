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
  const runInfo = stats.chartRunInfo ?? analyzeChartRuns(stats.trajectory);

  if (runInfo.hasReentries) {
    return `#${peakRank} peak. ${runInfo.totalRuns} separate chart runs. ${weeksOnChart} total weeks. "${trackName}" kept coming back.`;
  }
  if (peakRank === 1) {
    return `${weeksOnChart} weeks on the world's biggest streaming chart, all the way to #1. Here's how "${trackName}" got there.`;
  }
  if (weeksOnChart >= 20) {
    return `#${peakRank} peak across ${weeksOnChart} weeks. Most songs disappear in a few. This one didn't.`;
  }
  if (peakRank <= 5) {
    return `#${peakRank} on the global chart. ${weeksOnChart} weeks of data. Here's the full picture.`;
  }
  if (weeksOnChart <= 5) {
    return `${weeksOnChart} weeks on chart, peaking at #${peakRank}. Brief, but the data tells the whole story.`;
  }
  return `#${peakRank} peak, ${weeksOnChart} weeks on chart. The data story of "${trackName}."`;
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

const FEATURE_LABELS: Record<string, string> = {
  danceability: "Danceability measures how suitable a track is for dancing based on tempo, rhythm stability, and beat strength.",
  energy: "Energy captures intensity and activity. Loud, fast, noisy tracks score high; quiet ballads score low.",
  duration: "Duration is the track length. Shorter songs dominate streaming; longer ones suggest more complex arrangements.",
  acousticness: "Acousticness detects whether a track uses acoustic instruments versus electronic production.",
  speechiness: "Speechiness measures how much spoken word is in the track versus singing. Rap and spoken word score high.",
  tempo: "Tempo is the speed of the track in beats per minute.",
};

function featureDescriptor(feature: string, value: number): string {
  const descriptors: Record<string, [string, string]> = {
    danceability: ["groove-driven", "less dance-oriented"],
    energy: ["high-energy", "restrained"],
    duration: ["longer than most chart hits", "short and stream-friendly"],
    acousticness: ["acoustically rich", "heavily produced"],
    speechiness: ["vocal-forward", "melodically sung"],
    tempo: ["fast-paced", "slower"],
  };
  const [high, low] = descriptors[feature] || ["distinctive", "moderate"];
  return value > 0.6 ? high : value < 0.35 ? low : `moderate in ${feature}`;
}

function pctDiff(val: number, avg: number): string {
  if (avg === 0) return "above";
  const pct = Math.round(((val - avg) / avg) * 100);
  if (Math.abs(pct) < 5) return "in line with";
  return pct > 0 ? `${pct}% above` : `${Math.abs(pct)}% below`;
}

// ---------- Chapter 1: The Rise ----------

function buildRiseNarrative(stats: SongStats): SongStoryChapter {
  const { trackName, artistName, peakRank, weeksOnChart, maxStreams, firstWeek, trajectory } = stats;
  const debutMonth = formatDate(firstWeek);
  const firstRank = trajectory[0]?.rank ?? 100;
  const peakWeekIdx = trajectory.findIndex((t) => t.rank === peakRank);
  const weeksToPeak = peakWeekIdx >= 0 ? peakWeekIdx + 1 : weeksOnChart;
  const runInfo = stats.chartRunInfo ?? analyzeChartRuns(trajectory);

  // Beat 0: set the stage
  let beat0: string;
  if (runInfo.hasReentries) {
    beat0 = `${debutMonth}. "${trackName}" by ${artistName} enters the Spotify Global Top 200 for the first time. It won't be the last. The song logged ${runInfo.totalRuns} separate chart runs, meaning it dropped off the Top 200 and came back ${runInfo.totalRuns - 1} ${runInfo.totalRuns === 2 ? "time" : "times"}.`;
  } else {
    beat0 = `${debutMonth}. "${trackName}" by ${artistName} enters the Spotify Global Top 200. The chart tracks the 200 most-streamed songs globally each week. Here's how it played out.`;
  }

  // Beat 1: the trajectory
  let beat1: string;
  if (runInfo.hasReentries) {
    const firstRun = runInfo.runs[0];
    const bestRun = runInfo.runs.reduce((best, r) => r.peakRank < best.peakRank ? r : best);
    beat1 = `The first run lasted ${firstRun.weeks} weeks, peaking at #${firstRun.peakRank}. The dashed gaps mark periods off the chart before each re-entry.`;
    if (bestRun !== firstRun) {
      beat1 += ` The strongest run peaked at #${bestRun.peakRank} across ${bestRun.weeks} weeks.`;
    }
    if (runInfo.longestGapWeeks > 8) {
      beat1 += ` The longest gap was ${runInfo.longestGapWeeks} weeks off chart before returning.`;
    }
  } else if (peakRank <= 10 && weeksToPeak <= 2) {
    beat1 = `Debuted at #${firstRank}${firstRank <= 10 ? ", an immediate top-10 entry" : ""} and reached #${peakRank} within ${weeksToPeak === 1 ? "its first week" : "two weeks"}. ${weeksOnChart <= 8 ? "A fast spike." : `Then held on for ${weeksOnChart} total weeks.`}`;
  } else if (weeksToPeak >= 5 && peakRank <= 30) {
    beat1 = `Entered at #${firstRank} and took ${weeksToPeak} weeks to reach its peak. A gradual climb, building momentum through playlist placement and word of mouth.`;
  } else if (weeksOnChart >= 15) {
    beat1 = `${weeksOnChart} weeks on chart. That kind of sustained presence separates songs that become part of the cultural fabric from ones that pass through.`;
  } else {
    beat1 = `${weeksOnChart} weeks on chart, ${weeksToPeak <= 3 ? "reaching its peak quickly" : `taking ${weeksToPeak} weeks to climb`}. ${weeksOnChart <= 6 ? "A brief window." : "A solid run."}`;
  }

  // Beat 2: the peak
  let beat2: string;
  if (peakRank === 1) {
    beat2 = `Peak: #1. The most-streamed song in the world that week.`;
  } else if (peakRank <= 10) {
    beat2 = `Peak: #${peakRank}. Top 10 out of 200 songs, placing it among the most-streamed tracks on the planet.`;
  } else if (peakRank <= 50) {
    beat2 = `Peak: #${peakRank}. Upper quarter of the chart, a strong position in a field of 200.`;
  } else {
    beat2 = `Peak: #${peakRank}. Every position in the Top 200 represents one of the most-streamed songs globally that week.`;
  }

  // Beat 3: streams layer
  let beat3: string;
  if (maxStreams > 0) {
    beat3 = `The amber bars show weekly streaming volume. At its peak, "${trackName}" pulled ${formatStreams(maxStreams)} streams in a single week. ${maxStreams > 10_000_000 ? "Numbers like that reflect genuine global reach." : "Consistent streaming that kept it on the chart."} Now, what about the song itself?`;
  } else {
    beat3 = `${weeksOnChart >= 10 ? "Staying on this chart for this long takes consistent streaming, week after week." : "Even a short run means outstreaming thousands of other tracks."} What about the song itself?`;
  }

  const narrative = `${beat0} ${beat1} ${beat2} ${beat3}`;

  return {
    label: "Chapter 1",
    title: "The Rise",
    narrative,
    beats: [beat0, beat1, beat2, beat3],
  };
}

// ---------- Chapter 2: The Sound ----------

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

  // Beat 0: transition
  const beat0 = `The chart shows how it performed. Now, how did it sound compared to everything else in ${year}?`;

  // Beat 1: era average explanation
  const beat1 = `The gray shape is the average audio profile of all songs in the ${year} Spotify Top 200. Each axis is a different quality. ${FEATURE_LABELS.danceability} ${FEATURE_LABELS.energy} This shape is what "typical" sounded like that year.`;

  // Beat 2: song overlay
  const character =
    songFeatures.energy > 0.7 && songFeatures.danceability > 0.7
      ? "a high-energy, dance-floor-ready track"
      : songFeatures.acousticness > 0.5
        ? "an acoustically driven record, standing apart from the heavily produced chart norm"
        : songFeatures.duration > 0.6
          ? "a longer track that bucks the streaming-era trend toward brevity"
          : "a song that carves its own sonic lane";

  const beat2 = `The green shape is "${trackName}." It's ${character}. Where green extends past gray, the song scores higher than average. Where it pulls inward, lower.`;

  // Beat 3: top distinctive features
  const top2 = deltas.slice(0, 2);
  const featureDescs = top2.map((t) => {
    const diff = pctDiff(t.value, t.avg);
    return `Its ${t.feature} (${(t.value * 100).toFixed(0)}%) is ${diff} the chart average (${(t.avg * 100).toFixed(0)}%). ${FEATURE_LABELS[t.feature]} That makes this track ${featureDescriptor(t.feature, t.value)}.`;
  });
  const beat3 = `The biggest standouts: ${featureDescs.join(" ")}`;

  const narrative = `${beat0} ${beat1} ${beat2} ${beat3}`;

  return {
    label: "Chapter 2",
    title: "The Sound",
    narrative,
    beats: [beat0, beat1, beat2, beat3],
  };
}

// ---------- Chapter 3: The Moment ----------

function buildMomentNarrative(stats: SongStats): SongStoryChapter {
  const { trackName, genre, firstWeek, peakRank, peerSongs, totalChartStreams, songPeakStreams } = stats;
  const year = firstWeek.slice(0, 4);
  const peakWeek = stats.trajectory.find((t) => t.rank === peakRank);
  const peakWeekDate = peakWeek ? formatDate(peakWeek.week) : formatDate(firstWeek);

  const genreContexts: Record<string, string> = {
    "Pop": `Pop dominated the chart, though its share was gradually shrinking as Hip Hop/Rap and Latin music grew.`,
    "Hip Hop/Rap": `Hip Hop/Rap had become the streaming era's powerhouse, commanding a growing share of the Top 200.`,
    "Latin": `Latin music was one of the streaming era's biggest growth stories, expanding from niche to chart staple.`,
    "R&B": `R&B held a steady but modest slice of the chart. Never dominant, always present.`,
    "EDM/Dance": `EDM and Dance had peaked in chart presence and was gradually losing ground to Hip Hop and Latin.`,
    "Rock": `Rock's global streaming chart presence was minimal. Its audience lived more in album sales and concerts.`,
    "K-Pop": `K-Pop's global presence was surging, with dedicated fanbases driving coordinated streaming.`,
    "Country": `Country rarely appeared in the global Spotify Top 200, which skews heavily toward pop, hip hop, and Latin.`,
  };

  const genreNote = genreContexts[genre] || `${genre} had its own distinct niche in the global streaming landscape.`;

  // Beat 0: peer competition intro
  let beat0: string;
  if (peerSongs?.length) {
    const topPeer = peerSongs.find((p) => p.rank === 1) || peerSongs[0];
    beat0 = `No song charts alone. The week "${trackName}" peaked at #${peakRank}, the #1 song was "${topPeer.track_name}" by ${topPeer.artist_name}. Here's the competitive picture that week.`;
  } else {
    beat0 = `No song charts alone. Here's the competitive landscape "${trackName}" was navigating in ${peakWeekDate}.`;
  }

  // Beat 1: leaderboard
  let beat1: string;
  if (peerSongs?.length) {
    const topNames = peerSongs.slice(0, 3).map((p) => `"${p.track_name}"`).join(", ");
    beat1 = `The Top 10 that week: ${topNames}, and more. ${peakRank <= 10 ? `"${trackName}" was right there among them at #${peakRank}.` : peakRank <= 50 ? `"${trackName}" held its own at #${peakRank}.` : `"${trackName}" sat at #${peakRank}, competing in a field of 200.`}`;
  } else {
    beat1 = `At #${peakRank}, "${trackName}" ${peakRank <= 20 ? "was among the elite" : "was holding position"} in a field of the world's 200 most-streamed songs.`;
  }

  // Beat 2: stream share
  let beat2: string;
  if (totalChartStreams && songPeakStreams && totalChartStreams > 0) {
    const sharePercent = ((songPeakStreams / totalChartStreams) * 100).toFixed(1);
    beat2 = `That week, the entire Top 200 generated ${formatStreams(totalChartStreams)} streams combined. "${trackName}" accounted for ${sharePercent}% of that total. ${parseFloat(sharePercent) >= 2 ? "A significant share of global listening." : parseFloat(sharePercent) >= 1 ? "A solid share." : "A slice of an enormous pie."}`;
  } else {
    beat2 = `${genreNote} "${trackName}" entered this landscape as a ${genre} entry in ${year}.`;
  }

  // Beat 3: genre landscape
  const beat3 = totalChartStreams
    ? `This stacked area shows how genre shares in the Top 200 shifted over time. ${genreNote} The green band marks "${trackName}"'s time on chart.`
    : `The green band marks when "${trackName}" was on the chart. ${genreNote}`;

  const narrative = `${beat0} ${beat1} ${beat2} ${beat3}`;

  return {
    label: "Chapter 3",
    title: "The Moment",
    narrative,
    beats: [beat0, beat1, beat2, beat3],
  };
}

// ---------- Chapter 4: The Staying Power ----------

function buildStayingPowerNarrative(stats: SongStats): SongStoryChapter {
  const { trackName, weeksOnChart, genre, firstWeek } = stats;
  const year = firstWeek.slice(0, 4);
  const sp = stats.spotifyLifespan;
  const bb = stats.billboardData;

  // Beat 0: transition
  const beat0 = `How it sounded and where it peaked tells part of the story. The other part is how long it lasted. Let's put "${trackName}" in context against every other song that charted.`;

  // Beat 1: Spotify histogram + song marker + year avg
  let beat1: string;
  if (sp) {
    const relation = weeksOnChart > sp.yearAvg
      ? `above the ${year} average of ${sp.yearAvg.toFixed(1)} weeks`
      : weeksOnChart < sp.yearAvg
        ? `below the ${year} average of ${sp.yearAvg.toFixed(1)} weeks`
        : `right at the ${year} average of ${sp.yearAvg.toFixed(1)} weeks`;
    beat1 = `Each bar shows how many songs lasted that many weeks on the Spotify Top 200 in ${year}. "${trackName}" spent ${weeksOnChart} weeks, ${relation}. That puts it ahead of ${sp.percentileInYear}% of the ${sp.totalSongsInYear.toLocaleString()} songs that charted that year.`;
  } else {
    beat1 = `"${trackName}" spent ${weeksOnChart} weeks on the Spotify Global Top 200. The highlighted bar shows where it falls in the distribution.`;
  }

  // Beat 2: Longevity categories explanation
  const beat2 = `Every song in the dataset is scored on two axes: how high it peaked (impact) and how long it lasted (endurance). That creates four categories. The highlighted bar is where "${trackName}" lands.`;

  // Beat 3: Billboard comparison
  let beat3: string;
  if (bb) {
    const bbPeak = bb.peakRank === 1
      ? "reached #1"
      : `peaked at #${bb.peakRank}`;
    const topPct = 100 - bb.longevityPercentile;
    beat3 = `On the Billboard Hot 100, which combines radio, sales, and streaming going back to 1958, "${trackName}" ${bbPeak} and spent ${bb.totalWeeks} weeks on chart. That puts it in the top ${topPct}% of every song in 68 years of chart history.`;
  } else {
    beat3 = weeksOnChart >= 15
      ? `${weeksOnChart} weeks on the Spotify Top 200 is a sustained run. Most songs disappear within a few weeks. This one built an audience that kept coming back.`
      : weeksOnChart >= 8
        ? `${weeksOnChart} weeks is a solid chart run. Most songs are gone much faster.`
        : `Even ${weeksOnChart} weeks on the Spotify Top 200 means outstreaming the vast majority of released music. The chart moves fast.`;
  }

  // Beat 4: Genre overlay
  let beat4: string;
  if (sp) {
    const genreRelation = weeksOnChart > sp.genreAvg
      ? `longer than the typical ${genre} song (${sp.genreAvg.toFixed(1)} weeks)`
      : weeksOnChart < sp.genreAvg
        ? `shorter than the typical ${genre} song (${sp.genreAvg.toFixed(1)} weeks)`
        : `right in line with the typical ${genre} song (${sp.genreAvg.toFixed(1)} weeks)`;
    const genreTrend = sp.genreAvg > sp.yearAvg
      ? `${genre} songs tend to last longer than the overall average`
      : sp.genreAvg < sp.yearAvg
        ? `${genre} songs tend to have shorter runs than average`
        : `${genre} songs last about as long as the chart average`;
    beat4 = `The purple bars show just ${genre} songs. "${trackName}" lasted ${genreRelation}. ${genreTrend} in ${year}. Notice how the purple distribution shifts compared to the overall.`;
  } else {
    beat4 = `Among ${genre} songs on the chart, this run ${weeksOnChart >= 10 ? "stands out" : "was a brief appearance"}.`;
  }

  const narrative = `${beat0} ${beat1} ${beat2} ${beat3} ${beat4}`;

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
  const runInfo = stats.chartRunInfo ?? analyzeChartRuns(stats.trajectory);

  // Build conclusion: concise, data-forward
  const parts: string[] = [];

  // Opening line
  if (runInfo.hasReentries) {
    parts.push(`"${stats.trackName}" charted ${runInfo.totalRuns} separate times across ${stats.weeksOnChart} total weeks, peaking at #${stats.peakRank}.`);
  } else {
    parts.push(`"${stats.trackName}" spent ${stats.weeksOnChart} weeks on the Spotify Global Top 200, peaking at #${stats.peakRank}.`);
  }

  // Sound verdict
  const features = ["danceability", "energy", "duration", "acousticness", "speechiness"] as const;
  const topDelta = features
    .map((f) => ({ f, delta: Math.abs(stats.songFeatures[f] - stats.eraAverage[f]) }))
    .sort((a, b) => b.delta - a.delta)[0];

  if (topDelta.delta > 0.2) {
    parts.push(`Sonically, it stood apart from its era, most notably in ${topDelta.f} where it diverged significantly from the chart average.`);
  } else {
    parts.push(`Its sonic profile fit within the era's chart sound without extreme departures.`);
  }

  // Longevity verdict
  if (stats.spotifyLifespan) {
    const sp = stats.spotifyLifespan;
    parts.push(`It outlasted ${sp.percentileInYear}% of songs that charted in ${stats.firstWeek.slice(0, 4)}.`);
  }

  // Billboard verdict
  if (stats.billboardData) {
    const bb = stats.billboardData;
    const topPct = 100 - bb.longevityPercentile;
    parts.push(`On the Billboard Hot 100, it spent ${bb.totalWeeks} weeks, placing it in the top ${topPct}% of all entries since 1958.`);
  }

  const outro = parts.join(" ");

  return { chapters, thesis, classification, outro };
}
