import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Zap,
  Fuel,
  Leaf,
  Clock,
  Download,
  Copy,
  RotateCcw,
  Sliders,
  Check,
  ShieldCheck,
  Sparkles,
  Info,
  ChevronRight,
  TrendingDown,
  Layers,
  Building2,
  Truck
} from 'lucide-react';
import { Parcel, FleetRoiModelInputs } from '../../types';
import {
  fleetRoiCalculatorService,
  DEFAULT_ROI_INPUTS,
  ROI_SCENARIO_PRESETS,
  ScenarioPreset
} from '../../services/fleetRoiCalculatorService';

interface Props {
  parcels?: Parcel[];
  tenantName?: string;
}

export const FleetRoiCalculator: React.FC<Props> = ({ tenantName }) => {
  // Model input state
  const [inputs, setInputs] = useState<FleetRoiModelInputs>({ ...DEFAULT_ROI_INPUTS });
  const [activePresetId, setActivePresetId] = useState<string>('STANDARD_BALANCED');
  const [activeTab, setActiveTab] = useState<'CASH_FLOW' | 'TCO_COMPARISON'>('CASH_FLOW');

  // Feedback states
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState(false);

  // Compute financial model results
  const outputs = useMemo(() => {
    return fleetRoiCalculatorService.calculateRoi(inputs);
  }, [inputs]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    setInputs((prev) => ({
      ...prev,
      ...preset.inputs,
    }));
  };

  // Reset to Defaults
  const handleReset = () => {
    setInputs({ ...DEFAULT_ROI_INPUTS });
    setActivePresetId('STANDARD_BALANCED');
  };

  // Copy Executive Briefing to clipboard
  const handleCopyBriefing = () => {
    const text = fleetRoiCalculatorService.generateExecutiveSummaryText(inputs, outputs);
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Export CSV
  const handleExportCsv = () => {
    setIsExportingCsv(true);
    const csv = fleetRoiCalculatorService.generateCsv(inputs, outputs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LogiFlows_Fleet_EV_ROI_Model_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportingCsv(false);
    setCsvSuccess(true);
    setTimeout(() => setCsvSuccess(false), 3000);
  };

  // Formatter helper
  const fmtUsd = (val: number) => `$${Math.abs(val).toLocaleString()}`;

  // TCO Chart Data
  const tcoChartData = useMemo(() => {
    return [
      {
        name: 'Diesel Fleet (5-Yr)',
        tco: outputs.tcoComparison.diesel5YearTco,
        fill: '#f59e0b',
        description: 'CapEx + Diesel Fuel + Maintenance',
      },
      {
        name: 'Electric Fleet (5-Yr)',
        tco: outputs.tcoComparison.ev5YearTco,
        fill: '#10b981',
        description: 'Net CapEx + Charging + Reduced Maint - Carbon Credits',
      },
    ];
  }, [outputs.tcoComparison]);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl relative overflow-hidden animate-fade-in">
      {/* Decorative ambient gradient glow */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
              <Calculator className="w-3 h-3 text-emerald-400" />
              CAPITAL ALLOCATION & ESG FINANCIAL ENGINE
            </span>
            <span className="text-xs font-mono text-slate-400">
              • Commercial Fleet Electrification & Carbon Tax Credit Model
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Payback: {outputs.paybackPeriodYears} Years ({Math.round(outputs.paybackPeriodYears * 12)} Mos)
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-100 mt-1.5 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Fleet ROI & Electric Vehicle Transition Calculator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            Simulate the financial impact of transitioning commercial diesel fleets to electric vehicles, factoring in volumetric fuel displacement, regenerative maintenance savings, and monetized carbon tax credits.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Reset button */}
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Reset model to baseline defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Copy Executive Briefing */}
          <button
            onClick={handleCopyBriefing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors shadow-sm"
            title="Copy executive briefing text for CFO / investment committee review"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copySuccess ? 'Briefing Copied!' : 'Copy Briefing'}</span>
          </button>

          {/* Export CSV Model */}
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all shadow-sm ${
              csvSuccess
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30'
            }`}
            title="Download complete financial model and 5-year cash flow forecast as CSV"
          >
            {csvSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Download className="w-3.5 h-3.5" />}
            <span>{csvSuccess ? 'CSV Exported!' : 'Export Financial Model'}</span>
          </button>
        </div>
      </div>

      {/* Scenario Presets Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Quick Scenario Presets:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {ROI_SCENARIO_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activePresetId === p.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{p.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400">
                {p.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Simple Payback Period */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Capital Payback Period</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {outputs.paybackPeriodYears} Yrs
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              ({Math.round(outputs.paybackPeriodYears * 12)} Months)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Full breakeven on initial net CapEx
          </div>
        </div>

        {/* Card 2: Annual Net Operating Savings */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Annual Net Cash Inflow</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
              +${outputs.annualNetOperatingSavingsUsd.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              / Year
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Fuel + Maintenance + Carbon Credits
          </div>
        </div>

        {/* Card 3: 5-Year Net Present Value (NPV) */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">5-Year NPV ({inputs.discountRatePct}% Cost of Capital)</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-indigo-300 tabular-nums">
              +${outputs.fiveYearNpvUsd.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-indigo-400">
              {outputs.fiveYearRoiPct}% ROI
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            5-Year Net Profit: +${outputs.fiveYearNetSavingsUsd.toLocaleString()}
          </div>
        </div>

        {/* Card 4: Carbon Credit Monetization */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Carbon Credits Monetized</span>
            <Leaf className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-teal-300 tabular-nums">
              +${outputs.annualCarbonCreditRevenueUsd.toLocaleString()}
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              / Year
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {outputs.annualCo2AbatedMetricTons} Tons CO₂ abated @ ${inputs.carbonCreditPricePerTon}/Ton
          </div>
        </div>
      </div>

      {/* Main Dual-Panel Layout: Inputs (Left) & Dynamic Visualizations (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT PANEL: MODEL PARAMETERS & SENSITIVITY SLIDERS (5 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-5 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Financial & Operational Input Levers
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Adjust to recalculate ROI
            </span>
          </div>

          {/* Section A: Fleet Conversion Parameters */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono text-indigo-400 font-bold uppercase block tracking-wider">
              1. Fleet Transition Scope
            </span>

            {/* Slider 1: Vehicles Converted */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Vehicles to Electrify:</span>
                <span className="font-mono font-bold text-emerald-300">{inputs.convertedVehiclesCount} Vans</span>
              </div>
              <input
                type="range"
                min={1}
                max={40}
                step={1}
                value={inputs.convertedVehiclesCount}
                onChange={(e) => setInputs({ ...inputs, convertedVehiclesCount: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Slider 2: Daily Mileage */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Daily Route Distance per Van:</span>
                <span className="font-mono font-bold text-slate-200">{inputs.dailyMileageKm} km / day</span>
              </div>
              <input
                type="range"
                min={60}
                max={250}
                step={5}
                value={inputs.dailyMileageKm}
                onChange={(e) => setInputs({ ...inputs, dailyMileageKm: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Input: Operating Days */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Annual Delivery Days:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={200}
                  max={365}
                  value={inputs.annualOperatingDays}
                  onChange={(e) => setInputs({ ...inputs, annualOperatingDays: Number(e.target.value) })}
                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-500 text-[11px]">days/yr</span>
              </div>
            </div>
          </div>

          {/* Section B: Fuel & Energy Rates */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-amber-400 font-bold uppercase block tracking-wider">
              2. Energy & Fuel Price Baseline
            </span>

            {/* Slider: Diesel Price per Liter */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Diesel Fuel Price:</span>
                <span className="font-mono font-bold text-amber-300">${inputs.dieselPricePerLiter.toFixed(2)} / Liter</span>
              </div>
              <input
                type="range"
                min={0.90}
                max={2.20}
                step={0.02}
                value={inputs.dieselPricePerLiter}
                onChange={(e) => setInputs({ ...inputs, dieselPricePerLiter: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Slider: Electricity Price per kWh */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Depot Electricity Charging Rate:</span>
                <span className="font-mono font-bold text-cyan-300">${inputs.electricityPricePerKWh.toFixed(2)} / kWh</span>
              </div>
              <input
                type="range"
                min={0.08}
                max={0.35}
                step={0.01}
                value={inputs.electricityPricePerKWh}
                onChange={(e) => setInputs({ ...inputs, electricityPricePerKWh: Number(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Diesel Burn:</span>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.dieselConsumptionL100km}
                  onChange={(e) => setInputs({ ...inputs, dieselConsumptionL100km: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-slate-200 text-xs"
                />
                <span className="text-[10px] text-slate-500 text-right block mt-0.5">L / 100km</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">EV Efficiency:</span>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.evConsumptionKWh100km}
                  onChange={(e) => setInputs({ ...inputs, evConsumptionKWh100km: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-slate-200 text-xs"
                />
                <span className="text-[10px] text-slate-500 text-right block mt-0.5">kWh / 100km</span>
              </div>
            </div>
          </div>

          {/* Section C: Capital Expenditure & Subsidies */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase block tracking-wider">
              3. CapEx & Government Incentives
            </span>

            {/* Premium per Van */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-300 block">EV Purchase Price Premium:</span>
                <span className="text-[10px] text-slate-500">Cost delta vs. new diesel van</span>
              </div>
              <input
                type="number"
                step="500"
                value={inputs.evPurchasePremiumPerVehicle}
                onChange={(e) => setInputs({ ...inputs, evPurchasePremiumPerVehicle: Number(e.target.value) })}
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-slate-200 text-xs"
              />
            </div>

            {/* Charger Cost */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-300 block">Depot Charger Hardware & Install:</span>
                <span className="text-[10px] text-slate-500">Dedicated Level 2 / Fast plug per van</span>
              </div>
              <input
                type="number"
                step="250"
                value={inputs.chargerCostPerVehicle}
                onChange={(e) => setInputs({ ...inputs, chargerCostPerVehicle: Number(e.target.value) })}
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-slate-200 text-xs"
              />
            </div>

            {/* Subsidies */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-emerald-300 block font-semibold">Government Clean Subsidies:</span>
                <span className="text-[10px] text-slate-500">IRA 45W Commercial Tax Credit</span>
              </div>
              <input
                type="number"
                step="500"
                value={inputs.govSubsidiesPerVehicle}
                onChange={(e) => setInputs({ ...inputs, govSubsidiesPerVehicle: Number(e.target.value) })}
                className="w-24 px-2 py-1 bg-emerald-950/40 border border-emerald-700/80 rounded text-right font-mono text-emerald-300 text-xs font-bold"
              />
            </div>
          </div>

          {/* Section D: Carbon Tax Credits & Maintenance */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-teal-400 font-bold uppercase block tracking-wider">
              4. Carbon Credit & Maintenance Monetization
            </span>

            {/* Slider: Carbon Credit Price per Ton */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Carbon Credit Market Value:</span>
                <span className="font-mono font-bold text-teal-300">${inputs.carbonCreditPricePerTon} / Metric Ton CO₂</span>
              </div>
              <input
                type="range"
                min={20}
                max={180}
                step={5}
                value={inputs.carbonCreditPricePerTon}
                onChange={(e) => setInputs({ ...inputs, carbonCreditPricePerTon: Number(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Maintenance Costs */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Diesel Maint ($/km):</span>
                <input
                  type="number"
                  step="0.005"
                  value={inputs.dieselMaintCostPerKm}
                  onChange={(e) => setInputs({ ...inputs, dieselMaintCostPerKm: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-slate-200 text-xs"
                />
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">EV Maint ($/km):</span>
                <input
                  type="number"
                  step="0.005"
                  value={inputs.evMaintCostPerKm}
                  onChange={(e) => setInputs({ ...inputs, evMaintCostPerKm: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-slate-200 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: VISUALIZATIONS & FINANCIAL RETURN DYNAMICS (7 Cols) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Chart Header & Tab Toggles */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('CASH_FLOW')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'CASH_FLOW'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                5-Year Cumulative Cash Flow & Break-Even
              </button>

              <button
                onClick={() => setActiveTab('TCO_COMPARISON')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'TCO_COMPARISON'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                5-Year TCO Comparison
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Initial Net CapEx: <strong className="text-rose-400">${outputs.totalInitialNetCapExUsd.toLocaleString()}</strong>
            </span>
          </div>

          {/* VIEW 1: 5-Year Cumulative Cash Flow Curve (Recharts) */}
          {activeTab === 'CASH_FLOW' && (
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Capital Recovery & Cumulative Net Cash Flow Horizon
                  </h4>
                  <p className="text-xs text-slate-400">
                    Traces initial CapEx deployment through break-even to Year 5 net profit (+${outputs.fiveYearNetSavingsUsd.toLocaleString()}).
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Breakeven: Month {Math.round(outputs.paybackPeriodYears * 12)}
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={outputs.cashFlowTimeline} margin={{ top: 15, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      formatter={(val: any, name: any) => [`$${Number(val).toLocaleString()}`, String(name || '')]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: 'Capital Break-Even ($0)', fill: '#94a3b8', fontSize: 10, position: 'insideTopLeft' }} />

                    {/* Breakdown bars of annual cash inflow */}
                    <Bar dataKey="fuelSavings" name="Fuel Cost Savings" stackId="savings" fill="#10b981" maxBarSize={28} />
                    <Bar dataKey="maintSavings" name="Maintenance Savings" stackId="savings" fill="#06b6d4" maxBarSize={28} />
                    <Bar dataKey="carbonCredits" name="Carbon Tax Credits" stackId="savings" fill="#8b5cf6" maxBarSize={28} />

                    {/* Cumulative Cash Flow Line */}
                    <Line
                      type="monotone"
                      dataKey="cumulativeCashFlow"
                      name="Cumulative Net Cash Flow"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#38bdf8' }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 2: 5-Year Total Cost of Ownership (TCO) Comparison (Recharts) */}
          {activeTab === 'TCO_COMPARISON' && (
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    5-Year Total Cost of Ownership (TCO) Head-to-Head
                  </h4>
                  <p className="text-xs text-slate-400">
                    Comparing lifecycle diesel operational expense against electric fleet CapEx, charging, and maintenance.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  -{outputs.tcoComparison.tcoSavingsPct}% TCO Reduction
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tcoChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any, _name: any, item: any) => [`$${Number(val).toLocaleString()} (${item.payload.description})`, '5-Year TCO']}
                    />
                    <Bar dataKey="tco" name="5-Year TCO" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {tcoChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Net 5-Year TCO Savings:</span>
                  <span className="text-emerald-300 font-bold font-mono text-base">
                    ${outputs.tcoComparison.tcoSavingsUsd.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Operating Margin Improvement:</span>
                  <span className="text-indigo-300 font-bold font-mono text-base">
                    +{outputs.tcoComparison.tcoSavingsPct}% Over 5 Years
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Savings Revenue Component Breakdown Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-200 uppercase font-mono block">
              Annual Inflow Distribution: Where the Savings Come From
            </span>

            {/* Inflow bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* 1. Fuel Savings */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                  <Fuel className="w-3.5 h-3.5" />
                  <span>Fuel Cost Savings</span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  ${outputs.annualFuelSavingsUsd.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {Math.round((outputs.annualFuelSavingsUsd / (outputs.annualNetOperatingSavingsUsd || 1)) * 100)}% of annual benefit
                </span>
              </div>

              {/* 2. Maintenance Reduction */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Reduced Maintenance</span>
                </div>
                <div className="text-lg font-bold font-mono text-cyan-300">
                  ${outputs.annualMaintenanceSavingsUsd.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {Math.round((outputs.annualMaintenanceSavingsUsd / (outputs.annualNetOperatingSavingsUsd || 1)) * 100)}% of annual benefit
                </span>
              </div>

              {/* 3. Carbon Credits */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold mb-1">
                  <Leaf className="w-3.5 h-3.5" />
                  <span>Carbon Tax Credits</span>
                </div>
                <div className="text-lg font-bold font-mono text-teal-300">
                  ${outputs.annualCarbonCreditRevenueUsd.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {Math.round((outputs.annualCarbonCreditRevenueUsd / (outputs.annualNetOperatingSavingsUsd || 1)) * 100)}% of annual benefit
                </span>
              </div>
            </div>

            {/* Environmental Abatement Summary */}
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>Environmental Impact:</strong> Abates <strong>{outputs.annualCo2AbatedMetricTons} Metric Tons CO₂/year</strong> ({outputs.fiveYearCo2AbatedMetricTons} Tons over 5 years).
                </span>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 font-bold whitespace-nowrap">
                100% Audit-Verified Abatement
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
