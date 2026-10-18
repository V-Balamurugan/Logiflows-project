import React, { useState, useEffect, useMemo } from 'react';
import { 
  Network, 
  GitBranch, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Fuel, 
  Leaf, 
  Truck, 
  Warehouse, 
  Sliders, 
  RefreshCw, 
  Check, 
  X, 
  Zap, 
  TrendingUp, 
  ShieldAlert, 
  Flame, 
  ChevronRight, 
  Send,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { 
  BranchHub, 
  Vehicle, 
  HubCongestionForecast, 
  VehicleRerouteSuggestion, 
  CapacityBalancingMetrics 
} from '../../types';
import { storage } from '../../services/storage';
import { capacityBalancingService } from '../../services/capacityBalancingService';

interface Props {
  vehicles: Vehicle[];
}

export const CapacityBalancingEngine: React.FC<Props> = ({ vehicles }) => {
  const currentTenantId = storage.getActiveTenantId();

  // State
  const [forecasts, setForecasts] = useState<HubCongestionForecast[]>(() => 
    capacityBalancingService.getHubCongestionForecasts(currentTenantId)
  );
  const [suggestions, setSuggestions] = useState<VehicleRerouteSuggestion[]>(() => 
    capacityBalancingService.getRerouteSuggestions(currentTenantId)
  );
  const [metrics, setMetrics] = useState<CapacityBalancingMetrics>(() => 
    capacityBalancingService.getBalancingMetrics(currentTenantId)
  );
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [suggestionFilter, setSuggestionFilter] = useState<'ALL' | 'PENDING' | 'APPLIED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoBalanceActive, setIsAutoBalanceActive] = useState<boolean>(() => 
    capacityBalancingService.isAutoBalanceEnabled()
  );
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);
  const [maxUtilization, setMaxUtilization] = useState<number>(() => 
    capacityBalancingService.getThresholds().maxUtilization
  );
  const [minIdleCutoff, setMinIdleCutoff] = useState<number>(() => 
    capacityBalancingService.getThresholds().minIdleWait
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state with storage and service
  const refreshBalancingData = () => {
    const updatedForecasts = capacityBalancingService.getHubCongestionForecasts(currentTenantId);
    const updatedSuggestions = capacityBalancingService.getRerouteSuggestions(currentTenantId);
    const updatedMetrics = capacityBalancingService.getBalancingMetrics(currentTenantId);
    setForecasts(updatedForecasts);
    setSuggestions(updatedSuggestions);
    setMetrics(updatedMetrics);
  };

  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      refreshBalancingData();
    });
    return () => unsubscribe();
  }, [currentTenantId]);

  // Execute single vehicle reroute
  const handleApplyReroute = (suggestionId: string) => {
    const success = capacityBalancingService.applyReroute(suggestionId);
    if (success) {
      refreshBalancingData();
      const s = suggestions.find(item => item.id === suggestionId);
      setToastMessage(`✓ Reroute order confirmed: ${s?.vehicleNumber} diverted to ${s?.suggestedHubCode} (-${s?.netTimeSavedMin}m idle wait avoided).`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Batch execute all proposed reroutes
  const handleBatchApplyReroutes = () => {
    const applied = capacityBalancingService.applyAllReroutes();
    refreshBalancingData();
    setToastMessage(`⚡ Batch rebalancing executed: ${applied} vehicles diverted away from congested hubs.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Dismiss suggestion
  const handleDismissReroute = (suggestionId: string) => {
    capacityBalancingService.dismissReroute(suggestionId);
    refreshBalancingData();
  };

  // Simulate hub volume surge
  const handleSimulateSurge = (hubId: string) => {
    capacityBalancingService.simulateHubSurge(hubId, 2400);
    refreshBalancingData();
    const target = forecasts.find(f => f.hubId === hubId);
    setToastMessage(`⚡ Simulated Inbound Surge: +2,400 parcels injected into ${target?.hubName}. New reroutes calculated!`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Reset surges
  const handleResetSurges = () => {
    capacityBalancingService.resetSimulatedSurges();
    refreshBalancingData();
    setToastMessage('Hub capacities reset to baseline operational telemetry.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle Auto-Balance
  const handleToggleAutoBalance = () => {
    const next = !isAutoBalanceActive;
    setIsAutoBalanceActive(next);
    capacityBalancingService.setAutoBalanceEnabled(next);
    if (next) {
      // Auto-apply if turned on
      const count = capacityBalancingService.applyAllReroutes();
      refreshBalancingData();
      setToastMessage(`Autonomous Capacity Balancing ENABLED: ${count} immediate reroutes applied.`);
    } else {
      setToastMessage('Autonomous Capacity Balancing PAUSED. Manual review required.');
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save threshold parameters
  const handleSaveThresholds = () => {
    capacityBalancingService.updateThresholds(maxUtilization, minIdleCutoff);
    setShowThresholdConfig(false);
    refreshBalancingData();
    setToastMessage(`Balancing thresholds updated: Max Util ${maxUtilization}%, Min Idle ${minIdleCutoff}m.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      const matchStatus = 
        suggestionFilter === 'ALL' ? true :
        suggestionFilter === 'PENDING' ? s.status === 'PROPOSED' :
        s.status === 'APPLIED';

      const matchSearch = 
        searchQuery === '' ||
        s.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.currentDestinationHubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.suggestedHubName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [suggestions, suggestionFilter, searchQuery]);

  const pendingCount = suggestions.filter(s => s.status === 'PROPOSED').length;
  const appliedCount = suggestions.filter(s => s.status === 'APPLIED').length;

  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* Control Banner & Engine Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block">
              PREDICTIVE NETWORK OPTIMIZATION · CROSS-HUB LOAD BALANCER
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              HEURISTIC CAPACITY ROUTER
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            <span>Capacity Balancing & Predictive Hub Rerouting Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulates regional inbound volume spikes, forecasts loading dock dwell bottlenecks, and automatically diverts commercial freight to reduce gate idle time.
          </p>
        </div>

        {/* Engine Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Autonomous Mode Toggle */}
          <button
            onClick={handleToggleAutoBalance}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
              isAutoBalanceActive
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle autonomous vehicle rerouting without manual dispatcher approval"
          >
            <Zap className={`w-3.5 h-3.5 ${isAutoBalanceActive ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} />
            <span>{isAutoBalanceActive ? 'Auto-Balancing Active' : 'Enable Autonomous Mode'}</span>
          </button>

          {/* Test Inbound Surge Trigger */}
          <button
            onClick={() => {
              const sjc = forecasts.find(f => f.hubCode.includes('SJC')) || forecasts[0];
              if (sjc) handleSimulateSurge(sjc.hubId);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all shadow-sm"
            title="Inject an unexpected +2,400 parcel surge into the Silicon Valley Tech DC"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Hub Congestion Surge</span>
          </button>

          {/* Threshold Tuning */}
          <button
            onClick={() => setShowThresholdConfig(!showThresholdConfig)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tuning ({maxUtilization}%)</span>
          </button>

          {/* Reset Baseline */}
          <button
            onClick={handleResetSurges}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reset hub volume to standard baseline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Threshold Config Drawer */}
      {showThresholdConfig && (
        <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Algorithmic Balancing Parameters
            </span>
            <button onClick={() => setShowThresholdConfig(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Max Hub Congestion Threshold:</span>
                <span className="font-mono font-bold text-indigo-400">{maxUtilization}%</span>
              </div>
              <input
                type="range"
                min="65"
                max="95"
                step="5"
                value={maxUtilization}
                onChange={(e) => setMaxUtilization(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Hubs reaching or exceeding this utilization trigger automated diversion analysis.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Min Idle Dwell Cutoff:</span>
                <span className="font-mono font-bold text-indigo-400">{minIdleCutoff} mins</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={minIdleCutoff}
                onChange={(e) => setMinIdleCutoff(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Minimum projected gate wait required before proposing a highway detour.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
            <button
              onClick={() => setShowThresholdConfig(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveThresholds}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm"
            >
              Apply Parameters
            </button>
          </div>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Congested Hubs */}
        <div className={`p-4 rounded-xl border space-y-2 transition-all ${
          metrics.congestedHubsCount > 0 
            ? 'bg-gradient-to-br from-rose-950/30 to-slate-900 border-rose-500/40' 
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Congestion Bottlenecks
            </span>
            <span className="font-mono text-[10px] text-slate-500">{metrics.totalHubsMonitored} Hubs Monitored</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-rose-400">
              {metrics.congestedHubsCount}
            </span>
            <span className="text-xs text-slate-400">hubs over threshold</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics.congestedHubsCount > 0 
              ? 'Loading dock dwell exceeding nominal turnarounds' 
              : 'All regional intake hubs within capacity headroom'}
          </p>
        </div>

        {/* KPI 2: Total Idle Time Saved */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Projected Idle Time Saved</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-emerald-400">
              {metrics.totalIdleMinutesSaved}
            </span>
            <span className="text-xs text-slate-400">minutes avoided</span>
          </div>
          <p className="text-[11px] text-slate-500">
            ~{(metrics.totalIdleMinutesSaved / 60).toFixed(1)} vehicle operating hours returned to active service
          </p>
        </div>

        {/* KPI 3: Fuel & Carbon Saved */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Idling Emissions Avoided</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-emerald-400">
              {metrics.co2AvoidedKg}
            </span>
            <span className="text-xs text-slate-400">kg CO₂ ({metrics.fuelSavedLiters} L)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Zero-idle bypass via low-dwell intake bays
          </p>
        </div>

        {/* KPI 4: Pending Reroute Proposals */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Balancing Proposals</span>
            <GitBranch className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-indigo-400">
              {pendingCount}
            </span>
            <span className="text-xs text-slate-400">actions available ({appliedCount} applied)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Automated detour matching algorithm active
          </p>
        </div>
      </div>

      {/* Hub Capacity & Predictive Congestion Radar Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-indigo-400" />
              <span>Regional Hub Capacity & 8-Hour Predictive Congestion Radar</span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time intake load versus designed sorting throughput, dock dwell times, and predicted afternoon volume peaks.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forecasts.map((hub) => {
            const isCongested = hub.currentUtilizationPct >= 80 || hub.status === 'CONGESTED';
            const isCritical = hub.currentUtilizationPct >= 90;
            const isSelected = selectedHubId === hub.hubId;

            return (
              <div
                key={hub.hubId}
                onClick={() => setSelectedHubId(isSelected ? null : hub.hubId)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                  isCritical 
                    ? 'bg-rose-950/20 border-rose-500/50 hover:border-rose-400 shadow-md shadow-rose-950/30'
                    : isCongested
                    ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                } ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {hub.hubCode}
                      </span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-xs text-slate-300 font-semibold truncate max-w-[150px]">
                        {hub.hubType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100 mt-0.5 line-clamp-1">
                      {hub.hubName}
                    </h4>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isCritical
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : isCongested
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {hub.currentUtilizationPct}% LOAD
                  </span>
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">
                      {hub.currentLoad.toLocaleString()} / {hub.capacityDaily.toLocaleString()} pkgs
                    </span>
                    <span className={isCritical ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      Headroom: {hub.surplusCapacityPackages.toLocaleString()} pkgs
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCritical
                          ? 'bg-rose-500'
                          : isCongested
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, hub.currentUtilizationPct)}%` }}
                    />
                  </div>
                </div>

                {/* Loading Dock Dwell & Predictive Peak */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                  <div className="p-2 rounded-lg bg-slate-950/70 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Avg Gate Dwell:</span>
                    <span className={`font-mono font-bold text-xs ${
                      isCritical ? 'text-rose-400 animate-pulse' : isCongested ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      ~{hub.avgGateWaitMin} mins
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/70 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Forecast Peak:</span>
                    <span className="font-mono font-bold text-xs text-slate-200">
                      {hub.projectedPeakHour} ({hub.projectedPeakUtilizationPct}%)
                    </span>
                  </div>
                </div>

                {/* 8-Hour Hourly Trend Bar Visualization */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-500 font-mono block">
                    8-Hour Forecast Horizon:
                  </span>
                  <div className="flex items-end gap-1 h-7 w-full bg-slate-950/80 p-1 rounded-md">
                    {hub.hourlyForecast.map((hour, idx) => (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col justify-end items-center h-full group relative"
                      >
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            hour.risk === 'CRITICAL'
                              ? 'bg-rose-500'
                              : hour.risk === 'CONGESTED'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500/70'
                          }`}
                          style={{ height: `${Math.min(100, (hour.utilizationPct / 110) * 100)}%` }}
                        />
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 px-2 py-1 rounded bg-slate-800 text-[9px] font-mono text-white whitespace-nowrap shadow-lg">
                          {hour.hourLabel}: {hour.utilizationPct}% (~{hour.estimatedGateDwellMin}m dwell)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hub Actions */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500 font-mono">
                    Docks: {hub.activeDocks}/{hub.totalDocks}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSimulateSurge(hub.hubId);
                    }}
                    className="text-rose-400 hover:text-rose-300 font-medium hover:underline flex items-center gap-1"
                  >
                    <span>+2.4k Surge</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automated Vehicle Reroute Recommendations */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        {/* Section Header & Bulk Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-slate-100">
                Automated Vehicle Rerouting & Idle-Reduction Recommendations
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Algorithm matches vehicles targeting overloaded hubs with adjacent surplus hubs to bypass gate queues.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={handleBatchApplyReroutes}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/40 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Execute All Reroutes ({pendingCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg">
            {[
              { id: 'PENDING', label: `Pending Suggestions (${pendingCount})` },
              { id: 'APPLIED', label: `Applied / En Route (${appliedCount})` },
              { id: 'ALL', label: `All Proposals (${suggestions.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSuggestionFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  suggestionFilter === tab.id
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle number or hub..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Suggestion Cards */}
        {filteredSuggestions.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">
              No Hub Congestion Reroutes Needed
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All regional depots have sufficient loading dock throughput and vehicles are flowing without excessive gate idle time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuggestions.map((suggestion) => {
              const isApplied = suggestion.status === 'APPLIED';

              return (
                <div
                  key={suggestion.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    isApplied
                      ? 'bg-emerald-950/15 border-emerald-500/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-slate-100">
                        {suggestion.vehicleNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {suggestion.driverName}
                      </span>
                      <span className="text-slate-500 text-xs">·</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {suggestion.vehicleType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500 text-xs">·</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Load: {suggestion.currentLoadKg} / {suggestion.capacityKg} kg ({suggestion.parcelsOnboardCount} pkgs)
                      </span>
                    </div>

                    <div>
                      {isApplied ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <Check className="w-3.5 h-3.5" />
                          <span>REROUTE DISPATCHED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          <span>OPTIMAL ALTERNATIVE READY</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Diversion Trajectory Flow */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800/80">
                    {/* Current Congested Destination */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-rose-400 font-mono font-bold uppercase block">
                        Original Destination (Congested Gate)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {suggestion.currentDestinationHubName} ({suggestion.currentDestinationHubCode})
                        </span>
                        <span className="text-xs font-mono font-bold text-rose-400">
                          {suggestion.currentCongestionLevel}% Load
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-rose-400" />
                        <span>Projected Gate Dwell: <strong className="text-rose-300">~{suggestion.currentEstimatedWaitMin} mins idle</strong></span>
                      </p>
                    </div>

                    {/* Suggested Alternative Destination */}
                    <div className="space-y-1 md:border-l md:border-slate-800 md:pl-3">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase block">
                        Proposed Reroute (Open Docks)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {suggestion.suggestedHubName} ({suggestion.suggestedHubCode})
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {suggestion.suggestedCongestionLevel}% Load
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Projected Gate Dwell: <strong className="text-emerald-300">~{suggestion.suggestedEstimatedWaitMin} mins (Open)</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Quantitative Benefits Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">Idle Dwell Avoided:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        -{suggestion.idleTimeSavedMin} mins
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">Highway Detour:</span>
                      <span className="font-mono font-bold text-slate-300">
                        +{suggestion.distanceDeltaKm} km (+{suggestion.travelTimeDeltaMin}m)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">Net Time Saved:</span>
                      <span className="font-mono font-black text-indigo-400">
                        +{suggestion.netTimeSavedMin} mins net
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">Idling Fuel & CO₂:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {suggestion.idleFuelSavedLiters}L · {suggestion.co2SavedKg} kg
                      </span>
                    </div>
                  </div>

                  {/* Rationale & Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-slate-400 italic">
                      {suggestion.rationale}
                    </p>

                    <div className="flex items-center gap-2">
                      {!isApplied && (
                        <>
                          <button
                            onClick={() => handleDismissReroute(suggestion.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleApplyReroute(suggestion.id)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/30 transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Accept & Dispatch Reroute</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
