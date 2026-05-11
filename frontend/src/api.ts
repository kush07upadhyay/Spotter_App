import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface TripInput {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}

export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export interface Stop {
  type: 'fuel' | 'rest' | 'break' | 'pickup' | 'dropoff';
  location_name: string;
  lat: number;
  lng: number;
  arrival_time: string;
  departure_time: string;
  duration_hours: number;
  miles_from_start: number;
}

export interface LogSegment {
  status: 'OFF_DUTY' | 'SLEEPER' | 'DRIVING' | 'ON_DUTY';
  start_hour: number;
  end_hour: number;
  location: string;
  remarks: string;
  miles: number;
}

export interface DailyLog {
  date: string;
  total_miles: number;
  off_duty_hours: number;
  sleeper_hours: number;
  driving_hours: number;
  on_duty_hours: number;
  remarks: string[];
  segments: LogSegment[];
}

export interface TripPlanResponse {
  route: {
    total_distance_miles: number;
    total_duration_hours: number;
    geometry: [number, number][];
    current_location: Location;
    pickup_location: Location;
    dropoff_location: Location;
  };
  stops: Stop[];
  daily_logs: DailyLog[];
}

export async function planTrip(input: TripInput): Promise<TripPlanResponse> {
  const response = await axios.post<TripPlanResponse>(`${API_BASE}/api/trip-plan/`, input);
  return response.data;
}
