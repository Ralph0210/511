#!/usr/bin/env python3
"""
Seed Supabase with billboard_data.csv
Run from project root: python scripts/seed_supabase.py

Requires: pip install supabase python-dotenv
"""
import csv
import os
from pathlib import Path

try:
    from supabase import create_client
    from dotenv import load_dotenv
except ImportError:
    print("Install dependencies: pip install supabase python-dotenv")
    exit(1)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    exit(1)

CSV_PATH = Path(__file__).parent.parent / "billboard_data.csv"
BATCH_SIZE = 1000


def parse_bool(val: str) -> bool:
    return val.strip().lower() in ("true", "1", "yes")


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    rows = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "date": row["date"],
                "rank": int(row["rank"]) if row["rank"] else 0,
                "song": row["song"] or "",
                "artist": row["artist"] or "",
                "last_week": int(row["last_week"]) if row["last_week"] else None,
                "peak_rank": int(row["peak_rank"]) if row["peak_rank"] else 0,
                "weeks_on_board": int(row["weeks_on_board"]) if row["weeks_on_board"] else 0,
                "is_new": parse_bool(row.get("is_new", "false")),
                "image_url": row["image_url"] if row["image_url"] else None,
            })

    total = len(rows)
    print(f"Inserting {total} rows in batches of {BATCH_SIZE}...")

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table("chart_entries").insert(batch).execute()
        print(f"  Inserted {min(i + BATCH_SIZE, total)} / {total}")

    print("Done!")


if __name__ == "__main__":
    main()
