import React, { useState, useEffect } from 'react';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  Zap, 
  ChevronRight,
  Database
} from 'lucide-react';
import { offlineSyncService, OfflineSyncState } from '../../services/offlineSyncService';

interface Props {
  onOpenSyncManager: () => void;
}

export const OfflineCourierBanner: React.FC<Props> = ({ onOpenSyncManager }) => {
  const [syncState, setSyncState] = useState<OfflineSyncState>(() => offlineSyncService.getState());

  useEffect(() => {
    const unsub = offlineSyncService.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  // Show if offline or if pending items exist
  if (syncState.isOnline && syncState.pendingCount === 0) {
    return null;
  }

  const isOffline = !syncState.isOnline;

  return (
    <div className={`p-4 rounded-xl border transition-all animate-fade-in ${
      isOffline
        ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-amber-500/40 shadow-lg shadow-amber-950/20'
        : 'bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border-indigo-500/40'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
            isOffline 
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
              : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
          }`}>
            {isOffline ? <WifiOff className="w-5 h-5" /> : <RefreshCw className="w-5 h-5 animate-spin" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white">
                {isOffline ? 'Cellular Dead Zone Active (Subterranean / Tunnel)' : 'Uploading Queued Delivery Outbox...'}
              </span>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                isOffline ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {syncState.pendingCount} OFFLINE {syncState.pendingCount === 1 ? 'UPDATE' : 'UPDATES'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isOffline 
                ? 'Proof of Delivery signatures, QR scans, and stop completions are cached in local device storage. Zero progress will be lost.'
                : 'Connection restored. Pushing queued delivery events and digital signatures to central logistics server.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOffline && (
            <button
              onClick={() => offlineSyncService.setSimulationMode('ONLINE_5G')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate 5G Restore</span>
            </button>
          )}

          <button
            onClick={onOpenSyncManager}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Manage Outbox ({syncState.pendingCount})</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
