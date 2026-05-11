import { useState } from 'react';
import { TripForm } from './components/TripForm';
import { RouteMap } from './components/RouteMap';
import { LogSheet } from './components/LogSheet';
import { StopsList } from './components/StopsList';
import { TripSummary } from './components/TripSummary';
import { planTrip, type TripPlanResponse } from './api';
import { Truck, MapPin, FileText } from 'lucide-react';

function App() {
  const [tripData, setTripData] = useState<TripPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'logs'>('map');

  const handleSubmit = async (data: {
    current_location: string;
    pickup_location: string;
    dropoff_location: string;
    current_cycle_used: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await planTrip(data);
      setTripData(result);
      setActiveTab('map');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to plan trip';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-amber-400 rounded-lg p-2">
            <Truck className="w-6 h-6 text-[#1e3a5f]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Spotter</h1>
            <p className="text-blue-200 text-sm">ELD Trip Planner & HOS Compliance</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar - Trip Form */}
          <div className="lg:col-span-4">
            <TripForm onSubmit={handleSubmit} loading={loading} />
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            {tripData && <TripSummary data={tripData} />}
          </div>

          {/* Right content area */}
          <div className="lg:col-span-8">
            {tripData ? (
              <>
                {/* Tab buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab('map')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      activeTab === 'map'
                        ? 'bg-[#1e3a5f] text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <MapPin className="w-4 h-4" /> Route Map
                  </button>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      activeTab === 'logs'
                        ? 'bg-[#1e3a5f] text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Daily Logs ({tripData.daily_logs.length})
                  </button>
                </div>

                {/* Tab content */}
                {activeTab === 'map' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: '500px' }}>
                      <RouteMap data={tripData} />
                    </div>
                    <StopsList stops={tripData.stops} />
                  </div>
                )}
                {activeTab === 'logs' && (
                  <div className="space-y-6">
                    {tripData.daily_logs.map((log, idx) => (
                      <LogSheet key={idx} log={log} dayNumber={idx + 1} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="bg-blue-50 rounded-full p-6 mb-6">
                  <Truck className="w-12 h-12 text-[#1e3a5f]" />
                </div>
                <h2 className="text-xl font-semibold text-slate-700 mb-2">Plan Your Trip</h2>
                <p className="text-slate-500 max-w-md">
                  Enter your current location, pickup, and dropoff points to generate a
                  route plan with HOS-compliant stops and ELD log sheets.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-6 text-sm text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">11</div>
                    <span>Hr Drive Limit</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 font-bold">14</div>
                    <span>Hr Duty Window</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">70</div>
                    <span>Hr / 8-Day Cycle</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-400 text-xs py-6 mt-8">
        Spotter ELD Planner &middot; FMCSA Part 395 Compliant &middot; Property Carriers, 70hr/8day
      </footer>
    </div>
  );
}

export default App;
