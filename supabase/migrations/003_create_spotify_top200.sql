-- Spotify Top 200 weekly global chart data (2017–2021)
-- Source: https://github.com/younver/spotify-top-200-dataset
-- Semicolon-delimited CSV with 74,660 rows
-- One row per artist per chart entry (multi-artist tracks have multiple rows, distinguished by pivot flag)

CREATE TABLE IF NOT EXISTS spotify_top200 (
  id               BIGSERIAL PRIMARY KEY,

  -- Chart position
  rank             INTEGER NOT NULL,
  week             DATE NOT NULL,
  streams          BIGINT,

  -- Track metadata
  track_id         TEXT NOT NULL,
  track_name       TEXT,
  track_popularity INTEGER,
  track_number     INTEGER,
  track_index      INTEGER,
  explicit         BOOLEAN,
  release_date     DATE,

  -- Album metadata
  album_id         TEXT,
  album_name       TEXT,
  album_img        TEXT,
  album_type       TEXT,
  album_label      TEXT,
  album_track_number INTEGER,
  album_popularity INTEGER,

  -- Artist metadata (one row per artist on multi-artist tracks)
  artist_num       INTEGER,
  artist_names     TEXT,    -- all collaborating artists, comma-separated
  artist_id        TEXT,
  artist_name      TEXT,
  artist_img       TEXT,
  artist_followers BIGINT,
  artist_popularity INTEGER,
  artist_genres    TEXT,
  collab           BOOLEAN, -- true if track has multiple artists
  pivot            BOOLEAN, -- false = primary artist row, true = featured artist row

  -- Spotify audio features
  danceability     FLOAT,
  energy           FLOAT,
  key              INTEGER,
  mode             INTEGER,
  time_signature   INTEGER,
  loudness         FLOAT,
  speechiness      FLOAT,
  acousticness     FLOAT,
  instrumentalness FLOAT,
  liveness         FLOAT,
  valence          FLOAT,
  tempo            FLOAT,
  duration         INTEGER, -- milliseconds

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_spotify_week        ON spotify_top200(week);
CREATE INDEX IF NOT EXISTS idx_spotify_rank        ON spotify_top200(rank);
CREATE INDEX IF NOT EXISTS idx_spotify_week_rank   ON spotify_top200(week, rank);
CREATE INDEX IF NOT EXISTS idx_spotify_track_id    ON spotify_top200(track_id);
CREATE INDEX IF NOT EXISTS idx_spotify_artist_name ON spotify_top200(artist_name);
CREATE INDEX IF NOT EXISTS idx_spotify_track_name  ON spotify_top200(track_name);

-- Public read access
ALTER TABLE spotify_top200 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON spotify_top200 FOR SELECT USING (true);
CREATE POLICY "Allow service insert" ON spotify_top200 FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service delete" ON spotify_top200 FOR DELETE USING (true);
