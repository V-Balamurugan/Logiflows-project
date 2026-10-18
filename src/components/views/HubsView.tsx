import React, { useState } from 'react';
import { 
  Warehouse, 
  Plus, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  User,
  TrendingUp,
  BarChart3,
  Users
} from 'lucide-react';
import { storage } from '../../services/storage';
import { BranchHub, HubType, HubStatus } from '../../types';
import { HubThroughputForecastModule } from '../analytics/HubThroughputForecastModule';

export const HubsView: React.FC = () => {
  const currentTenantId = storage.getActiveTenantId();
  const hubs = storage.getHubs(currentTenantId);

  const [activeTab, setActiveTab] = useState<'facilities_grid' | 'throughput_forecast'>('throughput_forecast');
  const [selectedForecastHubId, setSelectedForecastHubId] = useState<string>(hubs[0]?.id || '');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<HubType>('REGIONAL_SORTING_HUB');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('San Francisco');
  const [state, setState] = useState('CA');
  const [postalCode, setPostalCode] = useState('94107');
  const [lat, setLat] = useState(37.7749);
  const [lng, setLng] = useState(-122.4194);
  const [capacityDaily, setCapacityDaily] = useState(10000);
  const [managerName, setManagerName] = useState('Alex Mercer');
  const [contactPhone, setContactPhone] = useState('+1 (415) 555-0182');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    storage.addHub({
      tenantId: currentTenantId,
      code: code.toUpperCase(),
      name,
      type,
      street,
      city,
      state,
      postalCode,
      lat,
      lng,
      capacityDaily,
      currentLoad: Math.floor(capacityDaily * 0.4),
      status: 'OPERATIONAL',
      contactPhone,
      managerName,
    });

    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            GEOSPATIAL INFRASTRUCTURE · POSTGIS 16 & ML FORECASTING
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Logistics Sorting Hubs & Last-Mile Depots
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configured geographic centroids, sorting automation capacity, 24h volume forecasts, and proactive staff shift allocation.
          </p>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('throughput_forecast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'throughput_forecast'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-200" />
            <span>24h Throughput & Shifts</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          </button>

          <button
            onClick={() => setActiveTab('facilities_grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'facilities_grid'
                ? 'bg-slate-800 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5 text-slate-300" />
            <span>Hub Facilities Grid ({hubs.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Hub Throughput Forecast & Shift Planning */}
      {activeTab === 'throughput_forecast' && (
        <HubThroughputForecastModule
          hubs={hubs}
          selectedHubId={selectedForecastHubId}
          onSelectHub={(id) => setSelectedForecastHubId(id)}
        />
      )}

      {/* Tab 2: Hub Facilities Grid */}
      {activeTab === 'facilities_grid' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hub Node</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hubs.map((hub) => {
          const isCongested = hub.status === 'CONGESTED';
          const loadPct = Math.round((hub.currentLoad / hub.capacityDaily) * 100);
          return (
            <div
              key={hub.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-400">
                    {hub.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                    {hub.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {hub.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isCongested
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {hub.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{hub.street}, {hub.city}, {hub.state} {hub.postalCode}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                  <span>GPS Coordinates:</span>
                  <span className="text-slate-200">{hub.lat.toFixed(4)}, {hub.lng.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Station Manager:</span>
                  <span className="text-slate-200">{hub.managerName}</span>
                </div>
              </div>

              {/* Load Capacity Bar */}
              <div className="space-y-1 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Daily Sorting Load:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {hub.currentLoad.toLocaleString()} / {hub.capacityDaily.toLocaleString()} ({loadPct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      loadPct > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, loadPct)}%` }}
                  />
                </div>
              </div>

              {/* Action Button: View 24h Forecast & Shifts */}
              <button
                onClick={() => {
                  setSelectedForecastHubId(hub.id);
                  setActiveTab('throughput_forecast');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-slate-700/80 hover:border-indigo-500/50 transition-all shadow-sm"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>View 24h Forecast & Shifts</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  )}

      {/* Add Hub Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              Register New Branch or Hub
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hub Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex South Bay Sortation Center"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="APX-SBY-04"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono uppercase text-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as HubType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                  >
                    <option value="REGIONAL_SORTING_HUB">Regional Sorting Hub</option>
                    <option value="DISTRIBUTION_CENTER">Distribution Center</option>
                    <option value="LAST_MILE_DEPOT">Last-Mile Depot</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 37.7)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || -122.4)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
                >
                  Create Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
