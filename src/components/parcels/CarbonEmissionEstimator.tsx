import React, { useState, useMemo } from 'react';
import { 
  Leaf, 
  Truck, 
  Zap, 
  HelpCircle, 
  Sliders, 
  Flame, 
  RotateCcw, 
  CheckCircle2, 
  TreeDeciduous, 
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Info
} from 'lucide-react';
import { Parcel, VehicleType, Vehicle } from '../../types';

interface Props {
  parcel: Parcel;
  vehicles?: Vehicle[];
}

export interface EmissionCalculationResult {
  vehicleType: VehicleType;
  vehicleLabel: string;
  fuelType: 'ELECTRIC' | 'DIESEL' | 'CLEAN_GRID';
  distanceKm: number;
  grossEmissionsKg: number;
  emissionsGrams: number;
  emissionsPerKgKmGrams: number; // intensity per parcel weight-km
  baselineDieselEmissionsKg: number;
  savingsVsDieselKg: number;
  savingsPercent: number;
  treeOffsetEquivalentMonths: number; // 1 urban tree absorbs ~21.77 kg CO2 / year (~1.81 kg / month)
  greenRating: 'A+' | 'A' | 'B' | 'C' | 'D';
  efficiencyTip: string;
}

// Vehicle emission factors (grams CO2 per vehicle-km based on EPA / GLEC framework)
const VEHICLE_EMISSION_FACTORS: Record<VehicleType, {
  name: string;
  description: string;
  gramsCo2PerKm: number;
  fuelType: 'ELECTRIC' | 'DIESEL' | 'CLEAN_GRID';
  iconType: 'electric' | 'van' | 'truck' | 'bike';
}> = {
  CARGO_EBIKE: {
    name: 'Cargo E-Bike',
    description: 'Zero direct tailpipe emissions, ultra-low battery cycle footprint',
    gramsCo2PerKm: 12, // 0.012 kg CO2 / km
    fuelType: 'CLEAN_GRID',
    iconType: 'bike',
  },
  ELECTRIC_VAN: {
    name: 'Electric Van (EV)',
    description: 'Renewable grid electric powertrain (e.g. BrightDrop / Rivian Delivery Van)',
    gramsCo2PerKm: 42, // 0.042 kg CO2 / km (based on CA clean energy grid mix)
    fuelType: 'ELECTRIC',
    iconType: 'electric',
  },
  SPRINTER_VAN: {
    name: 'Sprinter Cargo Van (Diesel)',
    description: 'Standard Euro 6 / EPA tier turbo-diesel commercial last-mile van',
    gramsCo2PerKm: 285, // 0.285 kg CO2 / km
    fuelType: 'DIESEL',
    iconType: 'van',
  },
  HEAVY_HAUL: {
    name: 'Heavy-Haul Freight Truck',
    description: 'Class 8 semi-truck for inter-facility line-haul freight consolidation',
    gramsCo2PerKm: 890, // 0.890 kg CO2 / km
    fuelType: 'DIESEL',
    iconType: 'truck',
  },
};

// Calculate geodesic haversine distance between 2 coordinates in km
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const CarbonEmissionEstimator: React.FC<Props> = ({ parcel, vehicles = [] }) => {
  // Infer initial vehicle type from parcel's assigned vehicle, or fallback to sensible default
  const assignedVehicle = vehicles.find((v) => v.id === parcel.assignedVehicleId);
  const initialVehicleType: VehicleType = assignedVehicle?.type || 'ELECTRIC_VAN';

  // Calculate default transit distance
  const defaultDistanceKm = useMemo(() => {
    // If delay risk assessment has transit distance computed
    if (parcel.delayRisk?.modelConfidenceFeatures?.transitDistanceKm) {
      return Math.round(parcel.delayRisk.modelConfidenceFeatures.transitDistanceKm * 10) / 10;
    }
    // If both sender and recipient coords exist
    if (
      parcel.sender?.lat &&
      parcel.sender?.lng &&
      parcel.recipient?.lat &&
      parcel.recipient?.lng
    ) {
      const direct = calculateHaversineDistance(
        parcel.sender.lat,
        parcel.sender.lng,
        parcel.recipient.lat,
        parcel.recipient.lng
      );
      // Multiply by 1.35 routing circuity factor for road networks
      return Math.max(3.5, Math.round(direct * 1.35 * 10) / 10);
    }
    return 18.5; // Bay Area average last-mile transit distance
  }, [parcel]);

  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>(initialVehicleType);
  const [distanceKm, setDistanceKm] = useState<number>(defaultDistanceKm);
  const [isCustomDistance, setIsCustomDistance] = useState(false);
  const [showMethodologyInfo, setShowMethodologyInfo] = useState(false);
  const [cargoAllocationModel, setCargoAllocationModel] = useState<'PARCEL_SHARE' | 'FULL_VEHICLE'>('PARCEL_SHARE');

  // Compute emission metrics
  const calculation: EmissionCalculationResult = useMemo(() => {
    const spec = VEHICLE_EMISSION_FACTORS[selectedVehicleType];
    const weightKg = Math.max(0.2, parcel.weightKg || 1);

    // Standard diesel sprinter baseline
    const dieselBaselineFactor = VEHICLE_EMISSION_FACTORS.SPRINTER_VAN.gramsCo2PerKm;
    const totalDieselGrams = dieselBaselineFactor * distanceKm;

    // Selected vehicle total route emissions
    const fullRouteGrams = spec.gramsCo2PerKm * distanceKm;

    // Weight allocation factor: in multi-parcel delivery vans, parcel shares the footprint
    // Average delivery van payload capacity is ~1,200 kg for vans, 120 kg for e-bikes, 12,000 kg for heavy-haul
    let payloadCapacityKg = 1200;
    if (selectedVehicleType === 'CARGO_EBIKE') payloadCapacityKg = 120;
    else if (selectedVehicleType === 'HEAVY_HAUL') payloadCapacityKg = 14000;

    // Share of vehicle payload (capped between 1% and 100%)
    const parcelShareRatio = cargoAllocationModel === 'PARCEL_SHARE'
      ? Math.min(1.0, Math.max(0.015, weightKg / (payloadCapacityKg * 0.7))) // assume 70% average vehicle fill rate
      : 1.0;

    const allocatedGrams = Math.round(fullRouteGrams * parcelShareRatio * 10) / 10;
    const allocatedKg = Math.round((allocatedGrams / 1000) * 1000) / 1000;

    const baselineAllocatedGrams = Math.round(totalDieselGrams * (weightKg / (1200 * 0.7)) * 10) / 10;
    const baselineKg = Math.round((baselineAllocatedGrams / 1000) * 1000) / 1000;

    const savingsKg = Math.max(0, Math.round((baselineKg - allocatedKg) * 1000) / 1000);
    const savingsPct = baselineKg > 0 ? Math.min(100, Math.round((savingsKg / baselineKg) * 100)) : 0;

    // Tree equivalent: 1 mature tree absorbs ~21.77 kg CO2 / year (~1.81 kg / month)
    const treeOffsetMonths = +(allocatedKg / 1.81).toFixed(2);

    // Intensity: grams CO2 per kg-km
    const intensityGrams = distanceKm > 0 && weightKg > 0
      ? +((allocatedGrams / (distanceKm * weightKg)).toFixed(2))
      : 0;

    // Green Rating
    let rating: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
    if (selectedVehicleType === 'CARGO_EBIKE') rating = 'A+';
    else if (selectedVehicleType === 'ELECTRIC_VAN') rating = 'A';
    else if (selectedVehicleType === 'SPRINTER_VAN') rating = 'C';
    else if (selectedVehicleType === 'HEAVY_HAUL') rating = 'D';

    let tip = 'Transition to electric delivery vehicles to cut emissions by over 80%.';
    if (selectedVehicleType === 'CARGO_EBIKE') {
      tip = 'Zero tailpipe emissions. Optimal for dense urban cores under 10 km.';
    } else if (selectedVehicleType === 'ELECTRIC_VAN') {
      tip = 'Renewable electric fleet saves ~85% CO2 vs. standard combustion engines.';
    } else if (selectedVehicleType === 'SPRINTER_VAN') {
      tip = 'Route optimization and EV fleet dispatching can save up to 1.4 kg CO2 per run.';
    } else if (selectedVehicleType === 'HEAVY_HAUL') {
      tip = 'Maximize consolidation fill rates to minimize grams CO2 per freight ton-kilometer.';
    }

    return {
      vehicleType: selectedVehicleType,
      vehicleLabel: spec.name,
      fuelType: spec.fuelType,
      distanceKm,
      grossEmissionsKg: allocatedKg,
      emissionsGrams: allocatedGrams,
      emissionsPerKgKmGrams: intensityGrams,
      baselineDieselEmissionsKg: baselineKg,
      savingsVsDieselKg: savingsKg,
      savingsPercent: savingsPct,
      treeOffsetEquivalentMonths: treeOffsetMonths,
      greenRating: rating,
      efficiencyTip: tip,
    };
  }, [selectedVehicleType, distanceKm, parcel.weightKg, cargoAllocationModel]);

  const ratingColors = {
    'A+': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'A': 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    'B': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'C': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'D': 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Carbon Emission Estimator
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${ratingColors[calculation.greenRating]}`}>
                ECO-GRADE {calculation.greenRating}
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates estimated CO₂ impact based on transit distance, vehicle propulsion, and parcel mass.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowMethodologyInfo(!showMethodologyInfo)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          title="Toggle GHG Accounting Protocol methodology"
        >
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">GLEC Standards</span>
        </button>
      </div>

      {/* Methodology Explainer Accordion */}
      {showMethodologyInfo && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              GHG Protocol / GLEC Logistics Framework
            </span>
            <span className="text-[10px] font-mono text-slate-500">ISO 14083 Compliant</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Emissions are calculated per the Global Logistics Emissions Council (GLEC) standard using average Well-to-Wheel (WTW) carbon intensity factors. When using the <strong className="text-slate-300">Parcel Share Allocation</strong> model, vehicle emissions are apportioned proportionally by the shipment's billable weight ({parcel.weightKg} kg) over the vehicle's standard payload load capacity.
          </p>
        </div>
      )}

      {/* Inputs: Vehicle Type Selector & Distance Slider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Vehicle Type Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Fleet Vehicle Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(VEHICLE_EMISSION_FACTORS) as VehicleType[]).map((type) => {
              const spec = VEHICLE_EMISSION_FACTORS[type];
              const isSelected = selectedVehicleType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedVehicleType(type)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {spec.name}
                    </span>
                    {spec.fuelType === 'ELECTRIC' || spec.fuelType === 'CLEAN_GRID' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        EV
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        DIESEL
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {spec.gramsCo2PerKm} g CO₂ / km
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Transit Distance & Allocation Options */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Transit Distance
              </label>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {distanceKm} km
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({(distanceKm * 0.621371).toFixed(1)} mi)
                </span>
                {isCustomDistance && (
                  <button
                    onClick={() => {
                      setDistanceKm(defaultDistanceKm);
                      setIsCustomDistance(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Reset to geo-computed distance"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <input
              type="range"
              min="1"
              max="150"
              step="0.5"
              value={distanceKm}
              onChange={(e) => {
                setDistanceKm(parseFloat(e.target.value));
                setIsCustomDistance(true);
              }}
              className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>1 km (Local)</span>
              <span>50 km (Regional)</span>
              <span>150 km (Corridor)</span>
            </div>
          </div>

          {/* Allocation Model Switch */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Apportionment Basis:
            </span>
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setCargoAllocationModel('PARCEL_SHARE')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  cargoAllocationModel === 'PARCEL_SHARE'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Apportion emissions by parcel's fraction of vehicle capacity"
              >
                Parcel Share ({parcel.weightKg}kg)
              </button>
              <button
                type="button"
                onClick={() => setCargoAllocationModel('FULL_VEHICLE')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  cargoAllocationModel === 'FULL_VEHICLE'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Full vehicle trip total"
              >
                Entire Vehicle Trip
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Matrix & Impact Visualizer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* 1. Estimated CO2 */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Estimated CO₂ Footprint
            </span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
              {calculation.grossEmissionsKg < 0.01 
                ? `${calculation.emissionsGrams} g` 
                : `${calculation.grossEmissionsKg.toFixed(3)} kg`}
            </span>
            <span className="text-xs text-slate-400 font-mono">CO₂e</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {calculation.emissionsPerKgKmGrams} g CO₂ / kg·km
          </div>
        </div>

        {/* 2. Savings vs. Diesel Baseline */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Avoided vs. Diesel Van
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {calculation.savingsVsDieselKg > 0 ? `-${calculation.savingsPercent}%` : '0%'}
            </span>
            <span className="text-xs text-emerald-300 font-mono">
              ({calculation.savingsVsDieselKg.toFixed(3)} kg)
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {calculation.savingsPercent > 0 
              ? 'Cleaner than diesel baseline' 
              : 'Standard combustion benchmark'}
          </div>
        </div>

        {/* 3. Tree Offset Absorption Time */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Tree Offset Absorption
            </span>
            <TreeDeciduous className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-teal-300">
              {calculation.treeOffsetEquivalentMonths < 0.1 
                ? '< 3 days' 
                : `${calculation.treeOffsetEquivalentMonths} mo`}
            </span>
            <span className="text-xs text-slate-400">of 1 tree</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Equiv. mature urban forest capture
          </div>
        </div>
      </div>

      {/* Fleet Routing Recommendation Footnote */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-emerald-200">
            Green Logistics Recommendation:
          </span>
          <p className="text-slate-300 text-[11px]">
            {calculation.efficiencyTip}
          </p>
        </div>
      </div>
    </div>
  );
};
