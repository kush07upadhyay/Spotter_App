# 🚛 Spotter — ELD Trip Planner & HOS Compliance

A full-stack web application that helps truck drivers plan trips with automatic **Hours of Service (HOS)** compliance. Enter your trip details and get a route with all required stops, rests, and fuel breaks — plus auto-generated **ELD daily log sheets** matching the FMCSA Part 395 format.

## Features

- 📍 **Route Planning** — Enter current location, pickup, and dropoff to get optimal driving route
- 🗺️ **Interactive Map** — Leaflet-powered map showing the route with color-coded stop markers
- ⏱️ **HOS Compliance** — Automatically enforces all FMCSA Part 395 rules:
  - 11-hour driving limit
  - 14-hour duty window
  - 30-minute break after 8 hours driving
  - 10-hour off-duty reset
  - 70-hour/8-day cycle limit
- ⛽ **Fuel Stops** — Auto-scheduled every 1,000 miles
- 📋 **ELD Log Sheets** — Canvas-rendered daily logs matching official FMCSA format with 15-minute grid, all 4 duty status lines, remarks, and recap section
- 🎨 **Modern UI** — Clean, responsive design with Tailwind CSS

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Django 5.x + Django REST Framework |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Map | Leaflet.js + OpenStreetMap |
| Routing | OpenRouteService API (free) |
| ELD Logs | HTML5 Canvas |

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` with API proxy to `http://localhost:8000`.

## HOS Rules Applied

| Rule | Limit |
|------|-------|
| Max Driving | 11 hours per shift |
| Duty Window | 14 hours from duty start |
| Mandatory Break | 30 min after 8 hrs driving |
| Off-Duty Reset | 10 consecutive hours |
| Weekly Limit | 70 hours / 8 days |
| Fuel Interval | Every 1,000 miles |
| Pickup/Dropoff | 1 hour each |

## Assumptions
- Property-carrying driver
- 70-hour/8-day cycle
- No adverse driving conditions

## License
MIT
