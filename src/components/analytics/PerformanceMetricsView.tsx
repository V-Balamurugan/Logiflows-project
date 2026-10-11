import React, { useState, useMemo } from 'react';
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
  Filter
} from 'lucide-react';
import { storage } from '../../services/storage';

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

  // Compute summary stats
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

  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [csvExportSuccess, setCsvExportSuccess] = useState(false);

  const filteredMetricsData = useMemo(() => {
    if (timeframe === '7D') return RAW_METRICS_DATA;
    if (timeframe === '14D') {
      const earlier = [
        { date: 'Sep 28', volumeDispatched: 320, volumeDelivered: 315, successRate: 98.4, avgEtaHours: 3.6, targetSlaHours: 4.0, firstAttemptSuccess: 95.9 },
        { date: 'Sep 29', volumeDispatched: 360, volumeDelivered: 355, successRate: 98.6, avgEtaHours: 3.4, targetSlaHours: 4.0, firstAttemptSuccess: 96.1 },
        { date: 'Sep 30', volumeDispatched: 410, volumeDelivered: 405, successRate: 98.7, avgEtaHours: 3.3, targetSlaHours: 4.0, firstAttemptSuccess: 96.4 },
        { date: 'Oct 01', volumeDispatched: 430, volumeDelivered: 422, successRate: 98.1, avgEtaHours: 3.7, targetSlaHours: 4.0, firstAttemptSuccess: 95.3 },
        { date: 'Oct 02', volumeDispatched: 450, volumeDelivered: 442, successRate: 98.2, avgEtaHours: 3.5, targetSlaHours: 4.0, firstAttemptSuccess: 95.8 },
        { date: 'Oct 03', volumeDispatched: 395, volumeDelivered: 390, successRate: 98.7, avgEtaHours: 3.2, targetSlaHours: 4.0, firstAttemptSuccess: 96.7 },
        { date: 'Oct 04', volumeDispatched: 330, volumeDelivered: 326, successRate: 98.8, avgEtaHours: 3.3, targetSlaHours: 4.0, firstAttemptSuccess: 96.9 },
      ];
      return [...earlier, ...RAW_METRICS_DATA];
    }
    // 30D expanded set
    const monthData = [];
    for (let day = 12; day <= 30; day++) {
      monthData.push({
        date: `Sep ${day < 10 ? '0' + day : day}`,
        volumeDispatched: 310 + ((day * 13) % 180),
        volumeDelivered: 304 + ((day * 13) % 176),
        successRate: +(97.5 + ((day * 7) % 20) / 10).toFixed(1),
        avgEtaHours: +(3.0 + ((day * 3) % 10) / 10).toFixed(1),
        targetSlaHours: 4.0,
        firstAttemptSuccess: +(94.8 + ((day * 5) % 30) / 10).toFixed(1),
      });
    }
    return [...monthData, ...RAW_METRICS_DATA];
  }, [timeframe]);

  const handleExportCsv = () => {
    setIsExportingCsv(true);
    setCsvExportSuccess(false);

    try {
      const headers = [
        'Report Date',
        'Tenant Code',
        'Timeframe Scope',
        'Dispatched Packages',
        'Successfully Delivered',
        'On-Time SLA Rate (%)',
        'Avg Transit ETA (Hours)',
        'SLA Ceiling Target (Hours)',
        'First-Attempt Success Rate (%)',
        'Returned To Depot (%)'
      ].join(',') + '\n';

      const tenantCode = tenant?.code || 'LOGIFLOWS-GLOBAL';

      const rows = filteredMetricsData.map((d) => {
        const returnRate = (100 - d.successRate).toFixed(1);
        return [
          `"${d.date}"`,
          `"${tenantCode}"`,
          `"${timeframe}"`,
          d.volumeDispatched,
          d.volumeDelivered,
          d.successRate,
          d.avgEtaHours,
          d.targetSlaHours,
          d.firstAttemptSuccess,
          returnRate
        ].join(',');
      }).join('\n');

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logiflows-management-analytics-${timeframe.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setCsvExportSuccess(true);
      setTimeout(() => setCsvExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed generating CSV export:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            EXECUTIVE ANALYTICS · REAL-TIME BUSINESS INTELLIGENCE
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Platform Performance Metrics & Delivery SLAs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Volume throughput, SLA fulfillment percentages, and dynamic transit ETA benchmarks for {tenant?.name || 'LogiFlows'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors border shadow-sm ${
              csvExportSuccess
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
            title="Download complete daily volume and success rate analytics CSV for management review"
          >
            <Download className={`w-3.5 h-3.5 ${csvExportSuccess ? 'text-emerald-400' : 'text-indigo-400'} ${isExportingCsv ? 'animate-bounce' : ''}`} />
            <span>{csvExportSuccess ? 'CSV Exported!' : isExportingCsv ? 'Generating CSV...' : 'Download CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
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

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
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

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
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

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
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
    </div>
  );
};
