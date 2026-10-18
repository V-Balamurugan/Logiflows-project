import React, { useState, useEffect, useMemo } from 'react';
import { 
  BellRing, 
  Sliders, 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Send, 
  Info, 
  Radio, 
  ChevronRight,
  Volume2,
  VolumeX,
  MessageSquare,
  Compass,
  FileText,
  HelpCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { storage } from '../../services/storage';
import { 
  DelayThresholdConfig, 
  PriorityBufferRule, 
  ServiceTier, 
  DelayThresholdBreachEvaluation, 
  Parcel 
} from '../../types';

interface Props {
  onThresholdsSaved?: (config: DelayThresholdConfig) => void;
  className?: string;
  compact?: boolean;
}

export const DelayThresholdConfigModal: React.FC<Props> = ({
  onThresholdsSaved,
  className = '',
  compact = false,
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const [config, setConfig] = useState<DelayThresholdConfig>(() => 
    storage.getDelayThresholdConfig(currentTenantId)
  );
  const [savedSuccessToast, setSavedSuccessToast] = useState<string | null>(null);
  const [activePriorityTab, setActivePriorityTab] = useState<ServiceTier>('SAME_DAY_PRIORITY');
  const [isSimulatingLiveScan, setIsSimulatingLiveScan] = useState(false);
  const [simulationResultToast, setSimulationResultToast] = useState<string | null>(null);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setConfig(storage.getDelayThresholdConfig(storage.getActiveTenantId()));
    });
    return unsubscribe;
  }, []);

  // Fetch current parcels for evaluation preview
  const parcels = useMemo(() => {
    return storage.getParcels(currentTenantId);
  }, [currentTenantId]);

  // Priority color styling helper
  const getTierMeta = (tier: ServiceTier) => {
    switch (tier) {
      case 'SAME_DAY_PRIORITY':
        return {
          title: 'Same-Day Priority',
          subtitle: 'High-SLA medical, perishable, or mission-critical dispatches',
          badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          accentColor: 'rose',
          dotColor: 'bg-rose-400',
          defaultWarning: 10,
          defaultCritical: 20,
        };
      case 'NEXT_DAY_EXPRESS':
        return {
          title: 'Next-Day Express',
          subtitle: 'Committed next-business-day standard corporate delivery',
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          accentColor: 'amber',
          dotColor: 'bg-amber-400',
          defaultWarning: 25,
          defaultCritical: 45,
        };
      case 'STANDARD_GROUND':
        return {
          title: 'Standard Ground',
          subtitle: 'Bulk regional fulfillment and multi-day ground transit',
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          accentColor: 'emerald',
          dotColor: 'bg-emerald-400',
          defaultWarning: 45,
          defaultCritical: 90,
        };
    }
  };

  // Evaluate parcels against current rules in real time
  const evaluatedBreaches = useMemo<DelayThresholdBreachEvaluation[]>(() => {
    const list: DelayThresholdBreachEvaluation[] = [];

    parcels.forEach((parcel) => {
      const rule = config.rules[parcel.serviceTier];
      if (!rule) return;

      const predictedDelay = parcel.delayRisk?.predictedDelayMinutes || 0;
      const confidence = parcel.delayRisk?.confidenceScore || 85;

      let breachSeverity: 'CRITICAL_BREACH' | 'WARNING_BUFFER' | 'WITHIN_BUFFER' = 'WITHIN_BUFFER';
      let bufferAllocated = rule.warningBufferMinutes;
      let bufferDeficit = 0;
      let recommendedAction = 'Nominal transit. On-time delivery within buffer.';

      if (predictedDelay >= rule.criticalBufferMinutes) {
        breachSeverity = 'CRITICAL_BREACH';
        bufferAllocated = rule.criticalBufferMinutes;
        bufferDeficit = predictedDelay - rule.criticalBufferMinutes;
        recommendedAction = rule.autoDispatchBypass 
          ? 'Emergency corridor bypass recommended + Recipient proactive SMS delay notification.'
          : 'Expedite driver waypoint order and notify regional dispatch hub.';
      } else if (predictedDelay >= rule.warningBufferMinutes) {
        breachSeverity = 'WARNING_BUFFER';
        bufferAllocated = rule.warningBufferMinutes;
        bufferDeficit = predictedDelay - rule.warningBufferMinutes;
        recommendedAction = 'Moderate delay buffer encroachment. Monitor congestion index and prepare auxiliary lane.';
      }

      list.push({
        parcel,
        priority: parcel.serviceTier,
        predictedDelayMinutes: predictedDelay,
        breachSeverity,
        bufferAllocatedMinutes: bufferAllocated,
        bufferDeficitMinutes: bufferDeficit,
        recommendedAction,
        alertDispatched: breachSeverity !== 'WITHIN_BUFFER',
      });
    });

    // Sort with critical breaches first, then warning
    return list.sort((a, b) => {
      const score = (sev: string) => (sev === 'CRITICAL_BREACH' ? 2 : sev === 'WARNING_BUFFER' ? 1 : 0);
      return score(b.breachSeverity) - score(a.breachSeverity);
    });
  }, [parcels, config]);

  // Breach count summaries
  const criticalBreachCount = evaluatedBreaches.filter((b) => b.breachSeverity === 'CRITICAL_BREACH').length;
  const warningBreachCount = evaluatedBreaches.filter((b) => b.breachSeverity === 'WARNING_BUFFER').length;
  const compliantCount = evaluatedBreaches.filter((b) => b.breachSeverity === 'WITHIN_BUFFER').length;

  // Handlers for updating active rule
  const handleUpdateActiveRule = (updates: Partial<PriorityBufferRule>) => {
    setConfig((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [activePriorityTab]: {
          ...prev.rules[activePriorityTab],
          ...updates,
        },
      },
    }));
  };

  const handleSaveConfig = () => {
    storage.saveDelayThresholdConfig(config);
    setSavedSuccessToast('Custom delay threshold buffer rules successfully saved to logistics profile!');
    if (onThresholdsSaved) {
      onThresholdsSaved(config);
    }
    setTimeout(() => {
      setSavedSuccessToast(null);
    }, 3500);
  };

  const handleResetToDefaults = () => {
    const defaults = storage.resetDelayThresholdConfig(currentTenantId);
    setConfig(defaults);
    setSavedSuccessToast('Thresholds restored to default enterprise operational baselines.');
    setTimeout(() => {
      setSavedSuccessToast(null);
    }, 3500);
  };

  // Run a real evaluation scan and dispatch notifications if triggered
  const handleRunEvaluationScan = () => {
    setIsSimulatingLiveScan(true);
    setTimeout(() => {
      setIsSimulatingLiveScan(false);

      const breached = evaluatedBreaches.filter((b) => b.breachSeverity !== 'WITHIN_BUFFER');
      if (breached.length > 0) {
        breached.forEach((b) => {
          storage.addNotification({
            title: `Threshold Alert: ${b.breachSeverity === 'CRITICAL_BREACH' ? 'CRITICAL BREACH' : 'Buffer Warning'}`,
            message: `${b.parcel.trackingNumber} (${b.priority.replace(/_/g, ' ')}) predicted delay +${b.predictedDelayMinutes}m exceeded ${b.bufferAllocatedMinutes}m buffer by +${b.bufferDeficitMinutes}m. Action: ${b.recommendedAction}`,
            category: 'DELIVERY_DELAY',
            parcelId: b.parcel.id,
            trackingNumber: b.parcel.trackingNumber,
            severity: b.breachSeverity === 'CRITICAL_BREACH' ? 'CRITICAL' : 'WARNING',
          });
        });

        setSimulationResultToast(
          `Evaluated ${parcels.length} consignments: Dispatched ${breached.length} intelligent threshold notifications across dispatch feeds!`
        );
      } else {
        setSimulationResultToast(
          `Evaluated ${parcels.length} consignments: All active shipments currently operate within configured priority buffers!`
        );
      }

      setTimeout(() => {
        setSimulationResultToast(null);
      }, 4500);
    }, 550);
  };

  const activeRule = config.rules[activePriorityTab];
  const activeMeta = getTierMeta(activePriorityTab);

  return (
    <div className={`p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Predictive Delay Alert Thresholds & Priority Buffer Rules
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Live Evaluator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Define custom time buffers and escalation triggers for each shipment priority tier to protect strict customer delivery SLAs.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset to default SLA buffers"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleRunEvaluationScan}
            disabled={isSimulatingLiveScan}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isSimulatingLiveScan ? 'animate-spin' : ''}`} />
            <span>{isSimulatingLiveScan ? 'Scanning...' : 'Scan Active Fleet'}</span>
          </button>

          <button
            onClick={handleSaveConfig}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Rules</span>
          </button>
        </div>
      </div>

      {/* Toast notifications */}
      {savedSuccessToast && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedSuccessToast}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80">Profile Synchronized</span>
        </div>
      )}

      {simulationResultToast && (
        <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-200 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{simulationResultToast}</span>
          </div>
          <span className="text-[10px] font-mono text-indigo-400/80">Telemetry Audited</span>
        </div>
      )}

      {/* Global Alert Governance Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="font-semibold text-slate-200 block text-[11px]">Global Alerting System</span>
              <span className="text-[10px] text-slate-400">Master toggle for delay broadcast</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabledGlobalAlerts}
              onChange={(e) => setConfig({ ...config, enabledGlobalAlerts: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <div>
              <span className="font-semibold text-slate-200 block text-[11px]">Corridor Sensitivity</span>
              <span className="text-[10px] text-slate-400">Trigger noise mitigation filter</span>
            </div>
          </div>
          <select
            value={config.corridorSensitivity}
            onChange={(e) => setConfig({ ...config, corridorSensitivity: e.target.value as any })}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="STRICT">Strict (Zero tolerance)</option>
            <option value="STANDARD">Standard (Balanced)</option>
            <option value="LENIENT">Lenient (High confidence only)</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-semibold text-slate-200 block text-[11px]">Auto Incident Tickets</span>
              <span className="text-[10px] text-slate-400">Create log on critical buffer breach</span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoTriggerIncidentTicket}
              onChange={(e) => setConfig({ ...config, autoTriggerIncidentTicket: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Priority Tier Tabs Selection */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {(['SAME_DAY_PRIORITY', 'NEXT_DAY_EXPRESS', 'STANDARD_GROUND'] as ServiceTier[]).map((tier) => {
            const meta = getTierMeta(tier);
            const isSelected = activePriorityTab === tier;
            const currentRule = config.rules[tier];
            const activeParcelsInTier = parcels.filter((p) => p.serviceTier === tier).length;
            const breachesInTier = evaluatedBreaches.filter(
              (b) => b.priority === tier && b.breachSeverity !== 'WITHIN_BUFFER'
            ).length;

            return (
              <button
                key={tier}
                onClick={() => setActivePriorityTab(tier)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-slate-950 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                <span>{meta.title}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                  {currentRule.warningBufferMinutes}m / {currentRule.criticalBufferMinutes}m
                </span>
                {breachesInTier > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
                    {breachesInTier} breach
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Priority Rule Configuration Panel */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>{activeMeta.title} Buffer Parameters</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${activeMeta.badgeColor}`}>
                    Tier Code: {activePriorityTab}
                  </span>
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activeMeta.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-slate-500">Active Consignments:</span>
              <strong className="text-slate-200">
                {parcels.filter((p) => p.serviceTier === activePriorityTab).length}
              </strong>
            </div>
          </div>

          {/* Interactive Sliders for Warning Buffer & Critical Buffer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Warning Buffer Slider */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">Warning Alert Buffer</span>
                </div>
                <div className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  +{activeRule.warningBufferMinutes} minutes
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Triggers proactive dispatcher radar warning when ML predicted delay exceeds this allocated cushion.
              </p>
              <input
                type="range"
                min="3"
                max="60"
                step="1"
                value={activeRule.warningBufferMinutes}
                onChange={(e) =>
                  handleUpdateActiveRule({ warningBufferMinutes: parseInt(e.target.value, 10) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Tight SLA (+3m)</span>
                <span>Balanced (+25m)</span>
                <span>Relaxed (+60m)</span>
              </div>
            </div>

            {/* Critical Buffer Slider */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-slate-200">Critical Breach Threshold</span>
                </div>
                <div className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  +{activeRule.criticalBufferMinutes} minutes
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Escalates to critical status, alerts courier terminal, and flags parcel for urgent bypass intervention.
              </p>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={activeRule.criticalBufferMinutes}
                onChange={(e) =>
                  handleUpdateActiveRule({ criticalBufferMinutes: parseInt(e.target.value, 10) })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Immediate (+10m)</span>
                <span>Standard (+45m)</span>
                <span>Maximum (+120m)</span>
              </div>
            </div>
          </div>

          {/* Secondary Parameters: ML Confidence Floor & Action Automation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Auto Dispatch Bypass Reroute */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={activeRule.autoDispatchBypass}
                onChange={(e) => handleUpdateActiveRule({ autoDispatchBypass: e.target.checked })}
                className="mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto Propose Bypass</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Automatically link recommended corridor detour to active courier navigation.
                </p>
              </div>
            </label>

            {/* Notify Recipient SMS */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={activeRule.notifyRecipientSms}
                onChange={(e) => handleUpdateActiveRule({ notifyRecipientSms: e.target.checked })}
                className="mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Proactive SMS Alert</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Send updated arrival window SMS to recipient before SLA delivery breach.
                </p>
              </div>
            </label>

            {/* Audio Chime Notification */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={activeRule.soundChime}
                onChange={(e) => handleUpdateActiveRule({ soundChime: e.target.checked })}
                className="mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  {activeRule.soundChime ? (
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Audible Console Beep</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Sound dispatch terminal acoustic chime when critical alert is logged.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Real-Time Live Audit Simulation Table: Parcels Evaluated against Active Buffers */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Buffer Compliance Radar
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ({parcels.length} consignments evaluated against custom buffer thresholds)
            </span>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
              {criticalBreachCount} Critical Breaches
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              {warningBreachCount} Warnings
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {compliantCount} Within Buffer
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Parcel Tracking</th>
                <th className="py-2.5 px-3">Priority Tier</th>
                <th className="py-2.5 px-3">Predicted Delay</th>
                <th className="py-2.5 px-3">Configured Buffer</th>
                <th className="py-2.5 px-3">Variance / Deficit</th>
                <th className="py-2.5 px-3">Threshold Status</th>
                <th className="py-2.5 px-3">Intelligence Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {evaluatedBreaches.slice(0, 6).map((evalItem) => {
                const isCritical = evalItem.breachSeverity === 'CRITICAL_BREACH';
                const isWarning = evalItem.breachSeverity === 'WARNING_BUFFER';

                return (
                  <tr
                    key={evalItem.parcel.id}
                    className={`hover:bg-slate-900/50 transition-colors ${
                      isCritical ? 'bg-rose-500/5' : isWarning ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                      {evalItem.parcel.trackingNumber}
                      <span className="block text-[10px] text-slate-500 font-sans font-normal">
                        To: {evalItem.parcel.recipient.city}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        getTierMeta(evalItem.priority).badgeColor
                      }`}>
                        {getTierMeta(evalItem.priority).title}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <span className={`font-bold ${
                        evalItem.predictedDelayMinutes > 20
                          ? 'text-rose-400'
                          : evalItem.predictedDelayMinutes > 0
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}>
                        +{evalItem.predictedDelayMinutes} min
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {evalItem.bufferAllocatedMinutes}m buffer
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      {evalItem.bufferDeficitMinutes > 0 ? (
                        <span className="text-rose-400 font-bold">
                          +{evalItem.bufferDeficitMinutes}m deficit
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">
                          {Math.abs(evalItem.predictedDelayMinutes - evalItem.bufferAllocatedMinutes)}m margin
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          Critical Breach
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Warning Buffer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Within Buffer
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-[11px] text-slate-300 max-w-xs truncate" title={evalItem.recommendedAction}>
                      {evalItem.recommendedAction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
