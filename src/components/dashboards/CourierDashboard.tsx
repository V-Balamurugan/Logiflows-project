import React, { useState, useEffect, useMemo } from 'react';
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
  FileCheck,
  Compass,
  CloudRain,
  Wind,
  Sparkles,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Leaf,
  Fuel
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Parcel, Employee, Vehicle } from '../../types';
import { PredictiveDelayWidget } from '../intelligence/PredictiveDelayWidget';
import { MultiStopPlannerModal } from '../map/MultiStopPlannerModal';
import { mockWeatherService } from '../../services/mockWeatherService';
import { LiveFleetMapOverlay } from '../map/LiveFleetMapOverlay';
import { LiveFleetMapFloatingButton } from '../map/LiveFleetMapFloatingButton';
import { autoDispatchService, AutoDispatchSuggestion } from '../../services/autoDispatchService';
import { AutoDispatchModal } from '../courier/AutoDispatchModal';
import { OfflineCourierBanner } from '../sync/OfflineCourierBanner';
import { RouteOptimizationModal } from '../courier/RouteOptimizationModal';
import { FuelEfficiencyTracker } from '../courier/FuelEfficiencyTracker';

interface Props {
  onOpenScanner: () => void;
  onOpenPod: (parcel: Parcel) => void;
  onSelectParcel: (parcel: Parcel) => void;
  onOpenOfflineSync?: () => void;
}

export const CourierDashboard: React.FC<Props> = ({
  onOpenScanner,
  onOpenPod,
  onSelectParcel,
  onOpenOfflineSync,
}) => {
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isRouteOptOpen, setIsRouteOptOpen] = useState(false);
  const [isLiveFleetMapOpen, setIsLiveFleetMapOpen] = useState(false);
  const [showSuggestAssignment, setShowSuggestAssignment] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'DELIVERY_STOPS' | 'FUEL_TRACKER'>('ALL');

  const currentUser = storage.getCurrentUser();
  const currentTenantId = storage.getActiveTenantId();

  const [parcels, setParcels] = useState<Parcel[]>(() => storage.getParcels(currentTenantId));
  const [employees, setEmployees] = useState<Employee[]>(() => storage.getEmployees(currentTenantId));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => storage.getVehicles(currentTenantId));

  // Sync state with storage updates in real-time
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setParcels(storage.getParcels(currentTenantId));
      setEmployees(storage.getEmployees(currentTenantId));
      setVehicles(storage.getVehicles(currentTenantId));
    });
    return unsubscribe;
  }, [currentTenantId]);

  // Parcels assigned to Marcus Vance
  const myParcels = parcels.filter(
    (p) => p.assignedCourierId === currentUser.id || p.status === 'OUT_FOR_DELIVERY'
  );

  const pendingStops = myParcels
    .filter((p) => p.status !== 'DELIVERED')
    .sort((a, b) => (a.routeStopOrder ?? 99) - (b.routeStopOrder ?? 99));
  const completedStops = myParcels.filter((p) => p.status === 'DELIVERED');

  // Identify new unassigned pickup requests (BOOKED, AT_ORIGIN_HUB, or without assigned courier)
  const unassignedPickups = useMemo(() => {
    return parcels.filter(
      (p) =>
        (p.status === 'BOOKED' ||
         p.status === 'ACCEPTED' ||
         p.status === 'AT_ORIGIN_HUB' ||
         !p.assignedCourierId) &&
        p.status !== 'DELIVERED'
    );
  }, [parcels]);

  // Run Auto-Dispatch algorithm
  const dispatchSuggestions: AutoDispatchSuggestion[] = useMemo(() => {
    return autoDispatchService.generateSuggestionsForPickups(
      unassignedPickups,
      employees,
      vehicles,
      parcels
    );
  }, [unassignedPickups, employees, vehicles, parcels]);

  // Single dispatch confirmation handler
  const handleApplyDispatch = (parcelId: string, courierId: string, vehicleId?: string) => {
    const success = storage.assignParcel(parcelId, courierId, vehicleId);
    if (success) {
      const assignedEmployee = employees.find((e) => e.id === courierId);
      const targetParcel = parcels.find((p) => p.id === parcelId);
      setDispatchFeedback(
        `Auto-dispatched ${targetParcel?.trackingNumber || 'parcel'} to ${assignedEmployee?.name || 'courier'}.`
      );
      setTimeout(() => setDispatchFeedback(null), 4500);
    }
  };

  // Batch auto-dispatch all
  const handleBatchAutoDispatchAll = (items: { parcelId: string; courierId: string; vehicleId?: string }[]) => {
    let count = 0;
    items.forEach((item) => {
      if (storage.assignParcel(item.parcelId, item.courierId, item.vehicleId)) {
        count++;
      }
    });
    setDispatchFeedback(`Algorithm batch-dispatched ${count} pickup assignments successfully.`);
    setTimeout(() => setDispatchFeedback(null), 4500);
  };

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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 'Suggest Assignment' Toggle Button */}
          <button
            onClick={() => setShowSuggestAssignment(!showSuggestAssignment)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all shadow-sm border ${
              showSuggestAssignment
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400/50 shadow-indigo-500/20'
                : 'bg-slate-800/90 hover:bg-slate-800 text-indigo-300 border-indigo-500/30 hover:text-white'
            }`}
            title="Auto-Dispatch Algorithm: Match pickup requests based on distance proximity and parcel priority"
          >
            <Sparkles className={`w-4 h-4 ${showSuggestAssignment ? 'text-indigo-200 fill-indigo-200/20' : 'text-indigo-400'}`} />
            <span>Suggest Assignment</span>
            {unassignedPickups.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                showSuggestAssignment ? 'bg-indigo-950/80 text-white' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {unassignedPickups.length}
              </span>
            )}
            {showSuggestAssignment ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            onClick={() => setIsPlannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="Open Multi-Stop Route Planner with Google Maps Platform Routes API"
          >
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Multi-Stop Route Planner</span>
          </button>

          {/* Dedicated Google Maps Route Optimization Engine (Traffic & Fuel Minimizer) */}
          <button
            onClick={() => setIsRouteOptOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-lg shadow-md transition-all hover:scale-[1.02] border border-emerald-400/40"
            title="Optimize Courier Multi-Stop Itinerary using live Google Maps traffic and fuel minimization"
          >
            <Zap className="w-4 h-4 text-emerald-100" />
            <span>Optimize Route (Traffic & Fuel)</span>
            <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-200 text-[9px] font-mono border border-emerald-400/30">
              GOOGLE MAPS
            </span>
          </button>

          {/* Fuel Efficiency Tracker Toggle Button */}
          <button
            onClick={() => setActiveTab(activeTab === 'FUEL_TRACKER' ? 'ALL' : 'FUEL_TRACKER')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all border ${
              activeTab === 'FUEL_TRACKER'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-slate-800/90 hover:bg-slate-800 text-emerald-300 border-emerald-500/30 hover:text-white'
            }`}
            title="Open Courier Fuel Efficiency Tracker & Recharts Line Chart"
          >
            <Fuel className="w-4 h-4 text-emerald-400" />
            <span>Fuel Tracker</span>
            <span className="hidden sm:inline px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-200 text-[9px] font-mono border border-emerald-400/30">
              RECHARTS
            </span>
          </button>

          <button
            onClick={onOpenScanner}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Custody Barcode</span>
          </button>
        </div>
      </div>

      {/* Offline Courier Cellular Deadzone Banner */}
      <OfflineCourierBanner onOpenSyncManager={onOpenOfflineSync || (() => {})} />

      {/* Auto-Dispatch Feedback Toast Banner */}
      {dispatchFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 flex items-center justify-between text-xs font-medium animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{dispatchFeedback}</span>
          </div>
          <button
            onClick={() => setDispatchFeedback(null)}
            className="text-xs text-emerald-300 hover:text-white underline font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Suggest Assignment (Auto-Dispatch Panel) when toggled */}
      {showSuggestAssignment && (
        <AutoDispatchModal
          suggestions={dispatchSuggestions}
          currentCourierId={currentUser.id}
          onApplyDispatch={handleApplyDispatch}
          onBatchAutoDispatchAll={handleBatchAutoDispatchAll}
        />
      )}

      {/* Sub-Navigation Tabs: Itinerary & Fuel Efficiency Tracker */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold ${
              activeTab === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
            }`}
          >
            Overview & All Modules
          </button>
          <button
            onClick={() => setActiveTab('DELIVERY_STOPS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
              activeTab === 'DELIVERY_STOPS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Delivery Stops ({pendingStops.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('FUEL_TRACKER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
              activeTab === 'FUEL_TRACKER'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm font-bold'
                : 'text-emerald-300 hover:text-white hover:bg-slate-950'
            }`}
          >
            <Fuel className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fuel Efficiency Tracker</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
              RECHARTS
            </span>
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-mono pr-2">
          <span>Active Shift: <strong className="text-emerald-300">Run #402</strong> · Vehicle: <strong className="text-indigo-300">APX-EV-101</strong></span>
        </div>
      </div>

      {/* Fuel Efficiency Tracker View (when FUEL_TRACKER tab selected) */}
      {activeTab === 'FUEL_TRACKER' && (
        <FuelEfficiencyTracker
          courierId={currentUser.id}
          courierName={currentUser.name}
          assignedVehicleId="veh-ev-101"
          vehicles={vehicles}
        />
      )}

      {/* Metric Counters (shown in ALL or DELIVERY_STOPS) */}
      {activeTab !== 'FUEL_TRACKER' && (
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
      )}

      {/* Embedded Fuel Efficiency Tracker in ALL view */}
      {activeTab === 'ALL' && (
        <FuelEfficiencyTracker
          courierId={currentUser.id}
          courierName={currentUser.name}
          assignedVehicleId="veh-ev-101"
          vehicles={vehicles}
        />
      )}

      {/* Weather-Adjusted Route Advisory, Predictive Delays, and Delivery Stops (shown in ALL or DELIVERY_STOPS) */}
      {activeTab !== 'FUEL_TRACKER' && (
        <>
          {/* Weather-Adjusted Route Advisory Banner */}
      {(() => {
        const primaryStation = mockWeatherService.getStationById('ws-sf-port');
        if (!primaryStation) return null;
        const impact = mockWeatherService.calculateWeatherDelayScore(primaryStation, 'ELECTRIC_VAN');
        return (
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                <CloudRain className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-sm">
                    Route Weather Advisory: {primaryStation.conditionLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    +{impact.additionalDelayMinutesPerTrip}m Weather Cushion
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Precipitation: <strong className="text-slate-200">{primaryStation.precipitationMmPerHour} mm/h</strong> · Wind gusts: <strong className="text-slate-200">{primaryStation.windGustKmh} km/h</strong> · Predictive Delay Score: <strong className="text-amber-300 font-mono">{impact.predictiveDelayScore}/100</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsPlannerOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-sm"
              >
                Re-Optimize Stops
              </button>
            </div>
          </div>
        );
      })()}

      {/* AI Predictive Delay Intelligence & Corridor Bottleneck Widget */}
      <PredictiveDelayWidget />

      {/* Assigned Delivery Queue */}
      <div className="space-y-3">
        {/* Route Optimization Prompt Callout (Traffic & Fuel Minimization) */}
        {pendingStops.length >= 2 && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/50 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                <Leaf className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-semibold text-white">
                  <span>Google Maps Route Optimization Engine</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                    LIVE TRAFFIC & FUEL SAVER
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Reorder remaining {pendingStops.length} stops using real-time traffic to bypass arterial congestion, saving up to 34 minutes and 3.8L fuel / energy.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsRouteOptOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Optimize Stops Now</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">
            Today's Route Stops Sequence
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Ordered by dynamic routing engine
            </span>
            <button
              onClick={() => setIsRouteOptOpen(true)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
            >
              <Zap className="w-3 h-3" />
              <span>Optimize</span>
            </button>
          </div>
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
      </>
      )}

      {/* Route Optimization Modal (Google Maps live traffic & fuel minimizer) */}
      <RouteOptimizationModal
        isOpen={isRouteOptOpen}
        onClose={() => setIsRouteOptOpen(false)}
        courierId={currentUser.id}
      />

      {/* Multi-Stop Route Planner Modal */}
      <MultiStopPlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        hubs={storage.getHubs(currentTenantId)}
        vehicles={storage.getVehicles(currentTenantId)}
        parcels={parcels}
      />

      {/* Floating 'Live Fleet Map' Button */}
      <LiveFleetMapFloatingButton
        onClick={() => setIsLiveFleetMapOpen(true)}
        isOpen={isLiveFleetMapOpen}
        badgeText="COURIER HUD"
      />

      {/* Small Overlay: Active Courier location relative to next delivery destination */}
      <LiveFleetMapOverlay
        isOpen={isLiveFleetMapOpen}
        onClose={() => setIsLiveFleetMapOpen(false)}
        courierId={currentUser.id}
      />
    </div>
  );
};
