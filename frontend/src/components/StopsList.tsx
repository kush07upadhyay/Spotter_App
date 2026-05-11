import type { Stop } from '../api';
import { Fuel, BedDouble, Coffee, Package, MapPin } from 'lucide-react';

interface StopsListProps {
  stops: Stop[];
}

const stopIcons = {
  fuel: <Fuel className="w-4 h-4 text-amber-500" />,
  rest: <BedDouble className="w-4 h-4 text-violet-500" />,
  break: <Coffee className="w-4 h-4 text-cyan-500" />,
  pickup: <Package className="w-4 h-4 text-emerald-500" />,
  dropoff: <MapPin className="w-4 h-4 text-red-500" />,
};

const stopColors = {
  fuel: 'bg-amber-50 border-amber-200',
  rest: 'bg-violet-50 border-violet-200',
  break: 'bg-cyan-50 border-cyan-200',
  pickup: 'bg-emerald-50 border-emerald-200',
  dropoff: 'bg-red-50 border-red-200',
};

export function StopsList({ stops }: StopsListProps) {
  if (!stops.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-700 mb-3">
        Stops & Rests ({stops.length})
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {stops.map((stop, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${stopColors[stop.type] || 'bg-slate-50 border-slate-200'}`}
          >
            <div className="flex-shrink-0">
              {stopIcons[stop.type] || <MapPin className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {stop.location_name}
              </p>
              <p className="text-xs text-slate-500">
                {stop.type.charAt(0).toUpperCase() + stop.type.slice(1)} · {stop.duration_hours.toFixed(1)} hrs · Mile {stop.miles_from_start.toFixed(0)}
              </p>
            </div>
            <div className="text-xs text-slate-400 text-right flex-shrink-0">
              {formatTime(stop.arrival_time)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
