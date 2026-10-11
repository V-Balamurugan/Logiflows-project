import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  User, 
  Truck, 
  FileCheck, 
  Warehouse,
  AlertCircle
} from 'lucide-react';
import { CustodyEvent } from '../../types';

interface Props {
  events: CustodyEvent[];
  trackingNumber: string;
}

export const CustodyTimeline: React.FC<Props> = ({ events, trackingNumber }) => {
  // Sort events chronologically ascending
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'BOOKING_CREATED':
        return <FileCheck className="w-4 h-4 text-indigo-400" />;
      case 'COURIER_PICKUP':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'HUB_CHECK_IN':
      case 'DESTINATION_HUB_RECEIVED':
        return <Warehouse className="w-4 h-4 text-blue-400" />;
      case 'INTER_HUB_DISPATCH':
      case 'OUT_FOR_DELIVERY_DISPATCH':
        return <Truck className="w-4 h-4 text-amber-400" />;
      case 'DELIVERY_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'DELIVERY_ATTEMPTED':
      case 'EXCEPTION_LOGGED':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">
            Continuous Custody Audit Ledger
          </h4>
          <p className="text-xs text-slate-400">
            Immutable chain of handling for <span className="font-mono text-indigo-300">{trackingNumber}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Chain Verified</span>
        </div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
        {sorted.map((evt, idx) => {
          const isLatest = idx === sorted.length - 1;
          return (
            <div key={evt.id} className="relative group">
              {/* Node dot */}
              <div className={`absolute -left-[27px] top-1 p-1 rounded-full border ${
                isLatest 
                  ? 'bg-slate-900 border-emerald-500 text-emerald-400 ring-4 ring-emerald-500/20' 
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}>
                {getEventIcon(evt.eventType)}
              </div>

              {/* Event Content */}
              <div className={`p-4 rounded-lg border transition-colors ${
                isLatest ? 'bg-slate-900/80 border-slate-700/80' : 'bg-slate-950/40 border-slate-800/60'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {evt.eventType.replace(/_/g, ' ')}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Current Status
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                  {evt.notes}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{evt.locationName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>{evt.operatorName} ({evt.operatorRole})</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                    <span>Hash:</span>
                    <span className="text-indigo-400">{evt.verificationHash}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
