"""
Comprehensive tests for the HOS Engine.
Covers all FMCSA Part 395 rules and edge cases.
"""
from django.test import TestCase
from datetime import datetime
from trips.hos_engine import (
    HOSEngine, MAX_DRIVING_HOURS, OFF_DUTY_RESET_HOURS,
)


def _make_segment(distance_miles, duration_hours, start_name='A', end_name='B'):
    """Helper to create a route segment dict."""
    return {
        'distance_miles': distance_miles,
        'duration_hours': duration_hours,
        'start_name': start_name,
        'end_name': end_name,
        'start_coords': [32.7767, -96.7970],
        'end_coords': [29.7604, -95.3698],
        'geometry': [],
        'waypoints': [],
    }


class HOSEngineBasicTests(TestCase):
    """Basic trip planning tests."""

    def test_short_trip_no_breaks_needed(self):
        """A 100-mile trip should need no mandatory breaks."""
        engine = HOSEngine(current_cycle_used=0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(50, 0.9), _make_segment(50, 0.9)],
            pickup_location={'name': 'Pickup', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'Dropoff', 'lat': 29.0, 'lng': -95.0},
        )
        self.assertEqual(len(plan.daily_logs), 1, "Short trip should fit in 1 day")
        stop_types = [s.type for s in plan.stops]
        self.assertIn('pickup', stop_types)
        self.assertIn('dropoff', stop_types)

    def test_daily_log_hours_sum_to_24(self):
        """Each daily log should total exactly 24 hours."""
        engine = HOSEngine(current_cycle_used=0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(300, 5.5), _make_segment(400, 7.3)],
            pickup_location={'name': 'Pickup', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'Dropoff', 'lat': 29.0, 'lng': -95.0},
        )
        for log in plan.daily_logs:
            total = log.off_duty_hours + log.sleeper_hours + log.driving_hours + log.on_duty_hours
            self.assertAlmostEqual(total, 24.0, places=1,
                msg=f"Day {log.date} totals {total:.2f}, expected 24.00")


class HOSEngine11HourDrivingLimitTests(TestCase):
    """Tests for the 11-hour driving limit per shift."""

    def test_11_hour_limit_triggers_rest(self):
        """Driving beyond 11 hours should trigger a 10-hour rest."""
        engine = HOSEngine(current_cycle_used=0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(700, 12.7), _make_segment(100, 1.8)],
            pickup_location={'name': 'P', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'D', 'lat': 29.0, 'lng': -95.0},
        )
        rest_stops = [s for s in plan.stops if s.type == 'rest']
        self.assertGreaterEqual(len(rest_stops), 1,
            "Should have at least one 10-hr rest stop for a 12+ hr drive")
        for rest in rest_stops:
            self.assertGreaterEqual(rest.duration_hours, OFF_DUTY_RESET_HOURS - 0.01)

    def test_no_single_day_driving_exceeds_11hrs(self):
        """No day should have >11 hours of driving."""
        engine = HOSEngine(current_cycle_used=0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(1200, 21.8)],
            pickup_location={'name': 'P', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'D', 'lat': 29.0, 'lng': -95.0},
        )
        for log in plan.daily_logs:
            self.assertLessEqual(log.driving_hours, MAX_DRIVING_HOURS + 0.1,
                f"Day {log.date} has {log.driving_hours:.2f}h driving, max is {MAX_DRIVING_HOURS}")


class HOSEngine30MinBreakTests(TestCase):
    """Tests for the mandatory 30-minute break after 8 hours driving."""

    def test_break_after_8_hours_driving(self):
        """A trip requiring >8 hours driving should include a 30-min break."""
        engine = HOSEngine(current_cycle_used=0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(500, 9.1), _make_segment(100, 1.8)],
            pickup_location={'name': 'P', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'D', 'lat': 29.0, 'lng': -95.0},
        )
        break_stops = [s for s in plan.stops if s.type == 'break']
        self.assertGreaterEqual(len(break_stops), 1,
            "Should have a 30-min break after 8 hours of driving")


class HOSEngineFuelStopTests(TestCase):
    """Tests for fuel stops every 1000 miles."""

    def test_fuel_stop_for_long_trip(self):
        """A 1500+ mile trip should include at least one fuel stop."""
        engine = HOSEngine(current_cycle_used=0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(800, 14.5), _make_segment(800, 14.5)],
            pickup_location={'name': 'P', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'D', 'lat': 29.0, 'lng': -95.0},
        )
        fuel_stops = [s for s in plan.stops if s.type == 'fuel']
        self.assertGreaterEqual(len(fuel_stops), 1,
            "Should have at least one fuel stop for a 1600-mile trip")


class HOSEngine70HourCycleTests(TestCase):
    """Tests for 70-hour/8-day cycle limit."""

    def test_high_cycle_used_triggers_restart(self):
        """Starting with 65 hours used on a long trip should trigger a rest/restart."""
        engine = HOSEngine(current_cycle_used=65.0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(300, 5.5), _make_segment(300, 5.5)],
            pickup_location={'name': 'P', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'D', 'lat': 29.0, 'lng': -95.0},
        )
        rest_stops = [s for s in plan.stops if s.type == 'rest']
        self.assertGreaterEqual(len(rest_stops), 1)


class HOSEngineEdgeCaseTests(TestCase):
    """Edge case tests."""

    def test_zero_distance_trip(self):
        """A same-location trip should still produce valid logs."""
        engine = HOSEngine(current_cycle_used=0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(0, 0), _make_segment(0, 0)],
            pickup_location={'name': 'P', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'D', 'lat': 30.0, 'lng': -95.0},
        )
        self.assertGreaterEqual(len(plan.daily_logs), 1)

    def test_max_cycle_used_70(self):
        """Starting at max cycle (70hrs) should still plan the trip."""
        engine = HOSEngine(current_cycle_used=70.0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(100, 1.8), _make_segment(100, 1.8)],
            pickup_location={'name': 'P', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'D', 'lat': 29.0, 'lng': -95.0},
        )
        self.assertGreaterEqual(len(plan.daily_logs), 1)

    def test_very_long_trip(self):
        """A cross-country 2800+ mile trip should be handled correctly."""
        engine = HOSEngine(current_cycle_used=0)
        plan = engine.plan_trip(
            route_segments=[_make_segment(1400, 25.5), _make_segment(1400, 25.5)],
            pickup_location={'name': 'P', 'lat': 30.0, 'lng': -95.0},
            dropoff_location={'name': 'D', 'lat': 34.0, 'lng': -118.0},
        )
        self.assertGreater(len(plan.daily_logs), 3, "2800mi trip should take multiple days")
        self.assertGreater(len(plan.stops), 5, "Should have many stops for a long trip")
        for log in plan.daily_logs:
            total = log.off_duty_hours + log.sleeper_hours + log.driving_hours + log.on_duty_hours
            self.assertAlmostEqual(total, 24.0, places=1)


class TripPlanViewValidationTests(TestCase):
    """Tests for the API endpoint input validation."""

    def test_missing_current_location(self):
        resp = self.client.post('/api/trip-plan/', {
            'pickup_location': 'Houston, TX',
            'dropoff_location': 'LA, CA',
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 400)

    def test_missing_pickup_location(self):
        resp = self.client.post('/api/trip-plan/', {
            'current_location': 'Dallas, TX',
            'dropoff_location': 'LA, CA',
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 400)

    def test_missing_dropoff_location(self):
        resp = self.client.post('/api/trip-plan/', {
            'current_location': 'Dallas, TX',
            'pickup_location': 'Houston, TX',
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 400)

    def test_invalid_cycle_used_negative(self):
        resp = self.client.post('/api/trip-plan/', {
            'current_location': 'Dallas, TX',
            'pickup_location': 'Houston, TX',
            'dropoff_location': 'LA, CA',
            'current_cycle_used': -5,
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 400)

    def test_invalid_cycle_used_over_70(self):
        resp = self.client.post('/api/trip-plan/', {
            'current_location': 'Dallas, TX',
            'pickup_location': 'Houston, TX',
            'dropoff_location': 'LA, CA',
            'current_cycle_used': 75,
        }, content_type='application/json')
        self.assertEqual(resp.status_code, 400)
