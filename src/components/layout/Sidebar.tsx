import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  Truck, 
  Warehouse, 
  Users, 
  QrCode, 
  Building2, 
  Layers, 
  Search, 
  Activity,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { User, Tenant } from '../../types';
import { storage } from '../../services/storage';

interface Props {
  currentUser: User;
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenScanner: () => void;
  onOpenTopology: () => void;
  onOpenTracking: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentUser,
  activeView,
  setActiveView,
  onOpenScanner,
  onOpenTopology,
  onOpenTracking,
  isOpenMobile,
  onCloseMobile,
}) => {
  const tenants = storage.getTenants();
  const currentTenantId = storage.getActiveTenantId();

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    storage.setActiveTenantId(e.target.value);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Operations Center',
      icon: <LayoutDashboard className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN', 'COURIER', 'CUSTOMER'],
    },
    {
      id: 'metrics',
      label: 'Performance Metrics',
      icon: <Activity className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN'],
    },
    {
      id: 'delay-intelligence',
      label: 'Delay Intelligence',
      icon: <Sparkles className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN', 'COURIER'],
    },
    {
      id: 'parcels',
      label: 'Parcels & Custody',
      icon: <Package className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN', 'CUSTOMER'],
    },
    {
      id: 'map',
      label: 'Geospatial Operations',
      icon: <MapPin className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN', 'COURIER'],
    },
    {
      id: 'courier-deliveries',
      label: 'My Delivery Route',
      icon: <Truck className="w-4 h-4" />,
      roles: ['COURIER'],
    },
    {
      id: 'hubs',
      label: 'Hubs & Depots',
      icon: <Warehouse className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN'],
    },
    {
      id: 'fleet',
      label: 'Fleet & Telemetry',
      icon: <Truck className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN'],
    },
    {
      id: 'employees',
      label: 'Personnel & Roles',
      icon: <Users className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN'],
    },
    {
      id: 'tenants',
      label: 'Tenants & Partitions',
      icon: <Building2 className="w-4 h-4" />,
      roles: ['PLATFORM_ADMIN'],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(currentUser.role));

  const handleItemClick = (id: string) => {
    setActiveView(id);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Sidebar Close Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center font-mono font-black text-white text-xs">
              LF
            </div>
            <span className="text-xs font-bold text-slate-200">LogiFlows Menu</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            ✕
          </button>
        </div>

        {/* Tenant Context Selector (For Admin / Owner) */}
        {(currentUser.role === 'PLATFORM_ADMIN' || currentUser.role === 'TENANT_OWNER') && (
          <div className="p-4 border-b border-slate-800/80">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Logistics Tenant Scope
            </label>
            <div className="relative">
              <select
                value={currentTenantId}
                onChange={handleTenantChange}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Primary Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Core Workflows
          </div>
          {visibleItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Utilities & Operations
          </div>

          {/* Optical Scanner Trigger */}
          <button
            onClick={() => {
              onOpenScanner();
              onCloseMobile?.();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors text-left"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Optical QR Scanner</span>
          </button>

          {/* Public Tracking Search */}
          <button
            onClick={() => {
              onOpenTracking();
              onCloseMobile?.();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors text-left"
          >
            <Search className="w-4 h-4 text-indigo-400" />
            <span>Public Tracking Portal</span>
          </button>

          {/* Scalable Microservices Architecture Inspector */}
          <button
            onClick={() => {
              onOpenTopology();
              onCloseMobile?.();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors text-left"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Microservices Topology</span>
          </button>
        </nav>

      {/* Bottom Infrastructure Telemetry Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-medium">PostGIS Database</span>
            <span className="font-mono text-emerald-400 font-semibold">ONLINE</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-medium">Redis Stream</span>
            <span className="font-mono text-emerald-400 font-semibold">1ms ping</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-medium">AI Predictor</span>
            <span className="font-mono text-indigo-400 font-semibold">RandomForest</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
