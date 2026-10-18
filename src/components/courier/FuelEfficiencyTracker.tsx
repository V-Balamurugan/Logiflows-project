import React, { useState, useMemo } from 'react';
import { 
  Fuel, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Gauge, 
  Calendar, 
  Plus, 
  Download, 
  Trash2, 
  Leaf, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Car
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { RouteFuelLogEntry, Vehicle } from '../../types';
import { storage } from '../../services/storage';
import { CURRENT_SPOT_PRICES } from '../../services/fuelConsumptionService';
import { LogRouteFuelModal } from './LogRouteFuelModal';

interface Props {
  courierId: string;
  courierName: string;
  assignedVehicleId?: string;
  vehicles: Vehicle[];
}

type MetricMode = 'EFFICIENCY' | 'CONSUMPTION_DISTANCE' | 'COST_EMISSIONS';
type TimeframeFilter = '7D' | '14D' | 'ALL';

export const FuelEfficiencyTracker: React.FC<Props> = ({
  courierId,
  courierName,
  assignedVehicleId,
  vehicles,
}) => {
  const currentTenantId = storage.getActiveTenantId();

  // Storage synced route logs
  const [logs, setLogs] = useState<RouteFuelLogEntry[]>(() =>
    storage.getRouteFuelLogs(currentTenantId, courierId)
  );

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [metricMode, setMetricMode] = useState<MetricMode>('EFFICIENCY');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('14D');
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Re-sync with storage changes
  React.useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setLogs(storage.getRouteFuelLogs(currentTenantId, courierId));
    });
    return unsubscribe;
  }, [currentTenantId, courierId]);

  // Determine active vehicle
  const activeVehicle = useMemo(() => {
    if (assignedVehicleId) {
      const match = vehicles.find((v) => v.id === assignedVehicleId);
      if (match) return match;
    }
    const driverMatch = vehicles.find((v) => v.driverId === courierId);
    return driverMatch || vehicles[0] || null;
  }, [vehicles, assignedVehicleId, courierId]);

  const fuelUnit = activeVehicle?.fuelType === 'ELECTRIC' ? 'kWh' : 'L';
  const targetBenchmark = activeVehicle?.avgConsumptionPer100Km || (activeVehicle?.fuelType === 'ELECTRIC' ? 28.5 : 11.2);

  // Filtered and chronological data for charts (oldest to newest)
  const chartData = useMemo(() => {
    // Sort oldest first for proper left-to-right line timeline
    const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (timeframe === '7D') {
      return sorted.slice(-7);
    }
    if (timeframe === '14D') {
      return sorted.slice(-14);
    }
    return sorted;
  }, [logs, timeframe]);

  // Summary Metrics Aggregations
  const summaryStats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        avgEfficiency: targetBenchmark,
        efficiencyDeltaPct: 0,
        totalDistanceKm: 0,
        totalFuelConsumed: 0,
        totalCostUsd: 0,
        estimatedDieselCostSavings: 0,
        avgEcoScore: 90,
        bestRoute: null,
      };
    }

    const totalDistance = chartData.reduce((s, r) => s + r.distanceKm, 0);
    const totalFuel = chartData.reduce((s, r) => s + r.fuelConsumed, 0);
    const totalCost = chartData.reduce((s, r) => s + r.fuelCostUsd, 0);
    const avgScore = Math.round(chartData.reduce((s, r) => s + r.ecoScore, 0) / chartData.length);
    
    // Weighted avg efficiency: (totalFuel / totalDistance) * 100
    const weightedEfficiency = totalDistance > 0 ? +((totalFuel / totalDistance) * 100).toFixed(2) : targetBenchmark;
    const deltaPct = +(((weightedEfficiency - targetBenchmark) / targetBenchmark) * 100).toFixed(1);

    // Calculate baseline diesel comparison (standard 11.5 L/100km @ $1.25/L)
    const dieselEquivalentLiters = (totalDistance / 100) * 11.5;
    const dieselCost = dieselEquivalentLiters * CURRENT_SPOT_PRICES.dieselPerLiter;
    const savings = Math.max(0, +(dieselCost - totalCost).toFixed(2));

    // Best route (lowest consumption / best delta)
    const sortedByEfficiency = [...chartData].sort((a, b) => a.efficiency - b.efficiency);
    const bestRoute = sortedByEfficiency[0];

    return {
      avgEfficiency: weightedEfficiency,
      efficiencyDeltaPct: deltaPct,
      totalDistanceKm: Math.round(totalDistance),
      totalFuelConsumed: +totalFuel.toFixed(1),
      totalCostUsd: +totalCost.toFixed(2),
      estimatedDieselCostSavings: savings,
      avgEcoScore: avgScore,
      bestRoute,
    };
  }, [chartData, targetBenchmark]);

  // Delete a route fuel log
  const handleDeleteLog = (id: string, routeName: string) => {
    if (storage.deleteRouteFuelLog(id)) {
      setToastMessage(`Deleted fuel log for ${routeName}.`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Route Code',
      'Route Name',
      'Date',
      'Vehicle',
      'Fuel Type',
      `Distance (km)`,
      `Fuel Consumed (${fuelUnit})`,
      `Efficiency (${fuelUnit}/100km)`,
      `Target Benchmark (${fuelUnit}/100km)`,
      'Delta %',
      'Cost ($ USD)',
      'CO2 (kg)',
      'Completed Stops',
      'Traffic',
      'Eco Score',
      'Notes',
    ];

    const rows = logs.map((l) => [
      l.routeCode,
      `"${l.routeName.replace(/"/g, '""')}"`,
      l.date,
      l.vehicleNumber,
      l.fuelType,
      l.distanceKm,
      l.fuelConsumed,
      l.efficiency,
      l.targetEfficiency,
      l.efficiencyDeltaPct,
      l.fuelCostUsd,
      l.co2EmissionsKg,
      l.stopsCount,
      l.trafficConditions,
      l.ecoScore,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `logiflows_fuel_efficiency_${courierId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage('Exported route fuel efficiency log to CSV.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: RouteFuelLogEntry = payload[0].payload;
      return (
        <div className="p-3.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs animate-fade-in z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="font-bold text-slate-100 font-mono text-[11px] block">
                {data.routeCode} · {data.displayDate}
              </span>
              <span className="text-[11px] text-slate-400 line-clamp-1">
                {data.routeName}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Score: {data.ecoScore}/100
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Efficiency Rate</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {data.efficiency} <span className="text-[10px] text-slate-400 font-normal">{data.fuelUnit}/100km</span>
              </span>
              <span className={`block text-[10px] font-mono ${data.efficiencyDeltaPct <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {data.efficiencyDeltaPct <= 0 ? `${Math.abs(data.efficiencyDeltaPct)}% better` : `+${data.efficiencyDeltaPct}% higher`}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">Energy & Distance</span>
              <span className="font-mono font-bold text-slate-200">
                {data.fuelConsumed} {data.fuelUnit}
              </span>
              <span className="block text-[10px] font-mono text-slate-400">
                over {data.distanceKm} km ({data.stopsCount} stops)
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">Fuel Cost</span>
              <span className="font-mono font-bold text-indigo-300">
                ${data.fuelCostUsd}
              </span>
              <span className="block text-[10px] font-mono text-slate-400">
                (${data.costPerKmUsd}/km)
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">Vehicle & Traffic</span>
              <span className="font-mono font-semibold text-slate-300">
                {data.vehicleNumber}
              </span>
              <span className="block text-[10px] text-slate-400">
                {data.trafficConditions} Traffic
              </span>
            </div>
          </div>

          {data.notes && (
            <p className="text-[10px] text-slate-400 italic bg-slate-950/80 p-1.5 rounded border border-slate-800 line-clamp-2">
              "{data.notes}"
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 animate-fade-in">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              FLEET TELEMETRY · COURIER ECO-DRIVE ENGINE
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              {activeVehicle?.vehicleNumber || 'APX-EV-101'} ({fuelUnit})
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <span>Route Fuel & Energy Efficiency Tracker</span>
            <span className="text-xs text-slate-400 font-normal">
              · {logs.length} logged shifts
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoring per-route consumption rates, benchmark variances, spot expense tracking, and driver eco-ratings.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Download Route Fuel History as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowHistoryTable(!showHistoryTable)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <span>{showHistoryTable ? 'Hide Table' : 'History Table'}</span>
            {showHistoryTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Log Route Fuel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Average Efficiency Rate */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Avg Fuel Efficiency</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 flex items-baseline gap-1.5">
            {summaryStats.avgEfficiency}
            <span className="text-xs text-slate-400 font-normal">{fuelUnit}/100km</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {summaryStats.efficiencyDeltaPct <= 0 ? (
              <span className="text-emerald-400 flex items-center font-bold">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                {Math.abs(summaryStats.efficiencyDeltaPct)}% more efficient
              </span>
            ) : (
              <span className="text-amber-400 flex items-center font-bold">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                +{summaryStats.efficiencyDeltaPct}% vs benchmark
              </span>
            )}
            <span className="text-slate-500">({targetBenchmark} target)</span>
          </div>
        </div>

        {/* KPI 2: Total Fuel & Distance */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Fuel & Distance</span>
            {activeVehicle?.fuelType === 'ELECTRIC' ? <Zap className="w-4 h-4 text-amber-400" /> : <Fuel className="w-4 h-4 text-indigo-400" />}
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 flex items-baseline gap-1.5">
            {summaryStats.totalFuelConsumed}
            <span className="text-xs text-slate-400 font-normal">{fuelUnit}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Across <strong className="text-slate-200">{summaryStats.totalDistanceKm} km</strong> on {chartData.length} shifts
          </div>
        </div>

        {/* KPI 3: Fuel Expense & Cost Savings */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Fuel Expense & Savings</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-baseline gap-1.5">
            ${summaryStats.totalCostUsd}
          </div>
          <div className="text-[11px] text-slate-400">
            Saved <strong className="text-emerald-400 font-mono">${summaryStats.estimatedDieselCostSavings}</strong> vs diesel equivalent
          </div>
        </div>

        {/* KPI 4: Driver Eco-Score */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Driver Eco-Score</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-yellow-300 flex items-baseline gap-1.5">
            {summaryStats.avgEcoScore}
            <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5" />
            <span>Tier 1 Exemplary Eco-Driver</span>
          </div>
        </div>
      </div>

      {/* Chart Section Header with Metric and Timeframe Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Metric Mode Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setMetricMode('EFFICIENCY')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
              metricMode === 'EFFICIENCY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Efficiency Rate ({fuelUnit}/100km)</span>
          </button>

          <button
            onClick={() => setMetricMode('CONSUMPTION_DISTANCE')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
              metricMode === 'CONSUMPTION_DISTANCE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fuel & Distance</span>
          </button>

          <button
            onClick={() => setMetricMode('COST_EMISSIONS')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1.5 ${
              metricMode === 'COST_EMISSIONS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Cost & Emissions</span>
          </button>
        </div>

        {/* Timeframe Scope Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          {(['7D', '14D', 'ALL'] as TimeframeFilter[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-all ${
                timeframe === tf
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tf === '7D' ? 'Last 7 Shifts' : tf === '14D' ? 'Last 14 Shifts' : 'All Recorded'}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Line Chart Container */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metricMode === 'EFFICIENCY' ? (
              <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#64748b" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={{ stroke: '#334155' }}
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor(dataMin - 3)),
                    (dataMax: number) => Math.ceil(dataMax + 3),
                  ]}
                  unit={` ${fuelUnit}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                />
                
                {/* Target Benchmark Reference Line */}
                <ReferenceLine 
                  y={targetBenchmark} 
                  stroke="#6366f1" 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ 
                    value: `Fleet Target (${targetBenchmark} ${fuelUnit}/100km)`, 
                    fill: '#a5b4fc', 
                    fontSize: 10, 
                    position: 'insideTopRight' 
                  }} 
                />

                <Line
                  name={`Actual Efficiency (${fuelUnit}/100km)`}
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: '#064e3b', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            ) : metricMode === 'CONSUMPTION_DISTANCE' ? (
              <LineChart data={chartData} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#64748b" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#f59e0b" 
                  tick={{ fontSize: 11, fill: '#fbbf24' }}
                  tickLine={{ stroke: '#334155' }}
                  unit={` ${fuelUnit}`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#38bdf8" 
                  tick={{ fontSize: 11, fill: '#7dd3fc' }}
                  tickLine={{ stroke: '#334155' }}
                  unit=" km"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                />
                
                <Line
                  yAxisId="left"
                  name={`Fuel Consumed (${fuelUnit})`}
                  type="monotone"
                  dataKey="fuelConsumed"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b', stroke: '#78350f', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#fbbf24' }}
                />

                <Line
                  yAxisId="right"
                  name="Distance Traveled (km)"
                  type="monotone"
                  dataKey="distanceKm"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#38bdf8', stroke: '#0c4a6e', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#7dd3fc' }}
                />
              </LineChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#64748b" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  yAxisId="cost"
                  stroke="#10b981" 
                  tick={{ fontSize: 11, fill: '#34d399' }}
                  tickLine={{ stroke: '#334155' }}
                  unit=" $"
                />
                <YAxis 
                  yAxisId="co2"
                  orientation="right"
                  stroke="#94a3b8" 
                  tick={{ fontSize: 11, fill: '#cbd5e1' }}
                  tickLine={{ stroke: '#334155' }}
                  unit=" kg"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                />

                <Line
                  yAxisId="cost"
                  name="Fuel Cost ($ USD)"
                  type="monotone"
                  dataKey="fuelCostUsd"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: '#064e3b', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#34d399' }}
                />

                <Line
                  yAxisId="co2"
                  name="CO₂ Emissions (kg)"
                  type="monotone"
                  dataKey="co2EmissionsKg"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#94a3b8', stroke: '#1e293b', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#f1f5f9' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Footer Insight */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Best Route on record: <strong className="text-slate-200">{summaryStats.bestRoute?.routeName || 'SFO Transit'}</strong> ({summaryStats.bestRoute?.efficiency} {fuelUnit}/100km · Eco-Score {summaryStats.bestRoute?.ecoScore}/100).
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            Regenerative braking telemetry updated in real-time
          </span>
        </div>
      </div>

      {/* History Table (Collapsible) */}
      {showHistoryTable && (
        <div className="space-y-3 pt-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Logged Route Itineraries History ({logs.length})
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              Stored locally & synced with fleet dispatch
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Route & Code</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Vehicle</th>
                  <th className="py-2.5 px-3 font-semibold">Distance</th>
                  <th className="py-2.5 px-3 font-semibold">Fuel Consumed</th>
                  <th className="py-2.5 px-3 font-semibold">Efficiency Rate</th>
                  <th className="py-2.5 px-3 font-semibold">Cost ($)</th>
                  <th className="py-2.5 px-3 font-semibold">Eco-Score</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-200">{log.routeName}</div>
                      <span className="text-[10px] font-mono text-indigo-400">{log.routeCode}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {log.displayDate}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {log.vehicleNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200">
                      {log.distanceKm} km
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-400">
                      {log.fuelConsumed} {log.fuelUnit}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-emerald-400">
                        {log.efficiency} {log.fuelUnit}/100km
                      </div>
                      <span className={`text-[10px] font-mono ${log.efficiencyDeltaPct <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {log.efficiencyDeltaPct <= 0 ? `${Math.abs(log.efficiencyDeltaPct)}% better` : `+${log.efficiencyDeltaPct}%`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200 font-semibold">
                      ${log.fuelCostUsd}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        log.ecoScore >= 90
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : log.ecoScore >= 80
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {log.ecoScore} / 100
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteLog(log.id, log.routeName)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Route Fuel Modal */}
      <LogRouteFuelModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        vehicles={vehicles}
        assignedVehicleId={assignedVehicleId}
        courierId={courierId}
        courierName={courierName}
        onLogSaved={(newEntry) => {
          setToastMessage(`Saved route fuel log for ${newEntry.routeName}.`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />
    </div>
  );
};
