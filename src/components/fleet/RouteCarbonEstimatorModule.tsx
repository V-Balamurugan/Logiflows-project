import React, { useState, useMemo } from 'react';
import { 
  Leaf, 
  Fuel, 
  Zap, 
  Truck, 
  TrendingDown, 
  TrendingUp, 
  Sliders, 
  MapPin, 
  Clock, 
  Weight, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  Sparkles, 
  RotateCcw, 
  ArrowRight, 
  RefreshCw,
  Sun,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  routeCarbonEstimationService, 
  ScheduledRoute, 
  RouteCarbonImpact,
  TerrainProfile,
  TrafficProfile
} from '../../services/routeCarbonEstimationService';
import { storage } from '../../services/storage';
import { Vehicle } from '../../types';

interface Props {
  vehicles: Vehicle[];
}

export const RouteCarbonEstimatorModule: React.FC<Props> = ({ vehicles }) => {
  const [routesState, setRoutesState] = useState<ScheduledRoute[]>(() => 
    routeCarbonEstimationService.getScheduledRoutes()
  );

  const [activeTab, setActiveTab] = useState<'SCHEDULED_ROUTES' | 'CARBON_SIMULATOR'>('SCHEDULED_ROUTES');
  const [filterType, setFilterType] = useState<'ALL' | 'ELECTRIC' | 'COMBUSTION'>('ALL');
  const [sortBy, setSortBy] = useState<'CO2_DESC' | 'CO2_ASC' | 'SAVINGS_DESC' | 'DISTANCE_DESC'>('CO2_DESC');
  const [showChart, setShowChart] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // --- What-If Carbon Simulator State ---
  const [simDistance, setSimDistance] = useState<number>(65);
  const [simPayload, setSimPayload] = useState<number>(450);
  const [simStops, setSimStops] = useState<number>(18);
  const [simVehicleId, setSimVehicleId] = useState<string>(vehicles[0]?.id || 'veh-ev-101');
  const [simTerrain, setSimTerrain] = useState<TerrainProfile>('ROLLING_URBAN');
  const [simTraffic, setSimTraffic] = useState<TrafficProfile>('MODERATE');
  const [simPowerSource, setSimPowerSource] = useState<'CA_STANDARD_GRID' | '100_PCT_SOLAR_RENEWABLE'>('CA_STANDARD_GRID');

  // Compute impacts for all scheduled routes
  const { impacts, summary } = useMemo(() => {
    return routeCarbonEstimationService.calculateAllScheduledRoutesImpact();
  }, [routesState]);

  // Filter & sort impacts
  const filteredImpacts = useMemo(() => {
    let list = impacts;
    if (filterType === 'ELECTRIC') {
      list = list.filter(i => i.fuelUnit === 'kWh');
    } else if (filterType === 'COMBUSTION') {
      list = list.filter(i => i.fuelUnit === 'L');
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'CO2_DESC') return b.projectedCO2Kg - a.projectedCO2Kg;
      if (sortBy === 'CO2_ASC') return a.projectedCO2Kg - b.projectedCO2Kg;
      if (sortBy === 'SAVINGS_DESC') return b.carbonSavingsKg - a.carbonSavingsKg;
      if (sortBy === 'DISTANCE_DESC') return b.route.totalDistanceKm - a.route.totalDistanceKm;
      return 0;
    });
  }, [impacts, filterType, sortBy]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredImpacts.map(i => ({
      name: i.route.routeCode,
      fullName: i.route.name,
      projectedCO2: i.projectedCO2Kg,
      baselineCO2: i.baselineDieselCO2Kg,
      vehicle: i.route.assignedVehicleNumber,
      savedCO2: i.carbonSavingsKg
    }));
  }, [filteredImpacts]);

  // Calculate Simulator Output
  const simulatorImpact = useMemo(() => {
    const selectedVeh = vehicles.find(v => v.id === simVehicleId) || vehicles[0];
    const syntheticRoute: ScheduledRoute = {
      id: 'sim-route',
      routeCode: 'SIM-RUN',
      name: 'Custom Simulated Route Itinerary',
      originHubName: 'Central Logistics Hub',
      originHubCode: 'HUB-SIM',
      destinationZone: 'Dynamic Destination Sector',
      scheduledDeparture: '09:00 AM',
      estimatedArrival: '11:30 AM',
      totalDistanceKm: simDistance,
      cargoPayloadKg: simPayload,
      stopsCount: simStops,
      assignedVehicleId: selectedVeh.id,
      assignedVehicleNumber: selectedVeh.vehicleNumber,
      assignedVehicleType: selectedVeh.type,
      fuelType: (selectedVeh.type === 'ELECTRIC_VAN' || selectedVeh.type === 'CARGO_EBIKE') ? 'ELECTRIC' : (selectedVeh.fuelType || 'DIESEL'),
      driverName: selectedVeh.driverName || 'Designated Courier',
      terrainProfile: simTerrain,
      trafficProfile: simTraffic,
      status: 'SCHEDULED'
    };

    return routeCarbonEstimationService.calculateRouteImpact(syntheticRoute, selectedVeh, simPowerSource);
  }, [simDistance, simPayload, simStops, simVehicleId, simTerrain, simTraffic, simPowerSource, vehicles]);

  // Handle vehicle reassignments
  const handleSwapToEco = (routeId: string, suggestedVehicleId: string) => {
    const updated = routeCarbonEstimationService.reassignRouteVehicle(routeId, suggestedVehicleId);
    if (updated) {
      setRoutesState([...routeCarbonEstimationService.getScheduledRoutes()]);
      setActionNotice(`Route ${updated.routeCode} reassigned to ${updated.assignedVehicleNumber} (${updated.assignedVehicleType}). Reduced CO₂ footprint applied.`);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-0.5">
            GREEN LOGISTICS & ENVIRONMENTAL IMPACT · ROUTE CARBON EMISSIONS ESTIMATOR
          </span>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <span>Scheduled Route Fuel Efficiency & CO₂ Impact Estimator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Calculates fuel burn, greenhouse emissions, and carbon savings based on vehicle powertrain, payload weight, topography, and traffic.
          </p>
        </div>

        {/* View Switcher: Scheduled vs Simulator */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('SCHEDULED_ROUTES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'SCHEDULED_ROUTES'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Scheduled Routes ({routesState.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CARBON_SIMULATOR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'CARBON_SIMULATOR'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>What-If Route Simulator</span>
          </button>
        </div>
      </div>

      {/* Fleet Environmental KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Projected CO2 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Scheduled Routes CO₂ Impact</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-100">
              {summary.totalProjectedCO2Kg}
            </span>
            <span className="text-xs text-slate-400 font-mono">kg CO₂</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Across {summary.totalDistanceKm} total route kilometers
          </p>
        </div>

        {/* KPI 2: Total Carbon Saved vs ICE */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Emissions Prevented vs Diesel</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-emerald-400">
              -{summary.totalCarbonSavedKg}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">kg CO₂ ({summary.overallFleetReductionPct}%)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${summary.overallFleetReductionPct}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Equivalent Trees Planted */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Annual Tree Offset Equiv.</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-amber-400">
              {summary.equivalentTreesPlanted}
            </span>
            <span className="text-xs text-slate-400 font-sans">mature trees/yr</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Based on EPA standard 21.77 kg CO₂/tree absorption
          </p>
        </div>

        {/* KPI 4: Fleet Energy & Fuel Cost */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Projected Fuel & Energy Cost</span>
            <Fuel className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-100">
              ${summary.totalFuelCostUsd.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">USD</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {summary.electricRoutesCount} EV routes · {summary.combustionRoutesCount} combustion routes
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW A: Scheduled Routes Carbon Estimator & Optimization Cards */}
      {/* ============================================================== */}
      {activeTab === 'SCHEDULED_ROUTES' && (
        <div className="space-y-6">
          {/* Chart Toggle & Controls */}
          {showChart && (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span>Scheduled Routes CO₂ Impact vs Legacy Diesel Baseline</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comparison showing actual projected emissions (green) against traditional diesel cargo van benchmarks (slate).
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-slate-300">Projected CO₂ (kg)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-slate-700" />
                    <span className="text-slate-300">Legacy Diesel Baseline (kg)</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155', 
                        borderRadius: '0.75rem', 
                        fontSize: '12px' 
                      }}
                      formatter={(val: any, name: any) => {
                        if (name === 'projectedCO2') return [`${val} kg CO₂`, 'Projected Emissions'];
                        if (name === 'baselineCO2') return [`${val} kg CO₂`, 'Legacy Diesel Baseline'];
                        return [val, name];
                      }}
                      labelFormatter={(name) => {
                        const match = chartData.find(c => c.name === name);
                        return match ? `${match.fullName} (${match.vehicle})` : name;
                      }}
                    />
                    <Bar dataKey="projectedCO2" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    <Bar dataKey="baselineCO2" fill="#475569" radius={[4, 4, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Filter & Sorting Segmented Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Filter Powertrain:</span>
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg">
                {[
                  { id: 'ALL', label: 'All Scheduled Routes' },
                  { id: 'ELECTRIC', label: 'Electric Only' },
                  { id: 'COMBUSTION', label: 'Combustion Only' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id as any)}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      filterType === tab.id
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="CO2_DESC">Highest CO₂ Footprint First</option>
                <option value="CO2_ASC">Lowest CO₂ Footprint First</option>
                <option value="SAVINGS_DESC">Most Carbon Saved vs Diesel</option>
                <option value="DISTANCE_DESC">Longest Distance (km)</option>
              </select>
            </div>
          </div>

          {/* Scheduled Routes Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredImpacts.map((impact) => {
              const { route, projectedCO2Kg, baselineDieselCO2Kg, carbonSavingsKg, carbonSavingsPct, carbonPerStopKg, estimatedFuelOrEnergyBurn, fuelUnit, consumptionRatePer100Km, projectedFuelCostUsd, ecoGrade, recommendedEcoAlternative } = impact;
              const isElectric = fuelUnit === 'kWh';

              return (
                <div 
                  key={route.id}
                  className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-100">
                          {route.routeCode}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-300 font-semibold truncate max-w-[220px]">
                          {route.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {route.originHubName} → {route.destinationZone}
                      </p>
                    </div>

                    {/* Eco Grade Badge */}
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                        ecoGrade === 'A+' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40' :
                        ecoGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        ecoGrade === 'B' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        ecoGrade === 'C' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        ECO GRADE {ecoGrade}
                      </span>
                    </div>
                  </div>

                  {/* Route Specs Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1 pb-1">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-bold text-slate-200">{route.assignedVehicleNumber}</span>
                      <span className="text-slate-500">({route.assignedVehicleType.replace(/_/g, ' ')})</span>
                    </span>
                    <span>·</span>
                    <span className="font-mono">{route.totalDistanceKm} km</span>
                    <span>·</span>
                    <span className="font-mono">{route.stopsCount} stops</span>
                    <span>·</span>
                    <span className="font-mono">{route.cargoPayloadKg} kg payload</span>
                  </div>

                  {/* Carbon & Energy Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Projected CO₂</span>
                      <span className="font-mono text-base font-bold text-slate-100">{projectedCO2Kg} kg</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{carbonPerStopKg} kg/stop</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Carbon Savings</span>
                      <span className="font-mono text-base font-bold text-emerald-400">-{carbonSavingsKg} kg</span>
                      <span className="text-[10px] text-emerald-400 block font-mono">-{carbonSavingsPct}% vs diesel</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Energy Burn</span>
                      <span className="font-mono text-base font-bold text-slate-100">{estimatedFuelOrEnergyBurn} {fuelUnit}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{consumptionRatePer100Km} {fuelUnit}/100km</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Fuel Cost</span>
                      <span className="font-mono text-base font-bold text-slate-100">${projectedFuelCostUsd}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">est. spot basis</span>
                    </div>
                  </div>

                  {/* Proactive Eco-Optimization Recommendation */}
                  {recommendedEcoAlternative && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <Leaf className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-emerald-300 block">
                              Eco-Optimization Opportunity Detected
                            </span>
                            <p className="text-[11px] text-emerald-200/90 leading-relaxed mt-0.5">
                              {recommendedEcoAlternative.recommendationReason}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSwapToEco(route.id, recommendedEcoAlternative.suggestedVehicleId)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-colors"
                        >
                          Swap to {recommendedEcoAlternative.suggestedVehicleNumber}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW B: What-If Route Carbon Simulator & Parametric Calculator */}
      {/* ============================================================== */}
      {activeTab === 'CARBON_SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Parameter Inputs & Sliders */}
          <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Parametric Route Simulation Controls</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust route distance, loaded cargo weight, and vehicle hardware to project emissions in real-time.
              </p>
            </div>

            {/* Vehicle Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold block">Select Vehicle Powertrain</label>
              <select
                value={simVehicleId}
                onChange={(e) => setSimVehicleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} ({v.type.replace(/_/g, ' ')}) · {v.fuelType || 'DIESEL'}
                  </option>
                ))}
              </select>
            </div>

            {/* Slider 1: Distance */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Route Distance:</span>
                <span className="font-mono font-bold text-indigo-400">{simDistance} km</span>
              </div>
              <input 
                type="range"
                min="10"
                max="300"
                step="5"
                value={simDistance}
                onChange={(e) => setSimDistance(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Slider 2: Cargo Payload */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Loaded Cargo Mass:</span>
                <span className="font-mono font-bold text-amber-400">{simPayload} kg</span>
              </div>
              <input 
                type="range"
                min="20"
                max="3500"
                step="20"
                value={simPayload}
                onChange={(e) => setSimPayload(Number(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Slider 3: Stops Count */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Planned Delivery Stops:</span>
                <span className="font-mono font-bold text-blue-400">{simStops} stops</span>
              </div>
              <input 
                type="range"
                min="2"
                max="45"
                value={simStops}
                onChange={(e) => setSimStops(Number(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            {/* Terrain Profile */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-300 font-semibold block">Route Topography Grade</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'FLAT_HIGHWAY', label: 'Flat Highway' },
                  { id: 'ROLLING_URBAN', label: 'Rolling Urban' },
                  { id: 'STEEP_HILLS', label: 'Steep Hills' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSimTerrain(t.id as TerrainProfile)}
                    className={`py-2 px-1 text-[11px] rounded-lg text-center transition-colors font-medium ${
                      simTerrain === t.id
                        ? 'bg-slate-700 text-white font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Traffic Profile */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-300 font-semibold block">Corridor Traffic Pattern</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'LIGHT', label: 'Light / Off-Peak' },
                  { id: 'MODERATE', label: 'Moderate' },
                  { id: 'CONGESTED', label: 'Heavy Traffic' }
                ].map(tr => (
                  <button
                    key={tr.id}
                    onClick={() => setSimTraffic(tr.id as TrafficProfile)}
                    className={`py-2 px-1 text-[11px] rounded-lg text-center transition-colors font-medium ${
                      simTraffic === tr.id
                        ? 'bg-slate-700 text-white font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Power Source */}
            <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800">
              <span className="text-slate-300 font-semibold block">EV Charging Electricity Source</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSimPowerSource('CA_STANDARD_GRID')}
                  className={`p-2.5 rounded-lg text-left text-[11px] border transition-colors ${
                    simPowerSource === 'CA_STANDARD_GRID'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-bold block">CA Standard Grid</span>
                  <span className="text-[10px] opacity-80">0.14 kg CO₂/kWh</span>
                </button>

                <button
                  onClick={() => setSimPowerSource('100_PCT_SOLAR_RENEWABLE')}
                  className={`p-2.5 rounded-lg text-left text-[11px] border transition-colors ${
                    simPowerSource === '100_PCT_SOLAR_RENEWABLE'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-bold block flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>100% Solar Off-Peak</span>
                  </span>
                  <span className="text-[10px] opacity-80">0.03 kg CO₂/kWh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Projected Output */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                    SIMULATION OUTPUT TELEMETRY
                  </span>
                  <h3 className="text-lg font-bold text-slate-100">
                    Projected Carbon & Fuel Impact Results
                  </h3>
                </div>

                <span className={`px-3 py-1 rounded-lg font-mono font-black text-xs ${
                  simulatorImpact.ecoGrade === 'A+' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40' :
                  simulatorImpact.ecoGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  simulatorImpact.ecoGrade === 'B' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  ECO GRADE {simulatorImpact.ecoGrade}
                </span>
              </div>

              {/* Big Metrics Display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">Estimated CO₂ Emitted</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-mono font-bold text-slate-100">
                      {simulatorImpact.projectedCO2Kg}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">kg CO₂</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono block">
                    {simulatorImpact.carbonPerStopKg} kg per stop
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">Carbon Avoided vs Diesel</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-mono font-bold text-emerald-400">
                      -{simulatorImpact.carbonSavingsKg}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono">kg</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono block">
                    {simulatorImpact.carbonSavingsPct}% carbon reduction
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">Projected Energy Expense</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-mono font-bold text-slate-100">
                      ${simulatorImpact.projectedFuelCostUsd}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">USD</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono block">
                    {simulatorImpact.estimatedFuelOrEnergyBurn} {simulatorImpact.fuelUnit} total
                  </span>
                </div>
              </div>

              {/* Visual Comparison Progress Bar */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-semibold">Emissions Comparison vs Baseline:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {simulatorImpact.projectedCO2Kg} kg vs {simulatorImpact.baselineDieselCO2Kg} kg baseline
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, (simulatorImpact.projectedCO2Kg / simulatorImpact.baselineDieselCO2Kg) * 100)}%` }}
                  />
                  <div 
                    className="h-full bg-emerald-950 transition-all opacity-50"
                    style={{ width: `${Math.max(0, 100 - (simulatorImpact.projectedCO2Kg / simulatorImpact.baselineDieselCO2Kg) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Simulated Vehicle Emissions</span>
                  <span>Avoided Carbon Emissions ({simulatorImpact.carbonSavingsPct}%)</span>
                </div>
              </div>

              {/* Environmental Offset Translation */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-2">
                <span className="text-emerald-400 font-bold block flex items-center gap-1.5">
                  <Leaf className="w-4 h-4" />
                  <span>Annual Carbon Offset Equivalence</span>
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Running this scheduled route on the selected vehicle prevents{' '}
                  <strong className="text-emerald-300 font-mono">{simulatorImpact.carbonSavingsKg} kg of atmospheric CO₂</strong>{' '}
                  from being released, equivalent to planting{' '}
                  <strong className="text-emerald-300 font-mono">{simulatorImpact.treesEquivalentAnnual} mature urban trees</strong>{' '}
                  absorbing carbon over an entire year.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
