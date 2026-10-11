import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Maximize2, 
  ShieldCheck, 
  Navigation, 
  MapPin, 
  Truck, 
  Warehouse, 
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { BranchHub, Vehicle, Parcel } from '../../types';
import { MapDiagnosticsModal } from './MapDiagnosticsModal';
import { storage } from '../../services/storage';
import { OpenRouteServiceToolbox } from './OpenRouteServiceToolbox';
import { OrsRouteResult, IsochronePolygon } from '../../services/openRouteService';

interface Props {
  hubs: BranchHub[];
  vehicles: Vehicle[];
  parcels: Parcel[];
  selectedParcelId?: string;
  onSelectParcel?: (parcel: Parcel) => void;
  className?: string;
}

export const LogisticsMap: React.FC<Props> = ({
  hubs,
  vehicles,
  parcels,
  selectedParcelId,
  onSelectParcel,
  className = 'h-[520px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const orsLayerRef = useRef<L.LayerGroup | null>(null);

  const [showHubs, setShowHubs] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showOrsToolbox, setShowOrsToolbox] = useState(true);
  const [activeOrsResult, setActiveOrsResult] = useState<OrsRouteResult | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isSimulatingMovement, setIsSimulatingMovement] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      // Default center around SF Bay Area
      const map = L.map(mapContainerRef.current, {
        center: [37.7749, -122.35],
        zoom: 10,
        zoomControl: false,
        attributionControl: false,
      });

      // Standard / Dark Matter OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Attribution
      L.control.attribution({ position: 'bottomright', prefix: 'LogiFlows PostGIS Engine' }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      orsLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;

      // Invalidate size on initial load to avoid grey tiles
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
      setMapError('Failed to initialize map canvas. Please check network connectivity.');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render Hubs, Vehicles, and Active Delivery Route Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !markersLayer || !routeLayer) return;

    markersLayer.clearLayers();
    routeLayer.clearLayers();

    // 1. Render Hubs
    if (showHubs) {
      hubs.forEach((hub) => {
        if (!hub.lat || !hub.lng) return;

        const isCongested = hub.status === 'CONGESTED';
        const color = isCongested ? '#f59e0b' : '#3b82f6';

        const hubHtml = `
          <div style="
            background: #0f172a;
            border: 2px solid ${color};
            border-radius: 8px;
            padding: 4px 6px;
            color: #f8fafc;
            font-size: 11px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            white-space: nowrap;
          ">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color};"></span>
            <span>${hub.code}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: hubHtml,
          className: 'custom-hub-icon',
          iconSize: [80, 26],
          iconAnchor: [40, 13],
        });

        const marker = L.marker([hub.lat, hub.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; color:#0f172a; min-width: 180px;">
            <div style="font-weight:700; font-size:13px; margin-bottom:4px;">${hub.name}</div>
            <div style="font-size:11px; color:#475569; margin-bottom:8px;">${hub.street}, ${hub.city}</div>
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Type:</span><strong>${hub.type.replace(/_/g, ' ')}</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between;">
              <span>Daily Load:</span><strong style="color:${isCongested ? '#b45309' : '#15803d'}">${hub.currentLoad} / ${hub.capacityDaily}</strong>
            </div>
          </div>
        `);
        markersLayer.addLayer(marker);
      });
    }

    // 2. Render Vehicles (Fleet Telemetry)
    if (showVehicles) {
      vehicles.forEach((veh) => {
        if (!veh.lastLocation || !veh.lastLocation.lat || !veh.lastLocation.lng) return;

        const isOnRoute = veh.status === 'ON_ROUTE';
        const color = isOnRoute ? '#10b981' : '#64748b';

        const vehicleHtml = `
          <div style="
            background: #020617;
            border: 2px solid ${color};
            border-radius: 9999px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${color};
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            cursor: pointer;
            position: relative;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
            <div style="
              position: absolute;
              bottom: -16px;
              left: 50%;
              transform: translateX(-50%);
              background: #0f172a;
              color: #e2e8f0;
              font-size: 9px;
              font-family: monospace;
              padding: 1px 4px;
              border-radius: 4px;
              border: 1px solid #334155;
              white-space: nowrap;
            ">${veh.vehicleNumber} (${veh.batteryOrFuelPct}%)</div>
          </div>
        `;

        const icon = L.divIcon({
          html: vehicleHtml,
          className: 'custom-vehicle-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([veh.lastLocation.lat, veh.lastLocation.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: inherit; color:#0f172a; min-width: 170px;">
            <div style="font-weight:700; font-size:13px; margin-bottom:2px;">${veh.vehicleNumber}</div>
            <div style="font-size:11px; color:#64748b; margin-bottom:6px;">Driver: ${veh.driverName || 'Unassigned'}</div>
            <div style="font-size:11px; margin-bottom:3px;">Type: <strong>${veh.type.replace('_', ' ')}</strong></div>
            <div style="font-size:11px; margin-bottom:3px;">Speed: <strong>${veh.lastLocation.speedKmh} km/h</strong></div>
            <div style="font-size:11px;">Battery/Fuel: <strong>${veh.batteryOrFuelPct}%</strong></div>
          </div>
        `);
        markersLayer.addLayer(marker);
      });
    }

    // 3. Render Active Parcel Delivery Waypoints & Route
    if (showRoutes) {
      // Find active out-for-delivery parcels to draw realistic route
      const activeParcels = parcels.filter(
        (p) => p.status === 'OUT_FOR_DELIVERY' || p.status === 'IN_TRANSIT_HUB_TRANSFER' || p.id === selectedParcelId
      );

      activeParcels.forEach((pcl) => {
        if (!pcl.sender.lat || !pcl.sender.lng || !pcl.recipient.lat || !pcl.recipient.lng) return;

        // Draw start / end markers
        const originCoord: [number, number] = [pcl.sender.lat, pcl.sender.lng];
        const destCoord: [number, number] = [pcl.recipient.lat, pcl.recipient.lng];
        const currentCoord: [number, number] = pcl.currentGeo 
          ? [pcl.currentGeo.lat, pcl.currentGeo.lng]
          : originCoord;

        // Route line connecting Origin -> Current -> Destination
        const routeCoords: [number, number][] = [originCoord, currentCoord, destCoord];
        const polyline = L.polyline(routeCoords, {
          color: pcl.delayRisk.level === 'HIGH' ? '#ef4444' : pcl.delayRisk.level === 'MEDIUM' ? '#f59e0b' : '#6366f1',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
        });

        polyline.bindTooltip(`Route for ${pcl.trackingNumber} (${pcl.delayRisk.level} Delay Risk)`, {
          sticky: true,
        });

        routeLayer.addLayer(polyline);

        // Destination Marker
        const destHtml = `
          <div style="
            background: #4338ca;
            border: 2px solid #a5b4fc;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          ">
            <span style="font-size:11px; font-weight:bold;">★</span>
          </div>
        `;
        const destIcon = L.divIcon({
          html: destHtml,
          className: 'dest-pin',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const destMarker = L.marker(destCoord, { icon: destIcon });
        destMarker.bindPopup(`
          <div style="font-family: inherit; color:#0f172a; min-width: 180px;">
            <div style="font-weight:700; font-size:12px; color:#4338ca; margin-bottom:2px;">Delivery Destination</div>
            <div style="font-weight:600; font-size:12px;">${pcl.recipient.name}</div>
            <div style="font-size:11px; color:#475569;">${pcl.recipient.street}, ${pcl.recipient.city}</div>
            <div style="font-size:11px; margin-top:4px;">Parcel: <strong>${pcl.trackingNumber}</strong></div>
          </div>
        `);
        markersLayer.addLayer(destMarker);
      });
    }
  }, [hubs, vehicles, parcels, showHubs, showVehicles, showRoutes, selectedParcelId]);

  // Handle Live Telemetry Movement Simulation (Redis GPS feed simulation)
  useEffect(() => {
    if (!isSimulatingMovement) return;

    const interval = setInterval(() => {
      // Pick active vehicle (veh-ev-101) and nudge slightly towards SF Medical Center
      const veh = vehicles.find((v) => v.id === 'veh-ev-101');
      if (veh && veh.lastLocation) {
        const deltaLat = (Math.random() - 0.48) * 0.003;
        const deltaLng = (Math.random() - 0.48) * 0.003;
        const newLat = veh.lastLocation.lat + deltaLat;
        const newLng = veh.lastLocation.lng + deltaLng;
        storage.updateVehicleLocation(veh.id, newLat, newLng, Math.floor(Math.random() * 360), 45);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulatingMovement, vehicles]);

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [];
    hubs.forEach((h) => {
      if (h.lat && h.lng) points.push([h.lat, h.lng]);
    });
    vehicles.forEach((v) => {
      if (v.lastLocation?.lat && v.lastLocation?.lng) points.push([v.lastLocation.lat, v.lastLocation.lng]);
    });

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  };

  const handleApplyOrsRoute = (coords: [number, number][], meta: OrsRouteResult) => {
    const map = mapInstanceRef.current;
    const orsLayer = orsLayerRef.current;
    if (!map || !orsLayer) return;

    orsLayer.clearLayers();
    setActiveOrsResult(meta);

    // Render vivid highlight polyline for calculated ORS road route
    const polyline = L.polyline(coords, {
      color: '#38bdf8', // bright cyan
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    });

    polyline.bindTooltip(
      `OpenRouteService Corridor: ${meta.distanceKm} km · ${meta.durationMinutes} min ETA`,
      { permanent: false, sticky: true }
    );
    orsLayer.addLayer(polyline);

    // Zoom and pan to fit entire calculated corridor
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  };

  const handleApplyIsochrone = (hub: BranchHub, polygons: IsochronePolygon[]) => {
    const map = mapInstanceRef.current;
    const orsLayer = orsLayerRef.current;
    if (!map || !orsLayer) return;

    orsLayer.clearLayers();
    setActiveOrsResult(null);

    // Render isochrone polygon bands from largest to smallest
    [...polygons].reverse().forEach((poly) => {
      const leafletPoly = L.polygon(poly.coordinates, {
        color: poly.color,
        fillColor: poly.color,
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '4, 4',
      });

      leafletPoly.bindTooltip(
        `${hub.name}: ${poly.rangeSeconds / 60}-minute delivery reachability zone`,
        { sticky: true }
      );
      orsLayer.addLayer(leafletPoly);
    });

    map.setView([hub.lat, hub.lng], 11);
  };

  const handleClearOrsOverlay = () => {
    if (orsLayerRef.current) {
      orsLayerRef.current.clearLayers();
    }
    setActiveOrsResult(null);
  };

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 ${className}`}>
      {/* Map Error Banner (if any) */}
      {mapError && (
        <div className="absolute top-4 left-4 right-4 z-20 p-3 rounded-lg bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{mapError}</span>
          </div>
          <button
            onClick={() => setMapError(null)}
            className="px-2 py-1 rounded bg-rose-900 hover:bg-rose-800 text-white font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Floating Interactive Controls Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl">
        {/* Toggle Hubs */}
        <button
          onClick={() => setShowHubs(!showHubs)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            showHubs ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Hubs & Depots"
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>Hubs ({hubs.length})</span>
        </button>

        {/* Toggle Vehicles */}
        <button
          onClick={() => setShowVehicles(!showVehicles)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            showVehicles ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Vehicle Fleet"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Fleet ({vehicles.length})</span>
        </button>

        {/* Toggle Routes */}
        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            showRoutes ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Active Delivery Routes"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Active Routes</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

        {/* Live GPS Telemetry Stream Toggle */}
        <button
          onClick={() => setIsSimulatingMovement(!isSimulatingMovement)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            isSimulatingMovement ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800'
          }`}
          title="Simulate Real-time Redis Telemetry Stream"
        >
          {isSimulatingMovement ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span>{isSimulatingMovement ? 'Streaming GPS' : 'Simulate GPS Stream'}</span>
        </button>

        {/* Reset View */}
        <button
          onClick={handleFitAll}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Fit bounds to all assets"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map Diagnostics & OpenRouteService Triggers */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowOrsToolbox(!showOrsToolbox)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xl backdrop-blur-md transition-colors ${
            showOrsToolbox
              ? 'bg-indigo-600 text-white border border-indigo-400'
              : 'bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30'
          }`}
          title="Toggle OpenRouteService Engine"
        >
          <Navigation className="w-4 h-4 text-indigo-300" />
          <span>OpenRouteService (ORS)</span>
        </button>

        <button
          onClick={() => setIsDiagnosticOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 rounded-lg shadow-xl backdrop-blur-md transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Map & Auth Diagnostic</span>
        </button>
      </div>

      {/* Live Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
          <span>Regional Hubs</span>
          <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block ml-2" />
          <span>Congested Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Active Fleet Van</span>
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block ml-2" />
          <span>Delivery Stop</span>
        </div>
      </div>

      {/* Leaflet DOM Mount */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating OpenRouteService (ORS) Geospatial Operations Panel */}
      {showOrsToolbox && (
        <div className="absolute bottom-4 right-4 z-20 w-full max-w-xl max-h-[85%] overflow-y-auto shadow-2xl animate-fade-in">
          <OpenRouteServiceToolbox
            hubs={hubs}
            vehicles={vehicles}
            parcels={parcels}
            onApplyRouteToMap={handleApplyOrsRoute}
            onSelectHubIsochrone={handleApplyIsochrone}
            onClearOverlay={handleClearOrsOverlay}
            isOverlayActive={!!activeOrsResult}
          />
        </div>
      )}

      {/* Map Diagnostics Audit Modal */}
      <MapDiagnosticsModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        onRefreshMap={() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }}
      />
    </div>
  );
};
