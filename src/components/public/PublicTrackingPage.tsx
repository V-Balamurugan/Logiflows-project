import React, { useState } from 'react';
import { 
  Search, 
  Package, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Warehouse, 
  ShieldCheck, 
  AlertCircle,
  Printer,
  ArrowLeft
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Parcel } from '../../types';
import { CustodyTimeline } from '../parcels/CustodyTimeline';

interface Props {
  onBackToApp: () => void;
  onPrintLabel: (parcel: Parcel) => void;
}

export const PublicTrackingPage: React.FC<Props> = ({ onBackToApp, onPrintLabel }) => {
  const [query, setQuery] = useState('LF-2026-89410-APX');
  const [parcel, setParcel] = useState<Parcel | null>(() => storage.getParcelByTracking('LF-2026-89410-APX') || null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (searchVal: string) => {
    setError(null);
    const found = storage.getParcelByTracking(searchVal);
    if (found) {
      setParcel(found);
    } else {
      setError(`No parcel found matching tracking or token: "${searchVal}".`);
      setParcel(null);
    }
  };

  const sampleTrackingNumbers = [
    'LF-2026-89410-APX',
    'LF-2026-89411-APX',
    'LF-2026-89412-APX',
    'LF-2026-89413-APX',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToApp}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to LogiFlows Portal</span>
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Public Tracking Gateway · SSL Secured</span>
          </div>
        </div>

        {/* Search Hero Box */}
        <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              LogiFlows Live Parcel Tracking
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Continuous custody verification, dynamic delivery ETA, and cryptographic audit ledger.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch(query);
                }}
                placeholder="Enter Tracking Number (e.g. LF-2026-89410-APX)"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => handleSearch(query)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-colors"
            >
              Track
            </button>
          </div>

          {/* Sample quick buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-500">
            <span>Quick test:</span>
            {sampleTrackingNumbers.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  handleSearch(s);
                }}
                className="font-mono text-indigo-400 hover:text-indigo-300 underline"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 max-w-md mx-auto">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Parcel Details Result Card */}
        {parcel && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
                    PARCEL IDENTITY CONFIRMED
                  </span>
                  <div className="text-xl font-bold font-mono text-white">
                    {parcel.trackingNumber}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Service: {parcel.serviceTier.replace(/_/g, ' ')} · {parcel.packageType.replace(/_/g, ' ')} ({parcel.weightKg} kg)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                    {parcel.status.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => onPrintLabel(parcel)}
                    className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Print 4x6 Label"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Transit Route Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Origin Shipper
                  </span>
                  <div className="font-semibold text-slate-200">{parcel.sender.name} ({parcel.sender.company || 'Enterprise'})</div>
                  <div className="text-slate-400">{parcel.sender.street}, {parcel.sender.city}, {parcel.sender.postalCode}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Destination Recipient
                  </span>
                  <div className="font-semibold text-slate-200">{parcel.recipient.name}</div>
                  <div className="text-slate-400">{parcel.recipient.street}, {parcel.recipient.city}, {parcel.recipient.postalCode}</div>
                </div>
              </div>

              {/* Dynamic ETA & Delay Risk Notice */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Estimated Delivery Window:</span>
                  <span className="text-sm font-bold font-mono text-slate-100">
                    {new Date(parcel.estimatedDeliveryDate).toLocaleDateString()} at {new Date(parcel.estimatedDeliveryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Transit SLA Risk:</span>
                  <span className={`font-mono font-bold ${
                    parcel.delayRisk.level === 'HIGH' ? 'text-rose-400' : parcel.delayRisk.level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {parcel.delayRisk.level} DELAY RISK
                  </span>
                </div>
              </div>

              {/* Proof of Delivery (if completed) */}
              {parcel.proofOfDelivery && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Official Delivery Receipt Verified</span>
                    </span>
                    <span className="font-mono text-emerald-400">{parcel.proofOfDelivery.confirmationCode}</span>
                  </div>
                  <p className="text-slate-300">
                    Delivered to <strong>{parcel.proofOfDelivery.recipientName}</strong> on {new Date(parcel.proofOfDelivery.timestamp).toLocaleString()}
                  </p>
                  {parcel.proofOfDelivery.notes && (
                    <p className="text-slate-400 italic">
                      Remarks: "{parcel.proofOfDelivery.notes}"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Custody Timeline */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <CustodyTimeline
                events={parcel.custodyEvents}
                trackingNumber={parcel.trackingNumber}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
