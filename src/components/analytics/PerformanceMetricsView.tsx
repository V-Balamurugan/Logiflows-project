import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Package, 
  AlertCircle, 
  Calendar, 
  Download,
  Filter,
  Search,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  FileSpreadsheet,
  CloudRain,
  MapPin,
  ArrowRight,
  Truck,
  Sparkles,
  ChevronDown,
  Info,
  Check
} from 'lucide-react';
import { storage } from '../../services/storage';
import { mockWeatherService } from '../../services/mockWeatherService';
import { Parcel, ParcelStatus, ServiceTier } from '../../types';
import { MonthlyRevenueProjectionChart } from './MonthlyRevenueProjectionChart';
import { RegionalDemandForecastModule } from './RegionalDemandForecastModule';
import { ComplianceAuditModule } from './ComplianceAuditModule';
import { FleetRoiCalculator } from './FleetRoiCalculator';
import { CustomerFeedbackAnalyticsScorecard } from './CustomerFeedbackAnalyticsScorecard';

// 7-day, 14-day, and 30-day realistic historical logistics data
const RAW_METRICS_DATA = [
  { date: 'Oct 05', volumeDispatched: 342, volumeDelivered: 338, successRate: 98.8, avgEtaHours: 3.2, targetSlaHours: 4.0, firstAttemptSuccess: 96.5 },
  { date: 'Oct 06', volumeDispatched: 410, volumeDelivered: 402, successRate: 98.0, avgEtaHours: 3.5, targetSlaHours: 4.0, firstAttemptSuccess: 95.8 },
  { date: 'Oct 07', volumeDispatched: 388, volumeDelivered: 382, successRate: 98.4, avgEtaHours: 3.3, targetSlaHours: 4.0, firstAttemptSuccess: 96.2 },
  { date: 'Oct 08', volumeDispatched: 465, volumeDelivered: 454, successRate: 97.6, avgEtaHours: 3.9, targetSlaHours: 4.0, firstAttemptSuccess: 94.9 },
  { date: 'Oct 09', volumeDispatched: 512, volumeDelivered: 504, successRate: 98.4, avgEtaHours: 3.4, targetSlaHours: 4.0, firstAttemptSuccess: 96.8 },
  { date: 'Oct 10', volumeDispatched: 480, volumeDelivered: 476, successRate: 99.1, avgEtaHours: 3.1, targetSlaHours: 4.0, firstAttemptSuccess: 97.5 },
  { date: 'Oct 11', volumeDispatched: 428, volumeDelivered: 424, successRate: 99.0, avgEtaHours: 3.0, targetSlaHours: 4.0, firstAttemptSuccess: 97.2 },
];

const HUB_DISTRIBUTION = [
  { name: 'Apex Central Maritime Hub (OAK)', value: 1420, color: '#6366f1' },
  { name: 'Silicon Valley Tech DC (SJC)', value: 980, color: '#3b82f6' },
  { name: 'Peninsula Last-Mile Depot (SFO)', value: 620, color: '#10b981' },
];

export const PerformanceMetricsView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7D' | '14D' | '30D'>('7D');
  const currentTenantId = storage.getActiveTenantId();
  const tenant = storage.getTenantById(currentTenantId);

  // Live storage subscriptions & states
  const [parcels, setParcels] = useState<Parcel[]>(() => storage.getParcels(currentTenantId));
  const hubs = useMemo(() => storage.getHubs(currentTenantId), [currentTenantId]);
  const vehicles = useMemo(() => storage.getVehicles(currentTenantId), [currentTenantId]);
  const employees = useMemo(() => storage.getEmployees(currentTenantId), [currentTenantId]);

  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setParcels(storage.getParcels(currentTenantId));
    });
    return unsubscribe;
  }, [currentTenantId]);

  // Lookup maps for hubs, vehicles, couriers
  const hubMap = useMemo(() => {
    const map = new Map<string, string>();
    hubs.forEach((h) => map.set(h.id, h.name));
    return map;
  }, [hubs]);

  const vehicleMap = useMemo(() => {
    const map = new Map<string, string>();
    vehicles.forEach((v) => map.set(v.id, v.vehicleNumber));
    return map;
  }, [vehicles]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [employees]);

  // Correlate parcels with mock weather service for weather-adjusted ETAs
  const weatherAdjustedMap = useMemo(() => {
    const records = mockWeatherService.calculateWeatherAdjustedParcels(parcels);
    const map = new Map<string, typeof records[0]>();
    records.forEach((r) => map.set(r.parcelId, r));
    return map;
  }, [parcels]);

  // --- Shipment & Delay Filtering States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [hubFilter, setHubFilter] = useState<string>('ALL');
  const [onlyDelayed, setOnlyDelayed] = useState(false);
  const [selectedParcelDetail, setSelectedParcelDetail] = useState<Parcel | null>(null);

  // Filtered Shipment & Delay Data
  const filteredShipmentsAndDelays = useMemo(() => {
    return parcels.filter((p) => {
      const weatherData = weatherAdjustedMap.get(p.id);
      const totalDelayMin = (p.delayRisk?.predictedDelayMinutes || 0) + (weatherData?.additionalDelayMinutes || 0);

      // Search match: tracking, recipient name, recipient city, sender name/company
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTracking = p.trackingNumber.toLowerCase().includes(query);
        const matchRecipient = p.recipient.name.toLowerCase().includes(query) || 
                               p.recipient.city.toLowerCase().includes(query) ||
                               (p.recipient.company && p.recipient.company.toLowerCase().includes(query));
        const matchSender = p.sender.name.toLowerCase().includes(query) ||
                            (p.sender.company && p.sender.company.toLowerCase().includes(query));
        const matchRiskFactor = p.delayRisk?.primaryRiskFactor?.toLowerCase().includes(query);
        if (!matchTracking && !matchRecipient && !matchSender && !matchRiskFactor) {
          return false;
        }
      }

      // Status match
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // Risk match
      if (riskFilter !== 'ALL') {
        const riskLevel = p.delayRisk?.level || 'LOW';
        if (riskLevel !== riskFilter) {
          return false;
        }
      }

      // Priority match
      if (priorityFilter !== 'ALL' && p.serviceTier !== priorityFilter) {
        return false;
      }

      // Hub match (origin or destination)
      if (hubFilter !== 'ALL') {
        if (p.originHubId !== hubFilter && p.destHubId !== hubFilter) {
          return false;
        }
      }

      // Only delayed toggle
      if (onlyDelayed) {
        const isDelayed = totalDelayMin > 0 || (p.delayRisk && p.delayRisk.level !== 'LOW');
        if (!isDelayed) return false;
      }

      return true;
    });
  }, [parcels, weatherAdjustedMap, searchQuery, statusFilter, riskFilter, priorityFilter, hubFilter, onlyDelayed]);

  // Filtered dataset summary statistics
  const filteredStats = useMemo(() => {
    const total = filteredShipmentsAndDelays.length;
    if (total === 0) {
      return { total: 0, delayed: 0, highRisk: 0, avgDelayMinutes: 0, onTimeRate: 100 };
    }
    let delayedCount = 0;
    let highRiskCount = 0;
    let totalDelayMinutes = 0;

    filteredShipmentsAndDelays.forEach((p) => {
      const weatherData = weatherAdjustedMap.get(p.id);
      const delay = (p.delayRisk?.predictedDelayMinutes || 0) + (weatherData?.additionalDelayMinutes || 0);
      if (delay > 0 || p.delayRisk?.level === 'HIGH' || p.delayRisk?.level === 'MEDIUM') {
        delayedCount++;
      }
      if (p.delayRisk?.level === 'HIGH') {
        highRiskCount++;
      }
      totalDelayMinutes += delay;
    });

    const avgDelay = +(totalDelayMinutes / total).toFixed(1);
    const onTimeRate = +(((total - delayedCount) / total) * 100).toFixed(1);

    return {
      total,
      delayed: delayedCount,
      highRisk: highRiskCount,
      avgDelayMinutes: avgDelay,
      onTimeRate
    };
  }, [filteredShipmentsAndDelays, weatherAdjustedMap]);

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'ALL' || riskFilter !== 'ALL' || priorityFilter !== 'ALL' || hubFilter !== 'ALL' || onlyDelayed;

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setRiskFilter('ALL');
    setPriorityFilter('ALL');
    setHubFilter('ALL');
    setOnlyDelayed(false);
  };

  // --- CSV Export States ---
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [csvExportSuccess, setCsvExportSuccess] = useState(false);
  const [exportedRowCount, setExportedRowCount] = useState<number>(0);

  /**
   * Helper to escape CSV strings according to RFC 4180
   */
  const escapeCsvField = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '""';
    const stringVal = String(value);
    const escaped = stringVal.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  /**
   * Download CSV button handler for the currently filtered shipment and delay data
   */
  const handleExportFilteredShipmentsCsv = () => {
    setIsExportingCsv(true);
    setCsvExportSuccess(false);

    try {
      const tenantCode = tenant?.code || 'LOGIFLOWS-GLOBAL';
      const timestampIso = new Date().toISOString();
      const dateStr = timestampIso.slice(0, 10);

      // Define comprehensive CSV columns for shipment and delay telemetry
      const headers = [
        'Tracking Number',
        'Service Tier / Priority',
        'Shipment Status',
        'Delay Risk Level',
        'Predicted Delay (Mins)',
        'Weather Added Delay (Mins)',
        'Total Delay Impact (Mins)',
        'Risk Confidence Score (%)',
        'Primary Delay Cause',
        'Correlated Weather Condition / Hazard',
        'Recommended Mitigation Action',
        'Origin Logistics Hub',
        'Destination Logistics Hub',
        'Scheduled Delivery Date',
        'Weather Adjusted Dynamic ETA',
        'Sender Name',
        'Sender Company',
        'Sender City & State',
        'Recipient Name',
        'Recipient Company',
        'Recipient Street Address',
        'Recipient City & State',
        'Recipient Postal Code',
        'Package Type',
        'Weight (Kg)',
        'Declared Value (USD)',
        'Shipping Fee (USD)',
        'Assigned Courier',
        'Assigned Fleet Vehicle',
        'Booking Created Timestamp',
        'Tenant Code',
        'Export Generated Timestamp'
      ].join(',') + '\r\n';

      const rows = filteredShipmentsAndDelays.map((p) => {
        const weatherInfo = weatherAdjustedMap.get(p.id);
        const baselineDelay = p.delayRisk?.predictedDelayMinutes || 0;
        const weatherDelay = weatherInfo?.additionalDelayMinutes || 0;
        const totalDelay = baselineDelay + weatherDelay;
        const originHubName = hubMap.get(p.originHubId) || p.originHubId;
        const destHubName = hubMap.get(p.destHubId) || p.destHubId;
        const courierName = p.assignedCourierId ? (employeeMap.get(p.assignedCourierId) || p.assignedCourierId) : 'Unassigned';
        const vehicleNumber = p.assignedVehicleId ? (vehicleMap.get(p.assignedVehicleId) || p.assignedVehicleId) : 'Unassigned';

        return [
          escapeCsvField(p.trackingNumber),
          escapeCsvField(p.serviceTier),
          escapeCsvField(p.status),
          escapeCsvField(p.delayRisk?.level || 'LOW'),
          escapeCsvField(baselineDelay),
          escapeCsvField(weatherDelay),
          escapeCsvField(totalDelay),
          escapeCsvField(p.delayRisk?.confidenceScore ?? 85),
          escapeCsvField(p.delayRisk?.primaryRiskFactor || 'Normal operational transit flow'),
          escapeCsvField(weatherInfo?.primaryHazard || 'Nominal road and weather conditions'),
          escapeCsvField(p.delayRisk?.recommendedMitigation || 'Maintain scheduled corridor routing'),
          escapeCsvField(originHubName),
          escapeCsvField(destHubName),
          escapeCsvField(p.estimatedDeliveryDate),
          escapeCsvField(weatherInfo?.weatherAdjustedEta || p.estimatedDeliveryDate),
          escapeCsvField(p.sender.name),
          escapeCsvField(p.sender.company || 'N/A'),
          escapeCsvField(`${p.sender.city}, ${p.sender.state}`),
          escapeCsvField(p.recipient.name),
          escapeCsvField(p.recipient.company || 'N/A'),
          escapeCsvField(p.recipient.street),
          escapeCsvField(`${p.recipient.city}, ${p.recipient.state}`),
          escapeCsvField(p.recipient.postalCode),
          escapeCsvField(p.packageType),
          escapeCsvField(p.weightKg),
          escapeCsvField(p.declaredValueUsd),
          escapeCsvField(p.shippingFeeUsd),
          escapeCsvField(courierName),
          escapeCsvField(vehicleNumber),
          escapeCsvField(p.createdAt),
          escapeCsvField(tenantCode),
          escapeCsvField(timestampIso)
        ].join(',');
      }).join('\r\n');

      // Add UTF-8 BOM (\uFEFF) so Excel parses Unicode characters without encoding defects
      const csvContent = '\uFEFF' + headers + rows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');

      // Dynamic filename incorporating active filter state summary
      let filterTag = 'all';
      if (statusFilter !== 'ALL') filterTag += `-${statusFilter.toLowerCase()}`;
      if (riskFilter !== 'ALL') filterTag += `-${riskFilter.toLowerCase()}`;
      if (priorityFilter !== 'ALL') filterTag += `-${priorityFilter.toLowerCase()}`;
      if (onlyDelayed) filterTag += '-delayed-only';

      downloadLink.href = url;
      downloadLink.download = `logiflows-shipments-and-delays-${filterTag}-${dateStr}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      setExportedRowCount(filteredShipmentsAndDelays.length);
      setCsvExportSuccess(true);
      setTimeout(() => setCsvExportSuccess(false), 4000);
    } catch (err) {
      console.error('Failed generating CSV export of shipment and delay data:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Compute summary stats for top KPI cards
  const totalVolume = useMemo(() => {
    return RAW_METRICS_DATA.reduce((acc, curr) => acc + curr.volumeDelivered, 0);
  }, []);

  const avgSuccessRate = useMemo(() => {
    const sum = RAW_METRICS_DATA.reduce((acc, curr) => acc + curr.successRate, 0);
    return (sum / RAW_METRICS_DATA.length).toFixed(1);
  }, []);

  const avgEta = useMemo(() => {
    const sum = RAW_METRICS_DATA.reduce((acc, curr) => acc + curr.avgEtaHours, 0);
    return (sum / RAW_METRICS_DATA.length).toFixed(1);
  }, []);

  const avgFirstAttempt = useMemo(() => {
    const sum = RAW_METRICS_DATA.reduce((acc, curr) => acc + curr.firstAttemptSuccess, 0);
    return (sum / RAW_METRICS_DATA.length).toFixed(1);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            EXECUTIVE ANALYTICS · REAL-TIME BUSINESS INTELLIGENCE
          </span>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Platform Performance Metrics & Delivery SLAs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Volume throughput, SLA fulfillment benchmarks, and dynamic predictive delay telemetry for {tenant?.name || 'LogiFlows'}.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Segmented Timeframe Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            {(['7D', '14D', '30D'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  timeframe === t
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === '7D' ? 'Last 7 Days' : t === '14D' ? 'Last 14 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          {/* Download CSV Button */}
          <button
            onClick={handleExportFilteredShipmentsCsv}
            disabled={isExportingCsv}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border shadow-md ${
              csvExportSuccess
                ? 'bg-emerald-950 text-emerald-200 border-emerald-600 ring-2 ring-emerald-500/30'
                : 'text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 border-indigo-500 hover:border-indigo-400'
            }`}
            title="Download CSV file containing currently filtered shipment and delay intelligence data"
          >
            {csvExportSuccess ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Download className={`w-4 h-4 ${isExportingCsv ? 'animate-bounce text-indigo-200' : 'text-white'}`} />
            )}
            <span>
              {csvExportSuccess
                ? `CSV Exported (${exportedRowCount} Rows)`
                : isExportingCsv
                ? 'Generating CSV...'
                : `Download CSV (${filteredShipmentsAndDelays.length} Records)`}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Delivery Volume</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {totalVolume.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">+12.4%</span>
            <span>vs previous period</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">On-Time SLA Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {avgSuccessRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>SLA Target: <strong className="text-slate-300">98.0%</strong></span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Average Transit ETA</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {avgEta} hrs
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            0.7h faster than SLA ceiling
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">1st-Attempt Success</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
            {avgFirstAttempt}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Minimizes return-to-depot runs
          </div>
        </div>
      </div>

      {/* Monthly Revenue Projection: Historical Income vs Forecasted Growth Trends */}
      <MonthlyRevenueProjectionChart parcels={parcels} tenantName={tenant?.name} />

      {/* Regional Demand Forecast: Historical Parcel Volume Surge Prediction & Courier Capacity Pre-Allocation */}
      <RegionalDemandForecastModule parcels={parcels} tenantName={tenant?.name} />

      {/* Compliance Audit Module: Chain-of-Custody Handoff Tracking & Safety Protocol Deviation Governance */}
      <ComplianceAuditModule parcels={parcels} tenantName={tenant?.name} />

      {/* Fleet ROI Calculator: Financial Impact of EV Transition, Fuel Cost Savings & Carbon Tax Credits */}
      <FleetRoiCalculator parcels={parcels} tenantName={tenant?.name} />

      {/* Customer Feedback & Quality Scorecard: CSAT, NPS & Per-Parcel Issue Analytics */}
      <CustomerFeedbackAnalyticsScorecard tenantName={tenant?.name} />

      {/* Grid of Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Delivery Volume (AreaChart with Gradient) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Daily Parcel Volume Throughput
              </h3>
              <p className="text-xs text-slate-400">
                Dispatched manifests versus completed handovers
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Live Ingestion
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RAW_METRICS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDispatched" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="volumeDispatched"
                  name="Dispatched Volume"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDispatched)"
                />
                <Area
                  type="monotone"
                  dataKey="volumeDelivered"
                  name="Delivered Successfully"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDelivered)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: SLA Success Rate % (LineChart with Reference Line) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Delivery Success Rate % & SLA Threshold
              </h3>
              <p className="text-xs text-slate-400">
                Compliance against contractually guaranteed 98% SLA
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Benchmark Target: 98%
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RAW_METRICS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[94, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  formatter={(val: any) => [`${val}%`, 'Success Rate']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <ReferenceLine y={98.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'SLA Target (98%)', fill: '#ef4444', fontSize: 10, position: 'insideBottomRight' }} />
                <Line
                  type="monotone"
                  dataKey="successRate"
                  name="Observed Success Rate %"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="firstAttemptSuccess"
                  name="1st-Attempt Rate %"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Average Transit ETA vs Target SLA Hours (BarChart) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Average Transit Duration (Hours)
              </h3>
              <p className="text-xs text-slate-400">
                Booking-to-doorstep duration compared to SLA ceiling
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              SLA Ceiling: 4.0h
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={RAW_METRICS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  formatter={(val: any) => [`${val} hours`, 'Average Transit Time']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <ReferenceLine y={4.0} stroke="#f59e0b" strokeDasharray="3 3" />
                <Bar
                  dataKey="avgEtaHours"
                  name="Actual Transit Time (Hrs)"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Hub Distribution Share (Pie/Donut Chart) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Volume Distribution by Logistics Hub
              </h3>
              <p className="text-xs text-slate-400">
                Throughput distribution across regional sorting facilities
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              3 Facilities
            </span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={HUB_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {HUB_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${val} parcels`, 'Throughput']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTERED SHIPMENTS & PREDICTIVE DELAY INTELLIGENCE REPOSITORY & CSV EXPORT */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-5 shadow-lg">
        {/* Section Header with Download CSV Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                ACTIVE SHIPMENT & DELAY TELEMETRY
              </span>
              <span className="text-xs font-mono text-slate-400">
                • {filteredShipmentsAndDelays.length} of {parcels.length} consignments matching
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              Filtered Shipment & Predictive Delay Intelligence Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-dimensional consignment filtering with corridor delay impact, weather additions, and one-click CSV export.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                title="Reset all search filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            {/* Primary 'Download CSV' Button */}
            <button
              onClick={handleExportFilteredShipmentsCsv}
              disabled={isExportingCsv}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shadow-md ${
                csvExportSuccess
                  ? 'bg-emerald-600 text-white border border-emerald-500 ring-2 ring-emerald-500/40'
                  : 'text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 border border-indigo-500 hover:shadow-indigo-500/25'
              }`}
              title="Download currently filtered shipments and predictive delay telemetry as a CSV file"
            >
              {csvExportSuccess ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Download className={`w-4 h-4 ${isExportingCsv ? 'animate-bounce' : ''}`} />
              )}
              <span>
                {csvExportSuccess
                  ? `CSV Exported! (${exportedRowCount} Rows)`
                  : isExportingCsv
                  ? 'Generating CSV...'
                  : `Download CSV (${filteredShipmentsAndDelays.length} Filtered)`}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Search Query */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracking, recipient, city..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* 2. Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="ALL">All Delivery Statuses</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="IN_TRANSIT_HUB_TRANSFER">In Transit (Hub Transfer)</option>
              <option value="AT_DESTINATION_HUB">At Destination Hub</option>
              <option value="AT_ORIGIN_HUB">At Origin Hub</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="DELIVERED">Delivered</option>
              <option value="EXCEPTION_RECORDED">Exception Recorded</option>
            </select>
          </div>

          {/* 3. Delay Risk Level Filter */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="ALL">All Delay Risk Levels</option>
              <option value="HIGH">High Risk (Critical Delay)</option>
              <option value="MEDIUM">Medium Risk (Warning)</option>
              <option value="LOW">Low Risk (On Track)</option>
            </select>
          </div>

          {/* 4. Priority / Service Tier Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="ALL">All Priority Tiers</option>
              <option value="SAME_DAY_PRIORITY">Same-Day Priority</option>
              <option value="NEXT_DAY_EXPRESS">Next-Day Express</option>
              <option value="STANDARD_GROUND">Standard Ground</option>
            </select>
          </div>

          {/* 5. Hub Location Filter */}
          <div>
            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="ALL">All Facility Hubs</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} - {h.name.replace('Apex ', '')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Quick-Toggles & Active Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyDelayed(!onlyDelayed)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                onlyDelayed
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${onlyDelayed ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>Show Only Delayed / At-Risk Shipments</span>
              {onlyDelayed && <span className="ml-1 w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />}
            </button>

            {/* Quick Priority Shortcut: Same Day */}
            <button
              onClick={() => setPriorityFilter(priorityFilter === 'SAME_DAY_PRIORITY' ? 'ALL' : 'SAME_DAY_PRIORITY')}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
                priorityFilter === 'SAME_DAY_PRIORITY'
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Same-Day Urgent
            </button>

            {/* Quick Risk Shortcut: High Risk */}
            <button
              onClick={() => setRiskFilter(riskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
                riskFilter === 'HIGH'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical Breaches (High)
            </button>
          </div>

          {/* Active Filter Indicators */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px] font-mono uppercase text-slate-500">Active Filters:</span>
              {searchQuery && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                  "{searchQuery}"
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                  {statusFilter.replace(/_/g, ' ')}
                </span>
              )}
              {riskFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                  Risk: {riskFilter}
                </span>
              )}
              {priorityFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                  Tier: {priorityFilter.replace(/_/g, ' ')}
                </span>
              )}
              {onlyDelayed && (
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[11px]">
                  Delayed Only
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filtered Subset KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800">
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400">Filtered Consignments</div>
            <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
              {filteredStats.total}
            </div>
            <div className="text-[10px] text-slate-500">
              {((filteredStats.total / (parcels.length || 1)) * 100).toFixed(0)}% of tenant fleet
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400">Delayed / At-Risk</div>
            <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
              {filteredStats.delayed}
            </div>
            <div className="text-[10px] text-slate-500">
              {filteredStats.highRisk} critical SLA breaches
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400">Avg Delay Impact</div>
            <div className="text-xl font-bold font-mono text-rose-300 tabular-nums">
              +{filteredStats.avgDelayMinutes}m
            </div>
            <div className="text-[10px] text-slate-500">
              ML corridor & weather padding
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400">On-Time Fulfillment</div>
            <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
              {filteredStats.onTimeRate}%
            </div>
            <div className="text-[10px] text-slate-500">
              Current filtered cohort
            </div>
          </div>
        </div>

        {/* Filtered Shipments and Delay Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <th className="py-3 px-3">Tracking / Priority</th>
                <th className="py-3 px-3">Transit Route</th>
                <th className="py-3 px-3">Recipient & City</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Delay Risk & ETA</th>
                <th className="py-3 px-3">Correlated Cause & AI Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredShipmentsAndDelays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No shipments match the current filters.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try clearing or adjusting search terms, status filters, or delay threshold criteria.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredShipmentsAndDelays.map((parcel) => {
                  const weatherInfo = weatherAdjustedMap.get(parcel.id);
                  const baselineDelay = parcel.delayRisk?.predictedDelayMinutes || 0;
                  const weatherDelay = weatherInfo?.additionalDelayMinutes || 0;
                  const totalDelay = baselineDelay + weatherDelay;
                  const riskLevel = parcel.delayRisk?.level || 'LOW';

                  const originName = hubMap.get(parcel.originHubId) || 'Origin Hub';
                  const destName = hubMap.get(parcel.destHubId) || 'Dest Hub';

                  return (
                    <tr 
                      key={parcel.id} 
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => setSelectedParcelDetail(parcel)}
                    >
                      {/* 1. Tracking & Priority */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-indigo-300 group-hover:text-indigo-200">
                          {parcel.trackingNumber}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              parcel.serviceTier === 'SAME_DAY_PRIORITY'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : parcel.serviceTier === 'NEXT_DAY_EXPRESS'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {parcel.serviceTier === 'SAME_DAY_PRIORITY'
                              ? 'SAME-DAY'
                              : parcel.serviceTier === 'NEXT_DAY_EXPRESS'
                              ? 'NEXT-DAY'
                              : 'GROUND'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {parcel.weightKg}kg
                          </span>
                        </div>
                      </td>

                      {/* 2. Transit Route */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-slate-300">
                          <span className="truncate max-w-[110px]" title={originName}>
                            {originName.replace('Apex ', '').replace(' Hub', '').replace(' Sorting', '')}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span className="truncate max-w-[110px]" title={destName}>
                            {destName.replace('Apex ', '').replace(' Depot', '').replace(' Distribution Center', '')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>
                            {parcel.assignedVehicleId ? (vehicleMap.get(parcel.assignedVehicleId) || parcel.assignedVehicleId) : 'Dispatch Pending'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Recipient & City */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200 truncate max-w-[140px]">
                          {parcel.recipient.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span>{parcel.recipient.city}, {parcel.recipient.state}</span>
                        </div>
                      </td>

                      {/* 4. Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                            parcel.status === 'OUT_FOR_DELIVERY'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : parcel.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : parcel.status === 'IN_TRANSIT_HUB_TRANSFER'
                              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              parcel.status === 'OUT_FOR_DELIVERY'
                                ? 'bg-amber-400 animate-pulse'
                                : parcel.status === 'DELIVERED'
                                ? 'bg-emerald-400'
                                : 'bg-indigo-400'
                            }`}
                          />
                          {parcel.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* 5. Delay Risk & ETA */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              riskLevel === 'HIGH'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : riskLevel === 'MEDIUM'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            }`}
                          >
                            {riskLevel} {totalDelay > 0 ? `(+${totalDelay}m)` : '(ON-TIME)'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Adj ETA: {weatherInfo?.weatherAdjustedEta || new Date(parcel.estimatedDeliveryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* 6. Correlated Cause & AI Mitigation */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="text-slate-300 text-[11px] truncate" title={parcel.delayRisk?.primaryRiskFactor}>
                          {parcel.delayRisk?.primaryRiskFactor || 'Clear arterial corridors'}
                        </div>
                        {weatherInfo?.primaryHazard && (
                          <div className="flex items-center gap-1 text-[10px] text-cyan-400 mt-0.5 truncate" title={weatherInfo.primaryHazard}>
                            <CloudRain className="w-3 h-3 flex-shrink-0" />
                            <span>{weatherInfo.primaryHazard}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-indigo-300 mt-0.5 flex items-center gap-1 truncate" title={parcel.delayRisk?.recommendedMitigation}>
                          <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                          <span>{parcel.delayRisk?.recommendedMitigation || 'Normal delivery speed holds'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Bar: Record Count & Download CSV Secondary Trigger */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-300 font-semibold">
              Showing {filteredShipmentsAndDelays.length} of {parcels.length} shipments
            </span>
            <span>• Filtered dataset contains real-time Doppler radar & PostGIS corridor metrics</span>
          </div>

          <button
            onClick={handleExportFilteredShipmentsCsv}
            disabled={isExportingCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Filtered Cohort to CSV</span>
          </button>
        </div>
      </div>

      {/* Parcel Detail Modal (Quick Inspection) */}
      {selectedParcelDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">
                  CONSIGNMENT CUSTODY & PREDICTIVE DELAY INSPECTION
                </span>
                <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  {selectedParcelDetail.trackingNumber}
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedParcelDetail.serviceTier}
                  </span>
                </h4>
              </div>
              <button
                onClick={() => setSelectedParcelDetail(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Consignor / Origin</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedParcelDetail.sender.name}</p>
                <p className="text-slate-400">{selectedParcelDetail.sender.company}</p>
                <p className="text-slate-500 text-[11px]">{selectedParcelDetail.sender.city}, {selectedParcelDetail.sender.state}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Consignee / Destination</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedParcelDetail.recipient.name}</p>
                <p className="text-slate-400">{selectedParcelDetail.recipient.company}</p>
                <p className="text-slate-500 text-[11px]">{selectedParcelDetail.recipient.street}, {selectedParcelDetail.recipient.city}</p>
              </div>
            </div>

            {/* Delay Intelligence Assessment Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Predictive Delay Intelligence
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  selectedParcelDetail.delayRisk?.level === 'HIGH'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : selectedParcelDetail.delayRisk?.level === 'MEDIUM'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {selectedParcelDetail.delayRisk?.level || 'LOW'} RISK • +{selectedParcelDetail.delayRisk?.predictedDelayMinutes || 0}m
                </span>
              </div>

              <p className="text-xs text-slate-300">
                <strong className="text-slate-400">Primary Factor:</strong> {selectedParcelDetail.delayRisk?.primaryRiskFactor}
              </p>
              <p className="text-xs text-indigo-300">
                <strong className="text-indigo-400">Recommended Action:</strong> {selectedParcelDetail.delayRisk?.recommendedMitigation}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <div>Confidence: <strong className="text-slate-200">{selectedParcelDetail.delayRisk?.confidenceScore}%</strong></div>
                <div>Weather: <strong className="text-slate-200">{selectedParcelDetail.delayRisk?.modelConfidenceFeatures?.weatherRisk}</strong></div>
                <div>Traffic: <strong className="text-slate-200">{selectedParcelDetail.delayRisk?.modelConfidenceFeatures?.trafficCongestion}</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedParcelDetail(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
