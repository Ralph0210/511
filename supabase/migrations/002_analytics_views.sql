-- Q1: Average song lifespan by debut year
-- For each song, lifespan = max(weeks_on_board). Group by year of first appearance.
CREATE OR REPLACE VIEW avg_lifespan_by_year AS
WITH song_lifespan AS (
  SELECT 
    song, 
    artist,
    MIN(date) AS first_date,
    MAX(weeks_on_board) AS max_weeks
  FROM chart_entries
  GROUP BY song, artist
)
SELECT 
  EXTRACT(YEAR FROM first_date)::int AS debut_year,
  ROUND(AVG(max_weeks)::numeric, 2) AS avg_lifespan,
  COUNT(*) AS song_count
FROM song_lifespan
GROUP BY EXTRACT(YEAR FROM first_date)
ORDER BY debut_year;

-- Q2: Debut vs gradual-rise songs - stats for comparison
-- "Debut" = is_new was true on first chart appearance; "Gradual" = climbed from previous chart
CREATE OR REPLACE VIEW debut_vs_gradual_stats AS
WITH first_appearance AS (
  SELECT DISTINCT ON (song, artist) 
    song, artist, date, is_new, weeks_on_board
  FROM chart_entries
  ORDER BY song, artist, date ASC
),
song_max_weeks AS (
  SELECT song, artist, MAX(weeks_on_board) AS max_weeks
  FROM chart_entries
  GROUP BY song, artist
),
combined AS (
  SELECT 
    fa.is_new AS is_debut,
    smw.max_weeks
  FROM first_appearance fa
  JOIN song_max_weeks smw ON fa.song = smw.song AND fa.artist = smw.artist
)
SELECT 
  is_debut,
  ROUND(AVG(max_weeks)::numeric, 2) AS avg_weeks,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY max_weeks)::int AS median_weeks,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY max_weeks)::int AS q1_weeks,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY max_weeks)::int AS q3_weeks,
  MIN(max_weeks)::int AS min_weeks,
  MAX(max_weeks)::int AS max_weeks,
  COUNT(*) AS song_count
FROM combined
GROUP BY is_debut;

-- Q2b: Raw data for box plot (sample to keep response size manageable)
CREATE OR REPLACE VIEW debut_vs_gradual_sample AS
WITH first_appearance AS (
  SELECT DISTINCT ON (song, artist) song, artist, is_new
  FROM chart_entries
  ORDER BY song, artist, date ASC
),
song_max_weeks AS (
  SELECT song, artist, MAX(weeks_on_board) AS max_weeks
  FROM chart_entries
  GROUP BY song, artist
)
SELECT 
  fa.is_new AS is_debut,
  smw.max_weeks
FROM first_appearance fa
JOIN song_max_weeks smw ON fa.song = smw.song AND fa.artist = smw.artist;

-- Q3: Peak rank vs longevity (one row per song)
CREATE OR REPLACE VIEW peak_longevity AS
SELECT 
  song,
  artist,
  MIN(peak_rank) AS peak_rank,
  MAX(weeks_on_board) AS weeks_on_board
FROM chart_entries
GROUP BY song, artist;
