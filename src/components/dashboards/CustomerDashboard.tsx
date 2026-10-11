import React from 'react';
import { 
  Package, 
  Plus, 
  Printer, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Parcel } from '../../types';

interface Props {
  onOpenBooking: () => void;
  onSelectParcel: (parcel: Parcel) => void;
  onPrintLabel: (parcel: Parcel) => void;
}

export const CustomerDashboard: React.FC<Props> = ({
  onOpenBooking,
  onSelectParcel,
  onPrintLabel,
}) => {
  const currentUser = storage.getCurrentUser();
  const parcels = storage.getParcels();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            B2B CLIENT SHIPMENT PORTAL
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Welcome, {currentUser.name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your outgoing shipments, download thermal shipping labels, and inspect real-time courier custody.
          </p>
        </div>

        <button
          onClick={onOpenBooking}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Book New Commercial Parcel</span>
        </button>
      </div>

      {/* Shipment Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Active Outgoing Shipments</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {parcels.filter((p) => p.status !== 'DELIVERED').length}
          </div>
          <span className="text-[11px] text-slate-500">In carrier network</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Completed Deliveries</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {parcels.filter((p) => p.status === 'DELIVERED').length}
          </div>
          <span className="text-[11px] text-slate-500">With digital POD archived</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400 block mb-1">Carrier Network Tier</span>
          <div className="text-2xl font-bold font-mono text-slate-100">
            SLA Priority
          </div>
          <span className="text-[11px] text-slate-500">Continuous custody insured</span>
        </div>
      </div>

      {/* Shipments List */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">
            My Shipments & Live Milestone Trackers
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {parcels.length} total records
          </span>
        </div>

        <div className="space-y-4">
          {parcels.map((pcl) => (
            <div
              key={pcl.id}
              className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-slate-100">
                      {pcl.trackingNumber}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {pcl.serviceTier.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Booked {new Date(pcl.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    To: <strong className="text-slate-200">{pcl.recipient.name}</strong> · {pcl.recipient.street}, {pcl.recipient.city}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPrintLabel(pcl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Download 4x6 Label</span>
                  </button>
                  <button
                    onClick={() => onSelectParcel(pcl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                  >
                    <span>View Custody Log</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Stepper Progression */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                {[
                  { label: 'Booked', active: true },
                  { 
                    label: 'Hub Sortation', 
                    active: pcl.status !== 'BOOKED' 
                  },
                  { 
                    label: 'Out for Delivery', 
                    active: pcl.status === 'OUT_FOR_DELIVERY' || pcl.status === 'DELIVERED' 
                  },
                  { 
                    label: 'Delivered', 
                    active: pcl.status === 'DELIVERED' 
                  },
                ].map((step, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className={`h-1.5 rounded-full ${
                      step.active ? 'bg-indigo-500' : 'bg-slate-800'
                    }`} />
                    <span className={`text-[11px] font-medium block ${
                      step.active ? 'text-slate-200' : 'text-slate-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Delivery Proof Highlight (if delivered) */}
              {pcl.proofOfDelivery && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Signed & Received by: <strong>{pcl.proofOfDelivery.recipientName}</strong> at {new Date(pcl.proofOfDelivery.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400">
                    {pcl.proofOfDelivery.confirmationCode}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
