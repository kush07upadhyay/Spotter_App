# 🚛 Trucker Tracker — ELD Trip Planner & HOS Compliance

A full-stack web application that helps commercial truck drivers plan trips with **automatic Hours of Service (HOS) compliance**. Enter your trip details and get an optimized route with all required stops, rests, and fuel breaks — plus auto-generated **ELD daily log sheets** matching the FMCSA Part 395 format.

> Built for property-carrying CMV drivers operating under the **70-hour/8-day** rule.

---

## ✨ Features

### 🗺️ Route Planning
- Enter current location, pickup, and dropoff with **autocomplete suggestions** (powered by Nominatim)
- Optimal driving route calculated via **OSRM** (Open Source Routing Machine)
- Interactive **Leaflet map** with color-coded markers for each stop type
- Full route polyline visualization

### ⏱️ HOS Compliance Engine
All FMCSA Part 395 rules automatically enforced:

| Rule | Implementation |
|------|---------------|
| **11-Hour Driving Limit** | Max 11 hrs driving after 10 consecutive hrs off duty |
| **14-Hour Duty Window** | Cannot drive beyond 14 hrs after coming on duty |
| **30-Minute Break** | Required after 8 cumulative hours of driving |
| **10-Hour Off-Duty** | Minimum 10 consecutive hours off duty between shifts |
| **70-Hour/8-Day Cycle** | Cannot exceed 70 on-duty hours in 8 consecutive days |
| **34-Hour Restart** | Optional restart to reset 70-hour cycle |
| **Fuel Stops** | Auto-scheduled every 1,000 miles (30-min on-duty) |

### 📋 ELD Daily Log Sheets
- **Canvas-rendered** daily logs matching the official FMCSA format
- 24-hour grid with 15-minute tick marks
- All 4 duty status rows: Off Duty, Sleeper Berth, Driving, On Duty (Not Driving)
- Color-coded status lines with transition markers
- Header with date, carrier info, truck/trailer numbers
- Remarks section with timestamped entries
- Shipping documents section
- **70hr/8-day recap** with compliance tracking
- Certification & signature line
- **Download as PNG** for each day's log

### 🎯 UX Features
- **Location autocomplete** with debounced Nominatim search
- **Info tooltips** (ⓘ) on every field explaining what it means for drivers
- **Mobile-responsive** layout with collapsible form panel
- **Loading skeleton** during route calculation
- Input validation with clear error messages
- "New Trip" reset functionality
- Timeline-style itinerary with arrival/departure times

---

## 🏗️ Architecture

```
Trucker_Tracker/
├── backend/                    # Django REST API
│   ├── backend/
│   │   ├── settings.py         # Production-ready config (whitenoise, logging, throttling)
│   │   ├── urls.py             # Root URL config
│   │   └── wsgi.py
│   ├── trips/
│   │   ├── hos_engine.py       # 🧠 Core HOS simulation engine (~550 lines)
│   │   ├── route_service.py    # Nominatim geocoding + OSRM routing
│   │   ├── views.py            # DRF API endpoint
│   │   ├── urls.py             # /api/trip-plan/
│   │   ├── tests.py            # 15 unit tests (HOS rules + API validation)
│   │   └── models.py
│   ├── requirements.txt
│   ├── Procfile                # Gunicorn for production
│   └── render.yaml             # Render.com deployment config
│
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx             # Main app with tabs, loading, error states
│   │   ├── api.ts              # TypeScript interfaces + API client
│   │   ├── index.css           # Tailwind CSS + custom styles
│   │   ├── main.tsx            # Entry point
│   │   └── components/
│   │       ├── TripForm.tsx    # Trip input form with validation
│   │       ├── LocationInput.tsx # Autocomplete with Nominatim
│   │       ├── InfoTooltip.tsx # Hover/tap info tooltips
│   │       ├── RouteMap.tsx    # Leaflet map with markers + polyline
│   │       ├── StopsList.tsx   # Timeline-style stop itinerary
│   │       ├── TripSummary.tsx # Trip statistics cards
│   │       └── LogSheet.tsx    # Canvas-rendered FMCSA daily log
│   ├── index.html
│   ├── vite.config.ts          # Vite config with API proxy
│   ├── vercel.json             # Vercel deployment config
│   └── package.json
│
├── .gitignore
└── README.md
```

### Data Flow

```
User Input → TripForm → POST /api/trip-plan/ → Django View
                                                   ├── Nominatim (geocode locations)
                                                   ├── OSRM (calculate route)
                                                   ├── HOS Engine (simulate trip)
                                                   │   ├── Drive segments
                                                   │   ├── Insert breaks/rests/fuel
                                                   │   └── Build daily logs
                                                   └── Reverse geocode stop names
                                                          ↓
Frontend receives: route geometry, stops[], daily_logs[]
    ├── RouteMap (Leaflet polyline + markers)
    ├── StopsList (timeline itinerary)
    ├── TripSummary (stats cards)
    └── LogSheet (Canvas ELD logs, downloadable PNG)
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **npm** or **yarn**

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv ../venv
source ../venv/bin/activate    # macOS/Linux
# OR
..\venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (proxies /api to localhost:8000)
npm run dev
```

Open **http://localhost:5173** in your browser.

### Run Tests

```bash
cd backend
python manage.py test trips -v2
```

```
Found 15 test(s).
test_11_hour_limit_triggers_rest ... ok
test_no_single_day_driving_exceeds_11hrs ... ok
test_break_after_8_hours_driving ... ok
test_high_cycle_used_triggers_restart ... ok
test_daily_log_hours_sum_to_24 ... ok
test_short_trip_no_breaks_needed ... ok
test_max_cycle_used_70 ... ok
test_very_long_trip ... ok
test_zero_distance_trip ... ok
test_fuel_stop_for_long_trip ... ok
test_invalid_cycle_used_negative ... ok
test_invalid_cycle_used_over_70 ... ok
test_missing_current_location ... ok
test_missing_dropoff_location ... ok
test_missing_pickup_location ... ok
----------------------------------------------------------------------
Ran 15 tests in 0.5s — OK
```

---

## 📡 API Reference

### `POST /api/trip-plan/`

**Request Body:**
```json
{
  "current_location": "Dallas, TX",
  "pickup_location": "Houston, TX",
  "dropoff_location": "Los Angeles, CA",
  "current_cycle_used": 10
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_location` | string | ✅ | Driver's current position |
| `pickup_location` | string | ✅ | Shipper/loading location |
| `dropoff_location` | string | ✅ | Receiver/unloading location |
| `current_cycle_used` | number | ✅ | On-duty hours used in last 7-8 days (0-70) |

**Response:**
```json
{
  "route": {
    "total_distance_miles": 1785.3,
    "total_duration_hours": 25.5,
    "geometry": [[lng, lat], ...],
    "current_location": { "lat": 32.77, "lng": -96.79, "name": "Dallas, TX" },
    "pickup_location": { "lat": 29.76, "lng": -95.36, "name": "Houston, TX" },
    "dropoff_location": { "lat": 34.05, "lng": -118.24, "name": "Los Angeles, CA" }
  },
  "stops": [
    {
      "type": "pickup|dropoff|fuel|rest|break",
      "location_name": "Crockett County, TX",
      "lat": 30.72, "lng": -101.24,
      "arrival_time": "2026-05-12T12:30:00",
      "departure_time": "2026-05-12T13:30:00",
      "duration_hours": 1.0,
      "miles_from_start": 397.2
    }
  ],
  "daily_logs": [
    {
      "date": "2026-05-12",
      "total_miles": 605,
      "off_duty_hours": 0.0,
      "sleeper_hours": 10.0,
      "driving_hours": 11.0,
      "on_duty_hours": 3.0,
      "remarks": ["08:00 - Pre-trip inspection (Dallas, TX)", ...],
      "segments": [
        {
          "status": "DRIVING|ON_DUTY|OFF_DUTY|SLEEPER",
          "start_hour": 8.25,
          "end_hour": 19.25,
          "location": "Dallas, TX",
          "remarks": "Driving",
          "miles": 605.0
        }
      ]
    }
  ]
}
```

---

## 🧪 Test Coverage

| Category | Tests | What's Verified |
|----------|-------|----------------|
| **Basic Trip** | 2 | Short trip fits in 1 day, daily logs sum to 24h |
| **11-Hr Driving** | 2 | Rest triggered after 11h, no day exceeds limit |
| **30-Min Break** | 1 | Break inserted after 8h cumulative driving |
| **Fuel Stops** | 1 | Fuel stop every 1,000 miles |
| **70-Hr Cycle** | 1 | High cycle usage triggers restart |
| **Edge Cases** | 3 | Zero distance, max cycle, 2800mi cross-country |
| **API Validation** | 5 | Missing fields, invalid cycle values → 400 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10, Django 5.x, Django REST Framework |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| **Map** | Leaflet + react-leaflet |
| **Geocoding** | Nominatim (OpenStreetMap) — free, no API key |
| **Routing** | OSRM (Open Source Routing Machine) — free, no API key |
| **ELD Logs** | HTML5 Canvas (downloadable PNG) |
| **Icons** | Lucide React |
| **Production** | Gunicorn, WhiteNoise, structured logging |

---

## 🌐 Deployment

### Frontend → Vercel
```bash
cd frontend && npm run build
# Deploy dist/ to Vercel (vercel.json included)
```

### Backend → Render.com
```bash
# render.yaml included — connects to GitHub for auto-deploy
# Set environment variables: DJANGO_SECRET_KEY, CORS_ALLOWED_ORIGINS, DEBUG=False
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | dev key | Django secret key (change in production!) |
| `DEBUG` | `True` | Set to `False` in production |
| `ALLOWED_HOSTS` | `*` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | all (dev) | Comma-separated frontend URLs |
| `VITE_API_URL` | `` (proxy) | Backend URL for frontend in production |

---

## 📝 FMCSA Compliance Notes

This application implements the HOS rules defined in **49 CFR Part 395** for property-carrying commercial motor vehicle drivers:

- Designed for the **70-hour/8-day** operating schedule
- Assumes a single driver (no team driving)
- Does not implement adverse driving conditions exception
- Does not implement short-haul exception
- Fuel stops are estimated at 1,000-mile intervals
- Pickup/dropoff time is estimated at 1 hour each
- Pre-trip inspection is 15 minutes (on-duty not driving)

---

## 📄 License

This project was built as an assignment submission for Spotter (Trucker Tracker).
