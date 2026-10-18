import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Truck, 
  Fuel, 
  Leaf, 
  Clock, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  Zap, 
  X, 
  Layers, 
  Weight, 
  TrendingDown, 
  Radio, 
  AlertTriangle,
  RotateCw,
  Send,
  Eye,
  Info
} from 'lucide-react';
import { 
  Vehicle, 
  Parcel, 
  BranchHub, 
  MultiVehicleAiOptimizationPlan, 
  OptimizedVehicleRouteSequence 
} from '../../types';
import { storage } from '../../services/storage';
import { 
  routeOptimizationAiService, 
  OptimizationOptions 
} from '../../services/routeOptimizationAiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  parcels: Parcel[];
  hubs: BranchHub[];
  onPreviewPlanOnMap?: (plan: MultiVehicleAiOptimizationPlan) => void;
}

export const RouteOptimizationAI: React.FC<Props> = ({
  isOpen,
  onClose,
  vehicles,
  parcels,
  hubs,
  onPreviewPlanOnMap
}) => {
  // Available dispatchable vehicles
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(() => {
    // Default: select available vehicles or top 3
    const available = vehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_ROUTE');
    return available.slice(0, 3).map(v => v.id);
  });

  // Algorithm tuning options
  const [trafficBias, setTrafficBias] = useState<'AVOID_CONGESTION' | 'BALANCED' | 'SHORTEST_DISTANCE'>('AVOID_CONGESTION');
  const [payloadStrategy, setPayloadStrategy] = useState<'HEAVY_DROPOFF_FIRST' | 'CLUSTER_DENSITY'>('HEAVY_DROPOFF_FIRST');
  const [prioritizeSameDaySla, setPrioritizeSameDaySla] = useState(true);

  // Optimization Execution State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStatusText, setOptimizationStatusText] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<MultiVehicleAiOptimizationPlan | null>(null);
  const [selectedPreviewVehicleId, setSelectedPreviewVehicleId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Eligible parcels count & weight
  const dispatchableParcels = useMemo(() => {
    return parcels.filter(p => 
      p.status === 'BOOKED' || 
      p.status === 'ACCEPTED' || 
      p.status === 'AT_ORIGIN_HUB' || 
      p.status === 'AT_DESTINATION_HUB' ||
      p.status === 'OUT_FOR_DELIVERY'
    );
  }, [parcels]);

  const totalPoolWeightKg = useMemo(() => {
    return dispatchableParcels.reduce((sum, p) => sum + p.weightKg, 0);
  }, [dispatchableParcels]);

  // Toggle vehicle selection
  const handleToggleVehicle = (id: string) => {
    setSelectedVehicleIds(prev => 
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    );
  };

  const handleSelectAllElectric = () => {
    const electricIds = vehicles.filter(v => v.type === 'ELECTRIC_VAN' || v.type === 'CARGO_EBIKE').map(v => v.id);
    setSelectedVehicleIds(electricIds);
  };

  const handleSelectAllVehicles = () => {
    setSelectedVehicleIds(vehicles.map(v => v.id));
  };

  // Run Route Optimization AI
  const handleExecuteOptimization = () => {
    if (selectedVehicleIds.length === 0) {
      setToastMessage('Please select at least 1 fleet vehicle to optimize.');
      return;
    }

    setIsOptimizing(true);
    setOptimizationStatusText('Analyzing real-time corridor congestion & road speed impedance...');

    setTimeout(() => {
      setOptimizationStatusText('Evaluating vehicle powertrain torque curves & payload mass friction...');
    }, 600);

    setTimeout(() => {
      setOptimizationStatusText('Sequencing delivery stops to eliminate hill climbs and left-turn delays...');
    }, 1200);

    setTimeout(() => {
      const selectedFleet = vehicles.filter(v => selectedVehicleIds.includes(v.id));
      const plan = routeOptimizationAiService.generateFuelOptimizedPlan(
        selectedFleet,
        dispatchableParcels,
        {
          trafficBias,
          payloadStrategy,
          prioritizeSameDaySla
        }
      );

      setCurrentPlan(plan);
      setSelectedPreviewVehicleId(plan.vehicleRoutes[0]?.vehicleId || null);
      setIsOptimizing(false);
      setOptimizationStatusText(null);
      setToastMessage(`✓ AI Route Optimization completed! Generated fuel-efficient sequences for ${plan.selectedVehicleCount} vehicles.`);
      setTimeout(() => setToastMessage(null), 5000);
    }, 1800);
  };

  // Dispatch and commit routes to fleet
  const handleCommitAndDispatch = () => {
    if (!currentPlan) return;
    const success = routeOptimizationAiService.commitAndDispatchPlan(currentPlan);
    if (success) {
      setToastMessage(`✓ Fleet Dispatched: ${currentPlan.totalParcelsCount} parcels assigned across ${currentPlan.selectedVehicleCount} vehicles.`);
      if (onPreviewPlanOnMap) {
        onPreviewPlanOnMap(currentPlan);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  // Preview on Map
  const handlePreviewOnMap = () => {
    if (!currentPlan) return;
    if (onPreviewPlanOnMap) {
      onPreviewPlanOnMap(currentPlan);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-6 my-8 max-h-[92vh] flex flex-col">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-indigo-400 hover:text-indigo-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                INTELLIGENT FLEET SEQUENCING · TRAFFIC & PAYLOAD IMPEDANCE ENGINE
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI OPTIMIZER ACTIVE
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>Route Optimization AI: Fuel-Efficient Multi-Vehicle Dispatcher</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select available fleet vehicles to automatically calculate optimal delivery sequences that minimize fuel burn, avoid traffic corridors, and drop heavy parcels first.
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="space-y-6 overflow-y-auto pr-1 flex-1">
          {/* Step 1: Fleet Vehicle Multi-Selector */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                  Step 1: Select Fleet Vehicles for Optimization Run ({selectedVehicleIds.length} Selected)
                </span>
                <p className="text-[11px] text-slate-400">
                  Select available electric vans, sprinters, and heavy haul units to mobilize.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllElectric}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium transition-colors"
                >
                  ⚡ All EV Vans
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllVehicles}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Select All ({vehicles.length})
                </button>
              </div>
            </div>

            {/* Vehicle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {vehicles.map((veh) => {
                const isSelected = selectedVehicleIds.includes(veh.id);
                const isElectric = veh.type === 'ELECTRIC_VAN' || veh.type === 'CARGO_EBIKE';

                return (
                  <div
                    key={veh.id}
                    onClick={() => handleToggleVehicle(veh.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 select-none ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-mono font-bold text-slate-100 text-sm">
                          {veh.vehicleNumber}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isElectric 
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {veh.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Driver: <strong className="text-slate-200">{veh.driverName || 'Courier'}</strong></span>
                      <span className="font-mono text-slate-300">{veh.capacityKg} kg cap</span>
                    </div>

                    {/* Battery / Fuel & Efficiency Rating */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Fuel className="w-3 h-3 text-amber-400" />
                          <span>Energy Level:</span>
                        </span>
                        <span className="text-slate-200 font-bold">{veh.batteryOrFuelPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            veh.batteryOrFuelPct < 25 ? 'bg-rose-500' : veh.batteryOrFuelPct < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${veh.batteryOrFuelPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Optimization Parameters & Heuristic Tuning */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                Step 2: AI Sequencing Parameters & Traffic Bias
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Parameter 1: Traffic Bias */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Real-Time Traffic Bias:</label>
                <select
                  value={trafficBias}
                  onChange={(e) => setTrafficBias(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="AVOID_CONGESTION">Avoid Congested Corridors (Max Speed)</option>
                  <option value="BALANCED">Balanced Flow & Distance</option>
                  <option value="SHORTEST_DISTANCE">Shortest Highway Mileage</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Dynamically shifts corridors away from I-880/US-101 traffic jams.
                </p>
              </div>

              {/* Parameter 2: Payload Strategy */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Parcel Weight Strategy:</label>
                <select
                  value={payloadStrategy}
                  onChange={(e) => setPayloadStrategy(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="HEAVY_DROPOFF_FIRST">Heavy Packages First (Min Ton-Km)</option>
                  <option value="CLUSTER_DENSITY">Geographic Cluster Proximity</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Dropping heaviest freight early reduces moving vehicle kinetic mass.
                </p>
              </div>

              {/* Parameter 3: Priority SLA */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Service Tier Compliance:</label>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="slaCheck"
                    checked={prioritizeSameDaySla}
                    onChange={(e) => setPrioritizeSameDaySla(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="slaCheck" className="text-slate-200 cursor-pointer text-xs">
                    Prioritize Same-Day Priority SLA Stops
                  </label>
                </div>
                <p className="text-[10px] text-slate-500">
                  Guarantees urgent medical/perishable handovers arrive before cutoff.
                </p>
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleExecuteOptimization}
                disabled={isOptimizing || selectedVehicleIds.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 transition-all disabled:opacity-50"
              >
                {isOptimizing ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isOptimizing ? 'Calculating Optimal Sequences...' : 'Run Route Optimization AI'}</span>
              </button>
            </div>

            {isOptimizing && optimizationStatusText && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono animate-pulse flex items-center gap-2">
                <Cpu className="w-4 h-4 animate-spin text-indigo-400" />
                <span>{optimizationStatusText}</span>
              </div>
            )}
          </div>

          {/* Step 3: Generated Fuel-Optimized Results Dashboard */}
          {currentPlan && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>AI Route Optimization Results & Efficiency Benchmarks</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Calculated optimal sequences across {currentPlan.selectedVehicleCount} vehicles for {currentPlan.totalParcelsCount} parcels ({currentPlan.totalWeightKg.toLocaleString()} kg).
                  </p>
                </div>
              </div>

              {/* Savings Metric KPI Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* KPI 1: Fuel Saved */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Fuel / Energy Saved</span>
                    <Fuel className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-emerald-400">
                      {currentPlan.totalFuelSavedLiters} L
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      +{currentPlan.totalKwhConserved} kWh
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    -26% fuel burn vs random sequencing
                  </p>
                </div>

                {/* KPI 2: CO2 Avoided */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Carbon Avoidance</span>
                    <Leaf className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-emerald-400">
                      {currentPlan.totalCo2SavedKg} kg
                    </span>
                    <span className="text-xs text-slate-400 font-mono">CO₂</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Eliminated moving deadweight emissions
                  </p>
                </div>

                {/* KPI 3: Distance & Time */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Mileage & Duration</span>
                    <Clock className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-slate-100">
                      {currentPlan.totalDistanceKm} km
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ~{Math.round(currentPlan.totalDurationMin / 60)}h {currentPlan.totalDurationMin % 60}m
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Across {currentPlan.selectedVehicleCount} vehicle routes
                  </p>
                </div>

                {/* KPI 4: Fuel Efficiency Score */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>AI Efficiency Rating</span>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-indigo-400">
                      {currentPlan.overallFuelEfficiencyScore}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">/ 100</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    94% congested corridor avoidance
                  </p>
                </div>
              </div>

              {/* Vehicle Route Sequence Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto text-xs font-semibold">
                {currentPlan.vehicleRoutes.map((route) => {
                  const isSelected = selectedPreviewVehicleId === route.vehicleId;
                  return (
                    <button
                      key={route.vehicleId}
                      onClick={() => setSelectedPreviewVehicleId(route.vehicleId)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                        isSelected
                          ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: route.color }} />
                      <span>{route.vehicleNumber}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({route.totalStops} stops)</span>
                    </button>
                  );
                })}
              </div>

              {/* Detailed Stop-by-Stop Itinerary for Selected Vehicle */}
              {selectedPreviewVehicleId && (() => {
                const route = currentPlan.vehicleRoutes.find(r => r.vehicleId === selectedPreviewVehicleId);
                if (!route) return null;

                return (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" style={{ color: route.color }} />
                        <span className="font-bold text-slate-100 font-mono text-sm">{route.vehicleNumber}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-300 font-medium">{route.driverName}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400 font-mono">{route.totalDistanceKm} km · {route.totalDurationMin} mins · {route.fuelConsumedAmount} {route.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {route.fuelEfficiencyScore}/100 ECO SCORE
                      </span>
                    </div>

                    {/* Sequence Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                            <th className="py-2 px-2.5">Stop</th>
                            <th className="py-2 px-2.5">Tracking / SLA</th>
                            <th className="py-2 px-2.5">Recipient & Address</th>
                            <th className="py-2 px-2.5">Drop Weight</th>
                            <th className="py-2 px-2.5">Remaining Load</th>
                            <th className="py-2 px-2.5">Corridor Traffic</th>
                            <th className="py-2 px-2.5 text-right">ETA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 font-mono">
                          {route.stops.map((stop) => (
                            <tr key={stop.parcelId} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-2.5 px-2.5">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-xs" style={{ backgroundColor: `${route.color}25`, color: route.color, border: `1px solid ${route.color}50` }}>
                                  #{stop.sequenceNumber}
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5">
                                <div className="font-bold text-slate-200">{stop.trackingNumber}</div>
                                <div className="text-[10px] font-sans text-indigo-400">{stop.serviceTier.replace(/_/g, ' ')}</div>
                              </td>
                              <td className="py-2.5 px-2.5 font-sans">
                                <div className="font-semibold text-slate-200">{stop.recipientName}</div>
                                <div className="text-[11px] text-slate-400">{stop.street}, {stop.city}</div>
                              </td>
                              <td className="py-2.5 px-2.5 text-slate-300">
                                {stop.weightKg} kg
                              </td>
                              <td className="py-2.5 px-2.5 text-slate-400">
                                {stop.remainingPayloadKg} kg
                              </td>
                              <td className="py-2.5 px-2.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  stop.trafficCondition === 'FREE_FLOW' 
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                }`}>
                                  {stop.trafficCondition.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-bold text-indigo-300">
                                {stop.estimatedArrivalClock} (+{stop.etaMinutes}m)
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {currentPlan && (
              <>
                <button
                  onClick={handlePreviewOnMap}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-colors shadow-sm"
                  title="Visualize fuel-optimized delivery sequences and traffic lines on the LogisticsMap"
                >
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span>Preview on LogisticsMap</span>
                </button>

                <button
                  onClick={handleCommitAndDispatch}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Apply & Dispatch AI Routes</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
