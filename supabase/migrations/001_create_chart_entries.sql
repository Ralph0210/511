-- Billboard chart entries table
CREATE TABLE IF NOT EXISTS chart_entries (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  rank INTEGER NOT NULL,
  song TEXT NOT NULL,
  artist TEXT NOT NULL,
  last_week INTEGER,
  peak_rank INTEGER NOT NULL,
  weeks_on_board INTEGER NOT NULL DEFAULT 0,
  is_new BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chart_entries_date ON chart_entries(date);
CREATE INDEX IF NOT EXISTS idx_chart_entries_artist ON chart_entries(artist);
CREATE INDEX IF NOT EXISTS idx_chart_entries_song ON chart_entries(song);
CREATE INDEX IF NOT EXISTS idx_chart_entries_rank ON chart_entries(rank);
CREATE INDEX IF NOT EXISTS idx_chart_entries_date_rank ON chart_entries(date, rank);

-- Enable Row Level Security (optional - disable if you want public read)
ALTER TABLE chart_entries ENABLE ROW LEVEL SECURITY;

-- Allow public read access (use anon key)
CREATE POLICY "Allow public read" ON chart_entries FOR SELECT USING (true);
