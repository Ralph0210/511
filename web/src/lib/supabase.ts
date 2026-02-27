import { createClient } from "@supabase/supabase-js";

export type ChartEntry = {
  id?: number;
  date: string;
  rank: number;
  song: string;
  artist: string;
  last_week: number | null;
  peak_rank: number;
  weeks_on_board: number;
  is_new: boolean;
  image_url: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}
