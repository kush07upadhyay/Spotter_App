import { useState, useCallback } from 'react';
import { TripForm } from './components/TripForm';
import { RouteMap } from './components/RouteMap';
import { LogSheet } from './components/LogSheet';
import { StopsList } from './components/StopsList';
import { TripSummary } from './components/TripSummary';
import { planTrip, type TripPlanResponse } from './api';
import { Truck, MapPin, FileText, AlertTriangle, X, ChevronDown } from 'lucide-react';

function App() {
  const [tripData, setTripData] = useState<TripPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'logs'>('map');
  const [cycleUsed, setCycleUsed] = useState(0);
  const [mobileFormOpen, setMobileFormOpen] = useState(true);

  const handleSubmit = useCallback(async (data: {
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
      setCycleUsed(data.current_cycle_used);
      setActiveTab('map');
      setMobileFormOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = error?.response?.data?.error || error?.message || 'Failed to plan trip. Please check your locations and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setTripData(null);
    setError(null);
    setMobileFormOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 rounded-lg p-2 shadow-md">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-[#1e3a5f]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Trucker Tracker</h1>
              <p className="text-blue-200 text-xs sm:text-sm hidden sm:block">ELD Trip Planner & HOS Compliance</p>
            </div>
          </div>
          {tripData && (
            <button
              onClick={handleReset}
              className="text-xs sm:text-sm px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> New Trip
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left sidebar - Trip Form */}
          <div className="lg:col-span-4">
            {/* Mobile collapsible header */}
            <button
              onClick={() => setMobileFormOpen(o => !o)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm border border-slate-200 mb-2"
            >
              <span className="font-semibold text-slate-700 text-sm">Trip Details</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mobileFormOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`${mobileFormOpen ? 'block' : 'hidden'} lg:block`}>
              <TripForm onSubmit={handleSubmit} loading={loading} onReset={tripData ? handleReset : undefined} />
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-in">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Trip planning failed</p>
                  <p className="text-red-600 text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}
            {tripData && <TripSummary data={tripData} />}
          </div>

          {/* Right content area */}
          <div className="lg:col-span-8">
            {loading ? (
              /* Loading skeleton */
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-20 px-8 text-center animate-pulse">
                <div className="w-16 h-16 rounded-full bg-blue-100 mb-6 flex items-center justify-center">
                  <Truck className="w-8 h-8 text-blue-300 animate-bounce" />
                </div>
                <div className="h-5 bg-slate-200 rounded w-48 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-72" />
                <p className="text-slate-400 text-sm mt-6">Calculating route, HOS stops & ELD logs...</p>
              </div>
            ) : tripData ? (
              <>
                {/* Tab buttons */}
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('map')}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'map'
                        ? 'bg-[#1e3a5f] text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <MapPin className="w-4 h-4" /> Route Map
                  </button>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: 'clamp(350px, 50vh, 550px)' }}>
                      <RouteMap data={tripData} />
                    </div>
                    <StopsList stops={tripData.stops} />
                  </div>
                )}
                {activeTab === 'logs' && (
                  <div className="space-y-6">
                    {tripData.daily_logs.map((log, idx) => (
                      <LogSheet
                        key={idx}
                        log={log}
                        dayNumber={idx + 1}
                        totalDays={tripData.daily_logs.length}
                        currentCycleUsed={cycleUsed}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-16 sm:py-20 px-6 sm:px-8 text-center">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full p-6 mb-6">
                  <Truck className="w-10 h-10 sm:w-12 sm:h-12 text-[#1e3a5f]" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">Plan Your Trip</h2>
                <p className="text-slate-500 max-w-md text-sm sm:text-base">
                  Enter your current location, pickup, and dropoff to generate a
                  route plan with HOS-compliant stops and ELD log sheets.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-6 text-sm text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">11</div>
                    <span className="text-xs sm:text-sm">Hr Drive Limit</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 font-bold">14</div>
                    <span className="text-xs sm:text-sm">Hr Duty Window</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">70</div>
                    <span className="text-xs sm:text-sm">Hr / 8-Day Cycle</span>
                  </div>
                </div>
                <div className="mt-8 px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg max-w-md">
                  <p className="text-xs text-amber-700">
                    <strong>FMCSA Part 395 Compliant</strong> — Automatically enforces 11-hr driving limit,
                    14-hr duty window, mandatory 30-min breaks, 10-hr rest periods, and 70-hr/8-day cycle limits.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-400 text-xs py-4 sm:py-6 mt-auto border-t border-slate-100 bg-white/50">
        <p>Trucker Tracker ELD Planner &middot; FMCSA Part 395 Compliant &middot; Property Carriers, 70hr/8day</p>
        <p className="mt-1 text-slate-300">Uses OpenStreetMap &amp; OSRM — No API keys required</p>
      </footer>
    </div>
  );
}

export default App;
