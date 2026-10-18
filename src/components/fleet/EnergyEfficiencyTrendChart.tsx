import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  LineChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Leaf,
  TrendingDown,
  TrendingUp,
  Zap,
  Fuel,
  Download,
  Calendar,
  CheckCircle2,
  Sliders,
  DollarSign,
  Truck,
  Building2,
  Check,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  Target
} from 'lucide-react';
import { Vehicle } from '../../types';
import {
  energyEfficiencyTrendService,
  SustainabilityScenario,
  FleetPowertrainScope,
  SustainabilityInitiative
} from '../../services/energyEfficiencyTrendService';

interface Props {
  vehicles: Vehicle[];
}

export const EnergyEfficiencyTrendChart: React.FC<Props> = ({ vehicles }) => {
  // Controls state
  const [scenario, setScenario] = useState<SustainabilityScenario>('CURRENT_TRAJECTORY');
  const [scope, setScope] = useState<FleetPowertrainScope>('ALL_VEHICLES');
  const [includeProjections, setIncludeProjections] = useState<boolean>(true);
  const [unitSystem, setUnitSystem] = useState<'METRIC' | 'IMPERIAL'>('METRIC');
  const [activeSecondaryView, setActiveSecondaryView] = useState<'ABATEMENT_STACK' | 'EFFICIENCY_CURVE'>('ABATEMENT_STACK');

  // Export CSV feedback
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState(false);

  // Compute trend points from service
  const trendData = useMemo(() => {
    return energyEfficiencyTrendService.generateMonthlyEfficiencyTrend(
      vehicles,
      scenario,
      scope,
      includeProjections
    );
  }, [vehicles, scenario, scope, includeProjections]);

  // Compute sustainability summary KPIs
  const summary = useMemo(() => {
    return energyEfficiencyTrendService.calculateSustainabilitySummary(trendData, vehicles);
  }, [trendData, vehicles]);

  // Strategic initiatives
  const initiatives = useMemo(() => {
    return energyEfficiencyTrendService.getSustainabilityInitiatives();
  }, []);

  // Format unit helpers
  const isMetric = unitSystem === 'METRIC';
  const fuelUnitLabel = isMetric ? 'L' : 'gal';
  const fuelConversion = isMetric ? 1.0 : 0.264172; // liters to US gallons
  const distanceUnitLabel = isMetric ? 'km' : 'mi';
  const distanceConversion = isMetric ? 1.0 : 0.621371; // km to miles
  const co2UnitLabel = isMetric ? 'Tons' : 'US Tons';
  const co2Conversion = isMetric ? 1.0 : 1.10231; // metric tons to US short tons

  // Prepared chart data converted based on unit system
  const formattedChartData = useMemo(() => {
    return trendData.map((d) => ({
      month: d.month,
      shortMonth: d.shortMonth,
      isProjected: d.isProjected,
      distance: Math.round(d.totalDistanceKm * distanceConversion),
      dieselUnits: Math.round(d.dieselLiters * fuelConversion),
      electricityKWh: d.electricityKWh,
      netCo2Tons: +(d.netCo2MetricTons * co2Conversion).toFixed(2),
      co2AvoidedTons: +(d.co2AvoidedMetricTons * co2Conversion).toFixed(2),
      targetCo2Tons: +(d.targetCo2MetricTons * co2Conversion).toFixed(2),
      efficiency: isMetric 
        ? d.efficiencyLPer100KmEq 
        : +(235.215 / (d.efficiencyLPer100KmEq || 1)).toFixed(1), // L/100km to MPG
      evSharePct: d.evFleetSharePct,
      totalEnergyCost: d.totalEnergyCostUsd,
    }));
  }, [trendData, distanceConversion, fuelConversion, co2Conversion, isMetric]);

  // Handle Export CSV
  const handleExportCsv = () => {
    setIsExportingCsv(true);
    const csv = energyEfficiencyTrendService.generateCsv(trendData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LogiFlows_Fleet_Energy_Efficiency_Trends_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportingCsv(false);
    setCsvSuccess(true);
    setTimeout(() => setCsvSuccess(false), 3000);
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl relative overflow-hidden animate-fade-in">
      {/* Decorative ambient background blur */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-400" />
              LONG-TERM FLEET SUSTAINABILITY & DECARBONIZATION
            </span>
            <span className="text-xs font-mono text-slate-400">
              • 12-Month Historical Telemetry + 2027 Projections
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ESG Rating: {summary.esgSustainabilityRating.replace(/_/g, ' ')}
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-100 mt-1.5 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            Energy Efficiency Trend & Fleet Carbon Decarbonization
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            Tracks monthly fuel volume reduction, clean electricity substitution, and gross carbon abatement to help administrators evaluate long-term sustainability ROI and achieve 2026-2027 Net-Zero milestones.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Unit Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setUnitSystem('METRIC')}
              className={`px-2.5 py-1 rounded transition-colors ${
                isMetric ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Metric (L/km)
            </button>
            <button
              onClick={() => setUnitSystem('IMPERIAL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                !isMetric ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              US (gal/mi)
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all shadow-sm ${
              csvSuccess
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
            }`}
            title="Download complete monthly fuel consumption and carbon telemetry dataset as CSV"
          >
            {csvSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{csvSuccess ? 'CSV Exported!' : 'Export Sustainability CSV'}</span>
          </button>
        </div>
      </div>

      {/* Scenario & Scope Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
        {/* 1. Sustainability Scenario */}
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 flex items-center gap-1">
            <Target className="w-3 h-3 text-emerald-400" />
            Decarbonization Trajectory Scenario:
          </label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as SustainabilityScenario)}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="CURRENT_TRAJECTORY">Current Fleet Trajectory (Baseline)</option>
            <option value="ACCELERATED_NET_ZERO">Accelerated Net-Zero (+35% EV + Eco-Routing)</option>
            <option value="FLEET_EXPANSION">Commercial Expansion (+25% Freight Volume)</option>
          </select>
        </div>

        {/* 2. Powertrain Scope Filter */}
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 flex items-center gap-1">
            <Truck className="w-3 h-3 text-cyan-400" />
            Powertrain Fleet Scope:
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as FleetPowertrainScope)}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL_VEHICLES">All Fleet Powertrains (Combined)</option>
            <option value="EV_ONLY">Electric Vehicles & Cargo E-Bikes Only</option>
            <option value="DIESEL_ONLY">Internal Combustion Diesel Fleet Only</option>
          </select>
        </div>

        {/* 3. Include Projections Toggle */}
        <div>
          <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-indigo-400" />
            Forward Projections:
          </label>
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeProjections}
                onChange={(e) => setIncludeProjections(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-slate-300 font-medium">Include Q1 2027 Projections</span>
            </label>
          </div>
        </div>

        {/* 4. Active Fleet Summary */}
        <div className="flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-slate-800/80 sm:pl-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Commercial Fleet</span>
          <span className="text-slate-200 font-mono font-bold mt-0.5">
            {vehicles.length} Vehicles ({vehicles.filter(v => v.type === 'ELECTRIC_VAN' || v.type === 'CARGO_EBIKE').length} Electric • {vehicles.filter(v => v.type === 'SPRINTER_VAN' || v.type === 'HEAVY_HAUL').length} Diesel)
          </span>
        </div>
      </div>

      {/* Top 4 Key Sustainability Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Carbon Reduction YoY */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Carbon Footprint Reduction</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
              -{summary.co2ReductionYoYPct}%
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              YoY Decline
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Down from 38.2 to 24.1 {co2UnitLabel}/mo
          </div>
        </div>

        {/* Card 2: Cumulative CO2 Avoided */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Abated CO₂ (12M)</span>
            <Leaf className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {summary.totalCo2AvoidedTons12M}
            </div>
            <span className="text-[11px] font-mono text-cyan-400">
              {co2UnitLabel} Avoided
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Equivalent to 5,420 mature trees planted
          </div>
        </div>

        {/* Card 3: Fleet Fuel Efficiency Gain */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Fleet Energy Efficiency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
              {isMetric ? `${summary.currentFleetEfficiencyL100km} L/100km` : `${+(235.215 / summary.currentFleetEfficiencyL100km).toFixed(1)} MPG`}
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              +{summary.efficiencyImprovementPct}% Gain
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Diesel Equivalent consumption per 100km
          </div>
        </div>

        {/* Card 4: Clean Energy Cost Savings */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Clean Energy Savings (12M)</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-indigo-300 tabular-nums">
              ${(summary.totalEnergySavingsUsd12M / 1000).toFixed(1)}k
            </div>
            <span className="text-[11px] font-mono text-indigo-400">
              {summary.currentEvFleetPct}% EV Ratio
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Saved vs. 100% internal combustion diesel baseline
          </div>
        </div>
      </div>

      {/* Primary Chart: Monthly Fuel Consumption & Carbon Output Trends (ComposedChart) */}
      <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-400" />
              Monthly Fuel Consumption & Carbon Output Trajectory
            </h4>
            <p className="text-xs text-slate-400">
              Correlation of monthly fuel consumed ({fuelUnitLabel}) against gross carbon emissions ({co2UnitLabel}) and 2026-2027 Net-Zero milestones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Target 2026: -25% CO₂
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Clean Energy Offset Active
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedChartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="dieselGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="elecGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="shortMonth" stroke="#64748b" fontSize={11} tickLine={false} />
              
              {/* Left Y-Axis: Fuel/Energy Volume */}
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                label={{ value: `Fuel Units (${fuelUnitLabel})`, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />

              {/* Right Y-Axis: Carbon Emissions in Tons */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 45]}
                stroke="#f43f5e"
                fontSize={11}
                tickLine={false}
                label={{ value: `Carbon (${co2UnitLabel})`, angle: 90, position: 'insideRight', fill: '#f43f5e', fontSize: 10 }}
              />

              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                formatter={(val: any, name: any) => {
                  const label = String(name || '');
                  if (label === 'Carbon Emissions') return [`${val} ${co2UnitLabel}`, label];
                  if (label === 'Net-Zero Target Glidepath') return [`${val} ${co2UnitLabel}`, label];
                  if (label === 'Abated / Avoided CO₂') return [`${val} ${co2UnitLabel}`, label];
                  if (label === 'Diesel Consumed') return [`${val.toLocaleString()} ${fuelUnitLabel}`, label];
                  if (label === 'Electricity Consumed') return [`${val.toLocaleString()} kWh`, label];
                  return [val, label];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

              {/* Stacked bars for Diesel vs Clean Electricity */}
              <Bar yAxisId="left" dataKey="dieselUnits" name="Diesel Consumed" stackId="energy" fill="url(#dieselGrad)" radius={[0, 0, 0, 0]} maxBarSize={28} />
              
              {/* Clean Avoided CO2 Abatement Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="co2AvoidedTons"
                name="Abated / Avoided CO₂"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#10b981' }}
              />

              {/* Net-Zero Target Glidepath Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="targetCo2Tons"
                name="Net-Zero Target Glidepath"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />

              {/* Actual Observed Carbon Emissions Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="netCo2Tons"
                name="Carbon Emissions"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f43f5e' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Chart Section with View Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Secondary Chart 1: Decarbonization Abatement Progression (AreaChart) */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-400" />
                Fleet Decarbonization & Avoided Carbon Trend
              </h4>
              <p className="text-xs text-slate-400">
                Visualizing the transition from fossil fuel carbon to avoided emissions via EV adoption
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Clean Transition
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaNetCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="areaAvoidedCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="shortMonth" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit={` ${co2UnitLabel}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Area
                  type="monotone"
                  dataKey="netCo2Tons"
                  name={`Net Emissions (${co2UnitLabel})`}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#areaNetCo2)"
                />
                <Area
                  type="monotone"
                  dataKey="co2AvoidedTons"
                  name={`Avoided CO₂ (${co2UnitLabel})`}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#areaAvoidedCo2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart 2: Fleet Fuel Efficiency Curve (LineChart) */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Fleet-Wide Efficiency Index & Electrification Rate
              </h4>
              <p className="text-xs text-slate-400">
                Tracking equivalent fuel consumption rate vs. growing EV fleet adoption percentage
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Efficiency Curve
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="shortMonth" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} unit={isMetric ? ' L/100' : ' MPG'} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#06b6d4" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="efficiency"
                  name={isMetric ? 'Efficiency (L/100km Eq)' : 'Efficiency (MPG Eq)'}
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="evSharePct"
                  name="EV Fleet Share %"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strategic Fleet Sustainability Improvements Section */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Strategic Decarbonization Initiatives & Fleet Sustainability Roadmap
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified operational interventions reducing fuel consumption, enhancing EV range, and shrinking corporate carbon footprint.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400">
            {initiatives.filter(i => i.status === 'ACTIVE').length} Active Programs • {initiatives.filter(i => i.status === 'PLANNED').length} Scheduled 2027
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {initiatives.map((init) => (
            <div
              key={init.id}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{init.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 mt-0.5 block">
                    Category: {init.category.replace(/_/g, ' ')} • Target Launch: {init.implementationDate}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  init.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {init.status}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {init.description}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">CO₂ Abatement</span>
                  <span className="text-emerald-300 font-bold">-{init.annualCo2SavingsTons} T/yr</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Cost Savings</span>
                  <span className="text-indigo-300 font-bold">${init.annualCostSavingsUsd.toLocaleString()}/yr</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Payback ROI</span>
                  <span className="text-slate-300 font-bold">{init.roiMonths} Months</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
