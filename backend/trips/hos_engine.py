"""
HOS (Hours of Service) Engine for FMCSA Part 395 compliance.
Property-carrying driver, 70hrs/8days, no adverse driving conditions.

Rules implemented:
- 11-hour driving limit per shift
- 14-hour driving window from start of duty
- 30-minute break after 8 cumulative driving hours
- 10-hour off-duty reset between shifts
- 70-hour/8-day rolling on-duty limit
- Fuel stop every 1,000 miles (30 min, on-duty not driving)
- 1 hour for pickup (on-duty not driving)
- 1 hour for dropoff (on-duty not driving)
"""

from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import List, Optional
import math


# ─── Constants ───────────────────────────────────────────────────────────────
MAX_DRIVING_HOURS = 11.0
MAX_DUTY_WINDOW_HOURS = 14.0
MANDATORY_BREAK_AFTER_DRIVING = 8.0
MANDATORY_BREAK_DURATION = 0.5  # 30 minutes
OFF_DUTY_RESET_HOURS = 10.0
MAX_CYCLE_HOURS = 70.0  # 70hr/8day
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_DURATION = 0.5  # 30 minutes
PICKUP_DURATION = 1.0  # 1 hour
DROPOFF_DURATION = 1.0  # 1 hour
AVERAGE_SPEED_MPH = 55.0  # fallback if API doesn't provide


# ─── Data Classes ────────────────────────────────────────────────────────────
@dataclass
class StatusSegment:
    """A single segment on the ELD log."""
    status: str  # 'OFF_DUTY', 'SLEEPER', 'DRIVING', 'ON_DUTY'
    start_time: datetime
    end_time: datetime
    location: str = ""
    remarks: str = ""
    miles: float = 0.0

    @property
    def duration_hours(self) -> float:
        return (self.end_time - self.start_time).total_seconds() / 3600.0


@dataclass
class Stop:
    """A stop along the route."""
    type: str  # 'fuel', 'rest', 'break', 'pickup', 'dropoff'
    location_name: str
    lat: float
    lng: float
    arrival_time: datetime
    departure_time: datetime
    miles_from_start: float

    @property
    def duration_hours(self) -> float:
        return (self.departure_time - self.arrival_time).total_seconds() / 3600.0


@dataclass
class DailyLog:
    """A single day's ELD log sheet (24-hour period)."""
    date: datetime
    segments: List[StatusSegment] = field(default_factory=list)
    total_miles: float = 0.0
    remarks_list: List[str] = field(default_factory=list)

    @property
    def off_duty_hours(self) -> float:
        return sum(s.duration_hours for s in self.segments if s.status == 'OFF_DUTY')

    @property
    def sleeper_hours(self) -> float:
        return sum(s.duration_hours for s in self.segments if s.status == 'SLEEPER')

    @property
    def driving_hours(self) -> float:
        return sum(s.duration_hours for s in self.segments if s.status == 'DRIVING')

    @property
    def on_duty_hours(self) -> float:
        return sum(s.duration_hours for s in self.segments if s.status == 'ON_DUTY')


@dataclass
class TripPlan:
    """Complete trip plan output."""
    stops: List[Stop] = field(default_factory=list)
    daily_logs: List[DailyLog] = field(default_factory=list)
    total_distance_miles: float = 0.0
    total_duration_hours: float = 0.0
    route_geometry: list = field(default_factory=list)


# ─── HOS Engine ──────────────────────────────────────────────────────────────
class HOSEngine:
    """Simulates a trip while enforcing all FMCSA HOS regulations."""

    def __init__(self, current_cycle_used: float = 0.0, start_time: Optional[datetime] = None):
        self.start_time = start_time or datetime.now().replace(
            hour=8, minute=0, second=0, microsecond=0
        )
        self.current_time = self.start_time
        self.current_cycle_used = current_cycle_used  # hours used in 70hr/8day

        # Shift trackers
        self.shift_start: Optional[datetime] = None
        self.driving_since_last_break = 0.0  # hours driving since last 30-min break
        self.driving_in_shift = 0.0  # hours driving in current shift
        self.on_duty_in_shift = 0.0  # total on-duty hours in current shift (incl driving)

        # Output accumulators
        self.segments: List[StatusSegment] = []
        self.stops: List[Stop] = []
        self.total_miles_driven = 0.0

    def plan_trip(
        self,
        route_segments: list,
        pickup_location: dict,
        dropoff_location: dict,
    ) -> TripPlan:
        """
        Plan a complete trip.

        route_segments: list of dicts with keys:
            - distance_miles: float
            - duration_hours: float
            - start_name: str
            - end_name: str
            - start_coords: [lat, lng]
            - end_coords: [lat, lng]
            - geometry: list of [lng, lat] coords (for map display)
            - waypoints: list of {lat, lng, name, miles_from_seg_start} along the segment
        """
        all_geometry = []

        # ── Phase 1: Drive current_location → pickup ──
        if route_segments and len(route_segments) >= 1:
            seg = route_segments[0]
            all_geometry.extend(seg.get('geometry', []))
            self._drive_segment(
                seg['distance_miles'],
                seg['duration_hours'],
                seg.get('waypoints', []),
                seg['start_name'],
                seg['end_name'],
                seg['start_coords'],
                seg['end_coords'],
            )

        # ── Phase 2: Pickup (1 hour on-duty not driving) ──
        self._do_pickup(pickup_location)

        # ── Phase 3: Drive pickup → dropoff ──
        if route_segments and len(route_segments) >= 2:
            seg = route_segments[1]
            all_geometry.extend(seg.get('geometry', []))
            self._drive_segment(
                seg['distance_miles'],
                seg['duration_hours'],
                seg.get('waypoints', []),
                seg['start_name'],
                seg['end_name'],
                seg['start_coords'],
                seg['end_coords'],
            )

        # ── Phase 4: Dropoff (1 hour on-duty not driving) ──
        self._do_dropoff(dropoff_location)

        # ── Phase 5: Final off-duty ──
        self._add_segment('OFF_DUTY', 10.0, dropoff_location.get('name', 'Destination'), 'End of trip - Off Duty')

        # Build daily logs from segments
        daily_logs = self._build_daily_logs()
        total_dist = sum(s.get('distance_miles', 0) for s in route_segments) if route_segments else 0
        total_dur = (self.current_time - self.start_time).total_seconds() / 3600.0

        return TripPlan(
            stops=self.stops,
            daily_logs=daily_logs,
            total_distance_miles=total_dist,
            total_duration_hours=total_dur,
            route_geometry=all_geometry,
        )

    # ── Driving Logic ────────────────────────────────────────────────────────
    def _drive_segment(
        self,
        total_miles: float,
        total_drive_hours: float,
        waypoints: list,
        start_name: str,
        end_name: str,
        start_coords: list,
        end_coords: list,
    ):
        """Drive a route segment, inserting mandatory breaks/rests/fuel stops."""
        if total_miles <= 0 or total_drive_hours <= 0:
            return

        avg_speed = total_miles / total_drive_hours  # mph from actual route data
        miles_remaining = total_miles
        segment_miles_driven = 0.0

        while miles_remaining > 0.01:
            # Ensure shift is started
            self._ensure_shift_started(start_name)

            # Calculate how many hours/miles we can drive before hitting any limit
            hours_to_next_break = MANDATORY_BREAK_AFTER_DRIVING - self.driving_since_last_break
            hours_to_shift_drive_limit = MAX_DRIVING_HOURS - self.driving_in_shift
            hours_to_window_end = MAX_DUTY_WINDOW_HOURS - self._shift_elapsed()
            hours_to_cycle_limit = MAX_CYCLE_HOURS - self.current_cycle_used
            miles_to_next_fuel = FUEL_INTERVAL_MILES - (self.total_miles_driven % FUEL_INTERVAL_MILES)
            hours_to_next_fuel = miles_to_next_fuel / avg_speed if avg_speed > 0 else 999

            hours_of_remaining_drive = miles_remaining / avg_speed

            # Find the minimum constraint
            drive_hours = min(
                hours_to_next_break,
                hours_to_shift_drive_limit,
                hours_to_window_end,
                hours_to_cycle_limit,
                hours_to_next_fuel,
                hours_of_remaining_drive,
            )
            drive_hours = max(drive_hours, 0)

            if drive_hours < 0.01:
                # We've hit a limit - figure out which one and handle it
                if hours_to_cycle_limit <= 0.01:
                    # 70-hour limit reached - need 34-hour restart (or end trip)
                    self._take_restart(self._get_location_at_miles(
                        segment_miles_driven, total_miles, start_coords, end_coords, waypoints
                    ))
                elif hours_to_shift_drive_limit <= 0.01 or hours_to_window_end <= 0.01:
                    # 11-hour or 14-hour limit - need 10-hour off-duty
                    self._take_rest(self._get_location_at_miles(
                        segment_miles_driven, total_miles, start_coords, end_coords, waypoints
                    ))
                elif hours_to_next_break <= 0.01:
                    # 8-hour driving limit - need 30-min break
                    self._take_30min_break(self._get_location_at_miles(
                        segment_miles_driven, total_miles, start_coords, end_coords, waypoints
                    ))
                elif hours_to_next_fuel <= 0.01:
                    # Fuel stop
                    self._take_fuel_stop(self._get_location_at_miles(
                        segment_miles_driven, total_miles, start_coords, end_coords, waypoints
                    ))
                continue

            # Drive this chunk
            miles_driven = drive_hours * avg_speed
            miles_driven = min(miles_driven, miles_remaining)

            loc_name = self._get_location_name_at_miles(
                segment_miles_driven, total_miles, start_name, end_name, waypoints
            )
            self._add_segment('DRIVING', drive_hours, loc_name, f'Driving', miles_driven)

            self.driving_since_last_break += drive_hours
            self.driving_in_shift += drive_hours
            self.on_duty_in_shift += drive_hours
            self.current_cycle_used += drive_hours
            self.total_miles_driven += miles_driven
            segment_miles_driven += miles_driven
            miles_remaining -= miles_driven

            # Check if fuel stop needed right at this point
            if self.total_miles_driven % FUEL_INTERVAL_MILES < 1 and miles_remaining > 1:
                self._take_fuel_stop(self._get_location_at_miles(
                    segment_miles_driven, total_miles, start_coords, end_coords, waypoints
                ))

    # ── Break/Rest Actions ───────────────────────────────────────────────────
    def _take_30min_break(self, location: dict):
        name = location.get('name', 'Rest Area')
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)

        self.stops.append(Stop(
            type='break', location_name=name, lat=lat, lng=lng,
            arrival_time=self.current_time,
            departure_time=self.current_time + timedelta(hours=MANDATORY_BREAK_DURATION),
            miles_from_start=self.total_miles_driven,
        ))
        self._add_segment('OFF_DUTY', MANDATORY_BREAK_DURATION, name, '30-min break')
        self.driving_since_last_break = 0.0

    def _take_rest(self, location: dict):
        """10-hour off-duty rest (sleeper berth)."""
        name = location.get('name', 'Rest Stop')
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)

        self.stops.append(Stop(
            type='rest', location_name=name, lat=lat, lng=lng,
            arrival_time=self.current_time,
            departure_time=self.current_time + timedelta(hours=OFF_DUTY_RESET_HOURS),
            miles_from_start=self.total_miles_driven,
        ))
        self._add_segment('SLEEPER', OFF_DUTY_RESET_HOURS, name, '10-hr Sleeper Berth rest')

        # Reset shift counters
        self.shift_start = None
        self.driving_since_last_break = 0.0
        self.driving_in_shift = 0.0
        self.on_duty_in_shift = 0.0

    def _take_restart(self, location: dict):
        """34-hour restart to reset 70-hour cycle."""
        name = location.get('name', 'Rest Stop')
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)

        self.stops.append(Stop(
            type='rest', location_name=name, lat=lat, lng=lng,
            arrival_time=self.current_time,
            departure_time=self.current_time + timedelta(hours=34),
            miles_from_start=self.total_miles_driven,
        ))
        self._add_segment('SLEEPER', 34.0, name, '34-hr Restart (cycle reset)')

        # Reset everything
        self.shift_start = None
        self.driving_since_last_break = 0.0
        self.driving_in_shift = 0.0
        self.on_duty_in_shift = 0.0
        self.current_cycle_used = 0.0

    def _take_fuel_stop(self, location: dict):
        """30-minute fuel stop (on-duty not driving)."""
        name = location.get('name', 'Fuel Stop')
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)

        self.stops.append(Stop(
            type='fuel', location_name=name, lat=lat, lng=lng,
            arrival_time=self.current_time,
            departure_time=self.current_time + timedelta(hours=FUEL_STOP_DURATION),
            miles_from_start=self.total_miles_driven,
        ))
        self._add_segment('ON_DUTY', FUEL_STOP_DURATION, name, 'Fueling')
        self.on_duty_in_shift += FUEL_STOP_DURATION
        self.current_cycle_used += FUEL_STOP_DURATION

    def _do_pickup(self, location: dict):
        """1-hour pickup (on-duty not driving)."""
        name = location.get('name', 'Pickup Location')
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)

        self._ensure_shift_started(name)

        # Check if we have enough window time
        remaining_window = MAX_DUTY_WINDOW_HOURS - self._shift_elapsed()
        if remaining_window < PICKUP_DURATION:
            self._take_rest({'name': name, 'lat': lat, 'lng': lng})
            self._ensure_shift_started(name)

        self.stops.append(Stop(
            type='pickup', location_name=name, lat=lat, lng=lng,
            arrival_time=self.current_time,
            departure_time=self.current_time + timedelta(hours=PICKUP_DURATION),
            miles_from_start=self.total_miles_driven,
        ))
        self._add_segment('ON_DUTY', PICKUP_DURATION, name, 'Pickup - Loading')
        self.on_duty_in_shift += PICKUP_DURATION
        self.current_cycle_used += PICKUP_DURATION

    def _do_dropoff(self, location: dict):
        """1-hour dropoff (on-duty not driving)."""
        name = location.get('name', 'Dropoff Location')
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)

        self._ensure_shift_started(name)

        remaining_window = MAX_DUTY_WINDOW_HOURS - self._shift_elapsed()
        if remaining_window < DROPOFF_DURATION:
            self._take_rest({'name': name, 'lat': lat, 'lng': lng})
            self._ensure_shift_started(name)

        self.stops.append(Stop(
            type='dropoff', location_name=name, lat=lat, lng=lng,
            arrival_time=self.current_time,
            departure_time=self.current_time + timedelta(hours=DROPOFF_DURATION),
            miles_from_start=self.total_miles_driven,
        ))
        self._add_segment('ON_DUTY', DROPOFF_DURATION, name, 'Dropoff - Unloading')
        self.on_duty_in_shift += DROPOFF_DURATION
        self.current_cycle_used += DROPOFF_DURATION

    # ── Helpers ──────────────────────────────────────────────────────────────
    def _ensure_shift_started(self, location_name: str):
        if self.shift_start is None:
            self.shift_start = self.current_time
            # Pre-trip inspection: 15 min on-duty not driving
            self._add_segment('ON_DUTY', 0.25, location_name, 'Pre-trip inspection')
            self.on_duty_in_shift += 0.25
            self.current_cycle_used += 0.25

    def _shift_elapsed(self) -> float:
        if self.shift_start is None:
            return 0.0
        return (self.current_time - self.shift_start).total_seconds() / 3600.0

    def _add_segment(self, status: str, duration_hours: float, location: str, remarks: str, miles: float = 0.0):
        start = self.current_time
        end = start + timedelta(hours=duration_hours)
        self.segments.append(StatusSegment(
            status=status,
            start_time=start,
            end_time=end,
            location=location,
            remarks=remarks,
            miles=miles,
        ))
        self.current_time = end

    def _get_location_at_miles(
        self, current_miles: float, total_miles: float,
        start_coords: list, end_coords: list, waypoints: list
    ) -> dict:
        """Interpolate location along route at given mileage."""
        if total_miles <= 0:
            return {'name': 'Unknown', 'lat': start_coords[0], 'lng': start_coords[1]}

        fraction = min(current_miles / total_miles, 1.0)

        # Check waypoints for nearest named location
        if waypoints:
            best = min(waypoints, key=lambda w: abs(w.get('miles_from_seg_start', 0) - current_miles))
            if abs(best.get('miles_from_seg_start', 0) - current_miles) < 50:
                return best

        # Linear interpolation
        lat = start_coords[0] + fraction * (end_coords[0] - start_coords[0])
        lng = start_coords[1] + fraction * (end_coords[1] - start_coords[1])
        return {'name': f'Mile {current_miles:.0f}', 'lat': lat, 'lng': lng}

    def _get_location_name_at_miles(
        self, current_miles: float, total_miles: float,
        start_name: str, end_name: str, waypoints: list
    ) -> str:
        if waypoints:
            best = min(waypoints, key=lambda w: abs(w.get('miles_from_seg_start', 0) - current_miles))
            if abs(best.get('miles_from_seg_start', 0) - current_miles) < 50:
                return best.get('name', f'Mile {current_miles:.0f}')
        fraction = current_miles / total_miles if total_miles > 0 else 0
        if fraction < 0.1:
            return start_name
        elif fraction > 0.9:
            return end_name
        return f'En route ({current_miles:.0f} mi)'

    # ── Build Daily Logs ─────────────────────────────────────────────────────
    def _build_daily_logs(self) -> List[DailyLog]:
        """Split segments into 24-hour daily log sheets."""
        if not self.segments:
            return []

        first_day = self.segments[0].start_time.replace(hour=0, minute=0, second=0, microsecond=0)
        last_time = self.segments[-1].end_time
        last_day = last_time.replace(hour=0, minute=0, second=0, microsecond=0)

        logs = []
        current_day = first_day
        while current_day <= last_day:
            day_start = current_day
            day_end = current_day + timedelta(hours=24)

            day_segments = []
            day_miles = 0.0
            day_remarks = []

            for seg in self.segments:
                # Check overlap with this day
                seg_start = max(seg.start_time, day_start)
                seg_end = min(seg.end_time, day_end)

                if seg_start >= seg_end:
                    continue

                duration = (seg_end - seg_start).total_seconds() / 3600.0
                miles_fraction = 0.0
                if seg.duration_hours > 0:
                    miles_fraction = seg.miles * (duration / seg.duration_hours)

                day_segments.append(StatusSegment(
                    status=seg.status,
                    start_time=seg_start,
                    end_time=seg_end,
                    location=seg.location,
                    remarks=seg.remarks,
                    miles=miles_fraction,
                ))

                if seg.status == 'DRIVING':
                    day_miles += miles_fraction

                if seg.remarks and seg.location:
                    remark_entry = f"{seg_start.strftime('%H:%M')} - {seg.remarks} ({seg.location})"
                    if remark_entry not in day_remarks:
                        day_remarks.append(remark_entry)

            # Fill gaps with OFF_DUTY at start/end of day
            if day_segments:
                if day_segments[0].start_time > day_start:
                    day_segments.insert(0, StatusSegment(
                        status='OFF_DUTY',
                        start_time=day_start,
                        end_time=day_segments[0].start_time,
                        location=day_segments[0].location,
                        remarks='Off Duty',
                    ))
                if day_segments[-1].end_time < day_end:
                    day_segments.append(StatusSegment(
                        status='OFF_DUTY',
                        start_time=day_segments[-1].end_time,
                        end_time=day_end,
                        location=day_segments[-1].location,
                        remarks='Off Duty',
                    ))
            else:
                day_segments.append(StatusSegment(
                    status='OFF_DUTY',
                    start_time=day_start,
                    end_time=day_end,
                    location='',
                    remarks='Off Duty - Full Day',
                ))

            logs.append(DailyLog(
                date=current_day,
                segments=day_segments,
                total_miles=round(day_miles, 1),
                remarks_list=day_remarks,
            ))

            current_day += timedelta(days=1)

        return logs
