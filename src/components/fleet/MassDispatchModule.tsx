import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Layers, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Sliders, 
  Clock, 
  Weight, 
  Package, 
  ShieldCheck, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Zap, 
  X,
  Printer,
  FileCheck
} from 'lucide-react';
import { 
  Vehicle, 
  Parcel, 
  BatchDispatchStrategy, 
  BatchDispatchPlan, 
  VehicleBatchAssignment 
} from '../../types';
import { batchDispatchService } from '../../services/batchDispatchService';
import { storage } from '../../services/storage';

interface Props {
  vehicles: Vehicle[];
}

export const MassDispatchModule: React.FC<Props> = ({ vehicles }) => {
  const currentTenantId = storage.getActiveTenantId();
  const [strategy, setStrategy] = useState<BatchDispatchStrategy>('GEO_CLUSTERING');
  const [maxStops, setMaxStops] = useState<number>(10);
  const [capacityBuffer, setCapacityBuffer] = useState<number>(10);
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'ELECTRIC_ONLY' | 'VANS_ONLY'>('ALL');
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  // Generated Plan State
  const [dispatchPlan, setDispatchPlan] = useState<BatchDispatchPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    dispatchedParcelsCount: number;
    dispatchedVehiclesCount: number;
    totalDispatchedKg: number;
  } | null>(null);

  // Generate / regenerate plan
  const generatePlan = () => {
    let filteredVehicles = vehicles.filter(v => v.status !== 'MAINTENANCE');
    if (vehicleFilter === 'ELECTRIC_ONLY') {
      filteredVehicles = filteredVehicles.filter(v => v.type === 'ELECTRIC_VAN' || v.type === 'CARGO_EBIKE');
    } else if (vehicleFilter === 'VANS_ONLY') {
      filteredVehicles = filteredVehicles.filter(v => v.type === 'ELECTRIC_VAN' || v.type === 'SPRINTER_VAN');
    }

    const plan = batchDispatchService.generateDispatchPlan(currentTenantId, {
      strategy,
      selectedVehicleIds: filteredVehicles.map(v => v.id),
      maxStopsPerVehicle: maxStops,
      targetCapacityBufferPct: capacityBuffer
    });

    setDispatchPlan(plan);
  };

  useEffect(() => {
    generatePlan();
  }, [strategy, maxStops, capacityBuffer, vehicleFilter, vehicles]);

  // Execute mass dispatch
  const handleExecuteDispatch = () => {
    if (!dispatchPlan || dispatchPlan.totalParcelsCount === 0) return;

    setIsExecuting(true);
    setTimeout(() => {
      const result = batchDispatchService.executeBatchDispatch(dispatchPlan);
      setIsExecuting(false);

      if (result.success) {
        setExecutionResult({
          dispatchedParcelsCount: result.dispatchedParcelsCount,
          dispatchedVehiclesCount: result.dispatchedVehiclesCount,
          totalDispatchedKg: result.totalDispatchedKg
        });
        // Refresh plan
        generatePlan();
      }
    }, 600);
  };

  // Remove parcel from specific assignment
  const handleRemoveParcelFromBatch = (vehId: string, parcelId: string) => {
    if (!dispatchPlan) return;
    const updatedAssignments = dispatchPlan.assignments.map(a => {
      if (a.vehicle.id === vehId) {
        const removed = a.parcels.find(p => p.id === parcelId);
        const filteredParcels = a.parcels.filter(p => p.id !== parcelId);
        const newWeight = Math.round((a.totalWeightKg - (removed?.weightKg || 0)) * 10) / 10;
        const combined = a.vehicle.currentLoadKg + newWeight;
        return {
          ...a,
          parcels: filteredParcels,
          totalWeightKg: newWeight,
          estimatedStops: filteredParcels.length,
          capacityUtilizationPct: Math.round((combined / a.vehicle.capacityKg) * 100)
        };
      }
      return a;
    });

    const totalCount = updatedAssignments.reduce((acc, a) => acc + a.parcels.length, 0);
    const totalWeight = Math.round(updatedAssignments.reduce((acc, a) => acc + a.totalWeightKg, 0) * 10) / 10;

    setDispatchPlan({
      ...dispatchPlan,
      assignments: updatedAssignments,
      totalParcelsCount: totalCount,
      totalWeightKg: totalWeight,
      vehiclesCount: updatedAssignments.filter(a => a.parcels.length > 0).length
    });
  };

  const dispatchReadyCount = batchDispatchService.getDispatchReadyParcels(currentTenantId).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & KPI Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            AUTOMATED FLEET ASSIGNMENT · HEURISTIC MULTI-VEHICLE DISPATCH ENGINE
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Simultaneous Mass-Dispatch & Route Loading
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Intelligently cluster, balance, and pack pending shipments across your active fleet with one-click atomic dispatch.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={generatePlan}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-compute Batches</span>
          </button>

          <button
            disabled={!dispatchPlan || dispatchPlan.totalParcelsCount === 0 || isExecuting}
            onClick={handleExecuteDispatch}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs shadow-lg transition-all ${
              !dispatchPlan || dispatchPlan.totalParcelsCount === 0 || isExecuting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-indigo-500/20 active:scale-95'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {isExecuting 
                ? 'Dispatching Across Fleet...' 
                : `Execute Mass Dispatch (${dispatchPlan?.totalParcelsCount || 0} Parcels)`}
            </span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Ready Shipments</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-1">
            {dispatchReadyCount}
          </div>
          <span className="text-[11px] text-slate-500">Unassigned or awaiting route dispatch</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Allocated in Batch</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
            {dispatchPlan?.totalParcelsCount || 0}
          </div>
          <span className="text-[11px] text-slate-500">
            Across {dispatchPlan?.vehiclesCount || 0} participating vehicles
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Batch Cargo Mass</span>
            <Weight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-1">
            {dispatchPlan?.totalWeightKg || 0} <span className="text-sm font-sans text-slate-400">kg</span>
          </div>
          <span className="text-[11px] text-slate-500">Payload weight loaded</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Dispatch Algorithm</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-mono font-bold text-purple-300 mt-2 truncate">
            {strategy.replace(/_/g, ' ')}
          </div>
          <span className="text-[11px] text-slate-500">SLA & geo-routing compliant</span>
        </div>
      </div>

      {/* Algorithm Strategy & Tuning Controls */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Batch Assignment Optimization Strategy & Parameters
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Safety Buffer: {capacityBuffer}% | Max Stops: {maxStops}
          </span>
        </div>

        {/* Strategy Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              id: 'GEO_CLUSTERING',
              label: 'Geographic Sector Clustering',
              desc: 'Clusters addresses into Metro SF, East Bay, South Bay & Peninsula to minimize stem miles.',
              badge: 'RECOMMENDED'
            },
            {
              id: 'BALANCED_WORKLOAD',
              label: 'Balanced Workload Distribution',
              desc: 'Evenly distributes parcel quantities and physical weight across all active couriers.',
              badge: 'FAIR DISPATCH'
            },
            {
              id: 'SLA_PRIORITY',
              label: 'SLA Tier & Express Escalation',
              desc: 'Sorts Same-Day Priority and Express shipments first onto the fastest electric fleet units.',
              badge: 'TIME SENSITIVE'
            },
            {
              id: 'MAX_CAPACITY_PACKING',
              label: 'Maximum Capacity Packing',
              desc: 'Uses Knapsack packing to maximize payload per vehicle, minimizing required fleet units.',
              badge: 'ECO PACKING'
            }
          ].map((strat) => (
            <button
              key={strat.id}
              onClick={() => setStrategy(strat.id as BatchDispatchStrategy)}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                strategy === strat.id
                  ? 'bg-indigo-600/15 border-indigo-500 shadow-sm shadow-indigo-950/40 ring-1 ring-indigo-500'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${strategy === strat.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                  {strat.label}
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  strategy === strat.id ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {strat.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {strat.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Tuning Sliders & Vehicle Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80 text-xs">
          {/* Max Stops Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Max Stops Per Vehicle:</span>
              <span className="font-mono font-bold text-indigo-400">{maxStops} stops</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              value={maxStops}
              onChange={(e) => setMaxStops(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Safety Buffer Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Payload Reserve Buffer:</span>
              <span className="font-mono font-bold text-emerald-400">{capacityBuffer}% buffer</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="5"
              value={capacityBuffer}
              onChange={(e) => setCapacityBuffer(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Vehicle Type Filter */}
          <div className="space-y-1.5">
            <span className="text-slate-300 block">Fleet Target Filter:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Fleet' },
                { id: 'ELECTRIC_ONLY', label: 'EVs & Ebikes' },
                { id: 'VANS_ONLY', label: 'Vans Only' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setVehicleFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    vehicleFilter === f.id
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Batch Assignment Preview Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            <span>Simultaneous Fleet Load Allocations ({dispatchPlan?.assignments.filter(a => a.parcels.length > 0).length || 0} Vehicles Loaded)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Click any vehicle to expand assigned parcel manifest
          </span>
        </div>

        {dispatchPlan && dispatchPlan.assignments.length > 0 ? (
          <div className="space-y-3">
            {dispatchPlan.assignments.map((assignment) => {
              const { vehicle, assignedCourier, parcels, totalWeightKg, capacityUtilizationPct, estimatedStops, estimatedRouteKm, estimatedDurationMin, primaryZone } = assignment;
              const isExpanded = expandedVehicleId === vehicle.id;
              const hasParcels = parcels.length > 0;

              return (
                <div
                  key={vehicle.id}
                  className={`rounded-xl border transition-all ${
                    hasParcels 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' 
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  {/* Card Header Bar */}
                  <div 
                    onClick={() => setExpandedVehicleId(isExpanded ? null : vehicle.id)}
                    className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        {vehicle.type === 'CARGO_EBIKE' ? (
                          <Zap className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Truck className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-slate-100">
                            {vehicle.vehicleNumber}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {vehicle.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {primaryZone}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            {assignedCourier ? assignedCourier.name : vehicle.driverName || 'Designated Courier'}
                          </span>
                          <span>·</span>
                          <span>Battery/Fuel: {vehicle.batteryOrFuelPct}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Utilization */}
                    <div className="flex items-center gap-6">
                      {/* Weight & Capacity meter */}
                      <div className="w-40 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Payload Load:</span>
                          <span className="text-slate-200 font-bold">
                            {(vehicle.currentLoadKg + totalWeightKg).toFixed(0)} / {vehicle.capacityKg} kg ({capacityUtilizationPct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              capacityUtilizationPct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, capacityUtilizationPct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Stops & Route Projections */}
                      <div className="text-right text-xs">
                        <div className="font-mono font-bold text-slate-100">
                          {estimatedStops} Stops ({totalWeightKg} kg)
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ~{estimatedRouteKm} km · ~{estimatedDurationMin} min
                        </div>
                      </div>

                      {/* Expand Chevron */}
                      <div className="p-1 rounded text-slate-400 hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Parcel Manifest */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 p-4 bg-slate-950/60 rounded-b-xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span>Allocated Manifest Items ({parcels.length} parcels)</span>
                        <span className="text-slate-500 text-[11px]">Click 'Remove' to drop a parcel back into the staging pool</span>
                      </div>

                      {parcels.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No parcels allocated to this vehicle under the current constraints.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                              <tr>
                                <th className="p-2.5">Tracking Number</th>
                                <th className="p-2.5">Recipient</th>
                                <th className="p-2.5">Destination City</th>
                                <th className="p-2.5">Weight</th>
                                <th className="p-2.5">Service Tier</th>
                                <th className="p-2.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-sans">
                              {parcels.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-800/30">
                                  <td className="p-2.5 font-mono font-bold text-indigo-300">
                                    {p.trackingNumber}
                                  </td>
                                  <td className="p-2.5 text-slate-200">
                                    {p.recipient.name}
                                  </td>
                                  <td className="p-2.5 text-slate-300">
                                    {p.recipient.city}
                                  </td>
                                  <td className="p-2.5 font-mono text-slate-300">
                                    {p.weightKg} kg
                                  </td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                      {p.serviceTier.replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveParcelFromBatch(vehicle.id, p.id);
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            No active vehicles available for automated dispatch under the selected filter criteria.
          </div>
        )}
      </div>

      {/* Execution Confirmation Receipt Modal */}
      {executionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Mass Dispatch Successfully Executed
                  </h3>
                  <p className="text-xs text-slate-400">
                    Continuous custody events logged to cryptographic ledger.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExecutionResult(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Operation ID:</span>
                <span className="text-indigo-400 font-bold">BATCH-DISPATCH-{Date.now().toString(36).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Total Parcels Dispatched:</span>
                <span className="text-emerald-400 font-bold">{executionResult.dispatchedParcelsCount} parcels</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Vehicles Mobilized:</span>
                <span className="text-slate-200 font-bold">{executionResult.dispatchedVehiclesCount} active units</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Total Cargo Mass:</span>
                <span className="text-amber-400 font-bold">{executionResult.totalDispatchedKg} kg</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">New Custody Status:</span>
                <span className="text-purple-400 font-bold">OUT_FOR_DELIVERY</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              All parcels have been assigned vehicle IDs and couriers. Couriers have received push manifest notifications on their mobile devices, and navigation routes are synchronized.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setExecutionResult(null)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
