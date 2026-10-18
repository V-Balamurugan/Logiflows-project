import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  ShieldCheck, 
  MapPin, 
  Truck, 
  Bell, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  RotateCcw, 
  Zap, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Activity, 
  Layers,
  ChevronDown,
  Navigation,
  Crosshair
} from 'lucide-react';
import { storage } from '../../services/storage';
import { GeofenceZone, GeofenceEvent, Vehicle, BranchHub, GeofenceActionType } from '../../types';
import { geofenceService, calculateDistanceKm, VehicleGeofenceStatus } from '../../services/geofenceService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  hubs: BranchHub[];
  onFlyToZone?: (zone: GeofenceZone) => void;
}

export const GeofenceModuleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  vehicles,
  hubs,
  onFlyToZone,
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const [activeTab, setActiveTab] = useState<'ZONES' | 'SIMULATION' | 'EVENTS'>('ZONES');
  const [zones, setZones] = useState<GeofenceZone[]>(() => storage.getGeofenceZones(currentTenantId));
  const [events, setEvents] = useState<GeofenceEvent[]>(() => storage.getGeofenceEvents(currentTenantId));
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || '');
  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneHubId, setNewZoneHubId] = useState(hubs[0]?.id || '');
  const [newZoneRadiusKm, setNewZoneRadiusKm] = useState(4.5);
  const [newZoneColor, setNewZoneColor] = useState('#10b981');
  const [simVehicleId, setSimVehicleId] = useState<string>(vehicles[0]?.id || 'veh-ev-101');
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  // Sync with storage changes
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setZones(storage.getGeofenceZones(currentTenantId));
      setEvents(storage.getGeofenceEvents(currentTenantId));
    });
    return unsubscribe;
  }, [currentTenantId]);

  // Compute live fleet proximity status for all zones
  const { statuses: fleetStatuses } = useMemo(() => {
    return geofenceService.evaluateFleetGeofences(vehicles, zones);
  }, [vehicles, zones]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const selectedSimVehicle = vehicles.find((v) => v.id === simVehicleId) || vehicles[0];

  const handleUpdateRadius = (zoneId: string, radiusKm: number) => {
    const target = zones.find((z) => z.id === zoneId);
    if (!target) return;
    const updated: GeofenceZone = { ...target, radiusKm };
    storage.updateGeofenceZone(updated);
    setZones(storage.getGeofenceZones(currentTenantId));
  };

  const handleToggleOption = (zoneId: string, field: 'enabled' | 'notifyOnEnter' | 'notifyOnExit') => {
    const target = zones.find((z) => z.id === zoneId);
    if (!target) return;
    const updated: GeofenceZone = { ...target, [field]: !target[field] };
    storage.updateGeofenceZone(updated);
    setZones(storage.getGeofenceZones(currentTenantId));
  };

  const handleDeleteZone = (zoneId: string) => {
    storage.deleteGeofenceZone(zoneId, currentTenantId);
    const updated = storage.getGeofenceZones(currentTenantId);
    setZones(updated);
    if (selectedZoneId === zoneId && updated.length > 0) {
      setSelectedZoneId(updated[0].id);
    }
  };

  const handleCreateNewZone = (e: React.FormEvent) => {
    e.preventDefault();
    const hub = hubs.find((h) => h.id === newZoneHubId) || hubs[0];
    if (!hub) return;

    const created = storage.addGeofenceZone({
      hubId: hub.id,
      hubName: hub.name,
      tenantId: currentTenantId,
      name: newZoneName.trim() || `${hub.name} Perimeter`,
      radiusKm: Number(newZoneRadiusKm),
      centerLat: hub.lat,
      centerLng: hub.lng,
      enabled: true,
      notifyOnEnter: true,
      notifyOnExit: true,
      colorHex: newZoneColor,
    });

    const updated = storage.getGeofenceZones(currentTenantId);
    setZones(updated);
    setSelectedZoneId(created.id);
    setIsCreatingZone(false);
    setNewZoneName('');
  };

  const handleSimulateCrossing = (action: GeofenceActionType) => {
    if (!selectedSimVehicle || !selectedZone) return;

    const event = geofenceService.simulateGeofenceCrossing(selectedSimVehicle, selectedZone, action);
    setEvents(storage.getGeofenceEvents(currentTenantId));

    const actionText = action === 'ENTER' ? 'ENTERED' : 'EXITED';
    setSimFeedback(
      `Triggered ${actionText} alert: Vehicle ${event.vehicleNumber} ${actionText.toLowerCase()} ${event.radiusKm}km perimeter of ${event.hubName}. Notification sent to platform log.`
    );

    setTimeout(() => {
      setSimFeedback(null);
    }, 5000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Geo-Fencing Perimeter & Delivery Zone Module
                </h3>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {zones.filter((z) => z.enabled).length} ACTIVE PERIMETERS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitors vehicle entry and exit boundaries across predefined hub perimeters and delivery zones in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('ZONES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'ZONES'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Delivery Zones ({zones.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('SIMULATION')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'SIMULATION'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Simulate Crossing</span>
              </button>

              <button
                onClick={() => setActiveTab('EVENTS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'EVENTS'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Alert Log ({events.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {simFeedback && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center justify-between text-xs animate-fade-in shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{simFeedback}</span>
            </div>
            <button
              onClick={() => setSimFeedback(null)}
              className="text-xs text-emerald-300 hover:text-white underline font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: DELIVERY ZONES & HUB PERIMETERS */}
          {activeTab === 'ZONES' && (
            <div className="space-y-6">
              {/* Top Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs text-slate-300">
                  <span>Predefined circular radii around distribution hubs and regional hubs. Adjust perimeters to adjust auto-triggers.</span>
                </div>
                <button
                  onClick={() => setIsCreatingZone(!isCreatingZone)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreatingZone ? 'Cancel' : 'Add New Predefined Zone'}</span>
                </button>
              </div>

              {/* Create Zone Form (when expanded) */}
              {isCreatingZone && (
                <form
                  onSubmit={handleCreateNewZone}
                  className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-4 animate-fade-in text-xs"
                >
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span>Define New Hub Perimeter / Delivery Zone Radius</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Zone Name</label>
                      <input
                        type="text"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        placeholder="e.g. SF Metro Express Perimeter"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Center Hub Anchor</label>
                      <select
                        value={newZoneHubId}
                        onChange={(e) => setNewZoneHubId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {hubs.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} ({h.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Perimeter Radius: <strong className="text-emerald-400 font-mono">{newZoneRadiusKm} km</strong>
                      </label>
                      <input
                        type="range"
                        min="1.0"
                        max="15.0"
                        step="0.5"
                        value={newZoneRadiusKm}
                        onChange={(e) => setNewZoneRadiusKm(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Zone Color:</span>
                      {['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewZoneColor(c)}
                          className={`w-5 h-5 rounded-full border-2 transition-transform ${
                            newZoneColor === c ? 'scale-125 border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingZone(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm"
                      >
                        Save Perimeter
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Predefined Zones Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.map((zone) => {
                  const isSelected = zone.id === selectedZoneId;
                  const zoneStatuses = fleetStatuses.filter((s) => s.geofenceId === zone.id);
                  const insideVehicles = zoneStatuses.filter((s) => s.isInside);
                  const hub = hubs.find((h) => h.id === zone.hubId);

                  return (
                    <div
                      key={zone.id}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        isSelected
                          ? 'bg-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/10'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Zone Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: zone.colorHex || '#10b981' }}
                          />
                          <div>
                            <h4 className="font-bold text-slate-100 text-xs">{zone.name}</h4>
                            <span className="text-[10px] text-slate-400 block">{zone.hubName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onFlyToZone && (
                            <button
                              onClick={() => {
                                onFlyToZone(zone);
                                onClose();
                              }}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Center Map on this Zone"
                            >
                              <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteZone(zone.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete Geofence Zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Radius Control Slider */}
                      <div className="space-y-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Boundary Radius:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {zone.radiusKm} km ({Math.round(zone.radiusKm * 0.621371 * 10) / 10} mi)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="15.0"
                          step="0.5"
                          value={zone.radiusKm}
                          onChange={(e) => handleUpdateRadius(zone.id, parseFloat(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Notification Trigger Toggles */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <button
                          onClick={() => handleToggleOption(zone.id, 'notifyOnEnter')}
                          className={`p-1.5 rounded-lg border flex items-center justify-between font-semibold transition-colors ${
                            zone.notifyOnEnter
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-emerald-400" />
                            <span>Notify on ENTER</span>
                          </span>
                          <span>{zone.notifyOnEnter ? 'ON' : 'OFF'}</span>
                        </button>

                        <button
                          onClick={() => handleToggleOption(zone.id, 'notifyOnExit')}
                          className={`p-1.5 rounded-lg border flex items-center justify-between font-semibold transition-colors ${
                            zone.notifyOnExit
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <ArrowLeft className="w-3 h-3 text-amber-400" />
                            <span>Notify on EXIT</span>
                          </span>
                          <span>{zone.notifyOnExit ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>

                      {/* Live Vehicles in Perimeter Status */}
                      <div className="pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-slate-400">Fleet in Perimeter:</span>
                          <span className="font-mono text-emerald-300 font-bold">
                            {insideVehicles.length} of {vehicles.length} Inside
                          </span>
                        </div>

                        <div className="space-y-1">
                          {zoneStatuses.slice(0, 3).map((st) => (
                            <div
                              key={st.vehicleId}
                              className="flex items-center justify-between text-[10px] p-1 rounded bg-slate-900/60 font-mono"
                            >
                              <span className="text-slate-300 flex items-center gap-1">
                                <Truck className="w-2.5 h-2.5 text-slate-400" />
                                <span>{st.vehicleNumber}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">{st.distanceKm} km</span>
                                <span
                                  className={`px-1 py-0.2 rounded font-bold ${
                                    st.isInside
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {st.isInside ? 'INSIDE' : 'OUTSIDE'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE SIMULATION TESTING */}
          {activeTab === 'SIMULATION' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Real-Time Geofence Boundary Crossing Simulator</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulate a courier vehicle crossing across perimeter borders to verify instant system notifications and audit trail creation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Target Vehicle</label>
                    <select
                      value={simVehicleId}
                      onChange={(e) => setSimVehicleId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicleNumber} ({v.driverName || 'Courier'}) - {v.type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Target Monitored Zone</label>
                    <select
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} ({z.radiusKm} km radius)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedZone && selectedSimVehicle && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-slate-400 text-[11px]">Selected Zone Perimeter:</span>
                        <div className="font-bold text-slate-200">
                          {selectedZone.name} ({selectedZone.radiusKm} km around {selectedZone.hubName})
                        </div>
                      </div>

                      {(() => {
                        const dist = calculateDistanceKm(
                          selectedSimVehicle.lastLocation?.lat || 37.7749,
                          selectedSimVehicle.lastLocation?.lng || -122.4194,
                          selectedZone.centerLat,
                          selectedZone.centerLng
                        );
                        const isInside = dist <= selectedZone.radiusKm;
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Current Proximity:</span>
                            <span className="font-mono font-bold text-slate-200">{dist} km</span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                isInside
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isInside ? 'INSIDE ZONE' : 'OUTSIDE PERIMETER'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleSimulateCrossing('ENTER')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md shadow-emerald-900/20"
                      >
                        <ArrowRight className="w-4 h-4 text-emerald-200" />
                        <span>Simulate Vehicle ENTER Perimeter</span>
                      </button>

                      <button
                        onClick={() => handleSimulateCrossing('EXIT')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold transition-all shadow-md shadow-amber-900/20"
                      >
                        <ArrowLeft className="w-4 h-4 text-amber-200" />
                        <span>Simulate Vehicle EXIT Perimeter</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT EVENT LOG */}
          {activeTab === 'EVENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Displaying historical vehicle boundary crossing events ({events.length} records)</span>
                <span className="font-mono text-[11px]">Audit Policy: ISO 27001 Log Retention</span>
              </div>

              {events.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                  No geofence crossing events recorded yet. Run a simulation crossing or drive vehicle across perimeter boundary.
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((evt) => {
                    const isEnter = evt.action === 'ENTER';
                    return (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isEnter
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {isEnter ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-100">{evt.vehicleNumber}</span>
                              <span className="text-slate-400">({evt.driverName || 'Courier'})</span>
                              <span
                                className={`px-2 py-0.2 rounded font-mono text-[10px] font-bold ${
                                  isEnter
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {isEnter ? 'ENTERED ZONE' : 'EXITED ZONE'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Zone: <strong className="text-slate-200">{evt.geofenceName}</strong> · Hub: <strong className="text-slate-200">{evt.hubName}</strong> ({evt.radiusKm} km radius)
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-400 font-mono space-y-0.5">
                          <div>
                            Distance: <strong className="text-slate-200">{evt.distanceFromCenterKm} km</strong> · Speed: {evt.speedKmh || 40} km/h
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(evt.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
