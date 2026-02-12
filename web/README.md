# Billboard Charts Web

Next.js app with D3 visualizations for Billboard Hot 100 data stored in Supabase.

## Setup

### 1. Create Supabase table and analytics views

In your Supabase project, open **SQL Editor** and run:

**First**, the chart_entries table (`supabase/migrations/001_create_chart_entries.sql`):

```sql
-- From supabase/migrations/001_create_chart_entries.sql
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

CREATE INDEX IF NOT EXISTS idx_chart_entries_date ON chart_entries(date);
CREATE INDEX IF NOT EXISTS idx_chart_entries_artist ON chart_entries(artist);
CREATE INDEX IF NOT EXISTS idx_chart_entries_song ON chart_entries(song);
CREATE INDEX IF NOT EXISTS idx_chart_entries_rank ON chart_entries(rank);

ALTER TABLE chart_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON chart_entries FOR SELECT USING (true);
```

**Then**, run the analytics views (`supabase/migrations/002_analytics_views.sql`) so the three analytical charts work:
- `avg_lifespan_by_year` – Q1
- `debut_vs_gradual_stats` – Q2
- `peak_longevity` – Q3

### 2. Seed data from CSV

From project root:

```bash
pip install supabase python-dotenv
cp .env web/.env.local   # or create web/.env.local with SUPABASE_URL and SUPABASE_SERVICE_KEY
python scripts/seed_supabase.py
```

### 3. Configure environment

Copy the root `.env` to `web/.env.local` or create it with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 4. Install and run

```bash
cd web
npm install
npm run dev
```

If you see 404s for `/_next/static/...` assets: stop the dev server, run `rm -rf .next`, then `npm run dev` again. Hard-refresh the browser (Cmd+Shift+R / Ctrl+Shift+R).

## Deploy to Vercel

1. Connect the repo to Vercel
2. Set root directory to `web`
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
4. Deploy
