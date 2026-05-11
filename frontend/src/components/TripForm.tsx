import { useState } from 'react';
import { MapPin, Navigation, Package, Clock, Loader2 } from 'lucide-react';
import { LocationInput } from './LocationInput';
import { InfoTooltip } from './InfoTooltip';

interface TripFormProps {
  onSubmit: (data: {
    current_location: string;
    pickup_location: string;
    dropoff_location: string;
    current_cycle_used: number;
  }) => void;
  loading: boolean;
  onReset?: () => void;
}

export function TripForm({ onSubmit, loading, onReset }: TripFormProps) {
  const [currentLocation, setCurrentLocation] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [cycleUsed, setCycleUsed] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      current_location: currentLocation,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      current_cycle_used: cycleUsed,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
        <Navigation className="w-5 h-5 text-[#1e3a5f]" />
        Trip Details
        <InfoTooltip text="Enter your trip info below. The app will calculate your full route with all required HOS stops (30-min breaks, 10-hr rest, fuel) and generate compliant ELD daily logs automatically." />
      </h2>

      <div className="space-y-4">
        {/* Current Location */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              Current Location
              <InfoTooltip text="Where your truck is right now. This is your starting point — the app will plan the route from here to pickup and then to delivery." />
            </span>
          </label>
          <LocationInput
            value={currentLocation}
            onChange={setCurrentLocation}
            placeholder="e.g., Dallas, TX"
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
              placeholder:text-slate-300 transition-all"
          />
        </div>

        {/* Pickup Location */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              Pickup Location
              <InfoTooltip text="The shipper's location where you'll load cargo. You'll go On Duty here for about 1 hour for pre-trip inspection and loading." />
            </span>
          </label>
          <LocationInput
            value={pickupLocation}
            onChange={setPickupLocation}
            placeholder="e.g., Houston, TX"
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
              placeholder:text-slate-300 transition-all"
          />
        </div>

        {/* Dropoff Location */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              Dropoff Location
              <InfoTooltip text="The receiver's location where you'll deliver cargo. You'll go On Duty here for about 1 hour for unloading and paperwork." />
            </span>
          </label>
          <LocationInput
            value={dropoffLocation}
            onChange={setDropoffLocation}
            placeholder="e.g., Los Angeles, CA"
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
              placeholder:text-slate-300 transition-all"
          />
        </div>

        {/* Current Cycle Used */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Current Cycle Used (hrs)
              <InfoTooltip text="Your total on-duty + driving hours from the last 7-8 days (check your ELD). Under the 70-hour/8-day rule, you cannot exceed 70 hours. Enter 0 if you've taken a 34-hour restart." />
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={cycleUsed}
              onChange={(e) => setCycleUsed(Math.max(0, Math.min(70, parseFloat(e.target.value) || 0)))}
              min={0}
              max={70}
              step={0.5}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              / 70 hrs
            </span>
          </div>
          <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400"
              style={{ width: `${(cycleUsed / 70) * 100}%` }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !currentLocation.trim() || !pickupLocation.trim() || !dropoffLocation.trim()}
          className="w-full mt-2 bg-[#1e3a5f] hover:bg-[#2d5a8e] text-white font-medium
            py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Planning Route...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              Plan Trip
            </>
          )}
        </button>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="w-full mt-2 text-slate-500 hover:text-slate-700 text-sm py-2 transition-colors"
          >
            Clear & Start Over
          </button>
        )}
      </div>
    </form>
  );
}
