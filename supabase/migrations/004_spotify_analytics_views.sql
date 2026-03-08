-- Spotify analytics views for ChartPulse exploration pages
-- Run in Supabase SQL Editor after 003_create_spotify_top200.sql

-- Q1: Song trajectory (rank + streams over time per song)
-- Filters to primary artist only to avoid double-counting collabs
CREATE OR REPLACE VIEW song_trajectories AS
SELECT track_id, track_name, artist_name, album_img,
       week, rank, streams, track_popularity, release_date
FROM spotify_top200
WHERE pivot = false OR pivot IS NULL
ORDER BY track_id, week;

-- Q1: Song summary stats (for cards, search, featured songs)
CREATE OR REPLACE VIEW song_summary AS
SELECT track_id,
       MIN(track_name) AS track_name,
       MIN(artist_name) AS artist_name,
       MIN(album_img) AS album_img,
       COUNT(DISTINCT week) AS weeks_on_chart,
       MIN(rank) AS peak_rank,
       MAX(streams) AS max_streams,
       AVG(streams)::BIGINT AS avg_streams,
       MIN(week) AS first_week,
       MAX(week) AS last_week,
       MIN(release_date) AS release_date,
       MIN(artist_genres) AS artist_genres
FROM spotify_top200
WHERE pivot = false OR pivot IS NULL
GROUP BY track_id;

-- Q2: Weekly attribute averages (for trend lines)
CREATE OR REPLACE VIEW weekly_attribute_trends AS
SELECT week,
       COUNT(DISTINCT track_id) AS song_count,
       AVG(duration)::INTEGER AS avg_duration,
       AVG(danceability)::REAL AS avg_danceability,
       AVG(energy)::REAL AS avg_energy,
       AVG(valence)::REAL AS avg_valence,
       AVG(tempo)::REAL AS avg_tempo,
       AVG(acousticness)::REAL AS avg_acousticness,
       AVG(speechiness)::REAL AS avg_speechiness,
       AVG(loudness)::REAL AS avg_loudness,
       AVG(CASE WHEN rank <= 10 THEN duration END)::INTEGER AS avg_duration_top10,
       AVG(CASE WHEN rank <= 50 THEN duration END)::INTEGER AS avg_duration_top50
FROM spotify_top200
WHERE (pivot = false OR pivot IS NULL)
GROUP BY week
ORDER BY week;

-- Q3: Weekly genre data (primary artist rows only, genre classification in app)
CREATE OR REPLACE VIEW weekly_genre_data AS
SELECT week, rank, streams, artist_genres, duration, track_id, track_name, artist_name
FROM spotify_top200
WHERE pivot = false OR pivot IS NULL;
