import React from 'react';
import { X, Printer, ShieldCheck, MapPin, Truck, Package, Sparkles } from 'lucide-react';
import { Parcel } from '../../types';
import { CustodyTimeline } from './CustodyTimeline';

interface Props {
  parcel: Parcel | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintLabel: (parcel: Parcel) => void;
}

export const ParcelDetailModal: React.FC<Props> = ({
  parcel,
  isOpen,
  onClose,
  onPrintLabel,
}) => {
  if (!isOpen || !parcel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono text-slate-100">
                {parcel.trackingNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {parcel.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Service: {parcel.serviceTier.replace(/_/g, ' ')} · {parcel.packageType.replace(/_/g, ' ')} ({parcel.weightKg}kg)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintLabel(parcel)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 4x6 Label</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Origin & Destination Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Sender / Origin
              </span>
              <div className="font-semibold text-slate-200">
                {parcel.sender.name} ({parcel.sender.company || 'Enterprise'})
              </div>
              <div className="text-slate-400">
                {parcel.sender.street}, {parcel.sender.city}, {parcel.sender.state} {parcel.sender.postalCode}
              </div>
              <div className="text-slate-500 text-[11px]">Contact: {parcel.sender.phone}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Recipient / Destination
              </span>
              <div className="font-semibold text-slate-200">
                {parcel.recipient.name} {parcel.recipient.company ? `(${parcel.recipient.company})` : ''}
              </div>
              <div className="text-slate-400">
                {parcel.recipient.street}, {parcel.recipient.city}, {parcel.recipient.state} {parcel.recipient.postalCode}
              </div>
              <div className="text-slate-500 text-[11px]">Contact: {parcel.recipient.phone}</div>
            </div>
          </div>

          {/* AI Delay Intelligence Assessment */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Predictive Delay Intelligence</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  parcel.delayRisk.level === 'HIGH'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : parcel.delayRisk.level === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {parcel.delayRisk.level} RISK (+{parcel.delayRisk.predictedDelayMinutes} min)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Factor: {parcel.delayRisk.primaryRiskFactor}
            </p>
            <p className="text-[11px] text-indigo-400">
              Recommended Mitigation: {parcel.delayRisk.recommendedMitigation}
            </p>
          </div>

          {/* Custody Timeline */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <CustodyTimeline
              events={parcel.custodyEvents}
              trackingNumber={parcel.trackingNumber}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <span className="text-xs font-mono text-slate-500">
            QR TOKEN: {parcel.qrToken.slice(0, 24)}...
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
