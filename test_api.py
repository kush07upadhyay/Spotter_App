import requests, json, time

start = time.time()
r = requests.post('http://localhost:8000/api/trip-plan/', json={
    'current_location': 'Dallas, TX',
    'pickup_location': 'Houston, TX',
    'dropoff_location': 'Los Angeles, CA',
    'current_cycle_used': 10,
})
elapsed = time.time() - start
d = r.json()

print(f"STATUS: {r.status_code} ({elapsed:.1f}s)")

if 'error' in d:
    print(f"ERROR: {d['error']}")
else:
    print(f"DISTANCE: {d['route']['total_distance_miles']:.0f} mi")
    print(f"DURATION: {d['route']['total_duration_hours']:.1f} hrs")
    print(f"\nSTOPS ({len(d['stops'])}):")
    for s in d['stops']:
        print(f"  {s['type']:8s} | {s['location_name'][:40]:40s} | {s['duration_hours']:.1f}h | mile {s['miles_from_start']:.0f}")

    print(f"\nDAILY LOGS ({len(d['daily_logs'])}):")
    for i, l in enumerate(d['daily_logs']):
        total = l['driving_hours'] + l['on_duty_hours'] + l['sleeper_hours'] + l['off_duty_hours']
        print(f"  Day {i+1}: {l['date']} | drive {l['driving_hours']:.1f}h | on-duty {l['on_duty_hours']:.1f}h | sleep {l['sleeper_hours']:.1f}h | off {l['off_duty_hours']:.1f}h | total={total:.1f}h | {l['total_miles']:.0f}mi")
        print(f"         Remarks: {l['remarks'][:3]}")
