import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Printer, 
  ExternalLink, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Parcel } from '../../types';

interface Props {
  onSelectParcel: (parcel: Parcel) => void;
  onOpenBooking: () => void;
  onPrintLabel: (parcel: Parcel) => void;
}

export const ParcelsView: React.FC<Props> = ({
  onSelectParcel,
  onOpenBooking,
  onPrintLabel,
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const parcels = storage.getParcels(currentTenantId);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = parcels.filter((p) => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchSearch =
      search === '' ||
      p.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.recipient.name.toLowerCase().includes(search.toLowerCase()) ||
      p.recipient.city.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            CONTINUOUS CUSTODY LEDGER · EVENT SOURCING
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Parcel Registry & Handling Operations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full audit history, verified QR identities, and automated serviceability records.
          </p>
        </div>
        <button
          onClick={onOpenBooking}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Book Commercial Parcel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Parcels' },
            { id: 'BOOKED', label: 'Booked' },
            { id: 'OUT_FOR_DELIVERY', label: 'Out For Delivery' },
            { id: 'DELIVERED', label: 'Delivered' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search manifests..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Parcels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((pcl) => (
          <div
            key={pcl.id}
            className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm font-bold text-slate-100 block">
                  {pcl.trackingNumber}
                </span>
                <span className="text-[11px] text-slate-400">
                  {pcl.serviceTier.replace(/_/g, ' ')} · {pcl.packageType.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {pcl.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Recipient:</span>
                <span className="font-semibold text-slate-200">{pcl.recipient.name}</span>
                <span className="text-slate-400 block truncate">{pcl.recipient.street}, {pcl.recipient.city}</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] font-mono text-slate-400">
                <span>Weight: {pcl.weightKg} kg</span>
                <span>Val: ${pcl.declaredValueUsd}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  pcl.delayRisk.level === 'HIGH'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : pcl.delayRisk.level === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {pcl.delayRisk.level} DELAY RISK
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPrintLabel(pcl)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Print Shipping Label"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onSelectParcel(pcl)}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 rounded-lg transition-colors"
                >
                  Custody Audit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
