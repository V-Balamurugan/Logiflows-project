import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  PenTool, 
  AlertTriangle, 
  Phone, 
  Navigation,
  FileCheck
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Parcel } from '../../types';
import { PredictiveDelayWidget } from '../intelligence/PredictiveDelayWidget';

interface Props {
  onOpenScanner: () => void;
  onOpenPod: (parcel: Parcel) => void;
  onSelectParcel: (parcel: Parcel) => void;
}

export const CourierDashboard: React.FC<Props> = ({
  onOpenScanner,
  onOpenPod,
  onSelectParcel,
}) => {
  const currentUser = storage.getCurrentUser();
  const currentTenantId = storage.getActiveTenantId();
  const parcels = storage.getParcels(currentTenantId);

  // Parcels assigned to Marcus Vance
  const myParcels = parcels.filter(
    (p) => p.assignedCourierId === currentUser.id || p.status === 'OUT_FOR_DELIVERY'
  );

  const pendingStops = myParcels.filter((p) => p.status !== 'DELIVERED');
  const completedStops = myParcels.filter((p) => p.status === 'DELIVERED');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Courier Header Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-0.5">
            COURIER FIELD TERMINAL · ROUTE RUN #402
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Welcome back, {currentUser.name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Assigned Vehicle: <strong className="text-indigo-300 font-mono">APX-EV-101 (82% Battery)</strong> · Active Shift Active
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenScanner}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Custody Barcode</span>
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Pending Deliveries</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {pendingStops.length} Stops
          </div>
          <span className="text-[11px] text-slate-500">Remaining in itinerary</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Completed Today</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {completedStops.length} Delivered
          </div>
          <span className="text-[11px] text-slate-500">Signatures captured</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400 block mb-1">Courier Rating</span>
          <div className="text-2xl font-bold font-mono text-slate-100">
            4.94 / 5.0
          </div>
          <span className="text-[11px] text-slate-500">1,420 career drops</span>
        </div>
      </div>

      {/* AI Predictive Delay Intelligence & Corridor Bottleneck Widget */}
      <PredictiveDelayWidget />

      {/* Assigned Delivery Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">
            Today's Route Stops Sequence
          </h3>
          <span className="text-xs text-slate-400">
            Ordered by dynamic routing engine
          </span>
        </div>

        <div className="space-y-3">
          {pendingStops.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              All deliveries completed for this run!
            </div>
          ) : (
            pendingStops.map((pcl, idx) => (
              <div
                key={pcl.id}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {pcl.trackingNumber}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {pcl.serviceTier.replace(/_/g, ' ')}
                    </span>
                    {pcl.delayRisk.level !== 'LOW' && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {pcl.delayRisk.level} RISK (+{pcl.delayRisk.predictedDelayMinutes}m)
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-slate-200 text-sm">
                    {pcl.recipient.name} {pcl.recipient.company ? `(${pcl.recipient.company})` : ''}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{pcl.recipient.street}, {pcl.recipient.city}, {pcl.recipient.postalCode}</span>
                  </div>

                  {pcl.specialInstructions && (
                    <div className="text-[11px] text-amber-300/90 italic">
                      Note: {pcl.specialInstructions}
                    </div>
                  )}
                </div>

                {/* Courier Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenPod(pcl)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Deliver & Sign POD</span>
                  </button>
                  <button
                    onClick={() => onSelectParcel(pcl)}
                    className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Custody Log
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
