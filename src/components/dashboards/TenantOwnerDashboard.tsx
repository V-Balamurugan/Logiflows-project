import React, { useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  Warehouse, 
  Truck, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { storage } from '../../services/storage';
import { LogisticsMap } from '../map/LogisticsMap';
import { Parcel } from '../../types';
import { PredictiveDelayWidget } from '../intelligence/PredictiveDelayWidget';

interface Props {
  onSelectParcel: (parcel: Parcel) => void;
  onOpenBooking: () => void;
  onNavigateMetrics?: () => void;
}

export const TenantOwnerDashboard: React.FC<Props> = ({ 
  onSelectParcel, 
  onOpenBooking,
  onNavigateMetrics 
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const tenant = storage.getTenantById(currentTenantId);
  const hubs = storage.getHubs(currentTenantId);
  const vehicles = storage.getVehicles(currentTenantId);
  const parcels = storage.getParcels(currentTenantId);

  const [selectedPcl, setSelectedPcl] = useState<Parcel | null>(null);

  // Filter delayed parcels for AI mitigation panel
  const delayedParcels = parcels.filter((p) => p.delayRisk.level !== 'LOW');
  const activeCount = parcels.filter((p) => p.status !== 'DELIVERED').length;
  const deliveredCount = parcels.filter((p) => p.status === 'DELIVERED').length;

  const handleMitigate = (parcel: Parcel) => {
    // Apply simulated AI mitigation
    storage.updateParcelStatus(
      parcel.id,
      parcel.status,
      'INTER_HUB_DISPATCH',
      'AI Intelligent Dynamic Reroute',
      `Applied AI mitigation: ${parcel.delayRisk.recommendedMitigation}`
    );
    // Lower delay risk
    storage.updateParcelDelayAssessment(parcel.id, {
      ...parcel.delayRisk,
      level: 'LOW',
      predictedDelayMinutes: 0,
      primaryRiskFactor: 'Mitigated: Transit redirected to optimal corridor.',
      recommendedMitigation: 'Route updated. ETA stabilized.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            TENANT OWNER OPERATIONS CONSOLE · {tenant?.code || 'APEX'}
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            {tenant?.name || 'Apex Express Logistics'} Operations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time geospatial dispatch, PostGIS hub networks, and machine learning delay mitigation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onNavigateMetrics && (
            <button
              onClick={onNavigateMetrics}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              Performance Analytics
            </button>
          )}
          <button
            onClick={onOpenBooking}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            Create Shipment Booking
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Parcels In Transit</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {activeCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {deliveredCount} delivered successfully
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">On-Time SLA Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            98.6%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            +0.4% above quarterly SLA
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Sorting Hubs</span>
            <Warehouse className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {hubs.length} Hubs
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {hubs.filter((h) => h.status === 'CONGESTED').length} congested
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Fleet Deployment</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {vehicles.filter((v) => v.status === 'ON_ROUTE').length} / {vehicles.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Vehicles streaming GPS
          </div>
        </div>
      </div>

      {/* Main Centerpiece: Integrated Geospatial Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Live Fleet & Hub PostGIS Spatial Overview
            </h3>
            <span className="text-xs text-slate-500">
              · Verified JWT Scope: <strong className="text-indigo-300 font-mono">{currentTenantId}</strong>
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Interactive Pan & Zoom · Live Telemetry
          </span>
        </div>

        <LogisticsMap
          hubs={hubs}
          vehicles={vehicles}
          parcels={parcels}
          selectedParcelId={selectedPcl?.id}
          onSelectParcel={(p) => setSelectedPcl(p)}
          className="h-[460px]"
        />
      </div>

      {/* AI Delay Intelligence & Proactive Alternative Routing */}
      <PredictiveDelayWidget />
    </div>
  );
};
