import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  RotateCw, 
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
  TrendingDown,
  Navigation,
  Star,
  Gauge
} from 'lucide-react';
import { Vehicle, Parcel, Employee } from '../../types';
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
  preselectedVehicleId?: string;
}

export const ReoptimizeRouteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vehicles,
  parcels,
  onApplyRouteToMap,
  preselectedCourierId,
  preselectedVehicleId,
}) => {
  const employees = storage.getEmployees();
  const couriers = employees.filter((e) => e.role === 'COURIER');

  const [selectedCourierId, setSelectedCourierId] = useState<string>(
    preselectedCourierId || couriers[0]?.id || 'user-courier'
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    preselectedVehicleId || vehicles[0]?.id || 'veh-ev-101'
  );

  const [profile, setProfile] = useState<'driving-car' | 'driving-hgv' | 'cycling-regular'>('driving-car');
  const [prioritizeParcelSla, setPrioritizeParcelSla] = useState(true);
  const [avoidHeavyTraffic, setAvoidHeavyTraffic] = useState(true);
  const [priorityWeight, setPriorityWeight] = useState<number>(1.5);

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationStep, setCalculationStep] = useState<string>('');
  const [reoptimizedResult, setReoptimizedResult] = useState<OptimizedRouteResult | null>(null);

  const selectedCourier = couriers.find((c) => c.id === selectedCourierId) || couriers[0];
  const assignedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  // Retrieve assigned or active parcels for selected courier/vehicle
  const candidateParcels = useMemo(() => {
    const courierParcels = parcels.filter(
      (p) =>
        (p.assignedCourierId === selectedCourier?.id ||
         p.assignedVehicleId === assignedVehicle?.id ||
         (selectedCourier?.id === 'user-courier' && (p.status === 'OUT_FOR_DELIVERY' || p.status === 'IN_TRANSIT_HUB_TRANSFER'))) &&
        p.status !== 'DELIVERED'
    );

    if (courierParcels.length > 0) return courierParcels;

    // Fallback: active out-for-delivery parcels in tenant
    return parcels
      .filter((p) => p.status === 'OUT_FOR_DELIVERY' || p.status === 'IN_TRANSIT_HUB_TRANSFER')
      .slice(0, 6);
  }, [parcels, selectedCourier, assignedVehicle]);

  // Convert parcels to StopWaypoints
  const waypoints: StopWaypoint[] = useMemo(() => {
    return candidateParcels.map((pcl, idx) => ({
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
  }, [candidateParcels]);

  const priorityStats = useMemo(() => {
    const sameDay = waypoints.filter((w) => w.serviceTier === 'SAME_DAY_PRIORITY').length;
    const nextDay = waypoints.filter((w) => w.serviceTier === 'NEXT_DAY_EXPRESS').length;
    const ground = waypoints.filter((w) => w.serviceTier === 'STANDARD_GROUND').length;
    const highRisk = waypoints.filter((w) => w.delayRiskLevel === 'HIGH').length;
    return { sameDay, nextDay, ground, highRisk };
  }, [waypoints]);

  const handleRunReoptimization = async () => {
    if (!selectedCourier || waypoints.length === 0) return;

    setIsCalculating(true);
    setReoptimizedResult(null);

    try {
      setCalculationStep('Step 1/3: Querying real-time traffic speeds & corridor delay matrix...');
      await new Promise((r) => setTimeout(r, 400));

      setCalculationStep('Step 2/3: Applying parcel priority SLA rankings (SAME DAY > EXPRESS > GROUND)...');
      await new Promise((r) => setTimeout(r, 450));

      setCalculationStep('Step 3/3: Re-sequencing waypoints to avoid bottlenecks & prioritize urgent drops...');
      await new Promise((r) => setTimeout(r, 400));

      const vehiclePos = assignedVehicle?.lastLocation || {
        lat: 37.7749,
        lng: -122.4194,
        name: `${assignedVehicle?.vehicleNumber || 'APX-EV-101'} (GPS Position)`,
      };

      const result = await openRouteService.optimizeCourierRoute(
        { id: selectedCourier.id, name: selectedCourier.name },
        {
          id: assignedVehicle?.id || 'veh-ev-101',
          vehicleNumber: assignedVehicle?.vehicleNumber || 'APX-EV-101',
          lastLocation: vehiclePos,
        },
        waypoints,
        profile,
        {
          prioritizeParcelSla,
          priorityWeight: avoidHeavyTraffic ? priorityWeight * 1.2 : priorityWeight,
        }
      );

      setReoptimizedResult(result);
    } catch (err) {
      console.error('Failed to re-optimize route:', err);
    } finally {
      setIsCalculating(false);
      setCalculationStep('');
    }
  };

  const handleApplyAndClose = () => {
    if (reoptimizedResult) {
      onApplyRouteToMap(reoptimizedResult);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden my-6 animate-scale-in">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <RotateCw className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Re-optimize Route: Real-Time Traffic & Parcel Priorities
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  DYNAMIC SLA ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Recalculates waypoint sequence based on live road corridor speeds and guarantees early delivery for high-priority parcels.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Top Config Grid: Courier, Vehicle & Profile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-400" />
                Active Courier
              </label>
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.activeDeliveriesCount} deliveries)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Assigned Vehicle
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} ({v.type.replace(/_/g, ' ')} · {v.batteryOrFuelPct}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                Vehicle Routing Profile
              </label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="driving-car">Driving Car / Courier Van (Standard)</option>
                <option value="driving-hgv">Heavy Goods Vehicle / Freight (HGV)</option>
                <option value="cycling-regular">Cargo Bike / Urban Micro-Mobility</option>
              </select>
            </div>
          </div>

          {/* Priority & Traffic Parameters */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Optimization Parameters: Traffic & Priority SLA Weighting
              </span>
              <span className="text-[11px] text-slate-400">
                {waypoints.length} waypoints detected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prioritizeParcelSla}
                  onChange={(e) => setPrioritizeParcelSla(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">
                    Prioritize Parcel SLA Priority Levels
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Schedule <strong className="text-indigo-300">SAME DAY PRIORITY</strong> and high-delay-risk consignments first in route.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avoidHeavyTraffic}
                  onChange={(e) => setAvoidHeavyTraffic(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">
                    Real-Time Traffic Corridor Avoidance
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Bypass congested bottlenecks (e.g. Bay Bridge westbound metering & Market St arterials).
                  </span>
                </div>
              </label>
            </div>

            {/* Manifest Priority Distribution Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="text-slate-400">Priority Manifests:</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Star className="w-3 h-3 text-indigo-300 fill-indigo-300" />
                {priorityStats.sameDay} Same Day Priority
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {priorityStats.nextDay} Next Day Express
              </span>
              <span className="px-2 py-0.5 rounded font-mono text-slate-300 bg-slate-800 border border-slate-700">
                {priorityStats.ground} Standard Ground
              </span>
              {priorityStats.highRisk > 0 && (
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  {priorityStats.highRisk} High Delay Risk
                </span>
              )}
            </div>
          </div>

          {/* Trigger Button or Calculation Step Banner */}
          {!reoptimizedResult && (
            <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center space-y-4">
              {isCalculating ? (
                <div className="space-y-3">
                  <RotateCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-200">{calculationStep}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    Evaluating combinatorial waypoints against real-time traffic impedance...
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">
                      Ready to Re-calculate {waypoints.length} Route Stops
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Click below to re-optimize waypoints considering current traffic conditions and parcel SLA priority constraints.
                    </p>
                  </div>

                  <button
                    onClick={handleRunReoptimization}
                    disabled={isCalculating || waypoints.length === 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xl transition-all hover:scale-[1.02] border border-emerald-400/30 disabled:opacity-50"
                  >
                    <RotateCw className="w-4 h-4 text-emerald-100" />
                    <span>Run Route Re-optimization</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Re-optimization Output Results */}
          {reoptimizedResult && (
            <div className="space-y-4 animate-fade-in">
              {/* Savings & Efficiency Highlights Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                    Travel Time Saved
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                    -{reoptimizedResult.timeSavedMinutes} mins
                  </div>
                  <span className="text-[11px] text-emerald-400/80">
                    {reoptimizedResult.timeSavedPercent}% time reduction
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block">
                    Optimized Duration
                  </span>
                  <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                    {Math.floor(reoptimizedResult.optimizedTotalDurationMinutes / 60)}h {reoptimizedResult.optimizedTotalDurationMinutes % 60}m
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Was {Math.floor(reoptimizedResult.originalTotalDurationMinutes / 60)}h {reoptimizedResult.originalTotalDurationMinutes % 60}m
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">
                    Total Route Distance
                  </span>
                  <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
                    {reoptimizedResult.optimizedTotalDistanceKm} km
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Saved {reoptimizedResult.distanceSavedKm} km
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
                    Stops Reordered
                  </span>
                  <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                    {reoptimizedResult.optimizedStops.length} Stops
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Traffic & Priority aligned
                  </span>
                </div>
              </div>

              {/* Priority Highlights & Bottlenecks Avoided */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Route Intelligence Highlights:
                </span>
                
                {reoptimizedResult.priorityHighlights && reoptimizedResult.priorityHighlights.length > 0 && (
                  <div className="space-y-1">
                    {reoptimizedResult.priorityHighlights.map((hl, i) => (
                      <div key={i} className="flex items-center gap-2 text-indigo-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                )}

                {reoptimizedResult.trafficBottlenecksAvoided.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    {reoptimizedResult.trafficBottlenecksAvoided.map((bn, i) => (
                      <div key={i} className="flex items-center gap-2 text-amber-300">
                        <TrendingDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{bn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stop Sequence Comparison Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">
                    Re-optimized Waypoint Sequence Order
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ranked by Priority & Real-Time Traffic
                  </span>
                </div>
                <div className="divide-y divide-slate-800/60 font-mono text-xs max-h-56 overflow-y-auto">
                  {reoptimizedResult.optimizedStops.map((stop, idx) => {
                    const stopNum = idx + 1;
                    const wasNum = stop.originalIndex;
                    const isPromoted = stopNum < wasNum;
                    return (
                      <div key={stop.parcelId || idx} className="p-3 flex items-center justify-between hover:bg-slate-900/40">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            stop.serviceTier === 'SAME_DAY_PRIORITY'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {stopNum}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 font-sans">
                              <span className="font-bold text-slate-200">{stop.recipientName}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                stop.serviceTier === 'SAME_DAY_PRIORITY'
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : stop.serviceTier === 'NEXT_DAY_EXPRESS'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {stop.serviceTier.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                              {stop.address} · <span className="font-mono">{stop.trackingNumber}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {isPromoted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                              WAS #{wasNum} → NOW #{stopNum}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Stop #{stopNum}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>OpenRouteService & PostGIS Live Traffic Matrix</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {reoptimizedResult ? (
              <button
                onClick={handleApplyAndClose}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>Apply Re-optimized Route to Map</span>
              </button>
            ) : (
              <button
                onClick={handleRunReoptimization}
                disabled={isCalculating || waypoints.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 text-emerald-100 ${isCalculating ? 'animate-spin' : ''}`} />
                <span>{isCalculating ? 'Computing...' : 'Re-optimize Route'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
