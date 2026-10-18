import React from 'react';
import { 
  Package, 
  Layers, 
  Search, 
  User as UserIcon, 
  ChevronDown, 
  Building2, 
  Plus,
  Bell,
  Menu
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { storage } from '../../services/storage';
import { OfflineSyncBadge } from '../sync/OfflineSyncBadge';

interface Props {
  currentUser: User;
  onOpenBooking: () => void;
  onOpenTopology: () => void;
  onNavigatePublicTracking: () => void;
  onOpenNotifications: () => void;
  onOpenOfflineSync: () => void;
  isOpenMobile?: boolean;
  onToggleMobileMenu?: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  onOpenBooking,
  onOpenTopology,
  onNavigatePublicTracking,
  onOpenNotifications,
  onOpenOfflineSync,
  isOpenMobile,
  onToggleMobileMenu,
  activeView,
  setActiveView,
}) => {
  const allUsers = storage.getAllUsers();
  const currentTenant = storage.getTenantById(storage.getActiveTenantId());

  const handleRoleSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    const user = allUsers.find((u) => u.id === selectedUserId);
    if (user) {
      storage.setCurrentUser(user);
    }
  };

  const getRoleBadgeLabel = (role: UserRole) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return 'Platform Admin';
      case 'TENANT_OWNER':
        return 'Tenant Owner';
      case 'TENANT_ADMIN':
        return 'Tenant Admin';
      case 'COURIER':
        return 'Delivery Courier';
      case 'CUSTOMER':
        return 'Corporate Customer';
      default:
        return role;
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 sm:gap-8 px-3.5 sm:px-6 py-3 sm:py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Zone 1: Brand Wordmark (Single text element wordmark) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <a 
          href="#home" 
          onClick={(e) => {
            e.preventDefault();
            setActiveView('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-mono font-black text-white text-base shadow-lg shadow-indigo-600/30">
            LF
          </div>
          <span className="font-sans font-extrabold tracking-tight">
            LogiFlows
          </span>
        </a>

        {/* Current Tenant Badge (if applicable) */}
        {currentUser.tenantId && currentTenant && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium truncate max-w-[140px]">{currentTenant.name}</span>
          </div>
        )}
      </div>

      {/* Zone 2: 4-5 concise single-line nav links with hover states */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'dashboard' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Operations Center
        </button>
        <button
          onClick={() => setActiveView('metrics')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'metrics' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Performance Metrics
        </button>
        <button
          onClick={() => setActiveView('parcels')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'parcels' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Parcel Custody
        </button>
        <button
          onClick={() => setActiveView('map')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'map' ? 'text-indigo-400 font-semibold' : ''
          }`}
        >
          Geospatial Map
        </button>
        <button
          onClick={onNavigatePublicTracking}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 text-slate-300"
        >
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          <span>Track Any Parcel</span>
        </button>
        <button
          onClick={onOpenTopology}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 text-slate-300"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Microservices Mesh</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action + Role Switcher Menu */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Interactive Role Switcher Dropdown (Allows testing all 5 roles instantly) */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <UserIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider leading-none">
              Active Role Switcher
            </span>
            <select
              value={currentUser.id}
              onChange={handleRoleSwitch}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                  {u.name} — {getRoleBadgeLabel(u.role)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Offline Sync Outbox & Cellular Status Badge */}
        <OfflineSyncBadge onClick={onOpenOfflineSync} />

        {/* Real-time Notifications Drawer Trigger */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          title="Open Logistics Notifications"
        >
          <Bell className="w-4 h-4" />
          {storage.getNotifications().filter((n) => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center font-mono ring-2 ring-slate-900 animate-pulse">
              {storage.getNotifications().filter((n) => !n.read).length}
            </span>
          )}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onOpenBooking}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm hover:shadow-indigo-500/20 transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Parcel Booking</span>
        </button>
      </div>
    </header>
  );
};
