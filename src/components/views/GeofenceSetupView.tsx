import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Truck, 
  Radio, 
  Bell, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  RotateCcw, 
  ExternalLink,
  Zap,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Activity,
  Layers,
  ChevronDown
} from 'lucide-react';
import L from 'leaflet';
import { storage } from '../../services/storage';
import { GeofenceZone, GeofenceEvent, Vehicle, BranchHub, GeofenceActionType } from '../../types';
import { geofenceService, calculateDistanceKm, VehicleGeofenceStatus } from '../../services/geofenceService';

interface Props {
  vehicles: Vehicle[];
}

export const GeofenceSetupView: React.FC<Props> = ({ vehicles }) => {
  const currentTenantId = storage.getActiveTenantId();
  const hubs = useMemo(() => storage.getHubs(currentTenantId), [currentTenantId]);

  const [zones, setZones] = useState<GeofenceZone[]>(() => storage.getGeofenceZones(currentTenantId));
  const [events, setEvents] = useState<GeofenceEvent[]>(() => storage.getGeofenceEvents(currentTenantId));
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editingZone, setEditingZone] = useState<Partial<GeofenceZone>>({});
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);
  const vehiclesLayerRef = useRef<L.LayerGroup | null>(null);

  // Sync with storage updates
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setZones(storage.getGeofenceZones(currentTenantId));
      setEvents(storage.getGeofenceEvents(currentTenantId));
    });
    return unsubscribe;
  }, [currentTenantId]);

  // Evaluate fleet positions against zones
  const { statuses: fleetStatuses } = useMemo(() => {
    return geofenceService.evaluateFleetGeofences(vehicles, zones);
  }, [vehicles, zones]);

  // Initialize or update Leaflet visualization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [37.7749, -122.35],
        zoom: 10,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      circlesLayerRef.current = L.layerGroup().addTo(map);
      vehiclesLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const circlesLayer = circlesLayerRef.current;
    const vehiclesLayer = vehiclesLayerRef.current;

    if (!map || !circlesLayer || !vehiclesLayer) return;

    circlesLayer.clearLayers();
    vehiclesLayer.clearLayers();

    const bounds: [number, number][] = [];

    // Draw Geofence Circles around hubs
    zones.forEach((zone) => {
      if (!zone.centerLat || !zone.centerLng) return;
      bounds.push([zone.centerLat, zone.centerLng]);

      const isSelected = zone.id === selectedZoneId;
      const color = zone.colorHex || (isSelected ? '#10b981' : '#6366f1');

      // Geofence Circle
      const circle = L.circle([zone.centerLat, zone.centerLng], {
        radius: zone.radiusKm * 1000, // convert km to meters
        color,
        fillColor: color,
        fillOpacity: isSelected ? 0.25 : 0.12,
        weight: isSelected ? 3 : 2,
        dashArray: zone.enabled ? undefined : '5, 5',
      });

      circle.bindTooltip(
        `<strong>${zone.name}</strong><br/>Radius: ${zone.radiusKm} km<br/>Status: ${zone.enabled ? 'Active' : 'Disabled'}`,
        { sticky: true }
      );
      circlesLayer.addLayer(circle);

      // Hub Center Pin
      const hubHtml = `
        <div style="
          background: #0f172a;
          border: 2px solid ${color};
          border-radius: 9999px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${color};
          font-weight: bold;
          font-size: 11px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        ">
          HUB
        </div>
      `;
      const hubIcon = L.divIcon({
        html: hubHtml,
        className: 'custom-hub-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const hubMarker = L.marker([zone.centerLat, zone.centerLng], { icon: hubIcon });
      hubMarker.bindPopup(`
        <div style="font-family: inherit; color: #0f172a; min-width: 160px;">
          <div style="font-weight: 800; font-size: 13px;">${zone.hubName}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Zone: ${zone.name}</div>
          <div style="font-size: 11px; margin-top: 4px;">Radius: <strong>${zone.radiusKm} km</strong></div>
          <div style="font-size: 10px; margin-top: 4px; color: ${zone.enabled ? '#16a34a' : '#dc2626'}; font-weight: bold;">
            ${zone.enabled ? '● Perimeter Live Armed' : '○ Zone Muted'}
          </div>
        </div>
      `);
      circlesLayer.addLayer(hubMarker);
    });

    // Draw Vehicle Pins & Inside Indicators
    vehicles.forEach((veh) => {
      if (!veh.lastLocation?.lat || !veh.lastLocation?.lng) return;
      bounds.push([veh.lastLocation.lat, veh.lastLocation.lng]);

      // Check if inside currently selected zone
      const activeZone = zones.find((z) => z.id === selectedZoneId);
      const isInsideSelected = activeZone
        ? calculateDistanceKm(
            veh.lastLocation.lat,
            veh.lastLocation.lng,
            activeZone.centerLat,
            activeZone.centerLng
          ) <= activeZone.radiusKm
        : false;

      const vColor = isInsideSelected ? '#10b981' : '#f59e0b';

      const vHtml = `
        <div style="
          background: #020617;
          border: 2px solid ${vColor};
          border-radius: 9999px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          position: relative;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${vColor}" stroke-width="2.5">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
          ${isInsideSelected ? `
            <div style="
              position: absolute;
              top: -6px;
              right: -6px;
              width: 12px;
              height: 12px;
              border-radius: 9999px;
              background: #10b981;
              border: 2px solid #ffffff;
            "></div>
          ` : ''}
        </div>
      `;

      const vIcon = L.divIcon({
        html: vHtml,
        className: 'custom-fleet-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const vMarker = L.marker([veh.lastLocation.lat, veh.lastLocation.lng], { icon: vIcon });
      vMarker.bindPopup(`
        <div style="font-family: inherit; color: #0f172a; min-width: 170px;">
          <div style="font-weight: 800; font-size: 13px; color: #1e293b;">${veh.vehicleNumber}</div>
          <div style="font-size: 11px; color: #64748b;">${veh.driverName || 'Driver Unassigned'}</div>
          <div style="font-size: 11px; margin-top: 4px;">Speed: <strong>${veh.lastLocation.speedKmh || 0} km/h</strong></div>
          <div style="font-size: 11px; margin-top: 2px;">Battery/Fuel: <strong>${veh.batteryOrFuelPct}%</strong></div>
          ${activeZone ? `
            <div style="font-size: 10px; margin-top: 5px; padding: 2px 5px; border-radius: 4px; font-weight: bold; background: ${isInsideSelected ? '#d1fae5' : '#f1f5f9'}; color: ${isInsideSelected ? '#065f46' : '#475569'};">
              ${isInsideSelected ? `INSIDE ${activeZone.name}` : `OUTSIDE ${activeZone.name}`}
            </div>
          ` : ''}
        </div>
      `);
      vehiclesLayer.addLayer(vMarker);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }, [zones, selectedZoneId, vehicles]);

  const activeZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  const handleUpdateRadius = (newRadius: number) => {
    if (!activeZone) return;
    const updated: GeofenceZone = {
      ...activeZone,
      radiusKm: Math.max(0.5, Math.round(newRadius * 10) / 10),
    };
    storage.updateGeofenceZone(updated);
  };

  const handleToggleZone = (zone: GeofenceZone) => {
    storage.updateGeofenceZone({
      ...zone,
      enabled: !zone.enabled,
    });
  };

  const handleToggleNotification = (zone: GeofenceZone, type: 'ENTER' | 'EXIT') => {
    storage.updateGeofenceZone({
      ...zone,
      notifyOnEnter: type === 'ENTER' ? !zone.notifyOnEnter : zone.notifyOnEnter,
      notifyOnExit: type === 'EXIT' ? !zone.notifyOnExit : zone.notifyOnExit,
    });
  };

  // Test Simulation Trigger
  const handleSimulateCrossing = (vehicleId: string, action: GeofenceActionType) => {
    if (!activeZone) return;
    const targetVeh = vehicles.find((v) => v.id === vehicleId);
    if (!targetVeh) return;

    const event = geofenceService.simulateGeofenceCrossing(targetVeh, activeZone, action);
    setSimFeedback(
      `Simulated ${action === 'ENTER' ? 'ENTRY' : 'EXIT'} of ${targetVeh.vehicleNumber} across ${activeZone.name}. Real-time notification dispatched!`
    );
    setTimeout(() => setSimFeedback(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      {/* Simulation Feedback Alert */}
      {simFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 flex items-center justify-between text-xs font-semibold animate-fade-in shadow-xl">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
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

      {/* Main Grid: Interactive Map + Configuration Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Viewport with Live Radius Circles */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  Live Geofence Perimeter Map
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    REAL-TIME POSTGIS RADII
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Monitors active delivery vans relative to defined circular buffer zones around regional sorting hubs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Zone Focus:</span>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.radiusKm} km)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="w-full h-[420px] bg-slate-950 relative" />

          {/* Map Footer Legend */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Vehicle Inside Geofence</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Vehicle Outside Perimeter</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-indigo-400 bg-indigo-500/20" />
                <span>Hub Geofence Buffer Zone</span>
              </span>
            </div>

            <div className="font-mono text-slate-400">
              {zones.filter((z) => z.enabled).length} Active Zones · {vehicles.length} Connected GPS Beacons
            </div>
          </div>
        </div>

        {/* Right Sidebar: Geofence Zone Settings & Radius Adjustment */}
        <div className="space-y-4">
          {activeZone ? (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-0.5">
                    GEOFENCE ZONE CONFIGURATION
                  </span>
                  <h4 className="text-base font-bold text-slate-100">
                    {activeZone.name}
                  </h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Hub Anchor: <strong className="text-slate-200">{activeZone.hubName}</strong>
                  </p>
                </div>

                <button
                  onClick={() => handleToggleZone(activeZone)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    activeZone.enabled
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {activeZone.enabled ? 'ARMED' : 'MUTED'}
                </button>
              </div>

              {/* Radius Slider */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                    Detection Radius
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {activeZone.radiusKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.5"
                  value={activeZone.radiusKm}
                  onChange={(e) => handleUpdateRadius(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.5 km (Depot Gate)</span>
                  <span>5.0 km (Metro)</span>
                  <span>15.0 km (Corridor)</span>
                </div>
              </div>

              {/* Notification Trigger Preferences */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Alert Trigger Conditions
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleToggleNotification(activeZone, 'ENTER')}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      activeZone.notifyOnEnter
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-slate-100 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ENTER Zone</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Vehicle ingress
                      </span>
                    </div>
                    {activeZone.notifyOnEnter ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-slate-600">OFF</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleToggleNotification(activeZone, 'EXIT')}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      activeZone.notifyOnExit
                        ? 'bg-amber-950/40 border-amber-500/50 text-slate-100 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                        <span>EXIT Zone</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Vehicle egress
                      </span>
                    </div>
                    {activeZone.notifyOnExit ? (
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-slate-600">OFF</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Vehicle Simulation Crossing Trigger */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Simulate Crossing Telemetry
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Live Test</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Simulate GPS telemetry moving across {activeZone.radiusKm} km radius boundary to test automated trigger alerts.
                </p>

                <div className="space-y-1.5 pt-1">
                  {vehicles.slice(0, 3).map((v) => (
                    <div
                      key={v.id}
                      className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-mono font-bold text-slate-200">
                          {v.vehicleNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {v.driverName || 'Driver'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleSimulateCrossing(v.id, 'ENTER')}
                          className="px-2 py-1 text-[10px] font-bold text-emerald-300 hover:text-white bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 rounded transition-colors"
                          title="Simulate vehicle entering this hub geofence"
                        >
                          Sim Ingress
                        </button>
                        <button
                          onClick={() => handleSimulateCrossing(v.id, 'EXIT')}
                          className="px-2 py-1 text-[10px] font-bold text-amber-300 hover:text-white bg-amber-950 hover:bg-amber-900 border border-amber-500/40 rounded transition-colors"
                          title="Simulate vehicle exiting this hub geofence"
                        >
                          Sim Egress
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Hub Zone Picker Cards */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Configured Hub Zones ({zones.length})
            </span>

            <div className="space-y-1.5">
              {zones.map((z) => {
                const isSelected = z.id === selectedZoneId;
                return (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZoneId(z.id)}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-950 border-emerald-500/60 shadow ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-200 truncate">{z.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Radius: {z.radiusKm} km · {z.enabled ? 'Active' : 'Disabled'}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400">
                      {z.radiusKm}km
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Geofence Event History Audit Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                Recent Geofence Ingress & Egress Trigger Events
              </h4>
              <p className="text-[11px] text-slate-400">
                Verified boundary crossings logged by the real-time GPS telemetry listener.
              </p>
            </div>
          </div>

          <span className="font-mono text-xs text-slate-400">
            {events.length} Total Audit Records
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 space-y-1">
            <Radio className="w-6 h-6 mx-auto text-slate-600 mb-1" />
            <p className="font-medium text-slate-400">No boundary crossing events recorded yet</p>
            <p className="text-[11px] text-slate-500">
              Trigger a test crossing using the simulation buttons above, or stream vehicle telemetry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Driver</th>
                  <th className="py-2.5 px-3">Geofence Zone</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Distance / Radius</th>
                  <th className="py-2.5 px-3 text-right">Speed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {events.slice(0, 15).map((evt) => {
                  const isEnter = evt.action === 'ENTER';
                  return (
                    <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-200">
                        {evt.vehicleNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">
                        {evt.driverName || 'Courier'}
                      </td>
                      <td className="py-2.5 px-3 text-indigo-300 font-sans font-medium">
                        {evt.geofenceName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isEnter
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isEnter ? 'ENTER (Ingress)' : 'EXIT (Egress)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {evt.distanceFromCenterKm} km (Zone: {evt.radiusKm} km)
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {evt.speedKmh ? `${evt.speedKmh} km/h` : 'Stopped'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
