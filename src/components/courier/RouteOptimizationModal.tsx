// Source: Google Maps Platform Code Assist
import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Leaf, 
  Clock, 
  MapPin, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Truck, 
  ArrowRight, 
  X, 
  Sparkles, 
  Layers, 
  Fuel, 
  Activity, 
  Compass, 
  Car, 
  Check, 
  ChevronRight,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { BranchHub, Vehicle, Parcel, Employee } from '../../types';
import { storage } from '../../services/storage';
import { 
  routeOptimizationEngine, 
  RouteOptimizationResult, 
  OptimizationObjective 
} from '../../services/routeOptimizationEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  courierId?: string;
  onApplySuccess?: (result: RouteOptimizationResult) => void;
  onViewOnMap?: (result: RouteOptimizationResult) => void;
}

export const RouteOptimizationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  courierId: initialCourierId,
  onApplySuccess,
  onViewOnMap,
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const couriers = storage.getEmployees(currentTenantId).filter((e) => e.role === 'COURIER');
  const vehicles = storage.getVehicles(currentTenantId);
  const hubs = storage.getHubs(currentTenantId);

  const [selectedCourierId, setSelectedCourierId] = useState<string>(
    initialCourierId || couriers[0]?.id || 'user-courier'
  );

  const [objective, setObjective] = useState<OptimizationObjective>('MINIMIZE_FUEL_AND_TIME');
  const [routingPreference, setRoutingPreference] = useState<'TRAFFIC_AWARE_OPTIMAL' | 'TRAFFIC_AWARE'>('TRAFFIC_AWARE_OPTIMAL');
  const [isRoundTrip, setIsRoundTrip] = useState(true);

  const [isCalculating, setIsCalculating] = useState(false);
  const [planResult, setPlanResult] = useState<RouteOptimizationResult | null>(null);
  const [applySuccessMsg, setApplySuccessMsg] = useState<string | null>(null);

  // Sync courier id if prop changes
  useEffect(() => {
    if (initialCourierId) {
      setSelectedCourierId(initialCourierId);
    }
  }, [initialCourierId]);

  const assignedVehicle = vehicles.find((v) => v.driverId === selectedCourierId) || vehicles[0];
  const assignedCourier = couriers.find((c) => c.id === selectedCourierId);

  // Compute on mount or courier switch
  useEffect(() => {
    if (!isOpen) return;
    handleCalculate();
  }, [isOpen, selectedCourierId, objective, routingPreference, isRoundTrip]);

  if (!isOpen) return null;

  const handleCalculate = async () => {
    setIsCalculating(true);
    setApplySuccessMsg(null);

    try {
      const result = await routeOptimizationEngine.optimizeCourierRoute({
        courierId: selectedCourierId,
        vehicle: assignedVehicle,
        objective,
        routingPreference,
        isRoundTrip,
      });
      setPlanResult(result);
    } catch (e) {
      console.error('Failed to calculate route optimization:', e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApplyToCourier = () => {
    if (!planResult) return;
    const res = routeOptimizationEngine.applyOptimizedPlanToCourier(planResult);
    setApplySuccessMsg(res.message);
    if (onApplySuccess) {
      onApplySuccess(planResult);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Google Maps Route Optimization Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                  TRAFFIC & FUEL MINIMIZER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculates the most efficient multi-stop path using real-time traffic data, minimizing transit time and fuel consumption.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Courier Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Assigned Courier</span>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="bg-transparent font-semibold text-slate-200 focus:outline-none cursor-pointer"
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehicle Card */}
            {assignedVehicle && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">
                    Vehicle: {assignedVehicle.vehicleNumber}
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span>{assignedVehicle.type.replace(/_/g, ' ')}</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono text-[9px] border border-indigo-500/30">
                      {assignedVehicle.fuelType || 'ELECTRIC'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recalculate Trigger */}
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'Computing Optimal Path...' : 'Recalculate Route'}</span>
          </button>
        </div>

        {/* Objective & Traffic Sensitivity Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Optimization Strategy Objective:</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setObjective('MINIMIZE_FUEL_AND_TIME')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  objective === 'MINIMIZE_FUEL_AND_TIME'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Balanced Optimal (Time & Fuel)</span>
              </button>

              <button
                onClick={() => setObjective('MINIMIZE_FUEL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  objective === 'MINIMIZE_FUEL'
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white border-teal-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                <span>Eco-Fuel Saver (Lowest Energy)</span>
              </button>

              <button
                onClick={() => setObjective('MINIMIZE_TIME')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  objective === 'MINIMIZE_TIME'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Fastest Transit (Priority SLA)</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Google Maps Traffic Engine:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {routingPreference === 'TRAFFIC_AWARE_OPTIMAL' ? 'Live Real-Time Traffic (TRAFFIC_AWARE_OPTIMAL)' : 'Historical Traffic Flow'}
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span>Round-trip (Return to starting Depot Hub)</span>
            </label>
          </div>
        </div>

        {/* Results Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {planResult && (
            <>
              {/* Savings Dashboard Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Time Saved Card */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider">Transit Time Saved</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    -{planResult.timeSavedMinutes}m
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {planResult.totalDurationMinutes}m total (was {planResult.baselineDurationMinutes}m) · <strong className="text-emerald-300">-{planResult.timeSavedPercent}%</strong>
                  </div>
                </div>

                {/* Fuel/Energy Saved Card */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider">Fuel / Energy Saved</span>
                    <Fuel className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-xl font-black text-teal-400 font-mono">
                    -{planResult.fuelSavedUnits} {planResult.fuelUnit}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {planResult.optimizedFuelUnits} {planResult.fuelUnit} (was {planResult.baselineFuelUnits} {planResult.fuelUnit}) · <strong className="text-teal-300">-${planResult.costSavingsUsd} USD</strong>
                  </div>
                </div>

                {/* Carbon Emissions Saved Card */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider">CO2 Emissions Reduced</span>
                    <Leaf className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-black text-cyan-400 font-mono">
                    -{planResult.co2SavedKg} kg
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {planResult.co2EmittedKg} kg total (was {planResult.baselineCO2Kg} kg CO2)
                  </div>
                </div>

                {/* Eco Score / Bottlenecks */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider">Eco Efficiency Score</span>
                    <Activity className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-amber-400 font-mono">
                    {planResult.ecoScore} / 100
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    <span className="text-indigo-300 font-semibold">{planResult.trafficBottlenecksAvoided} traffic bottlenecks</span> bypassed
                  </div>
                </div>
              </div>

              {/* Applied Toast Notice */}
              {applySuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{applySuccessMsg}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300">Synced to device & dispatch queue</span>
                </div>
              )}

              {/* Optimized Multi-Stop Itinerary Sequence Table */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <span>Optimized Waypoint Sequence & Arrival ETAs</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    Total Route: {planResult.totalDistanceKm} km · {planResult.orderedStops.length} Waypoints
                  </span>
                </div>

                <div className="space-y-2">
                  {planResult.orderedStops.map((stop, i) => {
                    const isOrigin = stop.stopType === 'ORIGIN';
                    const isDepotReturn = stop.stopType === 'DEPOT_RETURN';
                    const arrivalDate = new Date(stop.estimatedArrival);
                    const formattedTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={`${stop.id}-${i}`}
                        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
                          isOrigin || isDepotReturn
                            ? 'bg-slate-900 border-indigo-500/30'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isOrigin
                              ? 'bg-blue-600 text-white'
                              : isDepotReturn
                              ? 'bg-purple-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {isOrigin ? '0' : isDepotReturn ? '🏁' : stop.sequence}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200">
                                {stop.recipientName}
                              </span>
                              {stop.trackingNumber && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px] border border-indigo-500/30">
                                  {stop.trackingNumber}
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-mono uppercase">
                                {stop.stopType.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {stop.address}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-mono text-slate-500">Scheduled Arrival</span>
                            <span className="font-mono font-bold text-slate-200 text-xs">
                              {formattedTime}
                            </span>
                          </div>

                          {!isOrigin && !isDepotReturn && stop.originalSequence !== stop.sequence && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[10px] border border-emerald-500/20">
                              Order #{stop.originalSequence} → #{stop.sequence}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leg-by-Leg Traffic Congestion & Fuel Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-400" />
                    <span>Real-Time Traffic Congestion & Fuel Breakdown by Segment</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Calculated via Google Maps Routes API (TRAFFIC_AWARE_OPTIMAL)
                  </span>
                </div>

                <div className="space-y-2">
                  {planResult.legs.map((leg) => {
                    const congestionColor =
                      leg.trafficCongestion === 'SEVERE'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : leg.trafficCongestion === 'HEAVY'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : leg.trafficCongestion === 'MODERATE'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                    return (
                      <div
                        key={leg.legIndex}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-mono flex items-center justify-center text-[10px] font-bold">
                            #{leg.legIndex}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-200">
                              <span>{leg.fromName}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                              <span>{leg.toName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span>{leg.distanceKm} km</span>
                              <span>·</span>
                              <span>{leg.durationMinutes} mins</span>
                              <span>·</span>
                              <span>Avg {leg.avgSpeedKmh} km/h</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Traffic badge */}
                          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${congestionColor}`}>
                            {leg.trafficCongestion} CONGESTION
                            {leg.trafficDelayMinutes > 0 && ` (+${leg.trafficDelayMinutes}m)`}
                          </span>

                          {/* Fuel consumed */}
                          <div className="flex flex-col text-right">
                            <span className="font-mono text-teal-300 font-bold">
                              {leg.fuelConsumedUnits} {leg.fuelUnit}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              ${leg.fuelCostUsd} USD
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attribution and Google Maps Footer */}
              <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Powered by Google Maps Platform Routes API v2 with live traffic awareness</span>
                </div>
                <span className="font-mono text-slate-400">Google Maps</span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/70 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {planResult && onViewOnMap && (
              <button
                onClick={() => {
                  onViewOnMap(planResult);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>View on Geospatial Map</span>
              </button>
            )}

            <button
              onClick={handleApplyToCourier}
              disabled={!planResult || isCalculating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Optimized Sequence to Courier Itinerary</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
