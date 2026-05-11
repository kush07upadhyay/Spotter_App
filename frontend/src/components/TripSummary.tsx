import type { TripPlanResponse } from '../api';
import { Route, Clock, Fuel, BedDouble } from 'lucide-react';

interface TripSummaryProps {
  data: TripPlanResponse;
}

export function TripSummary({ data }: TripSummaryProps) {
  const totalDays = data.daily_logs.length;
  const fuelStops = data.stops.filter(s => s.type === 'fuel').length;
  const restStops = data.stops.filter(s => s.type === 'rest').length;
  const breakStops = data.stops.filter(s => s.type === 'break').length;

  return (
    <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Route className="w-4 h-4 text-[#1e3a5f]" />
        Trip Summary
      </h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Total Distance" value={`${data.route.total_distance_miles.toFixed(0)} mi`} />
        <Stat label="Total Duration" value={`${data.route.total_duration_hours.toFixed(1)} hrs`} />
        <Stat label="Days Required" value={`${totalDays}`} icon={<Clock className="w-3.5 h-3.5 text-blue-500" />} />
        <Stat label="Fuel Stops" value={`${fuelStops}`} icon={<Fuel className="w-3.5 h-3.5 text-amber-500" />} />
        <Stat label="Rest Stops" value={`${restStops}`} icon={<BedDouble className="w-3.5 h-3.5 text-violet-500" />} />
        <Stat label="30-min Breaks" value={`${breakStops}`} />
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-500 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
