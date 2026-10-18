import React, { useState } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Truck, 
  UserCheck, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Sliders, 
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Parcel, Employee, Vehicle } from '../../types';
import { 
  AutoDispatchSuggestion, 
  CourierCandidateScore 
} from '../../services/autoDispatchService';

interface Props {
  suggestions: AutoDispatchSuggestion[];
  currentCourierId: string;
  onApplyDispatch: (parcelId: string, courierId: string, vehicleId?: string) => void;
  onBatchAutoDispatchAll?: (items: { parcelId: string; courierId: string; vehicleId?: string }[]) => void;
}

export const AutoDispatchModal: React.FC<Props> = ({
  suggestions,
  currentCourierId,
  onApplyDispatch,
  onBatchAutoDispatchAll,
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<AutoDispatchSuggestion | null>(
    suggestions[0] || null
  );

  if (suggestions.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
        <h4 className="text-sm font-bold text-slate-100">
          All Pickup Requests Dispatched
        </h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          There are currently no unassigned pickup manifests waiting in queue. As new orders arrive via B2B API gateways, the auto-dispatch algorithm will compute proximity match scores.
        </p>
      </div>
    );
  }

  const activeItem = selectedSuggestion || suggestions[0];

  const urgencyBadge = {
    CRITICAL_IMMEDIATE: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    HIGH_PRIORITY: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    STANDARD_SCHEDULE: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  };

  return (
    <div className="rounded-xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl overflow-hidden animate-fade-in text-xs">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border-b border-indigo-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                Auto-Dispatch Engine: Suggest Assignment
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {suggestions.length} Pending Pickups
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluates courier GPS distance, parcel SLA priority weights, and active capacity.
            </p>
          </div>
        </div>

        {onBatchAutoDispatchAll && suggestions.length > 1 && (
          <button
            onClick={() => {
              const batch = suggestions.map((s) => ({
                parcelId: s.parcel.id,
                courierId: s.bestCandidate.courier.id,
                vehicleId: s.bestCandidate.vehicle?.id,
              }));
              onBatchAutoDispatchAll(batch);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
            title="Auto-dispatch all pending pickups to highest-ranked couriers"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Dispatch All ({suggestions.length})</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* Left Column: Pickup Requests List */}
        <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1">
            Incoming Pickup Queue
          </div>
          {suggestions.map((item) => {
            const isSelected = activeItem.parcel.id === item.parcel.id;
            const isAssignedToMe = item.bestCandidate.courier.id === currentCourierId;

            return (
              <button
                key={item.parcel.id}
                type="button"
                onClick={() => setSelectedSuggestion(item)}
                className={`w-full p-3 rounded-lg border text-left transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono font-bold text-slate-200">
                    {item.parcel.trackingNumber}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${urgencyBadge[item.dispatchUrgency]}`}>
                    {item.parcel.serviceTier.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-[11px] font-medium text-slate-300 truncate">
                  Pickup: {item.parcel.sender.name} ({item.parcel.sender.city})
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    {item.bestCandidate.distanceKm} km away
                  </span>
                  <span className={`font-semibold ${isAssignedToMe ? 'text-emerald-400' : 'text-slate-300'}`}>
                    → {item.bestCandidate.courier.name} {isAssignedToMe ? '(You)' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Center & Right Column: Best Candidate Detail & Candidates Comparison */}
        <div className="md:col-span-2 p-4 space-y-4">
          {/* Active Pickup Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-100">
                  {activeItem.parcel.trackingNumber}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${urgencyBadge[activeItem.dispatchUrgency]}`}>
                  {activeItem.parcel.serviceTier.replace(/_/g, ' ')}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                  {activeItem.parcel.weightKg} kg
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                <strong>Sender:</strong> {activeItem.parcel.sender.name} · {activeItem.parcel.sender.street}, {activeItem.parcel.sender.city}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                <strong>Dropoff:</strong> {activeItem.parcel.recipient.name} ({activeItem.parcel.recipient.city})
              </p>
            </div>

            <button
              onClick={() => {
                onApplyDispatch(
                  activeItem.parcel.id,
                  activeItem.bestCandidate.courier.id,
                  activeItem.bestCandidate.vehicle?.id
                );
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition-all shrink-0 self-start sm:self-auto"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirm Dispatch to {activeItem.bestCandidate.courier.name}</span>
            </button>
          </div>

          {/* Highest-Ranked Courier Candidate Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Algorithm Recommendation (#1 Rank)
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Confidence Match: <strong className="text-emerald-400">{activeItem.bestCandidate.matchConfidence}</strong> ({activeItem.bestCandidate.totalScore} pts)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {activeItem.bestCandidate.courier.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                      {activeItem.bestCandidate.courier.name}
                      {activeItem.bestCandidate.courier.id === currentCourierId && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[9px] border border-indigo-500/30">
                          YOU
                        </span>
                      )}
                    </h5>
                    <div className="text-[11px] text-slate-400">
                      Vehicle: <span className="font-mono text-slate-200">{activeItem.bestCandidate.vehicle?.vehicleNumber || 'Unassigned'}</span> · Rating: <span className="text-amber-300 font-mono">★ {activeItem.bestCandidate.courier.rating}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    {activeItem.bestCandidate.distanceKm} km away
                  </div>
                  <span className="text-[10px] text-slate-400">
                    ~{Math.round(activeItem.bestCandidate.distanceKm * 2.2)} mins ETA to pickup dock
                  </span>
                </div>
              </div>

              {/* Rationale badges */}
              <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  {activeItem.bestCandidate.matchReason}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-700">
                  Priority SLA Score: +{activeItem.bestCandidate.priorityScore}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-700">
                  Proximity Weight: +{Math.max(0, 50 - activeItem.bestCandidate.distanceKm * 1.25).toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Alternate Candidate Couriers */}
          {activeItem.alternateCandidates.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Alternate Available Couriers
              </span>

              <div className="space-y-2">
                {activeItem.alternateCandidates.map((alt) => (
                  <div
                    key={alt.courier.id}
                    className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span>{alt.courier.name}</span>
                        {alt.courier.id === currentCourierId && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[9px]">
                            YOU
                          </span>
                        )}
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({alt.vehicle?.vehicleNumber || 'Van'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {alt.distanceKm} km away · Score: {alt.totalScore} pts · {alt.matchConfidence} match
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onApplyDispatch(activeItem.parcel.id, alt.courier.id, alt.vehicle?.id);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    >
                      Assign Instead
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
