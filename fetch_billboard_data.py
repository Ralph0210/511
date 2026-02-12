
import argparse
import csv
import datetime
import time
import sys
import billboard

def parse_args():
    parser = argparse.ArgumentParser(description='Fetch historical Billboard chart data.')
    parser.add_argument('--chart', type=str, default='hot-100', help='Chart name (e.g. hot-100)')
    parser.add_argument('--start-date', type=str, default='1958-08-04', help='Date to stop fetching (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, default=None, help='Date to start fetching from (YYYY-MM-DD). Default: latest')
    parser.add_argument('--out', type=str, default='billboard_data.csv', help='Output CSV file path')
    parser.add_argument('--delay', type=float, default=1.0, help='Delay in seconds between requests')
    parser.add_argument('--max-retries', type=int, default=5, help='Max retries for requests')
    return parser.parse_args()

def fetch_chart(name, date_str, max_retries):
    try:
        return billboard.ChartData(name, date=date_str, max_retries=max_retries)
    except Exception as e:
        print(f"Error fetching chart for {date_str}: {e}")
        return None

def main():
    args = parse_args()
    
    # Open CSV for writing
    with open(args.out, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['date', 'rank', 'song', 'artist', 'last_week', 'peak_rank', 'weeks_on_board', 'is_new', 'image_url']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        # Determine start fetching date
        current_target_date = None
        if args.end_date:
            current_target_date = args.end_date
            print(f"Starting from provided date: {current_target_date}")
        else:
            print("Fetching latest chart to determine start date...")
            latest_chart = fetch_chart(args.chart, None, args.max_retries)
            if not latest_chart:
                print("Could not fetch latest chart. Exiting.")
                return
            current_target_date = latest_chart.date
            print(f"Latest chart date is: {current_target_date}")
            
            # Write latest chart data
            for entry in latest_chart:
                writer.writerow({
                    'date': latest_chart.date,
                    'rank': entry.rank,
                    'song': entry.title,
                    'artist': entry.artist,
                    'last_week': entry.lastPos if entry.lastPos else '',
                    'peak_rank': entry.peakPos,
                    'weeks_on_board': entry.weeks,
                    'is_new': entry.isNew,
                    'image_url': entry.image
                })
            
            # Move to previous epoch for loop
            d = datetime.datetime.strptime(current_target_date, '%Y-%m-%d')
            prev_d = d - datetime.timedelta(days=7)
            current_target_date = prev_d.strftime('%Y-%m-%d')
            print(f"Next target date: {current_target_date}")
            time.sleep(args.delay)

        start_date_obj = datetime.datetime.strptime(args.start_date, '%Y-%m-%d')
        last_fetched_date_str = None
        
        # If we just fetched latest, last_fetched_date_str should be set
        if not args.end_date and 'latest_chart' in locals():
            last_fetched_date_str = latest_chart.date

        while True:
            target_date_obj = datetime.datetime.strptime(current_target_date, '%Y-%m-%d')
            if target_date_obj < start_date_obj:
                print("Reached start date. Finishing.")
                break

            print(f"Fetching {current_target_date}...")
            chart = fetch_chart(args.chart, current_target_date, args.max_retries)
            
            if not chart:
                print(f"Failed to fetch {current_target_date}. Retrying same date after delay...")
                time.sleep(args.delay * 2)
                continue

            # Duplicate detection loop
            # If returned date is same or later than last fetched date (implies we rounded up to a date we likely already have)
            # But wait, if we are iterating backwards, "later" means "more recent". 
            # If we requested T-7 and got T (where T is last_fetched), then we got a duplicate.
            # If we got T+7, that's definitely wrong.
            # If we got T-7, good.
            # If we got T-1, good (chart moved).
            
            if last_fetched_date_str and chart.date >= last_fetched_date_str:
                print(f"Duplicate/Future date detected (Requested: {current_target_date}, Got: {chart.date}, Last: {last_fetched_date_str}).")
                # We requested a date that rounded UP to a date we already visited (or a future one).
                # This implies the chart for 'current_target_date' is actually in the future relative to reality or we didn't go back far enough.
                # Since we want to go BACKWARDS, we need to request an even earlier date to snap to the PREVIOUS chart.
                print("Backing off 1 day and retrying...")
                d = datetime.datetime.strptime(current_target_date, '%Y-%m-%d')
                d = d - datetime.timedelta(days=1)
                current_target_date = d.strftime('%Y-%m-%d')
                # Do not sleep here, just loop immediately or small sleep?
                # time.sleep(0.1) 
                continue

            # If we are here, we got a valid new chart older than last_fetched_date_str
            print(f"Successfully fetched chart for {chart.date}")
            
            for entry in chart:
                 writer.writerow({
                    'date': chart.date,
                    'rank': entry.rank,
                    'song': entry.title,
                    'artist': entry.artist,
                    'last_week': entry.lastPos if entry.lastPos else '',
                    'peak_rank': entry.peakPos,
                    'weeks_on_board': entry.weeks,
                    'is_new': entry.isNew,
                    'image_url': entry.image
                })
            
            # Update state
            last_fetched_date_str = chart.date
            
            # Calculate next target: current actual date - 7 days
            d = datetime.datetime.strptime(last_fetched_date_str, '%Y-%m-%d')
            prev_d = d - datetime.timedelta(days=7)
            current_target_date = prev_d.strftime('%Y-%m-%d')
            
            time.sleep(args.delay)

if __name__ == '__main__':
    main()
