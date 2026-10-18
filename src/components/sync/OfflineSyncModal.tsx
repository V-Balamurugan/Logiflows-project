import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  Database, 
  Smartphone, 
  Signal, 
  SignalLow, 
  SignalMedium, 
  SignalHigh, 
  SignalZero,
  ShieldCheck, 
  Trash2, 
  RotateCw, 
  Zap, 
  Radio, 
  HelpCircle,
  FileCheck,
  Send,
  Layers
} from 'lucide-react';
import { 
  offlineSyncService, 
  OfflineSyncState, 
  SyncOperation, 
  CellularSimulationMode 
} from '../../services/offlineSyncService';
import { SWRegistrationState, subscribeSWState } from '../../services/serviceWorkerRegistration';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<OfflineSyncState>(() => offlineSyncService.getState());
  const [outboxItems, setOutboxItems] = useState<SyncOperation[]>(() => offlineSyncService.getOutbox());
  const [activeTab, setActiveTab] = useState<'outbox' | 'network_sim' | 'architecture'>('outbox');
  const [swState, setSwState] = useState<SWRegistrationState>({
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isActive: false,
    hasSyncSupport: false,
  });
  const [selectedItemDetail, setSelectedItemDetail] = useState<SyncOperation | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubSync = offlineSyncService.subscribe((state) => {
      setSyncState(state);
      setOutboxItems(offlineSyncService.getOutbox());
    });

    const unsubSw = subscribeSWState((state) => {
      setSwState(state);
    });

    return () => {
      unsubSync();
      unsubSw();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimModeChange = (mode: CellularSimulationMode) => {
    offlineSyncService.setSimulationMode(mode);
  };

  const handleForceSync = async () => {
    await offlineSyncService.processOutboxQueue();
  };

  const handleClearSynced = () => {
    offlineSyncService.clearSyncedOperations();
  };

  const handleRetryFailed = () => {
    offlineSyncService.retryFailedOperations();
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
              syncState.isOnline 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' 
                : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
            }`}>
              {syncState.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Offline Sync & Cellular Resiliency Engine
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  syncState.isOnline
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {syncState.isOnline ? 'ONLINE (SYNC READY)' : 'OFFLINE (OUTBOX QUEUED)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Service Worker cache & local storage outbox prevent progress loss in subterranean garages and rural corridors.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Carrier / Signal</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 truncate">
              {syncState.isOnline ? (
                <SignalHigh className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <SignalZero className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className="truncate">{syncState.carrierName}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Estimated RTT</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{syncState.isOnline ? `${syncState.latencyMs} ms` : '∞ (Disconnected)'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Service Worker</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{swState.isActive ? 'Active (Precached)' : swState.isRegistered ? 'Registered' : 'Supported'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Pending In Outbox</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono text-amber-300 font-bold">{syncState.pendingCount} Operations</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setActiveTab('outbox')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-xs transition-all ${
              activeTab === 'outbox'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Courier Outbox Queue</span>
            {syncState.pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] font-mono">
                {syncState.pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('network_sim')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-xs transition-all ${
              activeTab === 'network_sim'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Cellular Coverage Simulator</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
              LIVE TEST
            </span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-xs transition-all ${
              activeTab === 'architecture'
                ? 'border-indigo-500 text-indigo-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zero-Loss Architecture</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'outbox' && (
            <div className="space-y-4">
              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleForceSync}
                    disabled={!syncState.isOnline || syncState.isSyncing || syncState.pendingCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-xs shadow-md transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
                    <span>{syncState.isSyncing ? 'Pushing to Cloud...' : 'Force Sync Now'}</span>
                  </button>

                  {!syncState.isOnline && (
                    <button
                      onClick={() => handleSimModeChange('ONLINE_5G')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Simulate Signal Restored</span>
                    </button>
                  )}

                  {syncState.failedCount > 0 && (
                    <button
                      onClick={handleRetryFailed}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Retry {syncState.failedCount} Failed</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {syncState.syncedCount > 0 && (
                    <button
                      onClick={handleClearSynced}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Clear completed sync items"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear {syncState.syncedCount} Synced</span>
                    </button>
                  )}
                  {syncState.lastSyncedAt && (
                    <span className="text-[11px] font-mono text-slate-500">
                      Last sync: {formatTimestamp(syncState.lastSyncedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Items List */}
              {outboxItems.length === 0 ? (
                <div className="p-12 text-center rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-200">Outbox is Clean</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    All courier delivery updates, electronic signatures, and custody checkpoint events have been synchronized with the cloud backend.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {outboxItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        item.status === 'PENDING'
                          ? 'bg-slate-950/80 border-amber-500/40'
                          : item.status === 'SYNCING'
                          ? 'bg-indigo-950/40 border-indigo-500/50'
                          : item.status === 'FAILED'
                          ? 'bg-rose-950/40 border-rose-500/50'
                          : 'bg-slate-950/40 border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5">
                            {item.status === 'PENDING' && (
                              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                            )}
                            {item.status === 'SYNCING' && (
                              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                            )}
                            {item.status === 'SYNCED' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                            {item.status === 'FAILED' && (
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-xs text-slate-200">
                                {item.summary}
                              </span>
                              {item.trackingNumber && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px] border border-indigo-500/30">
                                  {item.trackingNumber}
                                </span>
                              )}
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold ${
                                item.status === 'PENDING'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : item.status === 'SYNCING'
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : item.status === 'FAILED'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {item.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                              <span>Queued: {formatTimestamp(item.queuedAt)}</span>
                              {item.syncedAt && (
                                <span className="text-emerald-400">Synced: {formatTimestamp(item.syncedAt)}</span>
                              )}
                              {item.retryCount > 0 && (
                                <span className="text-amber-400">Retries: {item.retryCount}</span>
                              )}
                              {item.error && (
                                <span className="text-rose-400 font-mono">{item.error}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedItemDetail(selectedItemDetail?.id === item.id ? null : item)}
                          className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-900 rounded border border-slate-800 transition-colors"
                        >
                          {selectedItemDetail?.id === item.id ? 'Hide' : 'Inspect'}
                        </button>
                      </div>

                      {/* Expanded Payload Inspector */}
                      {selectedItemDetail?.id === item.id && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                          <div className="text-[10px] text-slate-500 uppercase mb-1">Encrypted Payload Snapshot:</div>
                          <pre className="text-indigo-200 whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {JSON.stringify(item.payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'network_sim' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Cellular Coverage Quality Simulator
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Test how the platform handles loss of signal in real time. Switch into subterranean deadzone to perform deliveries, signatures, and QR scans completely offline, then watch them auto-upload when you restore 5G coverage.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode 1: Auto */}
                  <div 
                    onClick={() => handleSimModeChange('AUTO')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      syncState.simulationMode === 'AUTO'
                        ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-white">Browser Auto Network</span>
                      <Radio className={`w-4 h-4 ${syncState.simulationMode === 'AUTO' ? 'text-indigo-400' : 'text-slate-600'}`} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Reflects real-world browser `navigator.onLine` and operating system Wi-Fi / cellular state.
                    </p>
                  </div>

                  {/* Mode 2: Online 5G */}
                  <div 
                    onClick={() => handleSimModeChange('ONLINE_5G')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      syncState.simulationMode === 'ONLINE_5G'
                        ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-emerald-300">5G High Speed (Optimal)</span>
                      <SignalHigh className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-xs text-slate-400">
                      Full signal (4 bars), 30ms latency. Updates push to the cloud instantaneously with zero queue buildup.
                    </p>
                  </div>

                  {/* Mode 3: Spotty 2G / Fringe */}
                  <div 
                    onClick={() => handleSimModeChange('POOR_COVERAGE_2G')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      syncState.simulationMode === 'POOR_COVERAGE_2G'
                        ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-amber-300">Spotty 2G / Edge Fringe</span>
                      <SignalLow className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-xs text-slate-400">
                      1 bar signal, 1,450ms latency with 25% simulated TCP retransmissions. Tests retry jitter and backoff.
                    </p>
                  </div>

                  {/* Mode 4: Dead Zone Offline */}
                  <div 
                    onClick={() => handleSimModeChange('OFFLINE_DEADZONE')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      syncState.simulationMode === 'OFFLINE_DEADZONE'
                        ? 'bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-rose-300">Dead Zone (Underground Garage)</span>
                      <SignalZero className="w-4 h-4 text-rose-400" />
                    </div>
                    <p className="text-xs text-slate-400">
                      0 bars signal. Forces complete offline mode. Courier updates accumulate safely in device local storage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  How LogiFlows Guarantees Zero Lost Progress
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
                      <Database className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-xs text-slate-200">1. Optimistic Local Write</h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Signatures, GPS coordinates, and status scans write immediately to device storage so the courier UI has 0ms latency.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                      <Clock className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-xs text-slate-200">2. FIFO Outbox Queue</h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Actions are serialized with cryptographic verification hashes into an immutable local outbox array with retry counters.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-xs text-slate-200">3. Background Auto-Push</h5>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Upon cellular link restoration or Service Worker sync events, pending operations are drained in chronological order.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-200 block">Service Worker Details:</span>
                  <p>• Scope: `/`</p>
                  <p>• Precaching: HTML shell, Google Fonts, Leaflet CSS, SVG icons, and web manifest.</p>
                  <p>• Background Sync Tag: `sync-courier-outbox`</p>
                  <p>• Cache Strategy: Network-First with Cache Fallback for documents; Stale-While-Revalidate for application assets.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Courier Device Outbox Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
};
