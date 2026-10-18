import React, { useState } from 'react';
import { 
  Package, 
  Truck, 
  Warehouse, 
  UserCheck, 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  QrCode, 
  CheckCircle2, 
  Clock,
  Printer,
  Send
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Parcel, ParcelStatus } from '../../types';
import { LiveFleetMapOverlay } from '../map/LiveFleetMapOverlay';
import { LiveFleetMapFloatingButton } from '../map/LiveFleetMapFloatingButton';

interface Props {
  onSelectParcel: (parcel: Parcel) => void;
  onOpenBooking: () => void;
  onOpenScanner: () => void;
  onPrintLabel: (parcel: Parcel) => void;
  onNavigateFleet?: () => void;
}

export const TenantAdminDashboard: React.FC<Props> = ({
  onSelectParcel,
  onOpenBooking,
  onOpenScanner,
  onPrintLabel,
  onNavigateFleet,
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const parcels = storage.getParcels(currentTenantId);
  const couriers = storage.getEmployees(currentTenantId).filter((e) => e.role === 'COURIER');
  const vehicles = storage.getVehicles(currentTenantId);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assigningParcel, setAssigningParcel] = useState<Parcel | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isLiveFleetMapOpen, setIsLiveFleetMapOpen] = useState(false);

  const readyForDispatchCount = parcels.filter(p => 
    (p.status === 'BOOKED' || p.status === 'ACCEPTED' || p.status === 'AT_ORIGIN_HUB' || p.status === 'AT_DESTINATION_HUB') &&
    (!p.assignedVehicleId || !p.assignedCourierId)
  ).length;

  const filteredParcels = parcels.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      p.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.recipient.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenAssign = (parcel: Parcel) => {
    setAssigningParcel(parcel);
    setSelectedCourierId(parcel.assignedCourierId || (couriers[0]?.id || ''));
    setSelectedVehicleId(parcel.assignedVehicleId || (vehicles[0]?.id || ''));
  };

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningParcel || !selectedCourierId) return;

    storage.assignParcel(assigningParcel.id, selectedCourierId, selectedVehicleId);
    setAssigningParcel(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            DISPATCH & LOGISTICS OPERATIONS DESK
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Active Parcel Manifest & Dispatch Coordination
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordinate courier assignments, track continuous custody handoffs, and manage service queues.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onNavigateFleet && readyForDispatchCount > 0 && (
            <button
              onClick={onNavigateFleet}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 rounded-lg shadow-sm transition-colors"
              title="Open Batch Mass-Dispatch Engine in Fleet View"
            >
              <Send className="w-4 h-4 text-purple-400" />
              <span>Mass Dispatch ({readyForDispatchCount} Ready)</span>
            </button>
          )}
          <button
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Scan Parcel Custody</span>
          </button>
          <button
            onClick={onOpenBooking}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        {/* Interactive Segmented Filter Tabs (frontend design compliant) */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Parcels' },
            { id: 'BOOKED', label: 'Booked' },
            { id: 'IN_TRANSIT_HUB_TRANSFER', label: 'Hub Transit' },
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

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracking, recipient, city..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Parcels Table */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredParcels.length} manifests</span>
          <span className="font-mono text-slate-500">Filter: {statusFilter}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Tracking / QR Token</th>
                <th className="py-2.5 px-3">Recipient & Destination</th>
                <th className="py-2.5 px-3">Service Tier</th>
                <th className="py-2.5 px-3">Assigned Courier</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Delay Risk</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredParcels.map((pcl) => {
                const assignedCourier = couriers.find((c) => c.id === pcl.assignedCourierId);
                return (
                  <tr key={pcl.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-200">
                        {pcl.trackingNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                        {pcl.packageType.replace(/_/g, ' ')} ({pcl.weightKg}kg)
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans">
                      <div className="font-semibold text-slate-200">
                        {pcl.recipient.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {pcl.recipient.street}, {pcl.recipient.city}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-slate-300 font-semibold">
                        {pcl.serviceTier.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-sans">
                      {assignedCourier ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-slate-200 font-medium">{assignedCourier.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700">
                        {pcl.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          pcl.delayRisk.level === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : pcl.delayRisk.level === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {pcl.delayRisk.level}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenAssign(pcl)}
                          className="px-2.5 py-1 text-[11px] font-sans font-medium text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 rounded transition-colors"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => onPrintLabel(pcl)}
                          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="Print 4x6 Label"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectParcel(pcl)}
                          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="View Custody Audit"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Courier Assignment Modal */}
      {assigningParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              Dispatch Parcel to Courier
            </h3>
            <p className="text-xs text-slate-400">
              Assign <strong className="text-indigo-400 font-mono">{assigningParcel.trackingNumber}</strong> to an active shift courier.
            </p>

            <form onSubmit={handleConfirmAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Delivery Courier *
                </label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.activeDeliveriesCount} active deliveries)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assign Fleet Vehicle (Optional)
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                >
                  <option value="">No Vehicle Assigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} ({v.type.replace('_', ' ')} - {v.batteryOrFuelPct}% charge)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningParcel(null)}
                  className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
                >
                  Confirm Dispatch Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating 'Live Fleet Map' Button */}
      <LiveFleetMapFloatingButton
        onClick={() => setIsLiveFleetMapOpen(true)}
        isOpen={isLiveFleetMapOpen}
        badgeText="FLEET RADAR"
      />

      {/* Small Overlay: Active Courier location relative to next delivery destination */}
      <LiveFleetMapOverlay
        isOpen={isLiveFleetMapOpen}
        onClose={() => setIsLiveFleetMapOpen(false)}
      />
    </div>
  );
};
