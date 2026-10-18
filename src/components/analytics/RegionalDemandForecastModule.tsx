import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sliders,
  RotateCcw,
  Sparkles,
  Truck,
  ArrowRight,
  ChevronRight,
  Info,
  Clock,
  Zap,
  MapPin,
  Check,
  Building2,
  Flame,
  Layers,
  Save
} from 'lucide-react';
import { Parcel } from '../../types';
import { storage } from '../../services/storage';
import { 
  regionalDemandForecastService, 
  RegionalZoneConfig, 
  REGIONAL_ZONE_CONFIGS 
} from '../../services/regionalDemandForecastService';

interface Props {
  parcels: Parcel[];
  tenantName?: string;
}

export const RegionalDemandForecastModule: React.FC<Props> = ({ parcels, tenantName }) => {
  const currentTenantId = storage.getActiveTenantId();

  // Interactive UI State
  const [selectedRegionId, setSelectedRegionId] = useState<string>('ALL');
  const [surgeIntensityMultiplier, setSurgeIntensityMultiplier] = useState<number>(1.0);
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>(() => {
    const saved = regionalDemandForecastService.getSavedPreAllocationPlan(currentTenantId);
    if (saved?.allocations) return saved.allocations;
    const initial: Record<string, number> = {};
    REGIONAL_ZONE_CONFIGS.forEach((c) => {
      initial[c.regionId] = c.defaultCouriers;
    });
    return initial;
  });

  const [isCommitted, setIsCommitted] = useState<boolean>(false);
  const [commitToastMessage, setCommitToastMessage] = useState<string | null>(null);

  // Compute forecasts based on parcels and current allocation/surge controls
  const regionalForecasts = useMemo(() => {
    return regionalDemandForecastService.getRegionalDemandForecasts(
      parcels,
      surgeIntensityMultiplier,
      customAllocations
    );
  }, [parcels, surgeIntensityMultiplier, customAllocations]);

  // Aggregate Macro Timeline (across all regions or for selected single region)
  const chartTimelineData = useMemo(() => {
    if (selectedRegionId === 'ALL') {
      return regionalDemandForecastService.getAggregatedDemandTimeline(regionalForecasts);
    }
    const single = regionalForecasts.find((r) => r.regionId === selectedRegionId);
    if (!single) return [];

    return single.dailyTimeline.map((pt) => ({
      dayLabel: pt.dayLabel,
      dateStr: pt.dateStr,
      historicalBaseline: pt.historicalBaseline,
      predictedVolume: pt.predictedVolume,
      allocatedCapacity: pt.allocatedCapacity,
      surgeDelta: pt.predictedVolume - pt.historicalBaseline,
      coveragePct: Math.round((pt.allocatedCapacity / pt.predictedVolume) * 100),
    }));
  }, [selectedRegionId, regionalForecasts]);

  // Top Macro KPI summary statistics
  const macroStats = useMemo(() => {
    const totalPredictedVolume = regionalForecasts.reduce((sum, f) => sum + f.predictedSurgeVolume, 0);
    const totalCourierCapacity = regionalForecasts.reduce((sum, f) => sum + f.courierCapacityParcels, 0);
    const totalCouriers = Object.values(customAllocations).reduce((a, b) => a + b, 0);
    const overallCoveragePct = Math.round((totalCourierCapacity / totalPredictedVolume) * 100);
    const activeSurgeZonesCount = regionalForecasts.filter(
      (f) => f.surgeRiskLevel === 'CRITICAL_SURGE' || f.surgeRiskLevel === 'HIGH_SURGE'
    ).length;
    const netCapacityDeficit = totalCourierCapacity - totalPredictedVolume;

    // Weighted average SLA safety probability
    const weightedSlaSafety = +(
      regionalForecasts.reduce((sum, f) => sum + f.slaSafetyProbabilityPct * f.predictedSurgeVolume, 0) /
      totalPredictedVolume
    ).toFixed(1);

    return {
      totalPredictedVolume,
      totalCourierCapacity,
      totalCouriers,
      overallCoveragePct,
      activeSurgeZonesCount,
      netCapacityDeficit,
      weightedSlaSafety
    };
  }, [regionalForecasts, customAllocations]);

  // Handler: Modify courier allocation for a specific region
  const handleUpdateCourierCount = (regionId: string, delta: number) => {
    setCustomAllocations((prev) => {
      const current = prev[regionId] || 20;
      const updated = Math.max(5, current + delta);
      return {
        ...prev,
        [regionId]: updated
      };
    });
    setIsCommitted(false);
  };

  const handleSetExactCourierCount = (regionId: string, count: number) => {
    setCustomAllocations((prev) => ({
      ...prev,
      [regionId]: Math.max(5, count)
    }));
    setIsCommitted(false);
  };

  // Handler: Run algorithmic auto-balancing across all regions
  const handleAutoBalanceCapacity = () => {
    const balanced = regionalDemandForecastService.autoBalanceCapacity(
      regionalForecasts,
      macroStats.totalCouriers
    );
    setCustomAllocations(balanced);
    setIsCommitted(false);
    setCommitToastMessage('Capacity auto-balanced: couriers re-distributed proportionally to surge volumes.');
    setTimeout(() => setCommitToastMessage(null), 3500);
  };

  // Handler: Commit Pre-Allocation Plan
  const handleCommitPlan = () => {
    regionalDemandForecastService.savePreAllocationPlan({
      id: `plan-reg-${Date.now().toString(36)}`,
      tenantId: currentTenantId,
      updatedAt: new Date().toISOString(),
      totalPredictedVolume: macroStats.totalPredictedVolume,
      totalCourierCapacity: macroStats.totalCourierCapacity,
      overallCoveragePct: macroStats.overallCoveragePct,
      activeSurgeZonesCount: macroStats.activeSurgeZonesCount,
      allocations: customAllocations,
      notes: `Pre-allocation plan generated under ${surgeIntensityMultiplier.toFixed(2)}x surge multiplier. Total Couriers: ${macroStats.totalCouriers}.`,
      status: 'COMMITTED'
    });

    setIsCommitted(true);
    setCommitToastMessage('Pre-Allocation Plan committed to dispatch ops! Courier shifts locked.');
    setTimeout(() => setCommitToastMessage(null), 4000);
  };

  // Handler: Reset to baseline defaults
  const handleResetDefaults = () => {
    regionalDemandForecastService.resetToDefaults(currentTenantId);
    const initial: Record<string, number> = {};
    REGIONAL_ZONE_CONFIGS.forEach((c) => {
      initial[c.regionId] = c.defaultCouriers;
    });
    setCustomAllocations(initial);
    setSurgeIntensityMultiplier(1.0);
    setIsCommitted(false);
    setCommitToastMessage('Allocations reset to default standard staffing levels.');
    setTimeout(() => setCommitToastMessage(null), 3000);
  };

  const activeRegion = useMemo(() => {
    if (selectedRegionId === 'ALL') return null;
    return regionalForecasts.find((r) => r.regionId === selectedRegionId) || null;
  }, [selectedRegionId, regionalForecasts]);

  return (
    <div className="space-y-6 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl animate-fade-in">
      {/* Module Header & Context */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              PREDICTIVE SURGE INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              HISTORICAL TIME-SERIES · SHIFT PRE-ALLOCATION
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span>Regional Demand Forecast & Courier Capacity Balancing</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Correlates historical parcel volumes, regional industrial drivers, and day-of-week trends to forecast upcoming localized demand spikes. Dispatch admins can pre-allocate courier capacity and re-route shifts ahead of bottleneck congestion.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleAutoBalanceCapacity}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md hover:scale-[1.02] border border-indigo-400/40"
            title="Automatically distribute existing couriers to eliminate regional deficits"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Auto-Balance Capacity</span>
          </button>

          <button
            onClick={handleCommitPlan}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
              isCommitted
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-500/50 ring-2 ring-emerald-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30 hover:scale-[1.02]'
            }`}
            title="Lock in this capacity allocation plan for operational dispatching"
          >
            {isCommitted ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            <span>{isCommitted ? 'Plan Committed' : 'Commit Pre-Allocation'}</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700"
            title="Reset courier counts to baseline"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Confirmation Toast Alert */}
      {commitToastMessage && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-indigo-500/40 text-indigo-200 text-xs animate-fade-in shadow-xl">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-slate-200">{commitToastMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Live Synchronized</span>
        </div>
      )}

      {/* Top Macro Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Predicted Volume</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
            {macroStats.totalPredictedVolume.toLocaleString()}
            <span className="text-[11px] font-normal text-slate-400 font-sans ml-1">pkgs/day</span>
          </div>
          <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
            <span>+{Math.round((surgeIntensityMultiplier - 1.0) * 100 + 28)}% surge vs base</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pre-Allocated Capacity</span>
            <Truck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300 tabular-nums">
            {macroStats.totalCourierCapacity.toLocaleString()}
            <span className="text-[11px] font-normal text-slate-400 font-sans ml-1">pkgs/day</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {macroStats.totalCouriers} couriers across 5 zones
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Capacity Coverage</span>
            <ShieldCheck className={`w-3.5 h-3.5 ${macroStats.overallCoveragePct >= 100 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className={`text-xl font-bold font-mono tabular-nums ${macroStats.overallCoveragePct >= 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {macroStats.overallCoveragePct}%
          </div>
          <div className="text-[11px] font-mono">
            {macroStats.netCapacityDeficit >= 0 ? (
              <span className="text-emerald-400">+{macroStats.netCapacityDeficit} buffer reserve</span>
            ) : (
              <span className="text-rose-400 font-bold">{macroStats.netCapacityDeficit} deficit shortfall</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Surge Alert Zones</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-300 tabular-nums">
            {macroStats.activeSurgeZonesCount} / 5
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Silicon Valley & East Bay active
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>SLA Safety Score</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
            {macroStats.weightedSlaSafety}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Same-Day & Express guaranteed
          </div>
        </div>
      </div>

      {/* Interactive Controls & Stress-Testing Multiplier */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Regional Filter Segmented Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs font-semibold">
          <span className="text-slate-400 text-xs mr-1 font-sans">Focus Region:</span>
          <button
            onClick={() => setSelectedRegionId('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedRegionId === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Regions (Macro Aggregate)
          </button>

          {regionalForecasts.map((r) => {
            const isSelected = selectedRegionId === r.regionId;
            const isSurge = r.surgeRiskLevel === 'CRITICAL_SURGE' || r.surgeRiskLevel === 'HIGH_SURGE';
            return (
              <button
                key={r.regionId}
                onClick={() => setSelectedRegionId(r.regionId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{r.regionName.split(' ')[0]}</span>
                {isSurge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Surge Intensity Stress-Test Slider */}
        <div className="flex items-center gap-3 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">Simulate Surge Stress-Test:</span>
          </div>

          <input
            type="range"
            min="1.0"
            max="1.8"
            step="0.05"
            value={surgeIntensityMultiplier}
            onChange={(e) => {
              setSurgeIntensityMultiplier(parseFloat(e.target.value));
              setIsCommitted(false);
            }}
            className="w-28 sm:w-36 accent-amber-500 cursor-pointer"
          />

          <span className="font-mono text-xs font-bold text-amber-400 min-w-12 text-right">
            {surgeIntensityMultiplier.toFixed(2)}x {surgeIntensityMultiplier > 1.0 ? `(+${Math.round((surgeIntensityMultiplier - 1) * 100)}%)` : '(Baseline)'}
          </span>
        </div>
      </div>

      {/* Main Timeline Visualization (ComposedChart: Historical Baseline vs Predicted Demand vs Allocated Capacity) */}
      <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>
                {selectedRegionId === 'ALL'
                  ? '7-Day Regional Demand Forecast & Fleet Capacity Envelope (Aggregate Network)'
                  : `${activeRegion?.regionName} · 7-Day Surge Projection & Capacity Alignment`}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                {selectedRegionId === 'ALL' ? 'Composite 5 Zones' : activeRegion?.regionCode}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Visualizes historical parcel baseline against anticipated surge spikes. Ensure green capacity line envelopes predicted demand to prevent dispatch bottlenecks.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-700 inline-block" />
              <span className="text-slate-400">Historical Base</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/80 inline-block" />
              <span className="text-amber-300">Predicted Surge</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 bg-emerald-400 inline-block" />
              <span className="text-emerald-300">Allocated Capacity</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartTimelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="surgeDemandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="historicalBaseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="dayLabel" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  const deficit = data.allocatedCapacity - data.predictedVolume;
                  const isSafe = deficit >= 0;

                  return (
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 font-mono min-w-[210px]">
                      <div className="font-bold text-slate-100 border-b border-slate-800 pb-1 font-sans flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-[10px] text-slate-400">{data.dateStr}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Historical Baseline:</span>
                        <span className="text-slate-200">{data.historicalBaseline} pkgs</span>
                      </div>
                      <div className="flex justify-between items-center text-amber-300">
                        <span>Predicted Surge:</span>
                        <span className="font-bold">{data.predictedVolume} pkgs</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-300">
                        <span>Allocated Capacity:</span>
                        <span className="font-bold">{data.allocatedCapacity} pkgs</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-800 pt-1 text-[11px]">
                        <span>Capacity Status:</span>
                        <span className={`font-bold ${isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isSafe ? `+${deficit} Buffer (${data.coveragePct}%)` : `${deficit} Shortfall (${data.coveragePct}%)`}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="historicalBaseline" 
                name="Historical Base" 
                fill="#334155" 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
              <Area 
                type="monotone" 
                dataKey="predictedVolume" 
                name="Predicted Surge Demand" 
                stroke="#f59e0b" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#surgeDemandGradient)" 
              />
              <Line 
                type="stepAfter" 
                dataKey="allocatedCapacity" 
                name="Allocated Courier Capacity" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', stroke: '#020617', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional Surge Breakdown & Interactive Capacity Pre-Allocation Cards */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Regional Zones & Courier Capacity Allocation Matrix</span>
            </h3>
            <p className="text-xs text-slate-400">
              Tune courier shift numbers per zone using +/- buttons or enter target headcounts. Real-time capacity deltas reflect immediately.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Standard: 34 parcels / courier shift
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regionalForecasts.map((zone) => {
            const couriers = customAllocations[zone.regionId] ?? zone.currentAllocatedCouriers;
            const isCritical = zone.surgeRiskLevel === 'CRITICAL_SURGE';
            const isHigh = zone.surgeRiskLevel === 'HIGH_SURGE';
            const isElevated = zone.surgeRiskLevel === 'ELEVATED';
            const isDeficit = zone.capacityDelta < 0;

            const badgeColor = isCritical 
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
              : isHigh 
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
              : isElevated 
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700';

            return (
              <div
                key={zone.regionId}
                className={`p-4 rounded-xl bg-slate-950 border transition-all space-y-3.5 relative overflow-hidden ${
                  isCritical
                    ? 'border-rose-500/40 shadow-lg shadow-rose-950/20'
                    : isHigh
                    ? 'border-amber-500/40 shadow-lg shadow-amber-950/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Zone Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">{zone.regionCode}</span>
                      <span className="text-slate-400 text-xs">·</span>
                      <h4 className="text-sm font-bold text-slate-100">{zone.regionName}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      <span>{zone.primaryHubName}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${badgeColor}`}>
                    {zone.surgeRiskLevel.replace('_', ' ')}
                  </span>
                </div>

                {/* Surge Driver Narrative */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] space-y-1">
                  <div className="text-slate-400 font-semibold flex items-center justify-between">
                    <span className="text-amber-400 flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      <span>Surge Driver:</span>
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">Peak: {zone.peakDeliveryWindow}</span>
                  </div>
                  <p className="text-slate-300 leading-snug">
                    {zone.surgeDriver}
                  </p>
                </div>

                {/* Demand vs Capacity Key Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block uppercase">Predicted Demand</span>
                    <span className="text-base font-bold text-amber-300">
                      {zone.predictedSurgeVolume} <span className="text-[10px] text-slate-400">pkgs</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      +{Math.round((zone.surgeFactor - 1) * 100)}% vs baseline
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block uppercase">Allocated Capacity</span>
                    <span className="text-base font-bold text-emerald-300">
                      {zone.courierCapacityParcels} <span className="text-[10px] text-slate-400">pkgs</span>
                    </span>
                    <span className={`text-[10px] block mt-0.5 font-bold ${isDeficit ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isDeficit ? `${zone.capacityDelta} Deficit` : `+${zone.capacityDelta} Surplus`}
                    </span>
                  </div>
                </div>

                {/* Visual Capacity Coverage Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Capacity Coverage:</span>
                    <span className={`font-mono font-bold ${zone.capacityCoveragePct >= 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {zone.capacityCoveragePct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        zone.capacityCoveragePct >= 105
                          ? 'bg-emerald-500'
                          : zone.capacityCoveragePct >= 95
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, zone.capacityCoveragePct)}%` }}
                    />
                  </div>
                </div>

                {/* Interactive Pre-Allocation Controls */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Pre-Allocated Couriers:</span>
                    </span>

                    <span className="text-slate-400 text-[11px] font-mono">
                      (Rec: {zone.recommendedCouriers})
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Stepper Controls */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => handleUpdateCourierCount(zone.regionId, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors text-sm"
                        title="Reduce allocated couriers by 1"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={couriers}
                        onChange={(e) => handleSetExactCourierCount(zone.regionId, parseInt(e.target.value) || 5)}
                        className="w-12 text-center bg-transparent text-white font-mono font-bold text-sm focus:outline-none"
                      />

                      <button
                        onClick={() => handleUpdateCourierCount(zone.regionId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors text-sm"
                        title="Increase allocated couriers by 1"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick buffer shortcuts */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateCourierCount(zone.regionId, 2)}
                        className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-semibold transition-colors"
                        title="Add +2 couriers shift reserve"
                      >
                        +2
                      </button>
                      <button
                        onClick={() => handleUpdateCourierCount(zone.regionId, 5)}
                        className="px-2 py-1.5 rounded bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-300 text-[10px] font-mono font-semibold transition-colors border border-indigo-700/50"
                        title="Add +5 couriers surge buffer"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleSetExactCourierCount(zone.regionId, zone.recommendedCouriers)}
                        className="px-2 py-1.5 rounded bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 text-[10px] font-mono font-bold transition-colors border border-emerald-700/40"
                        title="Match algorithm recommendation"
                      >
                        Match Rec
                      </button>
                    </div>
                  </div>

                  {/* Operational Risk Indicators */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>
                      SLA Safety: <strong className="text-emerald-400">{zone.slaSafetyProbabilityPct}%</strong>
                    </span>
                    <span>
                      {zone.overtimeRiskHours > 0 ? (
                        <span className="text-rose-400 font-bold">⚠️ ~{zone.overtimeRiskHours}h Overtime</span>
                      ) : (
                        <span className="text-slate-500">Zero Overtime Risk</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Key Municipalities Tags */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center gap-1 flex-wrap text-[10px] text-slate-500">
                  <span className="text-slate-400">Coverage:</span>
                  {zone.keyMunicipalities.slice(0, 4).map((city) => (
                    <span key={city} className="text-slate-400">
                      {city}
                    </span>
                  ))}
                  {zone.keyMunicipalities.length > 4 && (
                    <span className="text-slate-500">+{zone.keyMunicipalities.length - 4} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
