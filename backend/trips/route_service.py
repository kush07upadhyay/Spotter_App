"""
Route service using OpenRouteService API for geocoding and directions.
"""
import requests
from django.conf import settings


ORS_BASE = 'https://api.openrouteservice.org'


def geocode(location_text: str) -> dict:
    """Geocode a location string to lat/lng coordinates."""
    url = f'{ORS_BASE}/geocode/search'
    params = {
        'api_key': settings.ORS_API_KEY,
        'text': location_text,
        'size': 1,
        'boundary.country': 'US',
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    if not data.get('features'):
        raise ValueError(f'Could not geocode location: {location_text}')

    feature = data['features'][0]
    coords = feature['geometry']['coordinates']  # [lng, lat]
    name = feature['properties'].get('label', location_text)

    return {
        'lat': coords[1],
        'lng': coords[0],
        'name': name,
    }


def get_route(start: dict, end: dict) -> dict:
    """
    Get driving route between two points.
    Returns distance, duration, geometry, and waypoints along the route.
    """
    url = f'{ORS_BASE}/v2/directions/driving-hgv'
    headers = {
        'Authorization': settings.ORS_API_KEY,
        'Content-Type': 'application/json',
    }
    body = {
        'coordinates': [
            [start['lng'], start['lat']],
            [end['lng'], end['lat']],
        ],
        'instructions': True,
        'geometry': True,
        'units': 'mi',
    }

    resp = requests.post(url, json=body, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    route = data['routes'][0]
    summary = route['summary']
    distance_miles = summary['distance'] * 0.000621371  # meters to miles
    duration_hours = summary['duration'] / 3600.0  # seconds to hours
    geometry = route['geometry']  # encoded polyline

    # Decode geometry
    decoded_coords = _decode_polyline(geometry)

    # Extract waypoints from route steps for location names
    waypoints = []
    cumulative_dist = 0
    for segment in route.get('segments', []):
        for step in segment.get('steps', []):
            cumulative_dist += step.get('distance', 0) * 0.000621371
            name = step.get('name', '')
            if name and step.get('way_points'):
                wp_idx = step['way_points'][0]
                if wp_idx < len(decoded_coords):
                    coord = decoded_coords[wp_idx]
                    waypoints.append({
                        'lat': coord[1],
                        'lng': coord[0],
                        'name': name,
                        'miles_from_seg_start': cumulative_dist,
                    })

    return {
        'distance_miles': round(distance_miles, 1),
        'duration_hours': round(duration_hours, 2),
        'geometry': decoded_coords,
        'waypoints': waypoints,
        'start_name': start['name'],
        'end_name': end['name'],
        'start_coords': [start['lat'], start['lng']],
        'end_coords': [end['lat'], end['lng']],
    }


def _decode_polyline(encoded: str) -> list:
    """Decode a Google-encoded polyline string into a list of [lng, lat] coordinates."""
    decoded = []
    i = 0
    lat = 0
    lng = 0

    while i < len(encoded):
        # Latitude
        shift = 0
        result = 0
        while True:
            b = ord(encoded[i]) - 63
            i += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lat += (~(result >> 1) if result & 1 else result >> 1)

        # Longitude
        shift = 0
        result = 0
        while True:
            b = ord(encoded[i]) - 63
            i += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lng += (~(result >> 1) if result & 1 else result >> 1)

        decoded.append([lng / 1e5, lat / 1e5])

    return decoded
