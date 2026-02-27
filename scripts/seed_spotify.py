#!/usr/bin/env python3
"""
Seed Supabase with Spotify Top 200 dataset.
Run from project root: python scripts/seed_spotify.py

Dataset: https://github.com/younver/spotify-top-200-dataset
CSV is semicolon-delimited, 74,660 rows, weekly global Top 200 (2017–2021).

Requires: pip install supabase python-dotenv
"""
import csv
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    from supabase import create_client
    from dotenv import load_dotenv
except ImportError:
    print("Install dependencies: pip install supabase python-dotenv")
    sys.exit(1)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

# Path to the cloned dataset CSV (clone from https://github.com/younver/spotify-top-200-dataset)
CSV_PATH = Path(__file__).parent.parent / "spotify-top-200-dataset" / "spotify-top-200-dataset.csv"
BATCH_SIZE = 500


def parse_bool(val: str) -> bool | None:
    v = val.strip().lower()
    if v in ("true", "1", "yes"):
        return True
    if v in ("false", "0", "no"):
        return False
    return None


def parse_int(val: str) -> int | None:
    try:
        return int(val.strip())
    except (ValueError, AttributeError):
        return None


def parse_float(val: str) -> float | None:
    try:
        return float(val.strip())
    except (ValueError, AttributeError):
        return None


def parse_date(val: str) -> str | None:
    """Convert M/D/YYYY or YYYY-MM-DD to ISO date string."""
    val = val.strip()
    if not val:
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y"):
        try:
            return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def main():
    if not CSV_PATH.exists():
        print(f"CSV not found at {CSV_PATH}")
        print("Clone the dataset first:")
        print("  git clone https://github.com/younver/spotify-top-200-dataset.git")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    rows = []
    skipped = 0
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for i, row in enumerate(reader):
            week = parse_date(row.get("week", ""))
            if not week:
                skipped += 1
                continue

            rows.append({
                # Chart
                "rank":               parse_int(row.get("rank")),
                "week":               week,
                "streams":            parse_int(row.get("streams")),

                # Track
                "track_id":           row.get("track_id", "").strip() or None,
                "track_name":         row.get("track_name", "").strip() or "Unknown",
                "track_popularity":   parse_int(row.get("track_popularity")),
                "track_number":       parse_int(row.get("track_number")),
                "track_index":        parse_int(row.get("track_index")),
                "explicit":           parse_bool(row.get("explicit", "")),
                "release_date":       parse_date(row.get("release_date", "")),

                # Album
                "album_id":           row.get("album_id", "").strip() or None,
                "album_name":         row.get("album_name", "").strip() or None,
                "album_img":          row.get("album_img", "").strip() or None,
                "album_type":         row.get("album_type", "").strip() or None,
                "album_label":        row.get("album_label", "").strip() or None,
                "album_track_number": parse_int(row.get("album_track_number")),
                "album_popularity":   parse_int(row.get("album_popularity")),

                # Artist
                "artist_num":         parse_int(row.get("artist_num")),
                "artist_names":       row.get("artist_names", "").strip() or None,
                "artist_id":          row.get("artist_id", "").strip() or None,
                "artist_name":        row.get("artist_name", "").strip() or None,
                "artist_img":         row.get("artist_img", "").strip() or None,
                "artist_followers":   parse_int(row.get("artist_followers")),
                "artist_popularity":  parse_int(row.get("artist_popularity")),
                "artist_genres":      row.get("artist_genres", "").strip() or None,
                "collab":             parse_bool(row.get("collab", "")),
                "pivot":              parse_bool(row.get("pivot", "")),

                # Audio features
                "danceability":       parse_float(row.get("danceability")),
                "energy":             parse_float(row.get("energy")),
                "key":                parse_int(row.get("key")),
                "mode":               parse_int(row.get("mode")),
                "time_signature":     parse_int(row.get("time_signature")),
                "loudness":           parse_float(row.get("loudness")),
                "speechiness":        parse_float(row.get("speechiness")),
                "acousticness":       parse_float(row.get("acousticness")),
                "instrumentalness":   parse_float(row.get("instrumentalness")),
                "liveness":           parse_float(row.get("liveness")),
                "valence":            parse_float(row.get("valence")),
                "tempo":              parse_float(row.get("tempo")),
                "duration":           parse_int(row.get("duration")),
            })

    total = len(rows)
    print(f"Parsed {total} rows ({skipped} skipped)")

    # Clear any partial data from previous runs
    print("Clearing existing data...")
    supabase.table("spotify_top200").delete().neq("id", 0).execute()

    print(f"Inserting in batches of {BATCH_SIZE}...")

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table("spotify_top200").insert(batch).execute()
        print(f"  Inserted {min(i + BATCH_SIZE, total):,} / {total:,}")

    print("Done!")


if __name__ == "__main__":
    main()
