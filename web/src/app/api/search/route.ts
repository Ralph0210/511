import { createSupabaseClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  // Sanitize: strip wildcard chars to prevent pattern abuse
  const sanitized = q.replace(/[%_]/g, "");
  if (!sanitized) return NextResponse.json([]);

  const supabase = createSupabaseClient();
  // Fetch extra rows so we can deduplicate and still return up to 10
  const { data, error } = await supabase
    .from("song_summary")
    .select("track_id, track_name, artist_name, album_img, peak_rank, weeks_on_chart, max_streams")
    .or(`track_name.ilike.%${sanitized}%,artist_name.ilike.%${sanitized}%`)
    .order("max_streams", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  // Deduplicate: keep the version with the most weeks on chart
  const best = new Map<string, (typeof data)[number]>();
  for (const row of data || []) {
    const key = `${(row.track_name || "").toLowerCase()}|${(row.artist_name || "").toLowerCase()}`;
    const existing = best.get(key);
    if (!existing || (row.weeks_on_chart || 0) > (existing.weeks_on_chart || 0)) {
      best.set(key, row);
    }
  }

  const deduped = Array.from(best.values())
    .sort((a, b) => (b.max_streams || 0) - (a.max_streams || 0))
    .slice(0, 10);

  return NextResponse.json(deduped);
}
