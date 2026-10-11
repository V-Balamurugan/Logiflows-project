import React, { useState } from 'react';
import { 
  Building2, 
  Package, 
  Truck, 
  Warehouse, 
  Activity, 
  Plus, 
  ShieldCheck, 
  Server, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Tenant } from '../../types';

interface Props {
  onOpenTopology: () => void;
  onSelectTenant: (tenantId: string) => void;
}

export const PlatformAdminDashboard: React.FC<Props> = ({ onOpenTopology, onSelectTenant }) => {
  const tenants = storage.getTenants();
  const allParcels = storage.getParcels();
  const allHubs = storage.getHubs();
  const allVehicles = storage.getVehicles();
  const services = storage.getMicroservices();

  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [tenantContact, setTenantContact] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantRegion, setTenantRegion] = useState('North America West');

  const healthyServicesCount = services.filter((s) => s.status === 'HEALTHY').length;

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim() || !tenantCode.trim()) return;

    storage.addTenant({
      name: tenantName,
      code: tenantCode.toUpperCase(),
      tier: 'REGIONAL_PRO',
      status: 'ACTIVE',
      primaryContact: tenantContact,
      contactEmail: tenantEmail,
      region: tenantRegion,
      features: {
        predictiveAi: true,
        iotTelemetry: true,
        multiHubRouting: true,
      },
    });

    setTenantName('');
    setTenantCode('');
    setTenantContact('');
    setTenantEmail('');
    setIsAddTenantOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            PLATFORM SUPERVISION · GLOBAL CLUSTER
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Multi-Tenant Logistics Control Tower
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-tenant cluster management, PostgreSQL PostGIS partition isolation, and microservices mesh monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTopology}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inspect Microservices Mesh</span>
          </button>
          <button
            onClick={() => setIsAddTenantOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Provision New Tenant</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Tenants</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {tenants.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Isolated relational schemas
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total System Parcels</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {allParcels.length + 680}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Continuous custody ledgers
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Operational Hubs</span>
            <Warehouse className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {allHubs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            PostGIS spatial points active
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Mesh Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {healthyServicesCount}/{services.length} Healthy
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Zero critical container failures
          </div>
        </div>
      </div>

      {/* Tenants Directory Table */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Authorized Logistics Tenant Organizations
            </h3>
            <p className="text-xs text-slate-400">
              Each tenant operates under strict Row-Level Security (RLS) isolation.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {tenants.length} organizations provisioned
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Organization Name</th>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Subscription Tier</th>
                <th className="py-2.5 px-3">Operating Region</th>
                <th className="py-2.5 px-3">Hubs</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-sans font-semibold text-slate-200">
                    {t.name}
                  </td>
                  <td className="py-3 px-3 text-indigo-400 font-bold">
                    {t.code}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {t.tier.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-400">
                    {t.region}
                  </td>
                  <td className="py-3 px-3 text-slate-200">
                    {t.branchCount} Hubs
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectTenant(t.id)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-sans font-medium hover:underline"
                    >
                      <span>Switch Scope</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Tenant Modal */}
      {isAddTenantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              Provision New Tenant Workspace
            </h3>
            <form onSubmit={handleCreateTenant} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tenant Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pacific Coast Couriers"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prefix Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="PCC"
                    maxLength={5}
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono uppercase text-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={tenantRegion}
                    onChange={(e) => setTenantRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lead Admin Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Thomas Wayne"
                  value={tenantContact}
                  onChange={(e) => setTenantContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  placeholder="ops@pacificcoast.com"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTenantOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
                >
                  Confirm Provisioning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
