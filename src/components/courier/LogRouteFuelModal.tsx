import React, { useState, useMemo } from 'react';
import { 
  X, 
  Fuel, 
  Zap, 
  Leaf, 
  Gauge, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Vehicle, RouteFuelLogEntry } from '../../types';
import { CURRENT_SPOT_PRICES } from '../../services/fuelConsumptionService';
import { storage } from '../../services/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  assignedVehicleId?: string;
  courierId: string;
  courierName: string;
  onLogSaved: (entry: RouteFuelLogEntry) => void;
}

export const LogRouteFuelModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vehicles,
  assignedVehicleId,
  courierId,
  courierName,
  onLogSaved,
}) => {
  const currentTenantId = storage.getActiveTenantId();

  // Find initial default vehicle
  const defaultVehicle = useMemo(() => {
    if (assignedVehicleId) {
      const match = vehicles.find((v) => v.id === assignedVehicleId);
      if (match) return match;
    }
    const courierVeh = vehicles.find((v) => v.driverId === courierId);
    return courierVeh || vehicles[0] || null;
  }, [vehicles, assignedVehicleId, courierId]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    defaultVehicle?.id || 'veh-ev-101'
  );

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || defaultVehicle;
  }, [vehicles, selectedVehicleId, defaultVehicle]);

  const fuelType: 'ELECTRIC' | 'DIESEL' | 'UNLEADED' =
    selectedVehicle?.fuelType ||
    (selectedVehicle?.type === 'ELECTRIC_VAN' || selectedVehicle?.type === 'CARGO_EBIKE'
      ? 'ELECTRIC'
      : 'DIESEL');

  const fuelUnit: 'L' | 'kWh' = fuelType === 'ELECTRIC' ? 'kWh' : 'L';

  // Target baseline benchmark for this vehicle
  const targetEfficiency = useMemo(() => {
    if (selectedVehicle?.avgConsumptionPer100Km) {
      return selectedVehicle.avgConsumptionPer100Km;
    }
    if (fuelType === 'ELECTRIC') {
      return selectedVehicle?.type === 'CARGO_EBIKE' ? 1.4 : 28.5;
    }
    if (fuelType === 'DIESEL') {
      return selectedVehicle?.type === 'HEAVY_HAUL' ? 33.5 : 11.2;
    }
    return 12.0;
  }, [selectedVehicle, fuelType]);

  // Form states
  const [routeName, setRouteName] = useState('San Francisco Waterfront & Downtown Run #403');
  const [routeCode, setRouteCode] = useState('RUN-403');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [distanceKm, setDistanceKm] = useState<number>(142.5);
  const [fuelConsumed, setFuelConsumed] = useState<number>(37.2);
  const [stopsCount, setStopsCount] = useState<number>(22);
  const [trafficConditions, setTrafficConditions] = useState<'LIGHT' | 'MODERATE' | 'CONGESTED'>('MODERATE');
  const [notes, setNotes] = useState('Steady regenerative braking along Embarcadero corridor with smooth throttle inputs.');

  // Live calculated metrics
  const liveCalculations = useMemo(() => {
    const dist = Math.max(0.1, Number(distanceKm) || 0.1);
    const consumed = Math.max(0.1, Number(fuelConsumed) || 0.1);
    const efficiency = +((consumed / dist) * 100).toFixed(2); // L/100km or kWh/100km
    
    // Efficiency delta percentage: ((actual - target) / target) * 100
    // Negative means better than target
    const deltaPct = +(((efficiency - targetEfficiency) / targetEfficiency) * 100).toFixed(1);

    // Fuel cost calculation
    let unitPrice = CURRENT_SPOT_PRICES.electricityPerKWh;
    if (fuelType === 'DIESEL') unitPrice = CURRENT_SPOT_PRICES.dieselPerLiter;
    else if (fuelType === 'UNLEADED') unitPrice = CURRENT_SPOT_PRICES.unleadedPerLiter;

    const fuelCostUsd = +(consumed * unitPrice).toFixed(2);
    const costPerKmUsd = +(fuelCostUsd / dist).toFixed(3);

    // CO2 emissions
    let co2Factor = 0.14; // kg/kWh
    if (fuelType === 'DIESEL') co2Factor = 2.68;
    else if (fuelType === 'UNLEADED') co2Factor = 2.31;
    const co2EmissionsKg = +(consumed * co2Factor).toFixed(1);

    // Eco-score estimate (0-100)
    let baseScore = 90;
    if (deltaPct <= -10) baseScore = 97;
    else if (deltaPct <= -5) baseScore = 94;
    else if (deltaPct <= 0) baseScore = 91;
    else if (deltaPct <= 5) baseScore = 86;
    else if (deltaPct <= 10) baseScore = 80;
    else baseScore = 74;

    if (trafficConditions === 'CONGESTED') baseScore = Math.min(100, baseScore + 2); // Traffic cushion
    if (trafficConditions === 'LIGHT' && deltaPct > 5) baseScore -= 4;

    const ecoScore = Math.max(50, Math.min(100, baseScore));

    return {
      efficiency,
      deltaPct,
      fuelCostUsd,
      costPerKmUsd,
      co2EmissionsKg,
      ecoScore,
    };
  }, [distanceKm, fuelConsumed, targetEfficiency, fuelType, trafficConditions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim() || distanceKm <= 0 || fuelConsumed <= 0) return;

    // Format display date: e.g. "Oct 15"
    const parsedDate = new Date(dateStr + 'T12:00:00Z');
    const displayDate = parsedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

    const newLog = storage.addRouteFuelLog({
      tenantId: currentTenantId,
      courierId,
      courierName,
      vehicleId: selectedVehicle?.id || 'veh-ev-101',
      vehicleNumber: selectedVehicle?.vehicleNumber || 'APX-EV-101',
      vehicleType: selectedVehicle?.type || 'ELECTRIC_VAN',
      fuelType,
      routeName,
      routeCode: routeCode.toUpperCase(),
      date: dateStr,
      displayDate,
      distanceKm: Number(distanceKm),
      fuelConsumed: Number(fuelConsumed),
      fuelUnit,
      efficiency: liveCalculations.efficiency,
      targetEfficiency,
      efficiencyDeltaPct: liveCalculations.deltaPct,
      fuelCostUsd: liveCalculations.fuelCostUsd,
      costPerKmUsd: liveCalculations.costPerKmUsd,
      co2EmissionsKg: liveCalculations.co2EmissionsKg,
      stopsCount: Number(stopsCount) || 1,
      trafficConditions,
      ecoScore: liveCalculations.ecoScore,
      notes: notes.trim() || undefined,
    });

    onLogSaved(newLog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {fuelType === 'ELECTRIC' ? <Zap className="w-5 h-5 text-amber-400" /> : <Fuel className="w-5 h-5 text-indigo-400" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Log Route Fuel & Energy Consumption</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  {fuelType} ({fuelUnit})
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Record actual odometer mileage and fuel consumed to track route efficiency trends.
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Vehicle & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Assigned Vehicle
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} ({v.type.replace(/_/g, ' ')}) · {v.fuelType || 'ELECTRIC'}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Target Benchmark: <strong className="text-slate-300 font-mono">{targetEfficiency} {fuelUnit}/100km</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Route Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Route Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Route Name / Corridor
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g. San Francisco Financial District Core"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Route Code
              </label>
              <input
                type="text"
                value={routeCode}
                onChange={(e) => setRouteCode(e.target.value)}
                placeholder="e.g. RUN-403"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                required
              />
            </div>
          </div>

          {/* Core Telemetry Input Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Distance (km)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="1000"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Fuel Consumed ({fuelUnit})
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="500"
                value={fuelConsumed}
                onChange={(e) => setFuelConsumed(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg text-amber-400 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Completed Stops
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={stopsCount}
                onChange={(e) => setStopsCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Traffic Flow
              </label>
              <select
                value={trafficConditions}
                onChange={(e) => setTrafficConditions(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="LIGHT">Light Traffic</option>
                <option value="MODERATE">Moderate Traffic</option>
                <option value="CONGESTED">Heavy Congestion</option>
              </select>
            </div>
          </div>

          {/* Real-time Dynamic Calculation Preview Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                <span>Instant Route Performance Computed</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                Eco-Score: <strong className="text-emerald-400">{liveCalculations.ecoScore} / 100</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">Calculated Rate</span>
                <div className="text-base font-bold font-mono text-slate-100">
                  {liveCalculations.efficiency} <span className="text-xs text-slate-400 font-normal">{fuelUnit}/100km</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                  {liveCalculations.deltaPct <= 0 ? (
                    <span className="text-emerald-400 flex items-center font-mono">
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                      {Math.abs(liveCalculations.deltaPct)}% better
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center font-mono">
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                      +{liveCalculations.deltaPct}% higher
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">Estimated Cost</span>
                <div className="text-base font-bold font-mono text-emerald-400">
                  ${liveCalculations.fuelCostUsd}
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  ${liveCalculations.costPerKmUsd} / km
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">CO₂ Footprint</span>
                <div className="text-base font-bold font-mono text-slate-100">
                  {liveCalculations.co2EmissionsKg} <span className="text-xs text-slate-400 font-normal">kg</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {fuelType === 'ELECTRIC' ? 'Zero direct tailpipe' : 'Combustion emissions'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">Benchmark Target</span>
                <div className="text-base font-bold font-mono text-indigo-300">
                  {targetEfficiency} <span className="text-xs text-slate-400 font-normal">{fuelUnit}/100km</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Fleet standard
                </span>
              </div>
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Driver Remarks & Terrain Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Hill grade climbs, AC usage, traffic detours, weather conditions..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.01]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Route Fuel Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
