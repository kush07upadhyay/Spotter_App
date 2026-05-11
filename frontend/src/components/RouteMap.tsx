import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import type { TripPlanResponse } from '../api';

// Fix default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom marker icons
const createIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background:${color};width:32px;height:32px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const icons = {
  current: createIcon('#3b82f6', '📍'),
  pickup: createIcon('#10b981', '📦'),
  dropoff: createIcon('#ef4444', '🏁'),
  fuel: createIcon('#f59e0b', '⛽'),
  rest: createIcon('#8b5cf6', '🛏️'),
  break: createIcon('#06b6d4', '☕'),
};

function FitBounds({ data }: { data: TripPlanResponse }) {
  const map = useMap();
  useEffect(() => {
    const points: L.LatLngExpression[] = [];
    if (data.route.geometry.length > 0) {
      data.route.geometry.forEach(([lng, lat]) => points.push([lat, lng]));
    } else {
      points.push([data.route.current_location.lat, data.route.current_location.lng]);
      points.push([data.route.pickup_location.lat, data.route.pickup_location.lng]);
      points.push([data.route.dropoff_location.lat, data.route.dropoff_location.lng]);
    }
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [data, map]);
  return null;
}

interface RouteMapProps {
  data: TripPlanResponse;
}

export function RouteMap({ data }: RouteMapProps) {
  const routeCoords: [number, number][] = data.route.geometry.map(([lng, lat]) => [lat, lng]);

  return (
    <MapContainer center={[39.8, -98.5]} zoom={4} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds data={data} />

      {/* Route polyline */}
      {routeCoords.length > 0 && (
        <Polyline positions={routeCoords} color="#1e3a5f" weight={4} opacity={0.8} />
      )}

      {/* Current location marker */}
      <Marker position={[data.route.current_location.lat, data.route.current_location.lng]} icon={icons.current}>
        <Popup><b>Current Location</b><br />{data.route.current_location.name}</Popup>
      </Marker>

      {/* Pickup marker */}
      <Marker position={[data.route.pickup_location.lat, data.route.pickup_location.lng]} icon={icons.pickup}>
        <Popup><b>Pickup</b><br />{data.route.pickup_location.name}</Popup>
      </Marker>

      {/* Dropoff marker */}
      <Marker position={[data.route.dropoff_location.lat, data.route.dropoff_location.lng]} icon={icons.dropoff}>
        <Popup><b>Dropoff</b><br />{data.route.dropoff_location.name}</Popup>
      </Marker>

      {/* Stop markers */}
      {data.stops.map((stop, idx) => {
        const icon = stop.type === 'fuel' ? icons.fuel
          : stop.type === 'rest' ? icons.rest
          : stop.type === 'break' ? icons.break
          : stop.type === 'pickup' ? icons.pickup
          : icons.dropoff;
        return (
          <Marker key={idx} position={[stop.lat, stop.lng]} icon={icon}>
            <Popup>
              <b>{stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}</b><br />
              {stop.location_name}<br />
              <small>{stop.duration_hours.toFixed(1)} hrs &middot; Mile {stop.miles_from_start.toFixed(0)}</small>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
