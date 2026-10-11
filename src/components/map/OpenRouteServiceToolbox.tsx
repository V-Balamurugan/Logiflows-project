import React, { useState } from 'react';
import { 
  Route, 
  MapPin, 
  Layers, 
  Compass, 
  Clock, 
  Fuel, 
  Mountain, 
  Play, 
  Key, 
  CheckCircle2, 
  CircleDot,
  Radio,
  Sliders,
  Sparkles
} from 'lucide-react';
import { BranchHub, Parcel, Vehicle } from '../../types';
import { openRouteService, OrsRouteResult, IsochronePolygon } from '../../services/openRouteService';

interface Props {
  hubs: BranchHub[];
  vehicles: Vehicle[];
  parcels: Parcel[];
  onApplyRouteToMap?: (coords: [number, number][], meta: OrsRouteResult) => void;
  onSelectHubIsochrone?: (hub: BranchHub, polygons: IsochronePolygon[]) => void;
  onClearOverlay?: () => void;
  isOverlayActive?: boolean;
}

export const OpenRouteServiceToolbox: React.FC<Props> = ({
  hubs,
  vehicles,
  parcels,
  onApplyRouteToMap,
  onSelectHubIsochrone,
  onClearOverlay,
  isOverlayActive = false,
}) => {
  const [activeTab, setActiveTab] = useState<'routing' | 'isochrone' | 'config'>('routing');
  const [selectedProfile, setSelectedProfile] = useState<'driving-car' | 'driving-hgv' | 'cycling-regular'>('driving-car');
  
  // Routing state
  const [originType, setOriginType] = useState<'hub' | 'vehicle' | 'custom'>('hub');
  const [selectedHubId, setSelectedHubId] = useState<string>(hubs[0]?.id || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [selectedParcelId, setSelectedParcelId] = useState<string>(parcels[0]?.id || '');

  // Isochrone state
  const [isochroneHubId, setIsochroneHubId] = useState<string>(hubs[0]?.id || '');
  const [isochroneMinutes, setIsochroneMinutes] = useState<number[]>([10, 20, 30]);

  // Execution state
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<OrsRouteResult | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>(openRouteService.getApiKey() || '');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const handleSaveApiKey = () => {
    openRouteService.setApiKey(apiKeyInput);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  const handleComputeRoute = async () => {
    setIsCalculating(true);
    try {
      // Determine Start
      let startLat = 37.7749;
      let startLng = -122.4194;
      let startName = 'Origin';

      if (originType === 'hub') {
        const hub = hubs.find((h) => h.id === selectedHubId) || hubs[0];
        if (hub) {
          startLat = hub.lat;
          startLng = hub.lng;
          startName = hub.name;
        }
      } else if (originType === 'vehicle') {
        const veh = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
        if (veh?.lastLocation) {
          startLat = veh.lastLocation.lat;
          startLng = veh.lastLocation.lng;
          startName = `Courier ${veh.vehicleNumber}`;
        }
      }

      // Determine Destination from selected parcel
      const parcel = parcels.find((p) => p.id === selectedParcelId) || parcels[0];
      const endLat = parcel?.recipient.lat || 37.3382;
      const endLng = parcel?.recipient.lng || -121.8863;
      const endName = parcel?.recipient.name || 'Recipient Destination';

      const result = await openRouteService.getRouteDirections(
        { lat: startLat, lng: startLng, name: startName },
        { lat: endLat, lng: endLng, name: endName },
        selectedProfile
      );

      setRouteResult(result);
      if (onApplyRouteToMap) {
        onApplyRouteToMap(result.coordinates, result);
      }
    } catch (err) {
      console.error('Failed computing route:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleComputeIsochrone = () => {
    const hub = hubs.find((h) => h.id === isochroneHubId) || hubs[0];
    if (!hub) return;

    const polygons = openRouteService.generateIsochrones(
      { lat: hub.lat, lng: hub.lng, name: hub.name },
      isochroneMinutes
    );

    if (onSelectHubIsochrone) {
      onSelectHubIsochrone(hub, polygons);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                OpenRouteService Geospatial Engine
              </h4>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Corridor navigation, turn-by-turn routing & isochrone reachability zones
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('routing')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === 'routing' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Route Solver
          </button>
          <button
            onClick={() => setActiveTab('isochrone')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === 'isochrone' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Isochrones
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              activeTab === 'config' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            API Setup
          </button>
        </div>
      </div>

      {/* Tab 1: Route Solver */}
      {activeTab === 'routing' && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Origin Selection */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Dispatch Departure Origin
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setOriginType('hub')}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    originType === 'hub' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Hub
                </button>
                <button
                  type="button"
                  onClick={() => setOriginType('vehicle')}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    originType === 'vehicle' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Active Fleet Van
                </button>
              </div>

              {originType === 'hub' ? (
                <select
                  value={selectedHubId}
                  onChange={(e) => setSelectedHubId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.code} · {h.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} ({v.driverName || 'Courier'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Destination Selection */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Delivery Destination Waypoint
              </label>
              <select
                value={selectedParcelId}
                onChange={(e) => setSelectedParcelId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 mt-5 sm:mt-0"
              >
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.trackingNumber} · {p.recipient.city} ({p.recipient.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Travel Profile */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Routing Optimization Profile
              </label>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 mt-5 sm:mt-0"
              >
                <option value="driving-car">Commercial Fleet (Van / Light Vehicle)</option>
                <option value="driving-hgv">Heavy Goods Vehicle (HGV Freight / Semi)</option>
                <option value="cycling-regular">Urban Micro-Mobility (Cargo e-Bike)</option>
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Calculates real PostGIS spline with highway geometries & ETA</span>
            </div>

            <div className="flex items-center gap-2">
              {isOverlayActive && onClearOverlay && (
                <button
                  type="button"
                  onClick={onClearOverlay}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg transition-colors"
                >
                  Clear Route Overlay
                </button>
              )}

              <button
                type="button"
                onClick={handleComputeRoute}
                disabled={isCalculating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isCalculating ? 'Computing Vector Path...' : 'Calculate ORS Route'}</span>
              </button>
            </div>
          </div>

          {/* Computed Route Summary Box */}
          {routeResult && (
            <div className="mt-3 p-3.5 rounded-lg bg-slate-950 border border-indigo-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-100">
                    Route Successfully Solved & Projected to Map
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {routeResult.source === 'openrouteservice' ? 'Live ORS API' : 'PostGIS ORS Engine'}
                </span>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <Compass className="w-3 h-3 text-indigo-400" />
                    <span>Distance</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-100 mt-0.5">
                    {routeResult.distanceKm} km
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Duration</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">
                    {routeResult.durationMinutes} min
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <Fuel className="w-3 h-3 text-emerald-400" />
                    <span>Fuel / Battery</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                    ~{routeResult.fuelEstimateLiters} L
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <Mountain className="w-3 h-3 text-cyan-400" />
                    <span>Elevation Climb</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                    +{routeResult.elevationGainM}m
                  </div>
                </div>
              </div>

              {/* Turn-by-Turn Maneuvers Snippet */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Turn-by-Turn Navigation Steps ({routeResult.steps.length})
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {routeResult.steps.map((st, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-1.5 rounded bg-slate-900/60 text-[11px] text-slate-300 border border-slate-800/60"
                    >
                      <CircleDot className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <span>{st.instruction}</span>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {(st.distanceMeters / 1000).toFixed(2)} km · {Math.round(st.durationSeconds / 60)}m
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Isochrone Reachability */}
      {activeTab === 'isochrone' && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Center Hub for Reachability Analysis
              </label>
              <select
                value={isochroneHubId}
                onChange={(e) => setIsochroneHubId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Transit Time Reachability Bands (Minutes)
              </label>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono">10 min</span>
                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-mono">20 min</span>
                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 font-mono">30 min</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <p className="text-[11px] text-slate-400">
              Isochrones render polygon rings showcasing parcel service areas reachable within delivery time thresholds.
            </p>

            <button
              type="button"
              onClick={handleComputeIsochrone}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Project Isochrones on Map</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: API Configuration */}
      {activeTab === 'config' && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              OpenRouteService API Token (Optional Remote Live Service)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="5b3ce3597851110001cf6248..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              >
                Save Token
              </button>
            </div>
            {apiKeySaved && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> API token saved in local session storage
              </span>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1 leading-relaxed">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              Zero-Configuration High-Precision Mode
            </div>
            <p>
              When an external API token is not specified, LogiFlows uses the embedded high-precision PostGIS geometric routing and Bezier spline corridor calculation to compute road curvature, duration, and turn-by-turn guidance instantaneously with zero external rate limits.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
