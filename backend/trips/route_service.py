"""
Route service using free, no-API-key services:
- Nominatim (OpenStreetMap) for geocoding
- OSRM (Open Source Routing Machine) for driving directions

Both are free, reliable, and require no API keys.
"""

import logging
import time
import requests

logger = logging.getLogger(__name__)

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'
NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

# Nominatim requires a User-Agent and rate limiting (1 req/sec)
HEADERS = {'User-Agent': 'TruckerTrackerApp/1.0 (trip-planner)'}
_last_nominatim_call = 0.0


def _rate_limit_nominatim():
    """Ensure at least 1 second between Nominatim requests (their policy)."""
    global _last_nominatim_call
    now = time.time()
    elapsed = now - _last_nominatim_call
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)
    _last_nominatim_call = time.time()


def geocode(location_text: str) -> dict:
    """Geocode a location string to lat/lng using Nominatim (OpenStreetMap)."""
    _rate_limit_nominatim()
    params = {
        'q': location_text,
        'format': 'json',
        'limit': 1,
        'countrycodes': 'us',
        'addressdetails': 1,
    }
    resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    if not data:
        raise ValueError(f'Could not geocode location: "{location_text}". Please enter a valid US city/address.')

    result = data[0]
    lat = float(result['lat'])
    lng = float(result['lon'])
    name = result.get('display_name', location_text)
    # Shorten display name: "Dallas, Dallas County, Texas, US" → "Dallas, TX"
    name = _shorten_name(name, result.get('address', {}))

    logger.info(f'Geocoded "{location_text}" → {name} ({lat:.4f}, {lng:.4f})')
    return {'lat': lat, 'lng': lng, 'name': name}


def reverse_geocode(lat: float, lng: float) -> str:
    """Reverse geocode coordinates to a city/state name."""
    _rate_limit_nominatim()
    params = {
        'lat': lat,
        'lon': lng,
        'format': 'json',
        'zoom': 10,
        'addressdetails': 1,
    }
    try:
        resp = requests.get(NOMINATIM_REVERSE_URL, params=params, headers=HEADERS, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        addr = data.get('address', {})
        city = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('county', '')
        state = addr.get('state', '')
        if city and state:
            state_abbr = _state_abbrev(state)
            return f'{city}, {state_abbr}'
        return data.get('display_name', f'{lat:.2f}, {lng:.2f}')[:50]
    except Exception:
        return f'{lat:.2f}, {lng:.2f}'


def get_route(start: dict, end: dict) -> dict:
    """
    Get driving route using OSRM (free, no API key needed).
    Returns distance_miles, duration_hours, geometry, waypoints, and location names.
    """
    coords_str = f"{start['lng']},{start['lat']};{end['lng']},{end['lat']}"
    url = f'{OSRM_URL}/{coords_str}'
    params = {
        'overview': 'full',
        'geometries': 'geojson',
        'steps': 'true',
        'annotations': 'true',
    }

    resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if data.get('code') != 'Ok' or not data.get('routes'):
        raise ValueError(f'Could not find driving route from {start["name"]} to {end["name"]}.')

    route = data['routes'][0]
    distance_meters = route['distance']
    duration_seconds = route['duration']
    distance_miles = distance_meters * 0.000621371
    duration_hours = duration_seconds / 3600.0

    # Geometry is GeoJSON LineString: [[lng, lat], ...]
    geometry = route['geometry']['coordinates']  # list of [lng, lat]

    # Extract waypoints from route steps for named locations
    waypoints = []
    cumulative_miles = 0.0
    for leg in route.get('legs', []):
        for step in leg.get('steps', []):
            step_dist = step.get('distance', 0) * 0.000621371
            cumulative_miles += step_dist
            name = step.get('name', '')
            if name and len(name) > 2:
                maneuver = step.get('maneuver', {})
                loc = maneuver.get('location', [0, 0])
                waypoints.append({
                    'lat': loc[1],
                    'lng': loc[0],
                    'name': name,
                    'miles_from_seg_start': round(cumulative_miles, 1),
                })

    # Sample major waypoints (every ~100 miles) for named stops
    major_waypoints = _sample_major_waypoints(geometry, distance_miles, waypoints)

    logger.info(
        f'Route: {start["name"]} → {end["name"]}: '
        f'{distance_miles:.0f} mi, {duration_hours:.1f} hrs, '
        f'{len(geometry)} coords, {len(major_waypoints)} waypoints'
    )

    return {
        'distance_miles': round(distance_miles, 1),
        'duration_hours': round(duration_hours, 2),
        'geometry': geometry,
        'waypoints': major_waypoints,
        'start_name': start['name'],
        'end_name': end['name'],
        'start_coords': [start['lat'], start['lng']],
        'end_coords': [end['lat'], end['lng']],
    }


def _sample_major_waypoints(geometry: list, total_miles: float, raw_waypoints: list) -> list:
    """
    Select major waypoints roughly every 100 miles along the route.
    These provide named locations for ELD log remarks.
    """
    if not raw_waypoints:
        return []

    interval = 100.0  # miles
    result = []
    next_target = interval

    for wp in raw_waypoints:
        dist = wp.get('miles_from_seg_start', 0)
        if dist >= next_target:
            result.append(wp)
            next_target = dist + interval

    return result


def _shorten_name(display_name: str, address: dict) -> str:
    """Shorten a Nominatim display name to 'City, ST' format."""
    city = address.get('city') or address.get('town') or address.get('village') or ''
    state = address.get('state', '')
    if city and state:
        return f'{city}, {_state_abbrev(state)}'
    # Fallback: take first two comma-separated parts
    parts = display_name.split(',')
    if len(parts) >= 2:
        return f'{parts[0].strip()}, {parts[1].strip()}'
    return display_name[:40]


def _state_abbrev(state_name: str) -> str:
    """Convert full US state name to abbreviation."""
    states = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
        'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
        'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
        'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
        'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
        'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
        'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
        'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
        'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
        'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
        'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
    }
    return states.get(state_name, state_name[:2].upper())
