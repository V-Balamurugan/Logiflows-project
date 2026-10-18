import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CloudCheck, 
  CloudAlert, 
  Signal, 
  SignalLow, 
  SignalMedium, 
  SignalHigh, 
  SignalZero,
  ChevronDown
} from 'lucide-react';
import { offlineSyncService, OfflineSyncState } from '../../services/offlineSyncService';

interface Props {
  onClick: () => void;
  className?: string;
}

export const OfflineSyncBadge: React.FC<Props> = ({ onClick, className = '' }) => {
  const [syncState, setSyncState] = useState<OfflineSyncState>(() => offlineSyncService.getState());

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((newState) => {
      setSyncState(newState);
    });
    return unsubscribe;
  }, []);

  const getSignalIcon = () => {
    if (!syncState.isOnline) {
      return <SignalZero className="w-3.5 h-3.5 text-rose-400" />;
    }
    switch (syncState.signalStrengthBars) {
      case 1:
        return <SignalLow className="w-3.5 h-3.5 text-amber-400" />;
      case 2:
        return <SignalMedium className="w-3.5 h-3.5 text-amber-300" />;
      case 3:
      case 4:
      default:
        return <SignalHigh className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getStatusContent = () => {
    if (syncState.isSyncing) {
      return {
        label: 'Syncing Outbox...',
        sublabel: `${syncState.syncingCount || syncState.pendingCount} items`,
        pillColor: 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300',
        dotColor: 'bg-indigo-400 animate-spin',
        icon: <RefreshCw className="w-3.5 h-3.5 text-indigo-300 animate-spin" />,
      };
    }

    if (!syncState.isOnline) {
      return {
        label: 'Cellular Dead Zone',
        sublabel: `${syncState.pendingCount} queued`,
        pillColor: 'bg-amber-950/80 border-amber-500/40 text-amber-300 shadow-amber-900/20 shadow-md',
        dotColor: 'bg-amber-400 animate-ping',
        icon: <WifiOff className="w-3.5 h-3.5 text-amber-400" />,
      };
    }

    if (syncState.pendingCount > 0) {
      return {
        label: 'Pending Upload',
        sublabel: `${syncState.pendingCount} in outbox`,
        pillColor: 'bg-sky-950/80 border-sky-500/40 text-sky-300',
        dotColor: 'bg-sky-400 animate-pulse',
        icon: <CloudAlert className="w-3.5 h-3.5 text-sky-400" />,
      };
    }

    return {
      label: 'Sync: Online',
      sublabel: 'Cloud Linked',
      pillColor: 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700',
      dotColor: 'bg-emerald-400',
      icon: <Wifi className="w-3.5 h-3.5 text-emerald-400" />,
    };
  };

  const current = getStatusContent();

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${current.pillColor} ${className}`}
      title={`Network & Offline Outbox Manager (${syncState.carrierName})`}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        {current.icon}
        {getSignalIcon()}
      </div>

      <div className="flex flex-col text-left leading-none">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs tracking-tight">
            {current.label}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor}`} />
        </div>
        <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
          {current.sublabel}
        </span>
      </div>

      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200 transition-transform ml-0.5" />

      {/* Floating badge if pending items exist while offline */}
      {syncState.pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] font-mono shadow-md animate-pulse">
          {syncState.pendingCount}
        </span>
      )}
    </button>
  );
};
