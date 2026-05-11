from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .route_service import geocode, get_route, reverse_geocode
from .hos_engine import HOSEngine
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class TripPlanView(APIView):
    """
    POST /api/trip-plan/
    
    Accepts trip details, calculates route, applies HOS rules,
    returns route geometry, stops, and daily ELD log data.
    """

    def post(self, request):
        current_location = request.data.get('current_location', '').strip()
        pickup_location = request.data.get('pickup_location', '').strip()
        dropoff_location = request.data.get('dropoff_location', '').strip()
        current_cycle_used = float(request.data.get('current_cycle_used', 0))

        # Validate inputs
        if not current_location:
            return Response({'error': 'Current location is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pickup_location:
            return Response({'error': 'Pickup location is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not dropoff_location:
            return Response({'error': 'Dropoff location is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if current_cycle_used < 0 or current_cycle_used > 70:
            return Response({'error': 'Current cycle used must be between 0 and 70 hours.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Step 1: Geocode all locations
            current_geo = geocode(current_location)
            pickup_geo = geocode(pickup_location)
            dropoff_geo = geocode(dropoff_location)

            # Step 2: Get routes
            route_to_pickup = get_route(current_geo, pickup_geo)
            route_to_dropoff = get_route(pickup_geo, dropoff_geo)

            route_segments = [route_to_pickup, route_to_dropoff]

            # Step 3: Run HOS engine
            engine = HOSEngine(
                current_cycle_used=current_cycle_used,
                start_time=datetime.now().replace(hour=8, minute=0, second=0, microsecond=0),
            )
            trip_plan = engine.plan_trip(
                route_segments=route_segments,
                pickup_location=pickup_geo,
                dropoff_location=dropoff_geo,
            )

            # Step 3.5: Reverse geocode stops with generic names for better UX
            for stop in trip_plan.stops:
                if stop.location_name.startswith('Mile ') or stop.location_name.startswith('En route'):
                    try:
                        city_name = reverse_geocode(stop.lat, stop.lng)
                        if city_name and not city_name.startswith(str(stop.lat)[:4]):
                            stop.location_name = city_name
                    except Exception:
                        pass  # Keep generic name if reverse geocode fails

            # Step 4: Serialize response
            response_data = {
                'route': {
                    'total_distance_miles': round(trip_plan.total_distance_miles, 1),
                    'total_duration_hours': round(trip_plan.total_duration_hours, 2),
                    'geometry': trip_plan.route_geometry,
                    'current_location': current_geo,
                    'pickup_location': pickup_geo,
                    'dropoff_location': dropoff_geo,
                },
                'stops': [
                    {
                        'type': stop.type,
                        'location_name': stop.location_name,
                        'lat': stop.lat,
                        'lng': stop.lng,
                        'arrival_time': stop.arrival_time.isoformat(),
                        'departure_time': stop.departure_time.isoformat(),
                        'duration_hours': round(stop.duration_hours, 2),
                        'miles_from_start': round(stop.miles_from_start, 1),
                    }
                    for stop in trip_plan.stops
                ],
                'daily_logs': [
                    {
                        'date': log.date.strftime('%Y-%m-%d'),
                        'total_miles': log.total_miles,
                        'off_duty_hours': round(log.off_duty_hours, 2),
                        'sleeper_hours': round(log.sleeper_hours, 2),
                        'driving_hours': round(log.driving_hours, 2),
                        'on_duty_hours': round(log.on_duty_hours, 2),
                        'remarks': log.remarks_list,
                        'segments': [
                            {
                                'status': seg.status,
                                'start_hour': (seg.start_time - log.date).total_seconds() / 3600.0,
                                'end_hour': min((seg.end_time - log.date).total_seconds() / 3600.0, 24.0),
                                'location': seg.location,
                                'remarks': seg.remarks,
                                'miles': round(seg.miles, 1),
                            }
                            for seg in log.segments
                        ],
                    }
                    for log in trip_plan.daily_logs
                ],
            }

            return Response(response_data)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': f'An error occurred while planning the trip: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
