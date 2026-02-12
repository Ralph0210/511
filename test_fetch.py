
import billboard
import datetime

print("Fetching current chart...")
chart = billboard.ChartData('hot-100')
print(f"Current Date: {chart.date}")
print(f"Previous Date: {chart.previousDate}")

if chart.date:
    d = datetime.datetime.strptime(chart.date, '%Y-%m-%d')
    prev_d = d - datetime.timedelta(days=7)
    prev_date_str = prev_d.strftime('%Y-%m-%d')
    print(f"Calculated Previous Date: {prev_date_str}")
    
    print(f"Fetching chart for {prev_date_str}...")
    prev_chart = billboard.ChartData('hot-100', date=prev_date_str)
    print(f"Fetched Date: {prev_chart.date}")
    print(f"Fetched Previous Date: {prev_chart.previousDate}")
