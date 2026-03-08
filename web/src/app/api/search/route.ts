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
  const { data, error } = await supabase
    .from("song_summary")
    .select("track_id, track_name, artist_name, album_img, peak_rank, weeks_on_chart, max_streams")
    .or(`track_name.ilike.%${sanitized}%,artist_name.ilike.%${sanitized}%`)
    .order("max_streams", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data || []);
}
