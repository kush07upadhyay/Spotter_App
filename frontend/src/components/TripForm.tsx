import { useState } from 'react';
import { MapPin, Navigation, Package, Clock, Loader2 } from 'lucide-react';

interface TripFormProps {
  onSubmit: (data: {
    current_location: string;
    pickup_location: string;
    dropoff_location: string;
    current_cycle_used: number;
  }) => void;
  loading: boolean;
}

export function TripForm({ onSubmit, loading }: TripFormProps) {
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
      </h2>

      <div className="space-y-4">
        {/* Current Location */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              Current Location
            </span>
          </label>
          <input
            type="text"
            value={currentLocation}
            onChange={(e) => setCurrentLocation(e.target.value)}
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
            </span>
          </label>
          <input
            type="text"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
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
            </span>
          </label>
          <input
            type="text"
            value={dropoffLocation}
            onChange={(e) => setDropoffLocation(e.target.value)}
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
          disabled={loading}
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
      </div>
    </form>
  );
}
