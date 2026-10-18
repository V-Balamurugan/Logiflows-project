import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Sliders, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  RotateCcw, 
  Calendar, 
  Warehouse, 
  Layers, 
  ChevronRight, 
  Info, 
  Save, 
  UserCheck, 
  ArrowUpRight,
  TrendingDown,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area
} from 'recharts';
import { BranchHub, Parcel, Employee } from '../../types';
import { 
  hubForecastService, 
  HourlyThroughputForecast, 
  ShiftSchedule, 
  HubForecastSummary 
} from '../../services/hubForecastService';
import { storage } from '../../services/storage';

interface Props {
  hubs: BranchHub[];
  selectedHubId?: string;
  onSelectHub?: (hubId: string) => void;
}

export const HubThroughputForecastModule: React.FC<Props> = ({
  hubs,
  selectedHubId: propSelectedHubId,
  onSelectHub,
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const parcels = useMemo(() => storage.getParcels(currentTenantId), [currentTenantId]);
  const employees = useMemo(() => storage.getEmployees(currentTenantId), [currentTenantId]);

  const [activeHubId, setActiveHubId] = useState<string>(() => {
    return propSelectedHubId || hubs[0]?.id || '';
  });

  // Keep synced if prop changes
  useEffect(() => {
    if (propSelectedHubId && propSelectedHubId !== activeHubId) {
      setActiveHubId(propSelectedHubId);
    }
  }, [propSelectedHubId]);

  const activeHub = useMemo(() => {
    return hubs.find((h) => h.id === activeHubId) || hubs[0];
  }, [hubs, activeHubId]);

  const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>(() => {
    if (!activeHub) return [];
    return hubForecastService.getShiftSchedules(activeHub.id);
  });

  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [autoBalancedNotice, setAutoBalancedNotice] = useState<string | null>(null);

  // Sync shifts when active hub changes
  useEffect(() => {
    if (activeHub) {
      setShiftSchedules(hubForecastService.getShiftSchedules(activeHub.id));
      setSelectedHour(null);
    }
  }, [activeHub?.id]);

  // Generate 24-hour forecast
  const forecast: HourlyThroughputForecast[] = useMemo(() => {
    if (!activeHub) return [];
    return hubForecastService.generate24HourForecast(activeHub, parcels);
  }, [activeHub, parcels, shiftSchedules]);

  // Compute summary metrics
  const summary: HubForecastSummary | null = useMemo(() => {
    if (!activeHub) return null;
    return hubForecastService.getForecastSummary(activeHub, parcels);
  }, [activeHub, parcels, shiftSchedules]);

  // Available station operators & employees
  const hubOperators = useMemo(() => {
    return employees.filter(
      (e) => e.role === 'HUB_OPERATOR' || e.role === 'DISPATCHER'
    );
  }, [employees]);

  // Handle Role Stepper adjustment in Shift
  const handleRoleCountChange = (
    shiftId: string,
    roleKey: keyof ShiftSchedule['roles'],
    delta: number
  ) => {
    if (!activeHub) return;
    const shift = shiftSchedules.find((s) => s.id === shiftId);
    if (!shift) return;

    const currentVal = shift.roles[roleKey];
    const newVal = Math.max(0, currentVal + delta);
    if (newVal === currentVal) return;

    const updatedRoles = {
      ...shift.roles,
      [roleKey]: newVal,
    };

    const updatedShift: ShiftSchedule = {
      ...shift,
      roles: updatedRoles,
      totalAllocatedStaff:
        updatedRoles.sorters +
        updatedRoles.inductOperators +
        updatedRoles.forkliftDrivers +
        updatedRoles.inspectors +
        updatedRoles.dispatchers,
    };

    const newShifts = hubForecastService.updateShift(activeHub.id, updatedShift);
    setShiftSchedules([...newShifts]);
  };

  // Handle Operational Directives / Notes change
  const handleShiftNotesChange = (shiftId: string, notes: string) => {
    if (!activeHub) return;
    const shift = shiftSchedules.find((s) => s.id === shiftId);
    if (!shift) return;

    const updatedShift: ShiftSchedule = {
      ...shift,
      operationalNotes: notes,
    };

    const newShifts = hubForecastService.updateShift(activeHub.id, updatedShift);
    setShiftSchedules([...newShifts]);
  };

  // Auto-Balance Shifts to match volume peaks
  const handleAutoBalance = () => {
    if (!activeHub) return;
    const balanced = hubForecastService.autoBalanceShifts(activeHub.id, forecast);
    setShiftSchedules([...balanced]);
    setAutoBalancedNotice(
      `Shift scheduling automatically re-aligned to absorb ${summary?.projectedPeakHour || 'projected'} peak volume surges!`
    );
    setTimeout(() => setAutoBalancedNotice(null), 5000);
  };

  // Save / Publish Shift Schedule confirmation
  const handleSaveAndPublish = () => {
    if (!activeHub) return;
    hubForecastService.saveShiftSchedules(activeHub.id, shiftSchedules);
    setSaveSuccessNotice(
      `Shift schedules for ${activeHub.code} (${activeHub.name}) successfully published and dispatched to station leads.`
    );
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  // Selected hour details
  const hourDetail = useMemo(() => {
    if (selectedHour === null) return null;
    return forecast.find((f) => f.hour === selectedHour) || null;
  }, [selectedHour, forecast]);

  // Identify peak hours
  const peakHoursList = useMemo(() => {
    return forecast.filter((f) => f.isPeak);
  }, [forecast]);

  if (!activeHub || !summary) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Hub Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30">
              PREDICTIVE VOLUME ENGINE · 24-HOUR HORIZON
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Real-Time Model</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Hub Throughput Forecast & Shift Planning</span>
          </h2>
          <p className="text-xs text-slate-400">
            Machine learning forecast of parcel intake & linehaul volume peaks over the next 24 hours. Proactively allocate sortation and induct staff shifts.
          </p>
        </div>

        {/* Hub Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1.5">
            <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Hub:</span>
          </span>
          {hubs.map((hub) => (
            <button
              key={hub.id}
              onClick={() => {
                setActiveHubId(hub.id);
                onSelectHub?.(hub.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                hub.id === activeHub.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span className="font-mono">{hub.code}</span>
              <span className="hidden sm:inline text-[11px] text-slate-300">({hub.city})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications / Toast Banners */}
      {autoBalancedNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{autoBalancedNotice}</span>
          </div>
          <button
            onClick={() => setAutoBalancedNotice(null)}
            className="text-emerald-400 hover:text-emerald-100 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveSuccessNotice && (
        <div className="p-4 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
          <button
            onClick={() => setSaveSuccessNotice(null)}
            className="text-indigo-400 hover:text-indigo-100 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 24h Projected Volume */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Projected 24h Volume</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-100">
              {summary.projected24hVolume.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {summary.dailyCapacity.toLocaleString()} cap
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Utilization:</span>
            <span className="font-mono font-bold text-indigo-300">
              {Math.round((summary.projected24hVolume / summary.dailyCapacity) * 100)}% of daily quota
            </span>
          </div>
        </div>

        {/* Card 2: Peak Hourly Surge */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Forecasted Peak Surge</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-amber-300">
              {summary.peakHourlyVolume.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">pkgs/hr</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Peak Window:</span>
            <span className="font-mono font-bold text-amber-400">
              {summary.projectedPeakHour} ({summary.peakUtilizationPct}%)
            </span>
          </div>
        </div>

        {/* Card 3: Staffing Coverage Index */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Staffing Coverage Index</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-100">
              {summary.totalStaffAllocated}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {summary.totalStaffRecommended} target
            </span>
            <span
              className={`ml-auto text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                summary.staffingHealthPct >= 95
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {summary.staffingHealthPct}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Status:</span>
            <span className="font-bold text-slate-300">
              {summary.totalStaffAllocated >= summary.totalStaffRecommended
                ? 'Fully Staffed'
                : `${summary.totalStaffRecommended - summary.totalStaffAllocated} Staff Deficit`}
            </span>
          </div>
        </div>

        {/* Card 4: Bottleneck Alert Risk */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Bottleneck Surge Risk</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-2xl font-bold ${summary.highRiskSurgeHoursCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {summary.highRiskSurgeHoursCount}
            </span>
            <span className="text-xs text-slate-400">Critical Hours</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Peak Windows:</span>
            <span className="font-mono text-slate-300">
              {peakHoursList.length} elevated hours (&gt;80%)
            </span>
          </div>
        </div>
      </div>

      {/* Main 24-Hour Predictive Hourly Histogram Chart */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">
                24-Hour Projected Volume & Throughput Histogram
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hourly inbound sortation vs outbound linehaul freight with nominal capacity threshold ({forecast[0]?.capacityLimit} pkgs/hr). Click any bar for hourly diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500 inline-block" />
              <span className="text-slate-300">Inbound Sort</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
              <span className="text-slate-300">Outbound Linehaul</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-[2px] bg-rose-400 inline-block" />
              <span className="text-rose-300">Capacity Ceiling</span>
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={forecast}
              margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  setSelectedHour(e.activePayload[0].payload.hour);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data: HourlyThroughputForecast = payload[0].payload;
                    return (
                      <div className="bg-slate-900/98 backdrop-blur-md p-3.5 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-2 max-w-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-100 font-mono">
                            {data.timeLabel} ({data.formattedHour})
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              data.riskLevel === 'CRITICAL_SURGE'
                                ? 'bg-rose-500/20 text-rose-400'
                                : data.riskLevel === 'ELEVATED'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {data.utilizationPct}% Cap
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Total Volume:</span>
                            <span className="font-mono font-bold text-slate-100">{data.totalVolume} pkgs</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Cap Limit:</span>
                            <span className="font-mono text-slate-300">{data.capacityLimit} pkgs/hr</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Inbound:</span>
                            <span className="font-mono text-indigo-300 font-semibold">{data.inboundVolume} pkgs</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Outbound:</span>
                            <span className="font-mono text-cyan-300 font-semibold">{data.outboundVolume} pkgs</span>
                          </div>
                        </div>

                        {/* Priority Breakdown */}
                        <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Same-Day Priority:</span>
                            <strong className="text-purple-300 font-mono">{data.priorityBreakdown.sameDay}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Next-Day Express:</span>
                            <strong className="text-indigo-300 font-mono">{data.priorityBreakdown.nextDay}</strong>
                          </div>
                        </div>

                        {/* Staffing Recommendation */}
                        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Staff On Duty:</span>
                          <span
                            className={`font-mono font-bold ${
                              data.staffDeficitOrSurplus < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {data.allocatedStaff} / {data.recommendedStaff} rec
                          </span>
                        </div>

                        {data.bottleneckNotice && (
                          <div className="p-2 rounded bg-rose-950/40 border border-rose-500/20 text-[10px] text-rose-300">
                            {data.bottleneckNotice}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={forecast[0]?.capacityLimit || 600}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Nominal Processing Ceiling',
                  fill: '#f43f5e',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <Bar dataKey="inboundVolume" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="outboundVolume" stackId="a" fill="#06b6d4" radius={[3, 3, 0, 0]} />
              <Line
                type="monotone"
                dataKey="totalVolume"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Selected Hour Detail Tray */}
        {hourDetail && (
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4 text-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono font-bold text-sm">
                {hourDetail.timeLabel}
              </div>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span>Inspection for Hour {hourDetail.timeLabel} ({hourDetail.formattedHour})</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      hourDetail.riskLevel === 'CRITICAL_SURGE'
                        ? 'bg-rose-500/20 text-rose-400'
                        : hourDetail.riskLevel === 'ELEVATED'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {hourDetail.utilizationPct}% Utilization
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                  <span>Volume: <strong className="text-slate-200">{hourDetail.totalVolume} pkgs</strong></span>
                  <span>Inbound: <strong className="text-indigo-400">{hourDetail.inboundVolume}</strong></span>
                  <span>Outbound: <strong className="text-cyan-400">{hourDetail.outboundVolume}</strong></span>
                  <span>Recommended Staff: <strong className="text-emerald-400">{hourDetail.recommendedStaff}</strong></span>
                  <span>Allocated Staff: <strong className={hourDetail.staffDeficitOrSurplus < 0 ? 'text-rose-400' : 'text-slate-200'}>{hourDetail.allocatedStaff}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedHour(null)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Proactive Staff Shift Scheduling Matrix */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100">
                Station Staff Shift Allocation & Peak Balancing
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Proactively adjust sortation, induct, and forklift operator shift rosters to match expected volume peaks and avoid dock staging bottlenecks.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Auto-Balance Button */}
            <button
              onClick={handleAutoBalance}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl shadow-lg transition-all hover:scale-[1.02]"
              title="Automatically distribute available staff across shifts based on forecasted hourly volume peaks"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Auto-Balance Shifts to Peaks</span>
            </button>

            {/* Save & Publish Button */}
            <button
              onClick={handleSaveAndPublish}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all hover:scale-[1.02]"
              title="Save shift schedule and dispatch roster to station managers"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Publish Shift Schedule</span>
            </button>
          </div>
        </div>

        {/* 3 Operational Shifts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {shiftSchedules.map((shift) => {
            const isDeficit = shift.totalAllocatedStaff < shift.recommendedStaff;
            const isSurplus = shift.totalAllocatedStaff > shift.recommendedStaff;

            return (
              <div
                key={shift.id}
                className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Shift Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                        {shift.timeWindow}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                        {shift.shiftName}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                        isDeficit
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : isSurplus
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isDeficit ? 'Deficit' : isSurplus ? 'Surplus' : 'Optimal'}
                    </span>
                  </div>

                  {/* Volume Callout */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Projected Volume:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {shift.projectedVolume.toLocaleString()} pkgs
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Peak Window:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {shift.peakHourLabel} ({shift.peakVolume} pkgs/h)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Headcount Counter & Progress */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Allocated / Recommended:</span>
                    <span className="font-mono font-bold text-slate-200">
                      <span className={isDeficit ? 'text-rose-400' : 'text-emerald-400'}>
                        {shift.totalAllocatedStaff}
                      </span>{' '}
                      / {shift.recommendedStaff} Staff
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isDeficit ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (shift.totalAllocatedStaff / shift.recommendedStaff) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Interactive Station Role Breakdown Controls */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                    Station Roles Configuration
                  </span>

                  {/* Sorters */}
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
                    <span className="text-slate-300">Parcel Sorters</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'sorters', -1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-slate-100 w-5 text-center">
                        {shift.roles.sorters}
                      </span>
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'sorters', 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Induct Operators */}
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
                    <span className="text-slate-300">Induct Scanners</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'inductOperators', -1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-slate-100 w-5 text-center">
                        {shift.roles.inductOperators}
                      </span>
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'inductOperators', 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Forklift Drivers */}
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
                    <span className="text-slate-300">Forklift / Staging</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'forkliftDrivers', -1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-slate-100 w-5 text-center">
                        {shift.roles.forkliftDrivers}
                      </span>
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'forkliftDrivers', 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Customs / QC Inspectors */}
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
                    <span className="text-slate-300">QC & Customs</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'inspectors', -1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-slate-100 w-5 text-center">
                        {shift.roles.inspectors}
                      </span>
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'inspectors', 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Dispatchers */}
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
                    <span className="text-slate-300">Dock Dispatchers</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'dispatchers', -1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-slate-100 w-5 text-center">
                        {shift.roles.dispatchers}
                      </span>
                      <button
                        onClick={() => handleRoleCountChange(shift.id, 'dispatchers', 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Handling Capacity Metric */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Peak Processing Rate:</span>
                  <span className="font-mono font-bold text-indigo-300">
                    ~{(shift.roles.sorters * 65 + shift.roles.inductOperators * 110)} pkgs/hr
                  </span>
                </div>

                {/* Manager Directives & Notes */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <label className="text-[10px] text-slate-500 uppercase font-mono block">
                    Station Manager Directives:
                  </label>
                  <input
                    type="text"
                    value={shift.operationalNotes}
                    onChange={(e) => handleShiftNotesChange(shift.id, e.target.value)}
                    placeholder="Add operational directives for shift lead..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
