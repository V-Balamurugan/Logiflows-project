import React, { useState, useMemo } from 'react';
import { 
  Fuel, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Gauge, 
  Calendar, 
  Download, 
  Sliders, 
  Leaf, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowUpRight,
  Filter,
  RefreshCw
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
  AreaChart,
  Area
} from 'recharts';
import { Vehicle } from '../../types';
import { 
  fuelConsumptionService, 
  HISTORICAL_FUEL_PRICES, 
  CURRENT_SPOT_PRICES, 
  VehicleConsumptionRecord 
} from '../../services/fuelConsumptionService';

interface Props {
  vehicles: Vehicle[];
}

export const FleetFuelConsumptionMonitor: React.FC<Props> = ({ vehicles }) => {
  const [unitSystem, setUnitSystem] = useState<'METRIC' | 'IMPERIAL'>('METRIC');
  const [projectionScope, setProjectionScope] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [mileageSurgeFactor, setMileageSurgeFactor] = useState<number>(1.0);
  const [priceScenario, setPriceScenario] = useState<'SPOT' | 'AVG_30D' | 'SURGE_PLUS_15' | 'GREEN_OFFPEAK'>('SPOT');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<'ALL' | 'ELECTRIC' | 'DIESEL' | 'UNLEADED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState(false);

  // Compute active price basis based on scenario
  const activePriceBasis = useMemo(() => {
    if (priceScenario === 'AVG_30D') {
      const avgDiesel = HISTORICAL_FUEL_PRICES.reduce((s, p) => s + p.dieselPerLiter, 0) / HISTORICAL_FUEL_PRICES.length;
      const avgUnleaded = HISTORICAL_FUEL_PRICES.reduce((s, p) => s + p.unleadedPerLiter, 0) / HISTORICAL_FUEL_PRICES.length;
      const avgElec = HISTORICAL_FUEL_PRICES.reduce((s, p) => s + p.electricityPerKWh, 0) / HISTORICAL_FUEL_PRICES.length;
      return {
        dieselPerLiter: +avgDiesel.toFixed(2),
        unleadedPerLiter: +avgUnleaded.toFixed(2),
        electricityPerKWh: +avgElec.toFixed(2),
      };
    }
    if (priceScenario === 'SURGE_PLUS_15') {
      return {
        dieselPerLiter: +(CURRENT_SPOT_PRICES.dieselPerLiter * 1.15).toFixed(2),
        unleadedPerLiter: +(CURRENT_SPOT_PRICES.unleadedPerLiter * 1.15).toFixed(2),
        electricityPerKWh: +(CURRENT_SPOT_PRICES.electricityPerKWh * 1.15).toFixed(2),
      };
    }
    if (priceScenario === 'GREEN_OFFPEAK') {
      return {
        dieselPerLiter: CURRENT_SPOT_PRICES.dieselPerLiter,
        unleadedPerLiter: CURRENT_SPOT_PRICES.unleadedPerLiter,
        electricityPerKWh: 0.14, // Green solar off-peak charging
      };
    }
    return CURRENT_SPOT_PRICES;
  }, [priceScenario]);

  // Calculate fleet consumption records & summary
  const { records, summary } = useMemo(() => {
    return fuelConsumptionService.calculateFleetSummary(
      vehicles,
      activePriceBasis,
      mileageSurgeFactor
    );
  }, [vehicles, activePriceBasis, mileageSurgeFactor]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesFuel = fuelTypeFilter === 'ALL' || r.fuelType === fuelTypeFilter;
      const matchesSearch =
        r.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFuel && matchesSearch;
    });
  }, [records, fuelTypeFilter, searchQuery]);

  // Projected Cost for selected timeframe
  const displayTotalCost = useMemo(() => {
    if (projectionScope === 'DAILY') return summary.totalDailyCostUsd;
    if (projectionScope === 'WEEKLY') return +(summary.totalDailyCostUsd * 6).toFixed(2);
    if (projectionScope === 'MONTHLY') return summary.totalMonthlyCostUsd;
    return summary.totalAnnualProjectedCostUsd;
  }, [summary, projectionScope]);

  const displayTotalDistance = useMemo(() => {
    const km =
      projectionScope === 'DAILY'
        ? summary.totalDailyMileageKm
        : projectionScope === 'WEEKLY'
        ? summary.totalDailyMileageKm * 6
        : projectionScope === 'MONTHLY'
        ? summary.totalMonthlyMileageKm
        : summary.totalMonthlyMileageKm * 12;

    return unitSystem === 'METRIC' ? km : Math.round(km * 0.621371);
  }, [summary, projectionScope, unitSystem]);

  const displayCostPerDistance = useMemo(() => {
    if (unitSystem === 'METRIC') return summary.fleetAvgCostPerKmUsd;
    return +(summary.fleetAvgCostPerKmUsd / 0.621371).toFixed(3);
  }, [summary, unitSystem]);

  // CSV export handler
  const handleExportCsv = () => {
    setIsExportingCsv(true);
    setCsvSuccess(false);

    try {
      const headers = [
        'Vehicle Number',
        'Vehicle Model',
        'Assigned Driver',
        'Power Type',
        'Odometer (km)',
        'Daily Distance (km)',
        'Monthly Distance (km)',
        'Consumption Rate',
        'Daily Units Burned',
        'Monthly Units Burned',
        'Daily Cost ($)',
        'Monthly Projected Cost ($)',
        'Cost Per Km ($)',
        'Daily CO2 (kg)',
        'Efficiency Status'
      ].join(',') + '\n';

      const rows = records.map((r) => [
        `"${r.vehicleNumber}"`,
        `"${r.type}"`,
        `"${r.driverName}"`,
        r.fuelType,
        r.odometerKm,
        r.dailyMileageKm,
        r.monthlyMileageKm,
        `"${r.consumptionPer100Km} ${r.unitLabel}/100km"`,
        r.dailyUnitsConsumed,
        r.monthlyUnitsConsumed,
        r.dailyCostUsd,
        r.monthlyCostUsd,
        r.costPerKmUsd,
        r.carbonEmittedKgDaily,
        r.efficiencyRating
      ].join(',')).join('\n');

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fleet-fuel-consumption-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setCsvSuccess(true);
      setTimeout(() => setCsvSuccess(false), 3000);
    } catch (err) {
      console.error('Failed generating fuel audit CSV:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Scenario Controls */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg">
              <Fuel className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">
                  Fleet Fuel & Energy Consumption Intelligence
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  REAL-TIME AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculates projected commercial fuel and kilowatt-hour expenses using odometer telemetry, corridor mileage, and historical spot pricing.
              </p>
            </div>
          </div>

          {/* Unit & Scope Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Unit system toggle */}
            <div className="flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setUnitSystem('METRIC')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  unitSystem === 'METRIC' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Metric (km · L)
              </button>
              <button
                onClick={() => setUnitSystem('IMPERIAL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  unitSystem === 'IMPERIAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Imperial (mi · gal)
              </button>
            </div>

            {/* Scope toggle */}
            <div className="flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold">
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => setProjectionScope(sc)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    projectionScope === sc ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sc.charAt(0) + sc.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* CSV export */}
            <button
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                csvSuccess
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Download detailed fuel consumption audit CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{csvSuccess ? 'Exported CSV!' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Scenario Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          {/* Price Scenario Selector */}
          <div className="md:col-span-6 flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Price Telemetry Basis:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setPriceScenario('SPOT')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  priceScenario === 'SPOT'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                Current Spot ($1.25/L Diesel)
              </button>
              <button
                onClick={() => setPriceScenario('AVG_30D')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  priceScenario === 'AVG_30D'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                30-Day Moving Avg
              </button>
              <button
                onClick={() => setPriceScenario('SURGE_PLUS_15')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  priceScenario === 'SURGE_PLUS_15'
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                Surge Spike (+15%)
              </button>
              <button
                onClick={() => setPriceScenario('GREEN_OFFPEAK')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  priceScenario === 'GREEN_OFFPEAK'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                Off-Peak Green Solar ($0.14/kWh)
              </button>
            </div>
          </div>

          {/* Mileage Surge Multiplier Slider */}
          <div className="md:col-span-6 flex items-center justify-between md:justify-end gap-3 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[11px] font-semibold whitespace-nowrap">
              Mileage Multiplier: <strong className="text-indigo-300 font-mono">{mileageSurgeFactor.toFixed(2)}x</strong>
            </span>
            <input
              type="range"
              min="0.75"
              max="1.50"
              step="0.05"
              value={mileageSurgeFactor}
              onChange={(e) => setMileageSurgeFactor(parseFloat(e.target.value))}
              className="w-36 accent-indigo-500 cursor-pointer"
            />
            <button
              onClick={() => setMileageSurgeFactor(1.0)}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline font-mono"
            >
              Reset 1.0x
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {/* Total Projected Cost */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Projected {projectionScope} Cost
            </span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400">
            ${displayTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Across {vehicles.length} active fleet assets
          </span>
        </div>

        {/* Cost Per Distance */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Fleet Avg Cost / {unitSystem === 'METRIC' ? 'km' : 'mi'}
            </span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-indigo-300">
            ${displayCostPerDistance.toFixed(3)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Blended fuel & electric average
          </span>
        </div>

        {/* Total Distance */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Projected Fleet Distance
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-100">
            {displayTotalDistance.toLocaleString()} {unitSystem === 'METRIC' ? 'km' : 'mi'}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {projectionScope.toLowerCase()} corridor route coverage
          </span>
        </div>

        {/* Monthly EV Savings */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Electric Fleet Savings
            </span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400">
            +${summary.monthlySavingsFromEVUsd.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-500/90 font-semibold mt-0.5 block">
            {summary.electricFleetPercentage}% EV fleet share vs diesel
          </span>
        </div>

        {/* Carbon Offset */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md col-span-2 md:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              CO2 Avoided
            </span>
            <Leaf className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-300">
            {summary.monthlyCO2AvoidedKg.toLocaleString()} kg
          </div>
          <span className="text-[11px] text-teal-500 font-semibold mt-0.5 block">
            Monthly carbon emissions avoided
          </span>
        </div>
      </div>

      {/* Historical Fuel Price Telemetry & Trend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Historical Price Trend Graph (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Commercial Fuel & Energy Spot Price History</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (30-Day California Commercial Fleet Index)
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tracks ultra-low sulfur commercial diesel ($/L), fleet unleaded ($/L), and off-peak charging ($/kWh).
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Diesel ($1.25/L)
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                Unleaded ($1.12/L)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                EV Grid ($0.19/kWh)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORICAL_FUEL_PRICES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dieselGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="unleadedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 1.6]} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any, name: any) => [
                    `$${Number(val).toFixed(2)}`,
                    name === 'dieselPerLiter'
                      ? 'Diesel (Per Liter)'
                      : name === 'unleadedPerLiter'
                      ? 'Unleaded (Per Liter)'
                      : 'Commercial Grid (Per kWh)',
                  ]}
                />
                <Area type="monotone" dataKey="dieselPerLiter" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#dieselGrad)" />
                <Area type="monotone" dataKey="unleadedPerLiter" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#unleadedGrad)" />
                <Line type="monotone" dataKey="electricityPerKWh" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Projected Cost Fuel Mix Breakdown (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Fuel Cost Mix & Efficiency Breakdown</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Distribution of projected monthly energy expenditure by powertrain category.
            </p>
          </div>

          <div className="space-y-3">
            {/* Diesel fleet slice */}
            {(() => {
              const dieselRecords = records.filter((r) => r.fuelType === 'DIESEL');
              const dieselTotal = dieselRecords.reduce((s, r) => s + r.monthlyCostUsd, 0);
              const dieselPct = summary.totalMonthlyCostUsd > 0 ? Math.round((dieselTotal / summary.totalMonthlyCostUsd) * 100) : 0;
              return (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      Diesel Heavy & Vans ({dieselRecords.length})
                    </span>
                    <span className="font-mono font-bold text-amber-400">${dieselTotal.toLocaleString()} ({dieselPct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${dieselPct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Electric EV slice */}
            {(() => {
              const evRecords = records.filter((r) => r.fuelType === 'ELECTRIC');
              const evTotal = evRecords.reduce((s, r) => s + r.monthlyCostUsd, 0);
              const evPct = summary.totalMonthlyCostUsd > 0 ? Math.round((evTotal / summary.totalMonthlyCostUsd) * 100) : 0;
              return (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Electric Vans & Cargo Bikes ({evRecords.length})
                    </span>
                    <span className="font-mono font-bold text-emerald-400">${evTotal.toLocaleString()} ({evPct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${evPct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Unleaded Gasoline slice */}
            {(() => {
              const gasRecords = records.filter((r) => r.fuelType === 'UNLEADED');
              const gasTotal = gasRecords.reduce((s, r) => s + r.monthlyCostUsd, 0);
              const gasPct = summary.totalMonthlyCostUsd > 0 ? Math.round((gasTotal / summary.totalMonthlyCostUsd) * 100) : 0;
              return (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                      Unleaded Fleet Vans ({gasRecords.length})
                    </span>
                    <span className="font-mono font-bold text-indigo-400">${gasTotal.toLocaleString()} ({gasPct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${gasPct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Transitioning 2 additional diesel vans to EV is projected to yield an estimated <strong>${(summary.monthlySavingsFromEVUsd * 0.45).toFixed(0)}/month</strong> in net energy operational savings.
            </p>
          </div>
        </div>
      </div>

      {/* Vehicle-by-Vehicle Consumption Audit Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Vehicle Mileage & Projected Fuel Expense Audit</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual vehicle telemetry, odometer readings, fuel burn, and projected operational cost.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search vehicle or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-48"
            />

            <div className="flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              {(['ALL', 'ELECTRIC', 'DIESEL', 'UNLEADED'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFuelTypeFilter(type)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    fuelTypeFilter === type ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'ALL' ? 'All Powertrains' : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Vehicle & Model</th>
                <th className="p-3">Assigned Driver</th>
                <th className="p-3">Powertrain</th>
                <th className="p-3 text-right">Odometer</th>
                <th className="p-3 text-right">Active Mileage</th>
                <th className="p-3 text-right">Consumption Rate</th>
                <th className="p-3 text-right">Projected Cost ({projectionScope.toLowerCase()})</th>
                <th className="p-3 text-right">Cost / {unitSystem === 'METRIC' ? 'km' : 'mi'}</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono text-[11px]">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => {
                  const odoDisplay = unitSystem === 'METRIC' ? r.odometerKm : Math.round(r.odometerKm * 0.621371);
                  const periodDist =
                    projectionScope === 'DAILY'
                      ? r.dailyMileageKm
                      : projectionScope === 'WEEKLY'
                      ? r.weeklyMileageKm
                      : projectionScope === 'MONTHLY'
                      ? r.monthlyMileageKm
                      : r.monthlyMileageKm * 12;
                  const distDisplay = unitSystem === 'METRIC' ? periodDist : Math.round(periodDist * 0.621371);

                  const periodCost =
                    projectionScope === 'DAILY'
                      ? r.dailyCostUsd
                      : projectionScope === 'WEEKLY'
                      ? r.weeklyCostUsd
                      : projectionScope === 'MONTHLY'
                      ? r.monthlyCostUsd
                      : +(r.monthlyCostUsd * 12).toFixed(2);

                  const costPerDist =
                    unitSystem === 'METRIC' ? r.costPerKmUsd : +(r.costPerKmUsd / 0.621371).toFixed(3);

                  return (
                    <tr key={r.vehicleId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-sans">
                        <div className="font-bold text-slate-100 font-mono text-xs">{r.vehicleNumber}</div>
                        <span className="text-[10px] text-slate-400">{r.type.replace(/_/g, ' ')}</span>
                      </td>

                      <td className="p-3 font-sans text-slate-300">
                        {r.driverName}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            r.fuelType === 'ELECTRIC'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : r.fuelType === 'DIESEL'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}
                        >
                          {r.fuelType}
                        </span>
                      </td>

                      <td className="p-3 text-right text-slate-300 font-mono">
                        {odoDisplay.toLocaleString()} {unitSystem === 'METRIC' ? 'km' : 'mi'}
                      </td>

                      <td className="p-3 text-right text-indigo-300 font-mono font-bold">
                        {distDisplay.toLocaleString()} {unitSystem === 'METRIC' ? 'km' : 'mi'}
                      </td>

                      <td className="p-3 text-right text-slate-300 font-mono">
                        {r.consumptionPer100Km} {r.unitLabel}/100km
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-amber-400">
                        ${periodCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-300">
                        ${costPerDist.toFixed(3)}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.efficiencyRating === 'EXCELLENT'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                              : r.efficiencyRating === 'GOOD'
                              ? 'bg-blue-950/70 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {r.efficiencyRating === 'EXCELLENT'
                            ? 'Optimal'
                            : r.efficiencyRating === 'GOOD'
                            ? 'Normal'
                            : 'High Burn Alert'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500 font-sans">
                    No vehicles found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
