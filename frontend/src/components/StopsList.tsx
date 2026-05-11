import type { Stop } from '../api';
import { Fuel, BedDouble, Coffee, Package, MapPin, Clock, Navigation } from 'lucide-react';

interface StopsListProps {
  stops: Stop[];
}

const stopConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; badge: string; label: string }> = {
  fuel: { icon: <Fuel className="w-4 h-4" />, bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-500', label: 'Fuel Stop' },
  rest: { icon: <BedDouble className="w-4 h-4" />, bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-500', label: 'Rest Stop' },
  break: { icon: <Coffee className="w-4 h-4" />, bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-500', label: '30-min Break' },
  pickup: { icon: <Package className="w-4 h-4" />, bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-500', label: 'Pickup' },
  dropoff: { icon: <MapPin className="w-4 h-4" />, bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-500', label: 'Dropoff' },
};

export function StopsList({ stops }: StopsListProps) {
  if (!stops.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <Navigation className="w-4 h-4 text-[#1e3a5f]" />
        Trip Itinerary ({stops.length} stops)
      </h3>
      <div className="relative max-h-80 overflow-y-auto pr-1">
        {stops.map((stop, idx) => {
          const config = stopConfig[stop.type] || stopConfig.fuel;
          const isLast = idx === stops.length - 1;
          return (
            <div key={idx} className="flex gap-3 relative">
              {/* Timeline */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full ${config.badge} text-white flex items-center justify-center shadow-sm z-10`}>
                  {config.icon}
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-slate-200 min-h-6" />}
              </div>
              {/* Content */}
              <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                <div className={`rounded-lg border ${config.border} ${config.bg} px-3 py-2.5`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700">{config.label}</p>
                      <p className="text-xs text-slate-500 truncate">{stop.location_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatTime(stop.arrival_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span>{stop.duration_hours.toFixed(1)} hrs</span>
                    <span>·</span>
                    <span>Mile {stop.miles_from_start.toFixed(0)}</span>
                    {stop.departure_time && (
                      <>
                        <span>·</span>
                        <span>Depart {formatTime(stop.departure_time)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
