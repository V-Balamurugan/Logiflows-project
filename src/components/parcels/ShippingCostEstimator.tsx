import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Box, 
  Scale, 
  Milestone, 
  ShieldCheck, 
  Leaf, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Sliders,
  DollarSign,
  Info
} from 'lucide-react';
import { PackageType, ServiceTier } from '../../types';
import { 
  shippingRateService, 
  DimensionSpecs, 
  ShippingCostQuote 
} from '../../services/shippingRateService';

interface Props {
  dimensions: DimensionSpecs;
  onDimensionsChange?: (newDims: DimensionSpecs) => void;
  weightKg: number;
  onWeightChange?: (newWeight: number) => void;
  distanceKm: number;
  onDistanceChange?: (newDistance: number) => void;
  packageType: PackageType;
  serviceTier: ServiceTier;
  onServiceTierChange: (tier: ServiceTier) => void;
  declaredValueUsd: number;
  originCity?: string;
  destinationCity?: string;
  onQuoteCalculated?: (quote: ShippingCostQuote) => void;
}

export const ShippingCostEstimator: React.FC<Props> = ({
  dimensions,
  onDimensionsChange,
  weightKg,
  onWeightChange,
  distanceKm,
  onDistanceChange,
  packageType,
  serviceTier,
  onServiceTierChange,
  declaredValueUsd,
  originCity = 'Oakland, CA',
  destinationCity = 'San Francisco, CA',
  onQuoteCalculated,
}) => {
  const [includeCarbonOffset, setIncludeCarbonOffset] = useState(false);
  const [showItemizedBreakdown, setShowItemizedBreakdown] = useState(false);
  const [showManualDistanceOverride, setShowManualDistanceOverride] = useState(false);

  // Compute live quote based on current parameters
  const quote = useMemo(() => {
    const q = shippingRateService.calculateQuote({
      dimensions,
      weightKg,
      distanceKm,
      packageType,
      serviceTier,
      declaredValueUsd,
      includeCarbonOffset,
    });
    if (onQuoteCalculated) {
      onQuoteCalculated(q);
    }
    return q;
  }, [
    dimensions,
    weightKg,
    distanceKm,
    packageType,
    serviceTier,
    declaredValueUsd,
    includeCarbonOffset,
    onQuoteCalculated,
  ]);

  // Compute comparative options across all tiers
  const tierComparisons = useMemo(() => {
    return shippingRateService.compareServiceTiers({
      dimensions,
      weightKg,
      distanceKm,
      packageType,
      declaredValueUsd,
      includeCarbonOffset,
    });
  }, [
    dimensions,
    weightKg,
    distanceKm,
    packageType,
    declaredValueUsd,
    includeCarbonOffset,
  ]);

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
      {/* Title & Live Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100 flex items-center gap-2">
              Real-Time Shipping Cost Estimator
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-normal border border-emerald-500/20">
                Mock Rate Service Active
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Corridor Distance: <span className="text-slate-200 font-medium">{quote.distanceKm} km</span> ({originCity} ➔ {destinationCity})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowManualDistanceOverride(!showManualDistanceOverride)}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 px-2 py-1 rounded bg-slate-900 border border-slate-800 transition-colors"
          title="Adjust distance simulation"
        >
          <Sliders className="w-3 h-3" />
          <span>{showManualDistanceOverride ? 'Lock Distance' : 'Simulate Distance'}</span>
        </button>
      </div>

      {/* Optional Distance Simulation Slider */}
      {showManualDistanceOverride && onDistanceChange && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Simulated Corridor Distance:</span>
            <span className="font-mono font-bold text-indigo-300">{distanceKm} km</span>
          </div>
          <input
            type="range"
            min="2"
            max="250"
            step="1"
            value={distanceKm}
            onChange={(e) => onDistanceChange(parseFloat(e.target.value) || 10)}
            className="w-full accent-indigo-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>2 km (Local Depot)</span>
            <span>50 km (Regional)</span>
            <span>250 km (Intercity Haul)</span>
          </div>
        </div>
      )}

      {/* Dimensional Weight vs Physical Mass Analysis Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Actual Weight */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Actual Weight</span>
              <span className="font-mono font-bold text-slate-100 text-xs">{weightKg.toFixed(1)} kg</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500">Gross</span>
        </div>

        {/* Volumetric Weight */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Volumetric Weight</span>
              <span className="font-mono font-bold text-amber-300 text-xs">
                {quote.volumetricWeightKg.toFixed(2)} kg
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500" title="Formula: (L × W × H) / 5000">
            DIM 5000
          </span>
        </div>

        {/* Billable Weight */}
        <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
          quote.isVolumetricDominant 
            ? 'bg-amber-950/20 border-amber-500/40' 
            : 'bg-emerald-950/20 border-emerald-500/40'
        }`}>
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${quote.isVolumetricDominant ? 'text-amber-400' : 'text-emerald-400'}`} />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Billable Rating</span>
              <span className="font-mono font-bold text-white text-xs">{quote.billableWeightKg.toFixed(2)} kg</span>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            quote.isVolumetricDominant 
              ? 'bg-amber-500/20 text-amber-300' 
              : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            {quote.isVolumetricDominant ? 'Dimensional' : 'Mass Rate'}
          </span>
        </div>
      </div>

      {/* Interactive Service Tier Matrix Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
          <span>Choose Service Level SLA</span>
          <span className="text-[10px] text-slate-400">Click card to switch pricing tier</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {tierComparisons.map((item) => {
            const isSelected = item.tier === serviceTier;
            return (
              <button
                key={item.tier}
                type="button"
                onClick={() => onServiceTierChange(item.tier)}
                className={`text-left p-3 rounded-lg border transition-all relative ${
                  isSelected
                    ? 'bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                {item.badge && (
                  <span className={`absolute -top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                    item.isFastest 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                      : item.isCheapest 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}

                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-xs ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                    {item.name}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>

                <div className="text-[11px] text-slate-400 mb-2">
                  ETA: ~{item.transitHours}h ({item.timeframeText})
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold font-mono text-white">
                    ${item.totalCostUsd.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">USD</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Carbon Offset Toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeCarbonOffset}
            onChange={(e) => setIncludeCarbonOffset(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
          />
          <div className="flex items-center gap-1.5 text-slate-200">
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-[11px]">Carbon-Neutral Green Delivery Certificate</span>
          </div>
        </label>
        <span className="text-[11px] font-mono text-emerald-400 font-semibold">+$1.50</span>
      </div>

      {/* Collapsible Itemized Cost Breakdown */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
        <button
          type="button"
          onClick={() => setShowItemizedBreakdown(!showItemizedBreakdown)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium text-[11px]">Detailed Mock Carrier Rate Breakdown</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="font-mono font-bold text-slate-100">${quote.totalUsd.toFixed(2)}</span>
            {showItemizedBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showItemizedBreakdown && (
          <div className="px-3 pb-3 pt-1 border-t border-slate-800 space-y-2">
            <div className="divide-y divide-slate-800/80">
              {quote.lineItems.map((item) => (
                <div key={item.id} className="py-1.5 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-200 font-medium">{item.name}</span>
                    <span className="block text-[10px] text-slate-400">{item.description}</span>
                  </div>
                  <span className={`font-mono font-semibold ${item.isDiscount ? 'text-emerald-400' : 'text-slate-100'}`}>
                    {item.amount < 0 ? '-' : ''}${Math.abs(item.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between font-semibold">
              <span className="text-slate-200">Total B2B Rate (USD)</span>
              <span className="text-emerald-400 font-mono text-sm">${quote.totalUsd.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between">
              <span>Tariff Schedule: {quote.tariffCode}</span>
              <span>Updated: Real-Time</span>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Current Quote Summary Banner */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30">
        <div>
          <span className="text-[10px] text-indigo-300 uppercase tracking-wider block">Real-Time Shipping Fee</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono text-indigo-200">
              ${quote.totalUsd.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400">
              via {serviceTier.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">Transit SLA Window</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">
            {quote.deliveryTimeframeText}
          </span>
        </div>
      </div>
    </div>
  );
};
