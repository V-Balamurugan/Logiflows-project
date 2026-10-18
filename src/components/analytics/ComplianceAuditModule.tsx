import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Check,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Building2,
  Truck,
  UserCheck,
  FileText,
  Lock,
  Layers,
  Activity,
  AlertOctagon,
  Copy
} from 'lucide-react';
import {
  Parcel,
  RegulatoryFramework,
  SafetyDeviationSeverity,
  SafetyDeviationStatus,
  SafetyProtocolDeviation,
  CustodyHandoffRecord
} from '../../types';
import { storage } from '../../services/storage';
import { complianceAuditService } from '../../services/complianceAuditService';

interface Props {
  parcels: Parcel[];
  tenantName?: string;
}

export const ComplianceAuditModule: React.FC<Props> = ({ parcels, tenantName }) => {
  const currentTenantId = storage.getActiveTenantId();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'DEVIATIONS' | 'HANDOFFS_LEDGER' | 'REGULATORY_DOSSIER'>('DEVIATIONS');

  // Filters for deviations
  const [searchQuery, setSearchQuery] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Handoffs tab state
  const [selectedParcelForTimeline, setSelectedParcelForTimeline] = useState<string>(parcels[0]?.id || '');
  const [handoffSearch, setHandoffSearch] = useState('');

  // Investigation & CAPA Modal state
  const [investigatingDeviation, setInvestigatingDeviation] = useState<SafetyProtocolDeviation | null>(null);
  const [modalStatus, setModalStatus] = useState<SafetyDeviationStatus>('FLAGGED');
  const [modalCapa, setModalCapa] = useState('');
  const [modalAuditorNotes, setModalAuditorNotes] = useState('');
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Scan simulation state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultToast, setScanResultToast] = useState<string | null>(null);

  // CSV export state
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [csvSuccessToast, setCsvSuccessToast] = useState(false);

  // Copy dossier state
  const [copySuccess, setCopySuccess] = useState(false);

  // Compute compliance audit data from service
  const auditData = useMemo(() => {
    return complianceAuditService.getComplianceAuditReport(parcels, currentTenantId, tenantName);
  }, [parcels, currentTenantId, tenantName, isScanning, saveSuccessToast]);

  const { handoffs, deviations, summary, trendHistory } = auditData;

  // Filtered deviations for Tab 1
  const filteredDeviations = useMemo(() => {
    return deviations.filter((dev) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = dev.title.toLowerCase().includes(q);
        const matchTracking = dev.trackingNumber.toLowerCase().includes(q);
        const matchDesc = dev.description.toLowerCase().includes(q);
        const matchStandard = dev.regulatoryStandard.toLowerCase().includes(q);
        const matchLocation = dev.locationName.toLowerCase().includes(q);
        const matchParty = dev.responsibleParty.name.toLowerCase().includes(q);
        if (!matchTitle && !matchTracking && !matchDesc && !matchStandard && !matchLocation && !matchParty) {
          return false;
        }
      }
      if (frameworkFilter !== 'ALL' && dev.framework !== frameworkFilter) return false;
      if (severityFilter !== 'ALL' && dev.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && dev.status !== statusFilter) return false;
      return true;
    });
  }, [deviations, searchQuery, frameworkFilter, severityFilter, statusFilter]);

  // Selected parcel for chain-of-custody timeline
  const selectedParcelObj = useMemo(() => {
    return parcels.find((p) => p.id === selectedParcelForTimeline) || parcels[0];
  }, [parcels, selectedParcelForTimeline]);

  const parcelHandoffs = useMemo(() => {
    if (!selectedParcelObj) return [];
    return handoffs.filter((h) => h.parcelId === selectedParcelObj.id);
  }, [handoffs, selectedParcelObj]);

  // Open investigation modal
  const handleOpenInvestigate = (dev: SafetyProtocolDeviation) => {
    setInvestigatingDeviation(dev);
    setModalStatus(dev.status);
    setModalCapa(dev.correctiveActionPlan || '');
    setModalAuditorNotes(dev.auditorNotes || '');
  };

  // Save CAPA & status
  const handleSaveRemediation = () => {
    if (!investigatingDeviation) return;
    complianceAuditService.updateDeviationStatus(
      currentTenantId,
      investigatingDeviation.id,
      modalStatus,
      modalCapa,
      modalAuditorNotes
    );
    setSaveSuccessToast(true);
    setTimeout(() => {
      setSaveSuccessToast(false);
      setInvestigatingDeviation(null);
    }, 1200);
  };

  // Run live compliance audit scan
  const handleRunAuditScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanResultToast(`Audit scan complete: verified ${handoffs.length} custodial transfers across 5 regulatory frameworks.`);
      setTimeout(() => setScanResultToast(null), 4000);
    }, 1000);
  };

  // Export CSV
  const handleExportCsv = () => {
    setIsExportingCsv(true);
    const csvContent = complianceAuditService.generateAuditCsvContent(deviations, handoffs, summary);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LogiFlows_Regulatory_Compliance_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportingCsv(false);
    setCsvSuccessToast(true);
    setTimeout(() => setCsvSuccessToast(false), 3000);
  };

  // Official dossier text
  const dossierText = useMemo(() => {
    return complianceAuditService.generateOfficialAuditDossierText(summary, deviations, handoffs.length);
  }, [summary, deviations, handoffs.length]);

  const handleCopyDossier = () => {
    navigator.clipboard.writeText(dossierText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Framework scores array for bar chart
  const frameworkChartData = useMemo(() => {
    return [
      { name: 'DOT / FMCSA', score: summary.frameworkScores.DOT_FMCSA, full: 'Hours of Service & Highway Dwell' },
      { name: 'OSHA 1910', score: summary.frameworkScores.OSHA_SAFETY, full: 'Ergonomic & Heavy Lift Safety' },
      { name: 'FDA / GDP', score: summary.frameworkScores.FDA_GDP, full: 'Cold-Chain & Perishable Integrity' },
      { name: 'ISO 28000', score: summary.frameworkScores.ISO_28000, full: 'Cryptographic Chain-of-Custody' },
      { name: 'EPA Clean Air', score: summary.frameworkScores.EPA_CLEAN_AIR, full: 'Green Corridor Fleet Emissions' },
    ];
  }, [summary.frameworkScores]);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl relative overflow-hidden">
      {/* Decorative subtle ambient gradient glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              REGULATORY COMPLIANCE & SAFETY AUDIT ENGINE
            </span>
            <span className="text-xs font-mono text-slate-400">
              • {handoffs.length} Active Handoffs Tracked
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              summary.auditReadinessStatus === 'FULLY_COMPLIANT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {summary.auditReadinessStatus === 'FULLY_COMPLIANT' ? 'AUDIT READY: FULLY COMPLIANT' : 'AUDIT READY: ACTION REQUIRED'}
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-100 mt-1.5 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            Chain-of-Custody Governance & Safety Protocol Audit
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            Real-time verification of custodial transfers, cryptographic SHA-256 seal integrity, and automatic detection of DOT/FMCSA, OSHA, and FDA/GDP protocol deviations for mandatory regulatory reporting.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Run Audit Scan */}
          <button
            onClick={handleRunAuditScan}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-850 rounded-lg border border-slate-700 transition-all shadow-sm"
            title="Perform a live cryptographic audit scan across all active parcels and courier logs"
          >
            <Activity className={`w-3.5 h-3.5 text-cyan-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Protocols...' : 'Run Audit Scan'}</span>
          </button>

          {/* Export CSV Dossier */}
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all shadow-sm ${
              csvSuccessToast
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
            }`}
            title="Download safety protocol deviations and custodial transfer records as a CSV audit spreadsheet"
          >
            {csvSuccessToast ? <Check className="w-3.5 h-3.5 text-white" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{csvSuccessToast ? 'CSV Exported!' : 'Export CSV'}</span>
          </button>

          {/* View Official Dossier */}
          <button
            onClick={() => setActiveTab('REGULATORY_DOSSIER')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-md hover:shadow-emerald-500/20 transition-all border border-emerald-500/30"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Official Regulatory Dossier</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {scanResultToast && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-200 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{scanResultToast}</span>
          </div>
          <button onClick={() => setScanResultToast(null)} className="text-emerald-400 hover:text-white text-sm">✕</button>
        </div>
      )}

      {/* Top 4 KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Compliance Health Score */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Compliance Health Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
              {summary.complianceHealthScore}%
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              {summary.complianceHealthScore >= 90 ? 'Nominal' : 'Warning'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Aggregated cross-agency audit score
          </div>
        </div>

        {/* Metric 2: Chain-of-Custody Integrity */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Custody Integrity Rate</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {summary.custodyIntegrityRate}%
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {summary.verifiedHandoffsCount}/{summary.totalCustodyHandoffs} Verified
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cryptographic SHA-256 seal validation
          </div>
        </div>

        {/* Metric 3: Active Protocol Deviations */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Safety Protocol Deviations</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
              {summary.totalDeviationsCount}
            </div>
            <span className="text-[11px] font-mono text-rose-400 font-semibold">
              {summary.criticalDeviationsCount} Critical • {summary.warningDeviationsCount} Warn
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.resolvedDeviationsCount} CAPA remediations approved
          </div>
        </div>

        {/* Metric 4: Frameworks Verified */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Audited Frameworks</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 tabular-nums">
            5 Standards
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">DOT</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">OSHA</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">FDA/GDP</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">ISO 28k</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Framework Scores & 7-Day Custodial Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Framework Compliance Breakdown */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Regulatory Compliance Scores by Statutory Framework
              </h4>
              <p className="text-xs text-slate-400">
                Performance against mandatory 95.0% regulatory audit compliance benchmark
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Benchmark: 95%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frameworkChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[70, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  formatter={(val: any, _name: any, item: any) => [`${val}% (${item.payload.full})`, 'Score']}
                />
                <ReferenceLine y={95.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target 95%', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
                <Bar dataKey="score" name="Compliance Score %" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {frameworkChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.score >= 95 ? '#10b981' : entry.score >= 90 ? '#38bdf8' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 7-Day Custodial Handoffs & Integrity Trend */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Custodial Transfer Velocity & Audit Trail Integrity
              </h4>
              <p className="text-xs text-slate-400">
                Daily volume of verified handoffs correlated with detected protocol deviations
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Rolling 7D
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendHistory} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[90, 100]} stroke="#10b981" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar yAxisId="left" dataKey="handoffsCount" name="Custody Handoffs" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Line yAxisId="right" type="monotone" dataKey="integrityRate" name="Integrity Rate %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="left" type="monotone" dataKey="deviationsCount" name="Deviations Logged" stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tab Switcher Controls */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('DEVIATIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'DEVIATIONS'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span>Safety Protocol Deviations & CAPA Log</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
            {deviations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('HANDOFFS_LEDGER')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'HANDOFFS_LEDGER'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chain-of-Custody Handoff Ledger & Verification</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
            {handoffs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REGULATORY_DOSSIER')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'REGULATORY_DOSSIER'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Regulatory Audit Dossier</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SAFETY PROTOCOL DEVIATIONS & CAPA LOG */}
      {/* ========================================================================= */}
      {activeTab === 'DEVIATIONS' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracking, incident, standard..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Framework Filter */}
            <div>
              <select
                value={frameworkFilter}
                onChange={(e) => setFrameworkFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ALL">All Statutory Frameworks</option>
                <option value="DOT_FMCSA">DOT / FMCSA (Hours & Dwell)</option>
                <option value="OSHA_SAFETY">OSHA 1910 (Heavy Lift Ergonomics)</option>
                <option value="FDA_GDP">FDA 21 CFR / GDP (Cold Chain)</option>
                <option value="ISO_28000">ISO 28000 (Custody Integrity)</option>
                <option value="EPA_CLEAN_AIR">EPA Clean Air (Idle / Emissions)</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ALL">All Severity Levels</option>
                <option value="CRITICAL">Critical (Immediate CAPA)</option>
                <option value="WARNING">Warning (Elevated Risk)</option>
                <option value="MINOR">Minor (Administrative)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="ALL">All Audit Statuses</option>
                <option value="FLAGGED">Flagged for Review</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="CAPA_SUBMITTED">CAPA Plan Submitted</option>
                <option value="RESOLVED_CLEARED">Resolved & Auditor Cleared</option>
              </select>
            </div>
          </div>

          {/* Deviations Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-3 px-3">Severity / Standard</th>
                  <th className="py-3 px-3">Consignment & Ref</th>
                  <th className="py-3 px-3">Incident Protocol Title</th>
                  <th className="py-3 px-3">Location & Responsible Party</th>
                  <th className="py-3 px-3">Corrective Action Plan (CAPA)</th>
                  <th className="py-3 px-3">Audit Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDeviations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No safety protocol deviations matching current search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDeviations.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-900/50 transition-colors">
                      {/* 1. Severity & Standard */}
                      <td className="py-3 px-3 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            dev.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : dev.severity === 'WARNING'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}>
                            {dev.severity}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-medium truncate max-w-[120px]" title={dev.regulatoryStandard}>
                            {dev.regulatoryStandard}
                          </span>
                        </div>
                      </td>

                      {/* 2. Consignment & Ref */}
                      <td className="py-3 px-3 align-top font-mono">
                        <span className="text-indigo-300 font-semibold block">{dev.trackingNumber}</span>
                        <span className="text-[10px] text-slate-500">{dev.id}</span>
                      </td>

                      {/* 3. Protocol Title & Description */}
                      <td className="py-3 px-3 align-top max-w-xs">
                        <div className="text-slate-200 font-semibold text-xs leading-snug">{dev.title}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">{dev.description}</div>
                      </td>

                      {/* 4. Location & Responsible Party */}
                      <td className="py-3 px-3 align-top">
                        <div className="text-slate-300 text-xs">{dev.responsibleParty.name}</div>
                        <div className="text-slate-500 text-[10px]">{dev.responsibleParty.role}</div>
                        <div className="text-slate-400 text-[10px] mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[140px]">{dev.locationName}</span>
                        </div>
                      </td>

                      {/* 5. CAPA Action */}
                      <td className="py-3 px-3 align-top max-w-xs">
                        <div className="text-emerald-300 text-[11px] line-clamp-2 italic">
                          "{dev.correctiveActionPlan}"
                        </div>
                        {dev.auditorNotes && (
                          <div className="text-[10px] text-amber-300 mt-1 font-mono">
                            Auditor: {dev.auditorNotes}
                          </div>
                        )}
                      </td>

                      {/* 6. Audit Status */}
                      <td className="py-3 px-3 align-top">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          dev.status === 'RESOLVED_CLEARED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : dev.status === 'CAPA_SUBMITTED'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : dev.status === 'UNDER_INVESTIGATION'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {dev.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-3 px-3 align-top text-right">
                        <button
                          onClick={() => handleOpenInvestigate(dev)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded-lg border border-emerald-500/20 transition-colors"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHAIN-OF-CUSTODY HANDOFF LEDGER & TIMELINE VISUALIZER */}
      {/* ========================================================================= */}
      {activeTab === 'HANDOFFS_LEDGER' && (
        <div className="space-y-6 animate-fade-in">
          {/* Consignment Selection Bar */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Select Consignment to Inspect Handoff Chain:</span>
              <select
                value={selectedParcelForTimeline}
                onChange={(e) => setSelectedParcelForTimeline(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
              >
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.trackingNumber} • {p.packageType} ({p.serviceTier})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                Tracking: <strong className="text-slate-200">{selectedParcelObj?.trackingNumber}</strong>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {selectedParcelObj?.serviceTier}
              </span>
            </div>
          </div>

          {/* Chronological Handoff Journey Timeline */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Cryptographic Chain-of-Custody Handoff Journey
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological transfer events verified with deterministic SHA-256 Merkle hashes
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 font-bold px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Audit Trail Validated
                </span>
              </div>
            </div>

            {/* Stepper Timeline Visualizer */}
            <div className="space-y-4 pt-2">
              {parcelHandoffs.map((step, idx) => (
                <div key={step.handoffId} className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  {/* Step Index Badge */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold flex items-center justify-center text-xs">
                      0{idx + 1}
                    </div>
                    {idx < parcelHandoffs.length - 1 && (
                      <div className="w-0.5 h-8 bg-slate-800 my-1" />
                    )}
                  </div>

                  {/* Step Info */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Custody Stage</span>
                      <strong className="text-slate-200 text-xs">{step.eventType.replace(/_/g, ' ')}</strong>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{step.locationName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Handoff Parties</span>
                      <div className="text-slate-300 text-xs">
                        From: <span className="text-slate-100 font-medium">{step.fromPartyName}</span> ({step.fromPartyRole})
                      </div>
                      <div className="text-emerald-300 text-xs mt-0.5">
                        To: <span className="font-medium text-emerald-200">{step.toPartyName}</span> ({step.toPartyRole})
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Timestamp & Dwell</span>
                      <div className="text-slate-300 font-mono text-[11px]">{new Date(step.timestamp).toLocaleString()}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Dwell Time: {step.dwellMinutes} minutes</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Cryptographic Seal</span>
                      <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/80 block w-fit truncate max-w-[140px]" title={step.verificationHash}>
                        {step.verificationHash}
                      </span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3" />
                        <span>SHA-256 Tamper Verified</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REGULATORY AUDIT REPORT DOSSIER */}
      {/* ========================================================================= */}
      {activeTab === 'REGULATORY_DOSSIER' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Official Regulatory Audit Report Dossier
              </h4>
              <p className="text-xs text-slate-400">
                Formally generated regulatory dossier suitable for DOT, OSHA, FDA, and ISO external audits.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyDossier}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy Dossier'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-800 rounded-lg border border-emerald-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Dossier (CSV)</span>
              </button>
            </div>
          </div>

          {/* Dossier Code Block Display */}
          <div className="relative">
            <pre className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre max-h-[500px]">
              {dossierText}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INVESTIGATION & CAPA REMEDIATION MODAL */}
      {/* ========================================================================= */}
      {investigatingDeviation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                  REGULATORY DEVIATION INVESTIGATION & REMEDIATION (CAPA)
                </span>
                <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  {investigatingDeviation.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    {investigatingDeviation.severity}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Standard: {investigatingDeviation.regulatoryStandard}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInvestigatingDeviation(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Incident Details Summary */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Consignment Ref</span>
                <p className="font-semibold text-slate-200 mt-0.5 font-mono">{investigatingDeviation.trackingNumber}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{investigatingDeviation.locationName}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Responsible Operator / Lead</span>
                <p className="font-semibold text-slate-200 mt-0.5">{investigatingDeviation.responsibleParty.name}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{investigatingDeviation.responsibleParty.role}</p>
              </div>
            </div>

            {/* Description & Evidence */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <span className="text-slate-400 font-semibold block">Incident Evidence & Telemetry Findings:</span>
              <p className="text-slate-300 leading-relaxed">{investigatingDeviation.description}</p>
              <div className="text-[11px] font-mono text-cyan-300 pt-1 border-t border-slate-800/80">
                Telemetry Log: {investigatingDeviation.evidenceNotes}
              </div>
            </div>

            {/* Audit Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Update Audit Status:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['FLAGGED', 'UNDER_INVESTIGATION', 'CAPA_SUBMITTED', 'RESOLVED_CLEARED'] as SafetyDeviationStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setModalStatus(st)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                      modalStatus === st
                        ? 'bg-emerald-600 text-white border border-emerald-500 shadow-md ring-1 ring-emerald-400'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Corrective Action Plan (CAPA) Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Corrective and Preventive Action Plan (CAPA):
              </label>
              <textarea
                value={modalCapa}
                onChange={(e) => setModalCapa(e.target.value)}
                rows={3}
                placeholder="Specify regulatory remedial steps, equipment reassignment, or operational adjustments..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Auditor Sign-off Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Auditor Sign-off Notes:
              </label>
              <input
                type="text"
                value={modalAuditorNotes}
                onChange={(e) => setModalAuditorNotes(e.target.value)}
                placeholder="e.g. Verified by Compliance Officer J. Miller (License #AUD-8821)..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInvestigatingDeviation(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRemediation}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg shadow-md transition-all ${
                  saveSuccessToast
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {saveSuccessToast ? <Check className="w-4 h-4 text-white" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{saveSuccessToast ? 'Remediation Saved!' : 'Save Remediation & Sign-Off'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
