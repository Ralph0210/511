import { createSupabaseClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chart = searchParams.get("chart") ?? "top-songs-over-time";
  const limit = parseInt(searchParams.get("limit") ?? "5000", 10);

  const supabase = createSupabaseClient();

  try {
    switch (chart) {
      case "top-songs-over-time": {
        // #1 hits per week for timeline
        const { data, error } = await supabase
          .from("chart_entries")
          .select("date, song, artist, rank")
          .eq("rank", 1)
          .order("date", { ascending: true })
          .limit(limit);

        if (error) throw error;
        return NextResponse.json(data ?? []);
      }
      case "artist-count": {
        // Top artists by number of chart appearances
        const { data, error } = await supabase
          .from("chart_entries")
          .select("artist");

        if (error) throw error;

        const counts: Record<string, number> = {};
        (data ?? []).forEach((r) => {
          counts[r.artist] = (counts[r.artist] ?? 0) + 1;
        });

        const sorted = Object.entries(counts)
          .map(([artist, count]) => ({ artist, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 30);

        return NextResponse.json(sorted);
      }
      case "weeks-on-board": {
        // Distribution of max weeks on board
        const { data, error } = await supabase
          .from("chart_entries")
          .select("song, artist, weeks_on_board")
          .order("weeks_on_board", { ascending: false })
          .limit(500);

        if (error) throw error;

        // Group by song+artist, take max weeks
        const bySong: Record<string, number> = {};
        (data ?? []).forEach((r) => {
          const key = `${r.song}|${r.artist}`;
          if (!bySong[key] || r.weeks_on_board > bySong[key]) {
            bySong[key] = r.weeks_on_board;
          }
        });

        const sorted = Object.entries(bySong)
          .map(([key, weeks]) => {
            const [song, artist] = key.split("|");
            return { song, artist, weeks };
          })
          .sort((a, b) => b.weeks - a.weeks)
          .slice(0, 25);

        return NextResponse.json(sorted);
      }
      case "recent-chart": {
        const { data, error } = await supabase
          .from("chart_entries")
          .select("date, rank, song, artist, peak_rank, weeks_on_board")
          .order("date", { ascending: false })
          .limit(100);

        if (error) throw error;

        // Get unique dates, take most recent
        const dates = Array.from(new Set((data ?? []).map((r) => r.date))).sort().reverse();
        const latestDate = dates[0];
        const chartData = (data ?? []).filter((r) => r.date === latestDate);

        return NextResponse.json({ date: latestDate, entries: chartData });
      }
      default:
        return NextResponse.json({ error: "Unknown chart type" }, { status: 400 });
    }
  } catch (err) {
    console.error("Chart data error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch data" },
      { status: 500 }
    );
  }
}
