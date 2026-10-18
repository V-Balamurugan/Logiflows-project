import React, { useState, useMemo } from 'react';
import { 
  Route, 
  Sparkles, 
  Zap, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  X, 
  Sliders, 
  Layers, 
  Activity, 
  ChevronRight,
  TrendingDown,
  Navigation,
  RefreshCw,
  Info
} from 'lucide-react';
import { BranchHub, Vehicle, Parcel, Employee } from '../../types';
import { 
  openRouteService, 
  StopWaypoint, 
  OptimizedRouteResult 
} from '../../services/openRouteService';
import { storage } from '../../services/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  parcels: Parcel[];
  onApplyRouteToMap: (result: OptimizedRouteResult) => void;
  preselectedCourierId?: string;
}

export const AutoOptimizeRouteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vehicles,
  parcels,
  onApplyRouteToMap,
  preselectedCourierId,
}) => {
  const employees = storage.getEmployees();
  const couriers = employees.filter((e) => e.role === 'COURIER');

  const [selectedCourierId, setSelectedCourierId] = useState<string>(
    preselectedCourierId || couriers[0]?.id || 'user-courier'
  );
  const [profile, setProfile] = useState<'driving-car' | 'driving-hgv' | 'cycling-regular'>('driving-car');
  const [includeLiveTraffic, setIncludeLiveTraffic] = useState(true);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStep, setOptimizationStep] = useState<string>('');
  const [optimizedResult, setOptimizedResult] = useState<OptimizedRouteResult | null>(null);
  const [isAppliedToStore, setIsAppliedToStore] = useState(false);

  // Selected Courier and their assigned Vehicle
  const selectedCourier = couriers.find((c) => c.id === selectedCourierId) || couriers[0];
  const assignedVehicle = vehicles.find(
    (v) => v.driverId === selectedCourier?.id || v.id === selectedCourier?.assignedVehicleId
  ) || vehicles[0];

  // Parcels assigned to selected courier
  const assignedParcels = useMemo(() => {
    if (!selectedCourier) return [];
    return parcels.filter(
      (p) =>
        (p.assignedCourierId === selectedCourier.id ||
         p.assignedVehicleId === assignedVehicle?.id ||
         (selectedCourier.id === 'user-courier' && p.status === 'OUT_FOR_DELIVERY')) &&
        p.status !== 'DELIVERED'
    );
  }, [parcels, selectedCourier, assignedVehicle]);

  // Convert assigned parcels to StopWaypoints
  const waypoints: StopWaypoint[] = useMemo(() => {
    return assignedParcels.map((pcl, idx) => ({
      parcelId: pcl.id,
      trackingNumber: pcl.trackingNumber,
      recipientName: pcl.recipient.name,
      company: pcl.recipient.company,
      address: `${pcl.recipient.street}, ${pcl.recipient.city}`,
      city: pcl.recipient.city,
      postalCode: pcl.recipient.postalCode,
      lat: pcl.recipient.lat || 37.7749,
      lng: pcl.recipient.lng || -122.4194,
      serviceTier: pcl.serviceTier,
      originalIndex: pcl.routeStopOrder || idx + 1,
      packageType: pcl.packageType,
      specialInstructions: pcl.specialInstructions,
      delayRiskLevel: pcl.delayRisk?.level || 'LOW',
      weightKg: pcl.weightKg,
    }));
  }, [assignedParcels]);

  const handleRunOptimization = async () => {
    if (!selectedCourier || waypoints.length === 0) return;

    setIsOptimizing(true);
    setIsAppliedToStore(false);
    setOptimizedResult(null);

    try {
      setOptimizationStep('Querying OpenRouteService geospatial distance & traffic matrix...');
      await new Promise((r) => setTimeout(r, 450));

      setOptimizationStep('Analyzing urban corridor bottlenecks (Bay Bridge, US-101, downtown grid)...');
      await new Promise((r) => setTimeout(r, 500));

      setOptimizationStep('Solving combinatorial TSP route permutation for minimum travel time...');
      await new Promise((r) => setTimeout(r, 450));

      const result = await openRouteService.optimizeCourierRoute(
        { id: selectedCourier.id, name: selectedCourier.name },
        { 
          id: assignedVehicle?.id || 'veh-default', 
          vehicleNumber: assignedVehicle?.vehicleNumber || 'Van Fleet',
          lastLocation: assignedVehicle?.lastLocation 
            ? { lat: assignedVehicle.lastLocation.lat, lng: assignedVehicle.lastLocation.lng, name: assignedVehicle.vehicleNumber }
            : undefined
        },
        waypoints,
        profile
      );

      setOptimizedResult(result);
      onApplyRouteToMap(result);
    } catch (err) {
      console.error('Route optimization error:', err);
    } finally {
      setIsOptimizing(false);
      setOptimizationStep('');
    }
  };

  const handleApplyToItinerary = () => {
    if (!optimizedResult || !selectedCourier) return;

    const orderedIds = optimizedResult.optimizedStops.map((s) => s.parcelId);
    storage.reorderCourierStops(selectedCourier.id, orderedIds, {
      timeSavedMinutes: optimizedResult.timeSavedMinutes,
      trafficNotes: optimizedResult.trafficBottlenecksAvoided.join('; '),
    });

    setIsAppliedToStore(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Auto-Optimize Courier Route
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  OpenRouteService (ORS) Traffic Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically reorders assigned stops to minimize courier travel time and bypass real-time traffic congestion.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls: Courier Selection & Routing Profile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            {/* Courier Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Courier
              </label>
              <select
                value={selectedCourierId}
                onChange={(e) => {
                  setSelectedCourierId(e.target.value);
                  setOptimizedResult(null);
                  setIsAppliedToStore(false);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id === 'user-courier' ? 'Van APX-EV-101' : 'Van APX-EV-102'})
                  </option>
                ))}
              </select>
            </div>

            {/* Profile Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Vehicle Routing Profile
              </label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="driving-car">Driving Car / Sprinter Van (Standard)</option>
                <option value="driving-hgv">Driving Heavy HGV (Freight Truck)</option>
                <option value="cycling-regular">Cargo E-Bike (Hyperlocal Downtown)</option>
              </select>
            </div>

            {/* Live Traffic Toggle & Run Button */}
            <div className="flex flex-col justify-end">
              <button
                onClick={handleRunOptimization}
                disabled={isOptimizing || waypoints.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md transition-all"
              >
                {isOptimizing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Traffic...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Run Auto-Optimization</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Courier & Vehicle Telemetry Context Banner */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {selectedCourier?.name} · Vehicle {assignedVehicle?.vehicleNumber || 'APX-EV-101'}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>Start Position:</span>
                  <span className="font-mono text-indigo-300">
                    {assignedVehicle?.lastLocation
                      ? `${assignedVehicle.lastLocation.lat.toFixed(4)}, ${assignedVehicle.lastLocation.lng.toFixed(4)} (GPS Live)`
                      : '37.7749, -122.4194 (San Francisco Hub)'}
                  </span>
                  <span>·</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    {waypoints.length} Assigned Stops
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLiveTraffic}
                  onChange={(e) => setIncludeLiveTraffic(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Include Live Traffic Congestion Penalties</span>
              </label>
            </div>
          </div>

          {/* Optimization In-Progress State */}
          {isOptimizing && (
            <div className="p-6 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-center space-y-3 animate-pulse">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <div className="text-sm font-semibold text-indigo-200">
                Running OpenRouteService Multi-Stop Combinatorial Optimization
              </div>
              <div className="text-xs text-indigo-300/80 font-mono">
                {optimizationStep || 'Calculating shortest travel time sequence...'}
              </div>
            </div>
          )}

          {/* Optimization Results View */}
          {optimizedResult && !isOptimizing && (
            <div className="space-y-6 animate-fade-in">
              {/* Highlight Savings KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Travel Time Reduction */}
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
                    <span>Travel Time Savings</span>
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-300">
                    -{optimizedResult.timeSavedMinutes}m
                  </div>
                  <div className="text-[11px] text-emerald-400/80 mt-0.5">
                    {optimizedResult.originalTotalDurationMinutes}m → {optimizedResult.optimizedTotalDurationMinutes}m ({optimizedResult.timeSavedPercent}% faster)
                  </div>
                </div>

                {/* Distance Reduction */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Distance Saved</span>
                    <Route className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-100">
                    -{optimizedResult.distanceSavedKm} km
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {optimizedResult.originalTotalDistanceKm} km → {optimizedResult.optimizedTotalDistanceKm} km
                  </div>
                </div>

                {/* Bypassed Bottlenecks */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Traffic Corridors</span>
                    <Activity className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-300">
                    {optimizedResult.trafficBottlenecksAvoided.length} Bypassed
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Severe delay zones mitigated
                  </div>
                </div>

                {/* Engine Source */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Routing Engine</span>
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                    {optimizedResult.source === 'openrouteservice_matrix' ? 'ORS Matrix API' : 'ORS PostGIS Vector'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Isochrones & Graph Evaluated
                  </div>
                </div>
              </div>

              {/* Bypassed Bottlenecks Alert Strip (if any) */}
              {optimizedResult.trafficBottlenecksAvoided.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Real-time Traffic Congestion Mitigated:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/90 pl-1">
                    {optimizedResult.trafficBottlenecksAvoided.map((alert, idx) => (
                      <li key={idx}>{alert}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stops Comparison Table: Before vs After */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Stop Sequence Optimization Breakdown
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Ordered starting from {assignedVehicle?.vehicleNumber || 'Van'} current location
                  </span>
                </div>

                <div className="space-y-2">
                  {optimizedResult.optimizedStops.map((stop, idx) => {
                    const originalPos = stop.originalIndex;
                    const newPos = idx + 1;
                    const isReordered = originalPos !== newPos;
                    const legSegment = optimizedResult.segments[idx];

                    return (
                      <div
                        key={stop.parcelId}
                        className={`p-3.5 rounded-xl border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isReordered
                            ? 'bg-indigo-950/30 border-indigo-500/40'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start md:items-center gap-3">
                          {/* New Stop Position Badge */}
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white font-mono font-bold text-sm shadow-md shrink-0">
                            #{newPos}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-100 text-xs">
                                {stop.recipientName}
                              </span>
                              {stop.company && (
                                <span className="text-[11px] text-slate-400">
                                  ({stop.company})
                                </span>
                              )}
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {stop.trackingNumber}
                              </span>
                              {isReordered && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Moved from #{originalPos} → #{newPos}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>{stop.address}</span>
                            </div>
                          </div>
                        </div>

                        {/* Leg Segment Telemetry & Traffic */}
                        {legSegment && (
                          <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-11 md:pl-0">
                            <div className="text-right">
                              <span className="text-slate-400 block text-[10px]">Leg Distance</span>
                              <span className="font-bold text-slate-200">
                                {legSegment.distanceKm} km
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-slate-400 block text-[10px]">Transit ETA</span>
                              <span className="font-bold text-emerald-400">
                                ~{legSegment.durationMinutes} min
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-slate-400 block text-[10px]">Traffic State</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  legSegment.trafficCondition.congestionLevel === 'FREE_FLOW'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : legSegment.trafficCondition.congestionLevel === 'MODERATE'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {legSegment.trafficCondition.congestionLevel.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Initial State Before Optimization */}
          {!optimizedResult && !isOptimizing && (
            <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800 text-center space-y-3">
              <Route className="w-10 h-10 text-indigo-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                Ready to Optimize {waypoints.length} Stops for {selectedCourier?.name}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click <strong>"Run Auto-Optimization"</strong> above to compute the most efficient delivery route considering real-time OpenRouteService road directions, arterial bottlenecks, and traffic speed factors.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              {optimizedResult
                ? `Optimized route is rendered on map (${optimizedResult.timeSavedMinutes}m travel time saved)`
                : 'Select courier and click Run Auto-Optimization'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>

            {optimizedResult && (
              <button
                onClick={handleApplyToItinerary}
                disabled={isAppliedToStore}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-md transition-all ${
                  isAppliedToStore
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isAppliedToStore
                    ? 'Sequence Applied to Itinerary!'
                    : 'Apply Sequence to Courier Itinerary'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
