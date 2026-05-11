# Spotter App - Development Context & Thinking Notes

## Architecture Decisions

### Tech Stack
- **Backend**: Django 4.x + Django REST Framework
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Map API**: Leaflet.js (free, open-source) + OpenRouteService API (free tier, 2000 req/day)
- **ELD Logs**: HTML5 Canvas rendering (drawn programmatically to match FMCSA format)
- **Deployment**: Frontend on Vercel, Backend on Render/Railway (free tier)

### Why these choices?
1. **OpenRouteService** over Google Maps - free, no billing required, provides route geometry + duration + distance
2. **Leaflet** over Mapbox - truly free, no token limits for tile display
3. **Canvas** for ELD logs - pixel-perfect control, matches the official FMCSA log sheet format, can export as image/PDF
4. **Vite** over CRA - faster builds, better DX, modern standard

## HOS Rules (FMCSA Part 395 - Property Carriers, 70hr/8day)

### Core Limits
| Rule | Value | Reference |
|------|-------|-----------|
| Max driving per shift | 11 hours | §395.3(a)(3) |
| Driving window | 14 hours from start of duty | §395.3(a)(2) |
| 30-min break | Required after 8 cumulative driving hours | §395.3(a)(3)(ii) |
| Off-duty reset | 10 consecutive hours | §395.3(a)(1) |
| Weekly limit | 70 hours on-duty in 8 consecutive days | §395.3(b) |
| 34-hour restart | Resets 70-hour clock to zero | §395.3(c) |

### App Assumptions (from assignment)
- Property-carrying driver
- 70hrs/8days cycle
- No adverse driving conditions
- Fueling at least once every 1,000 miles
- 1 hour for pickup and drop-off
- Average speed: ~55 mph (will calculate from route API actual duration)

### Trip Planning Algorithm
1. Get route from current → pickup → dropoff via OpenRouteService
2. Calculate total drive time and distance
3. Simulate the trip hour by hour:
   - Start with current cycle hours used
   - After 8 hrs cumulative driving → 30-min break
   - After 11 hrs driving or 14 hrs on-duty → 10-hr off-duty (sleeper berth)
   - Every 1000 miles → fuel stop (30 min, on-duty not driving)
   - 1 hour at pickup (on-duty not driving)
   - 1 hour at dropoff (on-duty not driving)
   - Track 70-hour/8-day rolling total
4. Generate daily log sheets for each 24-hour period
5. Place stop markers on the map at appropriate locations along route

### ELD Log Sheet Structure (from PDF pg 15-19)
- 24-hour grid, 15-minute increments
- 4 status lines: Off Duty, Sleeper Berth, Driving, On Duty (Not Driving)
- Header: Date, miles, carrier info, truck numbers
- Remarks: City/State at each status change
- Recap section at bottom: 70hr/8day tracking
- Total hours per line must equal 24

## Progress Log
- [x] Read FMCSA HOS PDF (27 pages)
- [x] Read reference video summary
- [x] Read assignment instructions
- [x] Backend setup (Django + DRF)
- [x] HOS engine (11hr, 14hr, 30min, 70/8, fuel, pickup/dropoff)
- [x] Route service: Switched from ORS (API key expired) → Nominatim + OSRM (free, no key)
- [x] API tested: Dallas→Houston→LA = 1785mi, 8 stops, 4 daily logs, all HOS compliant
- [x] Frontend: React + Vite + Tailwind, TripForm, RouteMap, LogSheet, StopsList, TripSummary
- [x] ELD LogSheet: Canvas-drawn matching FMCSA format (header, 24hr grid, 15min ticks, remarks, recap, signature)
- [x] Production hardening: whitenoise, gunicorn, logging, throttling, CORS config
- [x] Deployment configs: Procfile, render.yaml, vercel.json
- [x] Git repo: github.com/kush07upadhyay/Spotter_App
- [ ] Final UI polish & edge case testing
- [ ] Deployment guide
