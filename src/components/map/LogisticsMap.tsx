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
  Pause,
  Sparkles,
  Zap,
  CheckCircle2,
  RotateCcw,
  Compass,
  Globe,
  RotateCw,
  Star,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  History,
  AlertTriangle,
  Radio,
  CloudRain,
  ShieldAlert,
  Flame,
  X
} from 'lucide-react';
import { BranchHub, Vehicle, Parcel, GeofenceZone, GeofenceEvent } from '../../types';
import { MapDiagnosticsModal } from './MapDiagnosticsModal';
import { storage } from '../../services/storage';
import { OpenRouteServiceToolbox } from './OpenRouteServiceToolbox';
import { OrsRouteResult, IsochronePolygon, OptimizedRouteResult, openRouteService, StopWaypoint } from '../../services/openRouteService';
import { AutoOptimizeRouteModal } from './AutoOptimizeRouteModal';
import { MultiStopPlannerModal } from './MultiStopPlannerModal';
import { ReoptimizeRouteModal } from './ReoptimizeRouteModal';
import { MultiStopPlanResult, convertOptimizedRouteToMultiStopPlan } from '../../services/googleMapsRoutesService';
import { GoogleLogisticsMap } from './GoogleLogisticsMap';
import { routePlaybackService, CompletedDeliveryRoute } from '../../services/routePlaybackService';
import { RoutePlaybackControl } from './RoutePlaybackControl';
import { 
  subscribeToPredictiveDelayIncidents, 
  broadcastPredictiveDelayIncident,
  PRESET_PREDICTIVE_INCIDENTS, 
  PredictiveDelayIncident 
} from '../../services/predictiveDelayIncidentService';
import { PredictiveDelayWidget } from '../intelligence/PredictiveDelayWidget';
import { geofenceService, calculateDistanceKm } from '../../services/geofenceService';
import { GeofenceModuleModal } from './GeofenceModuleModal';
import { RouteOptimizationAI } from './RouteOptimizationAI';
import { MultiVehicleAiOptimizationPlan } from '../../types';
import { routeOptimizationAiService } from '../../services/routeOptimizationAiService';

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
  const playbackLayerRef = useRef<L.LayerGroup | null>(null);
  const geofenceLayerRef = useRef<L.LayerGroup | null>(null);

  const [showHubs, setShowHubs] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showOrsToolbox, setShowOrsToolbox] = useState(true);
  const [activeOrsResult, setActiveOrsResult] = useState<OrsRouteResult | null>(null);
  const [activeOptimizedRoute, setActiveOptimizedRoute] = useState<OptimizedRouteResult | null>(null);
  const [activeMultiStopPlan, setActiveMultiStopPlan] = useState<MultiStopPlanResult | null>(null);
  const [isAutoOptimizeOpen, setIsAutoOptimizeOpen] = useState(false);
  const [isRouteOptAiOpen, setIsRouteOptAiOpen] = useState(false);
  const [activeAiPlan, setActiveAiPlan] = useState<MultiVehicleAiOptimizationPlan | null>(null);
  const [isMultiStopPlannerOpen, setIsMultiStopPlannerOpen] = useState(false);
  const [isReoptimizeModalOpen, setIsReoptimizeModalOpen] = useState(false);
  const [isReoptimizing, setIsReoptimizing] = useState(false);
  const [reoptimizeStatusText, setReoptimizeStatusText] = useState<string | null>(null);
  const [showReoptimizedStopsDetail, setShowReoptimizedStopsDetail] = useState(false);
  const [mapProvider, setMapProvider] = useState<'GOOGLE_MAPS' | 'LEAFLET'>('GOOGLE_MAPS');
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isSimulatingMovement, setIsSimulatingMovement] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // --- Historical Route Playback State ---
  const [playbackRoutes, setPlaybackRoutes] = useState<CompletedDeliveryRoute[]>(() =>
    routePlaybackService.getAllCompletedRoutes()
  );
  const [activePlaybackRoute, setActivePlaybackRoute] = useState<CompletedDeliveryRoute>(
    () => playbackRoutes[0] || routePlaybackService.getAllCompletedRoutes()[0]
  );
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackAutoFollow, setPlaybackAutoFollow] = useState(true);
  const [playbackLoop, setPlaybackLoop] = useState(false);

  // --- Automated Re-routing Trigger & Predictive Delay Detection State ---
  const [isAutoRerouteTriggerEnabled, setIsAutoRerouteTriggerEnabled] = useState(true);
  const [activeIncidentAlert, setActiveIncidentAlert] = useState<PredictiveDelayIncident | null>(null);
  const [autoRerouteState, setAutoRerouteState] = useState<'IDLE' | 'RECALCULATING' | 'RE_ROUTED'>('IDLE');
  const [lastRecalculatedSavings, setLastRecalculatedSavings] = useState<{
    timeSavedMin: number;
    bypassName: string;
    corridorName: string;
    incidentCause: string;
    timestamp: string;
  } | null>(null);
  const [isIncidentDrawerOpen, setIsIncidentDrawerOpen] = useState(false);
  const [isSimulateIncidentMenuOpen, setIsSimulateIncidentMenuOpen] = useState(false);

  // --- Geo-fencing Module & Perimeter Alert State ---
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);
  const [geofenceZones, setGeofenceZones] = useState<GeofenceZone[]>(() => storage.getGeofenceZones());
  const [activeGeofenceAlert, setActiveGeofenceAlert] = useState<GeofenceEvent | null>(null);

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
      playbackLayerRef.current = L.layerGroup().addTo(map);
      geofenceLayerRef.current = L.layerGroup().addTo(map);

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
          <div style="font-family: inherit; color:#0f172a; min-width: 175px;">
            <div style="font-weight:700; font-size:13px; margin-bottom:2px;">${veh.vehicleNumber}</div>
            <div style="font-size:11px; color:#64748b; margin-bottom:6px;">Driver: ${veh.driverName || 'Unassigned'}</div>
            <div style="font-size:11px; margin-bottom:3px;">Type: <strong>${veh.type.replace(/_/g, ' ')}</strong></div>
            <div style="font-size:11px; margin-bottom:3px;">Speed: <strong>${veh.lastLocation.speedKmh} km/h</strong></div>
            <div style="font-size:11px; margin-bottom:6px;">Battery/Fuel: <strong>${veh.batteryOrFuelPct}%</strong></div>
            <button
              id="replay-veh-${veh.id}"
              style="
                width: 100%;
                background: linear-gradient(to right, #7c3aed, #4f46e5);
                color: #ffffff;
                border: none;
                padding: 6px 10px;
                border-radius: 6px;
                font-weight: 700;
                font-size: 11px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                box-shadow: 0 2px 6px rgba(79,70,229,0.3);
              "
            >
              <span>▶</span>
              <span>Replay Vehicle Route</span>
            </button>
          </div>
        `);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`replay-veh-${veh.id}`);
          if (btn) {
            btn.onclick = () => {
              handleStartVehiclePlayback(veh);
              marker.closePopup();
            };
          }
        });
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

    // 4. Render Predefined Geofence Delivery Zones & Hub Perimeters
    const geofenceLayer = geofenceLayerRef.current;
    if (geofenceLayer) {
      geofenceLayer.clearLayers();
      if (showGeofences) {
        geofenceZones.filter((z) => z.enabled).forEach((zone) => {
          if (!zone.centerLat || !zone.centerLng) return;

          const color = zone.colorHex || '#10b981';
          const radiusMeters = zone.radiusKm * 1000;

          // Circle with translucent fill and dashed border
          const circle = L.circle([zone.centerLat, zone.centerLng], {
            radius: radiusMeters,
            color,
            fillColor: color,
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6, 6',
          });

          // Compute vehicles currently inside
          const insideVehs = vehicles.filter((v) => {
            if (!v.lastLocation?.lat || !v.lastLocation?.lng) return false;
            return (
              calculateDistanceKm(v.lastLocation.lat, v.lastLocation.lng, zone.centerLat, zone.centerLng) <=
              zone.radiusKm
            );
          });

          circle.bindPopup(`
            <div style="font-family: inherit; color:#0f172a; min-width: 210px;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color};"></span>
                <strong style="font-size:13px; color:#0f172a;">${zone.name}</strong>
              </div>
              <div style="font-size:11px; color:#475569; margin-bottom:6px;">
                Anchor Hub: <strong>${zone.hubName}</strong>
              </div>
              <div style="background:#f1f5f9; padding:6px; border-radius:6px; font-size:11px; margin-bottom:6px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                  <span>Perimeter Radius:</span>
                  <strong style="font-family:monospace; color:#059669;">${zone.radiusKm} km</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                  <span>Alert on ENTER:</span>
                  <strong style="color:${zone.notifyOnEnter ? '#059669' : '#94a3b8'};">${zone.notifyOnEnter ? 'Active' : 'Off'}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span>Alert on EXIT:</span>
                  <strong style="color:${zone.notifyOnExit ? '#d97706' : '#94a3b8'};">${zone.notifyOnExit ? 'Active' : 'Off'}</strong>
                </div>
              </div>
              <div style="font-size:11px; color:#334155;">
                Vehicles Inside: <strong style="color:${insideVehs.length > 0 ? '#10b981' : '#64748b'};">${insideVehs.length} Active</strong>
                ${insideVehs.map((v) => `<div style="font-size:10px; color:#64748b; font-family:monospace; margin-top:2px;">• ${v.vehicleNumber} (${v.driverName || 'Courier'})</div>`).join('')}
              </div>
            </div>
          `);

          circle.bindTooltip(
            `${zone.name}: ${zone.radiusKm} km perimeter (${insideVehs.length} vehicles inside)`,
            { sticky: true }
          );
          geofenceLayer.addLayer(circle);

          // Add perimeter boundary label tag marker
          const labelLat = zone.centerLat + (zone.radiusKm / 111) * 0.95;
          const labelHtml = `
            <div style="
              background: #020617;
              border: 1.5px solid ${color};
              border-radius: 9999px;
              padding: 2px 7px;
              color: #f1f5f9;
              font-size: 10px;
              font-weight: 700;
              box-shadow: 0 2px 8px rgba(0,0,0,0.6);
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span style="width:6px; height:6px; border-radius:50%; background:${color};"></span>
              <span>${zone.name}: ${zone.radiusKm}km</span>
            </div>
          `;
          const labelMarker = L.marker([labelLat, zone.centerLng], {
            icon: L.divIcon({
              html: labelHtml,
              className: 'geofence-border-label',
              iconSize: [120, 20],
              iconAnchor: [60, 10],
            }),
          });
          geofenceLayer.addLayer(labelMarker);
        });
      }
    }
  }, [hubs, vehicles, parcels, showHubs, showVehicles, showRoutes, showGeofences, geofenceZones, selectedParcelId]);

  // Continuous Fleet Geofence Perimeter Evaluation & Live Notification Trigger
  useEffect(() => {
    const { triggeredEvents } = geofenceService.evaluateFleetGeofences(vehicles, geofenceZones);
    if (triggeredEvents.length > 0) {
      const latest = triggeredEvents[0];
      setActiveGeofenceAlert(latest);
      const timer = setTimeout(() => {
        setActiveGeofenceAlert((curr) => (curr?.id === latest.id ? null : curr));
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [vehicles, geofenceZones]);

  // Sync Geofence Zones from storage
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setGeofenceZones(storage.getGeofenceZones());
    });
    return unsubscribe;
  }, []);

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

  const handleFitPlaybackRoute = (route: CompletedDeliveryRoute) => {
    const map = mapInstanceRef.current;
    if (!map || !route || route.points.length === 0) return;
    const bounds = L.latLngBounds(route.points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [60, 60] });
  };

  const handleStartVehiclePlayback = (vehicle: Vehicle) => {
    const route =
      routePlaybackService.getRouteByVehicleId(vehicle.id) ||
      routePlaybackService.getRouteByVehicleNumber(vehicle.vehicleNumber) ||
      routePlaybackService.createHistoricalRouteForVehicle(vehicle);

    setActivePlaybackRoute(route);
    setPlaybackRoutes(routePlaybackService.getAllCompletedRoutes());
    setPlaybackIndex(0);
    setIsPlaybackActive(true);
    setIsPlaybackPlaying(true);
    handleFitPlaybackRoute(route);
  };

  // Auto-switch playback route if a delivered parcel is selected from props
  useEffect(() => {
    if (!selectedParcelId) return;
    const targetParcel = parcels.find((p) => p.id === selectedParcelId);
    if (targetParcel && targetParcel.status === 'DELIVERED') {
      const route =
        routePlaybackService.getRouteByParcelId(targetParcel.id) ||
        routePlaybackService.createHistoricalRouteForParcel(targetParcel);
      setActivePlaybackRoute(route);
      setPlaybackRoutes(routePlaybackService.getAllCompletedRoutes());
      setPlaybackIndex(0);
      setIsPlaybackActive(true);
      setIsPlaybackPlaying(true);
      handleFitPlaybackRoute(route);
    }
  }, [selectedParcelId, parcels]);

  // Route Playback Animation Timer Loop
  useEffect(() => {
    if (!isPlaybackPlaying || !isPlaybackActive || !activePlaybackRoute) return;

    const intervalMs = Math.max(25, Math.round(180 / playbackSpeed));
    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = prev + 1;
        if (next >= activePlaybackRoute.points.length) {
          if (playbackLoop) {
            return 0;
          } else {
            setIsPlaybackPlaying(false);
            return activePlaybackRoute.points.length - 1;
          }
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaybackPlaying, isPlaybackActive, activePlaybackRoute, playbackSpeed, playbackLoop]);

  // Render Historical Route Playback on Leaflet Canvas
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = playbackLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (!isPlaybackActive || !activePlaybackRoute || activePlaybackRoute.points.length === 0) {
      return;
    }

    const pts = activePlaybackRoute.points;
    const allCoords: [number, number][] = pts.map((p) => [p.lat, p.lng]);
    const traversedCoords: [number, number][] = pts.slice(0, playbackIndex + 1).map((p) => [p.lat, p.lng]);

    // 1. Full planned historical corridor line (dashed indigo)
    const fullPoly = L.polyline(allCoords, {
      color: '#6366f1',
      weight: 4,
      opacity: 0.35,
      dashArray: '6, 8',
    });
    layer.addLayer(fullPoly);

    // 2. Traversed progress path (vivid emerald glow)
    if (traversedCoords.length >= 2) {
      const traversedPoly = L.polyline(traversedCoords, {
        color: '#10b981',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });
      layer.addLayer(traversedPoly);
    }

    // 3. Origin Hub marker
    const originIcon = L.divIcon({
      html: `
        <div style="
          background: #1e3a8a;
          border: 2px solid #60a5fa;
          border-radius: 8px;
          padding: 3px 6px;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(0,0,0,0.6);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>🏁</span>
          <span>${activePlaybackRoute.originCity}</span>
        </div>
      `,
      className: 'playback-origin-marker',
      iconSize: [80, 24],
      iconAnchor: [40, 12],
    });
    const originMarker = L.marker(activePlaybackRoute.originCoords, { icon: originIcon });
    originMarker.bindPopup(`
      <div style="font-family: inherit; font-size:12px; color:#0f172a;">
        <strong>Origin Departure Hub</strong><br/>
        ${activePlaybackRoute.originName}<br/>
        <span style="color:#64748b; font-size:11px;">Departed: ${activePlaybackRoute.startTime}</span>
      </div>
    `);
    layer.addLayer(originMarker);

    // 4. Destination Hand-off marker
    const destIcon = L.divIcon({
      html: `
        <div style="
          background: #065f46;
          border: 2px solid #34d399;
          border-radius: 8px;
          padding: 3px 6px;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(0,0,0,0.6);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>✅</span>
          <span>${activePlaybackRoute.recipientName}</span>
        </div>
      `,
      className: 'playback-dest-marker',
      iconSize: [90, 24],
      iconAnchor: [45, 12],
    });
    const destMarker = L.marker(activePlaybackRoute.destCoords, { icon: destIcon });
    destMarker.bindPopup(`
      <div style="font-family: inherit; font-size:12px; color:#0f172a;">
        <strong>Delivered & Signed (POD)</strong><br/>
        ${activePlaybackRoute.destAddress}, ${activePlaybackRoute.destCity}<br/>
        <span style="color:#059669; font-size:11px;">Confirmation: ${activePlaybackRoute.podConfirmationCode}</span>
      </div>
    `);
    layer.addLayer(destMarker);

    // 5. Animating Vehicle Marker
    const curPt = pts[playbackIndex] || pts[0];
    if (curPt) {
      const vehIcon = L.divIcon({
        html: `
          <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; inset:0; border-radius:50%; background:rgba(16,185,129,0.35); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="background:#020617; border:2.5px solid #10b981; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; transform:rotate(${curPt.heading}deg); transition:transform 0.12s ease-out; box-shadow:0 0 18px rgba(16,185,129,0.8); color:#10b981;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981" stroke="#10b981" stroke-width="1.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            </div>
            <div style="position:absolute; bottom:-16px; left:50%; transform:translateX(-50%); background:#0f172a; color:#10b981; font-size:9px; font-family:monospace; font-weight:bold; padding:1px 5px; border-radius:4px; border:1px solid #10b981; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.6);">
              ${curPt.speedKmh} km/h
            </div>
          </div>
        `,
        className: 'playback-animated-veh-icon',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const vehMarker = L.marker([curPt.lat, curPt.lng], { icon: vehIcon });
      vehMarker.bindPopup(`
        <div style="font-family: inherit; font-size:12px; color:#0f172a;">
          <strong>${activePlaybackRoute.vehicleNumber} (${activePlaybackRoute.courierName})</strong><br/>
          Speed: <strong>${curPt.speedKmh} km/h</strong> · Heading: ${curPt.heading}°<br/>
          Battery: <strong>${curPt.batteryPct}%</strong><br/>
          <span style="color:#64748b; font-size:11px;">${curPt.stepDescription}</span>
        </div>
      `);
      layer.addLayer(vehMarker);

      // Pan camera if autoFollow enabled
      if (playbackAutoFollow) {
        map.panTo([curPt.lat, curPt.lng], { animate: true, duration: 0.2 });
      }
    }
  }, [isPlaybackActive, activePlaybackRoute, playbackIndex, playbackAutoFollow]);

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

  const handleApplyOptimizedRoute = (result: OptimizedRouteResult) => {
    const map = mapInstanceRef.current;
    const orsLayer = orsLayerRef.current;
    if (!map || !orsLayer) return;

    orsLayer.clearLayers();
    setActiveOptimizedRoute(result);
    setActiveOrsResult(null);

    // Sync to activeMultiStopPlan so Google Maps Platform displays the re-calculated route too
    const plan = convertOptimizedRouteToMultiStopPlan(result);
    setActiveMultiStopPlan(plan);

    // 1. Draw vehicle start position
    const startHtml = `
      <div style="
        background: #020617;
        border: 2px solid #10b981;
        border-radius: 9999px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #10b981;
        box-shadow: 0 4px 14px rgba(0,0,0,0.6);
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
          background: #064e3b;
          color: #a7f3d0;
          font-size: 9px;
          font-weight: bold;
          padding: 1px 4px;
          border-radius: 4px;
          white-space: nowrap;
        ">START</div>
      </div>
    `;
    const startIcon = L.divIcon({
      html: startHtml,
      className: 'custom-start-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const startMarker = L.marker([result.startLocation.lat, result.startLocation.lng], { icon: startIcon });
    startMarker.bindPopup(`
      <div style="font-family: inherit; color:#0f172a; min-width: 170px;">
        <div style="font-weight:700; font-size:12px; color:#059669;">Route Origin (GPS Start)</div>
        <div style="font-weight:600; font-size:12px;">${result.courierName} · ${result.vehicleNumber}</div>
        <div style="font-size:11px; color:#475569;">${result.startLocation.lat.toFixed(4)}, ${result.startLocation.lng.toFixed(4)}</div>
      </div>
    `);
    orsLayer.addLayer(startMarker);

    // 2. Draw numbered stop markers for each optimized stop with Parcel Priority tagging
    result.optimizedStops.forEach((stop, idx) => {
      const stopNum = idx + 1;
      const originalNum = stop.originalIndex;
      const isReordered = originalNum !== stopNum;
      const isSameDay = stop.serviceTier === 'SAME_DAY_PRIORITY';
      const isExpress = stop.serviceTier === 'NEXT_DAY_EXPRESS';
      const isHighRisk = stop.delayRiskLevel === 'HIGH';

      const borderColor = isSameDay ? '#c084fc' : isReordered ? '#fbbf24' : '#818cf8';
      const bgColor = isSameDay ? '#7c3aed' : '#4f46e5';

      const stopHtml = `
        <div style="
          background: ${bgColor};
          border: 2px solid ${borderColor};
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 13px;
          font-family: monospace;
          box-shadow: 0 4px 14px rgba(0,0,0,0.7);
          position: relative;
        ">
          ${stopNum}
          ${isSameDay ? `
            <div style="
              position: absolute;
              top: -8px;
              left: 50%;
              transform: translateX(-50%);
              background: #9333ea;
              color: #f3e8ff;
              font-size: 7px;
              font-weight: 800;
              padding: 0px 4px;
              border-radius: 4px;
              border: 1px solid #d8b4fe;
              white-space: nowrap;
            ">PRIORITY</div>
          ` : ''}
          ${isReordered && !isSameDay ? `
            <div style="
              position: absolute;
              top: -6px;
              right: -6px;
              background: #d97706;
              color: #fff;
              font-size: 8px;
              font-weight: 800;
              border-radius: 9999px;
              width: 14px;
              height: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1px solid #ffffff;
            ">★</div>
          ` : ''}
        </div>
      `;

      const stopIcon = L.divIcon({
        html: stopHtml,
        className: 'optimized-stop-pin',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; color:#0f172a; min-width: 200px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <span style="font-weight:800; font-size:12px; color:${bgColor};">STOP #${stopNum} (${isSameDay ? 'PRIORITY SLA' : 'Re-optimized'})</span>
            ${isReordered ? `<span style="font-size:10px; background:#fef3c7; color:#92400e; padding:1px 4px; border-radius:4px; font-weight:700;">WAS #${originalNum}</span>` : ''}
          </div>
          <div style="font-weight:700; font-size:13px; margin-bottom:2px;">${stop.recipientName}</div>
          ${stop.company ? `<div style="font-size:11px; color:#64748b;">${stop.company}</div>` : ''}
          <div style="font-size:11px; color:#475569; margin-top:2px;">${stop.address}</div>
          <div style="font-size:11px; margin-top:4px; display:flex; justify-content:space-between;">
            <span>Priority Tier:</span>
            <strong style="color:${isSameDay ? '#7c3aed' : '#2563eb'};">${stop.serviceTier.replace(/_/g, ' ')}</strong>
          </div>
          ${stop.delayRiskLevel ? `
            <div style="font-size:11px; display:flex; justify-content:space-between; margin-top:2px;">
              <span>Delay Risk:</span>
              <strong style="color:${isHighRisk ? '#dc2626' : '#16a34a'};">${stop.delayRiskLevel}</strong>
            </div>
          ` : ''}
          <div style="font-size:11px; margin-top:5px; border-top:1px solid #e2e8f0; padding-top:4px;">
            Tracking: <strong style="font-family:monospace;">${stop.trackingNumber}</strong>
          </div>
        </div>
      `);
      orsLayer.addLayer(marker);
    });

    // 3. Draw traffic-colored polyline segments with casing
    result.segments.forEach((seg) => {
      const color =
        seg.trafficCondition.congestionLevel === 'FREE_FLOW'
          ? '#10b981'
          : seg.trafficCondition.congestionLevel === 'MODERATE'
          ? '#f59e0b'
          : '#ef4444';

      // Outer casing for contrast
      const casing = L.polyline(seg.corridorGeometry, {
        color: '#020617',
        weight: 9,
        opacity: 0.75,
      });
      orsLayer.addLayer(casing);

      // Inner traffic corridor polyline
      const poly = L.polyline(seg.corridorGeometry, {
        color,
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });

      poly.bindTooltip(
        `Leg ${seg.segmentIndex}: ${seg.fromName} → ${seg.toName} (${seg.distanceKm} km · ${seg.durationMinutes}m · ${seg.trafficCondition.congestionLevel.replace('_', ' ')})`,
        { sticky: true }
      );
      orsLayer.addLayer(poly);
    });

    // Fit map bounds to show full optimized route
    if (result.fullRouteCoordinates.length > 0) {
      map.fitBounds(L.latLngBounds(result.fullRouteCoordinates), { padding: [60, 60] });
    }
  };

  const handleClearOptimizedRoute = () => {
    if (orsLayerRef.current) {
      orsLayerRef.current.clearLayers();
    }
    setActiveOptimizedRoute(null);
    setActiveMultiStopPlan(null);
  };

  const handleApplyAiOptimizationPlan = (plan: MultiVehicleAiOptimizationPlan) => {
    setActiveAiPlan(plan);
    setActiveOptimizedRoute(null);
    setActiveMultiStopPlan(null);
    setActiveOrsResult(null);

    const map = mapInstanceRef.current;
    const orsLayer = orsLayerRef.current;
    if (!map || !orsLayer) return;

    orsLayer.clearLayers();

    const allPoints: [number, number][] = [];

    plan.vehicleRoutes.forEach((route) => {
      const color = route.color || '#10b981';

      // 1. Vehicle Origin Marker
      if (route.routeCoordinates.length > 0) {
        const startCoord = route.routeCoordinates[0];
        allPoints.push(startCoord);

        const startHtml = `
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
            font-weight: 800;
            font-size: 12px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.8);
            position: relative;
          ">
            <span>⚡</span>
            <div style="
              position: absolute;
              bottom: -16px;
              left: 50%;
              transform: translateX(-50%);
              background: #0f172a;
              color: ${color};
              font-size: 8px;
              font-family: monospace;
              font-weight: 700;
              padding: 1px 4px;
              border-radius: 4px;
              border: 1px solid ${color}40;
              white-space: nowrap;
            ">${route.vehicleNumber}</div>
          </div>
        `;
        const startIcon = L.divIcon({
          html: startHtml,
          className: 'custom-ai-veh-start',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const startMarker = L.marker(startCoord, { icon: startIcon });
        startMarker.bindPopup(`
          <div style="font-family: inherit; color:#0f172a; min-width: 175px;">
            <div style="font-weight:700; font-size:12px; color:${color};">AI Sequence Origin</div>
            <div style="font-weight:600; font-size:12px;">${route.vehicleNumber} (${route.driverName})</div>
            <div style="font-size:11px; color:#475569;">Stops: ${route.totalStops} · Distance: ${route.totalDistanceKm} km</div>
            <div style="font-size:11px; color:#475569;">Fuel: ${route.fuelConsumedAmount} ${route.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}</div>
          </div>
        `);
        orsLayer.addLayer(startMarker);
      }

      // 2. Route Corridor Lines
      if (route.routeCoordinates.length > 1) {
        route.routeCoordinates.forEach((c) => allPoints.push(c));

        // Casing for contrast
        const casing = L.polyline(route.routeCoordinates, {
          color: '#020617',
          weight: 7,
          opacity: 0.85,
        });
        orsLayer.addLayer(casing);

        // Colored route line
        const poly = L.polyline(route.routeCoordinates, {
          color,
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });
        poly.bindTooltip(
          `${route.vehicleNumber} (${route.driverName}) · ${route.totalStops} stops · Eco Score: ${route.fuelEfficiencyScore}/100`,
          { sticky: true }
        );
        orsLayer.addLayer(poly);
      }

      // 3. Numbered Stop Markers
      route.stops.forEach((stop) => {
        allPoints.push([stop.lat, stop.lng]);

        const stopHtml = `
          <div style="
            background: #020617;
            border: 2px solid ${color};
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            font-family: monospace;
            box-shadow: 0 3px 10px rgba(0,0,0,0.7);
            position: relative;
          ">
            ${stop.sequenceNumber}
            <div style="
              position: absolute;
              top: -14px;
              left: 50%;
              transform: translateX(-50%);
              background: ${color};
              color: #020617;
              font-size: 7px;
              font-weight: 900;
              padding: 0 3px;
              border-radius: 3px;
              white-space: nowrap;
            ">${stop.estimatedArrivalClock}</div>
          </div>
        `;

        const stopIcon = L.divIcon({
          html: stopHtml,
          className: 'ai-optimized-stop-pin',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: stopIcon });
        stopMarker.bindPopup(`
          <div style="font-family: inherit; color:#0f172a; min-width: 200px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <span style="font-weight:800; font-size:11px; color:${color};">${route.vehicleNumber} · STOP #${stop.sequenceNumber}</span>
              <span style="font-size:10px; background:#e0e7ff; color:#3730a3; padding:1px 4px; border-radius:4px; font-weight:700;">ETA ${stop.estimatedArrivalClock}</span>
            </div>
            <div style="font-weight:700; font-size:12px;">${stop.recipientName}</div>
            <div style="font-size:11px; color:#475569;">${stop.street}, ${stop.city}</div>
            <div style="margin-top:4px; font-size:11px; display:flex; justify-content:space-between;">
              <span>Drop Load: <strong>${stop.weightKg} kg</strong></span>
              <span>Remaining: <strong>${stop.remainingPayloadKg} kg</strong></span>
            </div>
            <div style="font-size:10px; color:#64748b; margin-top:2px;">
              Traffic: <strong style="color:${stop.trafficCondition === 'FREE_FLOW' ? '#16a34a' : '#d97706'}">${stop.trafficCondition}</strong> · Leg: ${stop.legDistanceKm} km
            </div>
            <div style="font-size:10px; color:#4338ca; margin-top:3px; font-family:monospace;">
              ${stop.trackingNumber} (${stop.serviceTier.replace(/_/g, ' ')})
            </div>
          </div>
        `);
        orsLayer.addLayer(stopMarker);
      });
    });

    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
    }
  };

  const handleClearAiPlan = () => {
    if (orsLayerRef.current) {
      orsLayerRef.current.clearLayers();
    }
    setActiveAiPlan(null);
  };

  // Re-calculate waypoints based on real-time traffic and parcel priority levels
  const handleReoptimizeRoute = async () => {
    setIsReoptimizing(true);
    setReoptimizeStatusText('Analyzing real-time traffic corridor speeds...');

    try {
      const activeParcels = parcels.filter(
        (p) =>
          (p.status === 'OUT_FOR_DELIVERY' ||
           p.status === 'IN_TRANSIT_HUB_TRANSFER' ||
           p.id === selectedParcelId ||
           p.assignedCourierId === 'user-courier') &&
          p.status !== 'DELIVERED'
      );

      const targetParcels = activeParcels.length > 0 
        ? activeParcels 
        : parcels.filter((p) => p.status !== 'DELIVERED').slice(0, 6);

      if (targetParcels.length === 0) {
        setMapError('No active consignment waypoints available to re-optimize.');
        setIsReoptimizing(false);
        setReoptimizeStatusText(null);
        return;
      }

      const waypoints: StopWaypoint[] = targetParcels.map((pcl, idx) => ({
        parcelId: pcl.id,
        trackingNumber: pcl.trackingNumber,
        recipientName: pcl.recipient.name,
        company: pcl.recipient.company,
        address: `${pcl.recipient.street}, ${pcl.recipient.city}`,
        city: pcl.recipient.city,
        postalCode: pcl.recipient.postalCode,
        lat: pcl.recipient.lat || 37.7749,
        lng: pcl.recipient.lng || -122.4194,
        serviceTier: pcl.serviceTier,
        originalIndex: pcl.routeStopOrder || idx + 1,
        packageType: pcl.packageType,
        specialInstructions: pcl.specialInstructions,
        delayRiskLevel: pcl.delayRisk?.level || 'LOW',
        weightKg: pcl.weightKg,
      }));

      const activeVehicle = vehicles.find((v) => v.id === 'veh-ev-101') || vehicles[0] || {
        id: 'veh-ev-101',
        vehicleNumber: 'APX-EV-101',
        lastLocation: { lat: 37.7749, lng: -122.4194, speedKmh: 45, heading: 200, lastUpdated: new Date().toISOString() },
      };
      const activeCourier = { id: 'user-courier', name: 'Marcus Vance' };

      setReoptimizeStatusText('Weighting parcel priority levels (SAME DAY PRIORITY upfront)...');
      await new Promise((r) => setTimeout(r, 450));

      const optimizedResult = await openRouteService.optimizeCourierRoute(
        activeCourier,
        {
          id: activeVehicle.id,
          vehicleNumber: activeVehicle.vehicleNumber,
          lastLocation: activeVehicle.lastLocation ? {
            lat: activeVehicle.lastLocation.lat,
            lng: activeVehicle.lastLocation.lng,
            name: `${activeVehicle.vehicleNumber} (Live Start Position)`,
          } : undefined,
        },
        waypoints,
        'driving-car',
        {
          prioritizeParcelSla: true,
          priorityWeight: 1.5,
        }
      );

      handleApplyOptimizedRoute(optimizedResult);
    } catch (err) {
      console.error('Error during route re-optimization:', err);
      setMapError('Failed to recalculate route waypoints.');
    } finally {
      setIsReoptimizing(false);
      setReoptimizeStatusText(null);
    }
  };

  // --- Automated Re-routing Trigger Implementation ---
  const handleAutomatedReroute = async (incident: PredictiveDelayIncident) => {
    setActiveIncidentAlert(incident);
    setAutoRerouteState('RECALCULATING');
    setIsReoptimizing(true);
    setReoptimizeStatusText(
      `🚨 Automated Re-Route: Bypassing ${incident.corridorName} (+${incident.currentDelayMin}m delay) via ${incident.recommendedBypass.name}...`
    );

    try {
      const activeParcels = parcels.filter(
        (p) =>
          (p.status === 'OUT_FOR_DELIVERY' ||
           p.status === 'IN_TRANSIT_HUB_TRANSFER' ||
           p.id === selectedParcelId ||
           p.assignedCourierId === 'user-courier') &&
          p.status !== 'DELIVERED'
      );

      const targetParcels = activeParcels.length > 0 
        ? activeParcels 
        : parcels.filter((p) => p.status !== 'DELIVERED').slice(0, 6);

      const waypoints: StopWaypoint[] = targetParcels.map((pcl, idx) => ({
        parcelId: pcl.id,
        trackingNumber: pcl.trackingNumber,
        recipientName: pcl.recipient.name,
        company: pcl.recipient.company,
        address: `${pcl.recipient.street}, ${pcl.recipient.city}`,
        city: pcl.recipient.city,
        postalCode: pcl.recipient.postalCode,
        lat: pcl.recipient.lat || 37.7749,
        lng: pcl.recipient.lng || -122.4194,
        serviceTier: pcl.serviceTier,
        originalIndex: pcl.routeStopOrder || idx + 1,
        packageType: pcl.packageType,
        specialInstructions: pcl.specialInstructions,
        delayRiskLevel: pcl.delayRisk?.level || 'LOW',
        weightKg: pcl.weightKg,
      }));

      const activeVehicle = vehicles.find((v) => v.id === (incident.impactedVehicleId || 'veh-ev-101')) || vehicles[0] || {
        id: 'veh-ev-101',
        vehicleNumber: 'APX-EV-101',
        lastLocation: { lat: 37.7749, lng: -122.4194, speedKmh: 45, heading: 200, lastUpdated: new Date().toISOString() },
      };
      const activeCourier = { id: 'user-courier', name: incident.courierName || 'Marcus Vance' };

      await new Promise((r) => setTimeout(r, 650));

      const optimizedResult = await openRouteService.optimizeCourierRoute(
        activeCourier,
        {
          id: activeVehicle.id,
          vehicleNumber: activeVehicle.vehicleNumber,
          lastLocation: activeVehicle.lastLocation ? {
            lat: activeVehicle.lastLocation.lat,
            lng: activeVehicle.lastLocation.lng,
            name: `${activeVehicle.vehicleNumber} (Live Start Position)`,
          } : undefined,
        },
        waypoints,
        'driving-car',
        {
          prioritizeParcelSla: true,
          priorityWeight: 2.0,
        }
      );

      // Inject bypass notes & highlight
      optimizedResult.trafficBottlenecksAvoided = [
        `Avoided ${incident.corridorName}: diverted via ${incident.recommendedBypass.name} (Saved ~${incident.recommendedBypass.timeSavedMin} mins)`
      ];
      optimizedResult.priorityHighlights = [
        `Automated Re-Route Trigger Executed: SLA protected against ${incident.type === 'SEVERE_WEATHER_DELAY' ? 'Severe Weather Storm' : 'Traffic Incident'}`
      ];

      handleApplyOptimizedRoute(optimizedResult);

      setLastRecalculatedSavings({
        timeSavedMin: incident.recommendedBypass.timeSavedMin,
        bypassName: incident.recommendedBypass.name,
        corridorName: incident.corridorName,
        incidentCause: incident.cause,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setAutoRerouteState('RE_ROUTED');

      // Record audit notification to storage
      storage.addNotification({
        title: `Automated Courier Re-Route: ${incident.type === 'SEVERE_WEATHER_DELAY' ? 'Severe Weather Alert' : 'Major Traffic Incident'}`,
        message: `PredictiveDelayWidget detected ${incident.cause}. Courier path automatically recalculated via ${incident.recommendedBypass.name}, saving ${incident.recommendedBypass.timeSavedMin} mins.`,
        category: 'DELIVERY_DELAY',
        severity: 'WARNING',
      });
    } catch (err) {
      console.error('Error during automated re-route:', err);
      setMapError('Failed to execute automated re-routing.');
      setAutoRerouteState('IDLE');
    } finally {
      setIsReoptimizing(false);
      setReoptimizeStatusText(null);
    }
  };

  // Subscribe to PredictiveDelayWidget incident broadcasts
  useEffect(() => {
    const unsubscribe = subscribeToPredictiveDelayIncidents((incident) => {
      setActiveIncidentAlert(incident);
      if (isAutoRerouteTriggerEnabled) {
        handleAutomatedReroute(incident);
      } else {
        setAutoRerouteState('IDLE');
      }
    });
    return unsubscribe;
  }, [isAutoRerouteTriggerEnabled, parcels, vehicles, selectedParcelId]);

  const handleApplyMultiStopPlan = (result: MultiStopPlanResult) => {
    setActiveMultiStopPlan(result);

    const map = mapInstanceRef.current;
    const orsLayer = orsLayerRef.current;
    if (map && orsLayer && result.routePath.length > 0) {
      orsLayer.clearLayers();

      // Draw polyline
      const poly = L.polyline(result.routePath, {
        color: '#4f46e5',
        weight: 6,
        opacity: 0.9,
      });
      poly.bindTooltip(
        `Multi-Stop Plan (${result.engine === 'GOOGLE_MAPS' ? 'Google Maps Routes v2' : 'OpenRouteService'}): ${result.totalDistanceKm} km · ${result.totalDurationMinutes} mins`,
        { sticky: true }
      );
      orsLayer.addLayer(poly);

      // Draw numbered stop pins
      result.orderedWaypoints.forEach((wp, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === result.orderedWaypoints.length - 1;
        const stopHtml = `
          <div style="
            background: ${isStart ? '#10b981' : isEnd ? '#ef4444' : '#4f46e5'};
            border: 2px solid #ffffff;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            font-family: monospace;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          ">
            ${isStart ? 'S' : isEnd ? 'E' : idx}
          </div>
        `;
        const marker = L.marker([wp.lat, wp.lng], {
          icon: L.divIcon({
            html: stopHtml,
            className: 'multi-stop-pin',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        });
        marker.bindPopup(`
          <div style="font-family: inherit; color:#0f172a; min-width: 180px;">
            <div style="font-weight:800; font-size:12px; color:#4f46e5; margin-bottom:2px;">
              ${isStart ? 'START POINT' : isEnd ? 'DESTINATION / END' : `STOP #${idx}`}
            </div>
            <div style="font-weight:700; font-size:13px;">${wp.name}</div>
            <div style="font-size:11px; color:#475569; margin-top:2px;">${wp.address}</div>
            ${wp.trackingNumber ? `<div style="font-size:11px; margin-top:4px; font-family:monospace;">Tracking: ${wp.trackingNumber}</div>` : ''}
          </div>
        `);
        orsLayer.addLayer(marker);
      });

      map.fitBounds(L.latLngBounds(result.routePath), { padding: [60, 60] });
    }
  };

  const handleClearMultiStopPlan = () => {
    if (orsLayerRef.current) {
      orsLayerRef.current.clearLayers();
    }
    setActiveMultiStopPlan(null);
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

        {/* Toggle Geofence Perimeters */}
        <button
          onClick={() => setShowGeofences(!showGeofences)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            showGeofences ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Predefined Delivery Zones & Hub Perimeters"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-200" />
          <span>Geofences ({geofenceZones.filter((z) => z.enabled).length})</span>
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

        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

        {/* Map Engine Switcher: Google Maps Platform vs Leaflet */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold">
          <button
            onClick={() => setMapProvider('GOOGLE_MAPS')}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              mapProvider === 'GOOGLE_MAPS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Google Maps Platform (Routes API v2)"
          >
            <Globe className="w-3 h-3 text-indigo-200" />
            <span>Google Maps</span>
          </button>
          <button
            onClick={() => {
              setMapProvider('LEAFLET');
              setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
            }}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              mapProvider === 'LEAFLET'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="OpenStreetMap / Leaflet (PostGIS)"
          >
            <Layers className="w-3 h-3 text-slate-300" />
            <span>Leaflet</span>
          </button>
        </div>

        {/* Reset View */}
        <button
          onClick={handleFitAll}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Fit bounds to all assets"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map Diagnostics, ORS & Multi-Stop Planner / Auto-Optimize & Re-optimize Triggers */}
      <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center gap-2">
        {/* 'Route Playback' Feature (Animate Historical Path of Completed Deliveries) */}
        <button
          onClick={() => {
            const nextActive = !isPlaybackActive;
            setIsPlaybackActive(nextActive);
            if (nextActive) {
              setIsPlaybackPlaying(true);
              if (activePlaybackRoute) {
                handleFitPlaybackRoute(activePlaybackRoute);
              }
            } else {
              setIsPlaybackPlaying(false);
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xl backdrop-blur-md transition-all border ${
            isPlaybackActive
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white border-purple-400 shadow-purple-900/40 ring-2 ring-purple-500/40'
              : 'bg-slate-900/90 hover:bg-slate-800 text-purple-300 border-purple-500/30'
          }`}
          title="Historical Route Playback: Animate GPS telemetry and breadcrumbs of completed deliveries"
        >
          <History className={`w-3.5 h-3.5 ${isPlaybackPlaying ? 'animate-spin' : ''}`} />
          <span>Route Playback</span>
          <span className="hidden sm:inline px-1 py-0.5 rounded bg-purple-950/80 text-purple-200 text-[9px] font-mono border border-purple-400/30">
            {playbackRoutes.length} TRACKS
          </span>
        </button>

        {/* Automated Re-Routing Trigger (Triggered by PredictiveDelayWidget) */}
        <div className="relative">
          <button
            onClick={() => setIsAutoRerouteTriggerEnabled(!isAutoRerouteTriggerEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xl backdrop-blur-md transition-all border ${
              isAutoRerouteTriggerEnabled
                ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 text-white border-amber-400/80 shadow-rose-900/40 ring-2 ring-amber-500/30'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Automated Re-routing Trigger: Automatically recalculates optimal courier path if a major traffic incident or severe weather delay is detected by PredictiveDelayWidget"
          >
            <div className="relative flex items-center justify-center">
              <Radio className={`w-3.5 h-3.5 ${isAutoRerouteTriggerEnabled ? 'text-amber-200 animate-pulse' : 'text-slate-400'}`} />
              {isAutoRerouteTriggerEnabled && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                </span>
              )}
            </div>
            <span>{isAutoRerouteTriggerEnabled ? 'Auto-Reroute: ON' : 'Auto-Reroute: OFF'}</span>
            <span className="hidden sm:inline px-1 py-0.2 rounded bg-black/40 text-amber-200 text-[9px] font-mono border border-amber-400/30">
              TRIGGER
            </span>
          </button>
        </div>

        {/* Geofencing Perimeter Module Trigger */}
        <button
          onClick={() => setIsGeofenceModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xl backdrop-blur-md transition-all border bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border-emerald-500/40 hover:text-white"
          title="Open Geo-Fencing Module: Configure delivery zones & hub perimeters, manage notification triggers"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span>Geofencing</span>
          <span className="hidden sm:inline px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 text-[9px] font-mono border border-emerald-500/30">
            {geofenceZones.filter((z) => z.enabled).length} ZONES
          </span>
        </button>

        {/* Predictive Delay Radar Modal Trigger */}
        <button
          onClick={() => setIsIncidentDrawerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg shadow-xl backdrop-blur-md transition-all border bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-amber-500/30"
          title="Open Predictive Delay & Bottleneck Radar (ML Traffic & Storm Forecasts)"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Delay Radar</span>
        </button>

        {/* Simulate Delay Incident & Geofence Crossing Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsSimulateIncidentMenuOpen(!isSimulateIncidentMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg shadow-xl backdrop-blur-md transition-all border bg-slate-900/90 hover:bg-slate-800 text-rose-300 border-rose-500/30"
            title="Simulate delay incidents or geofence boundary crossings"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">Simulate Events</span>
            <ChevronDown className="w-3 h-3 text-rose-300" />
          </button>

          {isSimulateIncidentMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl p-2 z-50 text-xs animate-fade-in backdrop-blur-md space-y-1">
              <div className="text-[10px] font-mono uppercase text-emerald-400 px-2 py-1 font-bold border-b border-slate-800">
                Geofence Boundary Crossing Triggers
              </div>
              <button
                onClick={() => {
                  setIsSimulateIncidentMenuOpen(false);
                  const v = vehicles.find((veh) => veh.id === 'veh-ev-101') || vehicles[0];
                  const z = geofenceZones[0];
                  if (v && z) {
                    const evt = geofenceService.simulateGeofenceCrossing(v, z, 'ENTER');
                    setActiveGeofenceAlert(evt);
                  }
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-start gap-2.5 transition-colors"
              >
                <Radio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-emerald-300">Vehicle ENTER Hub Perimeter</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Cross APX-EV-101 into SF Central Hub perimeter</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsSimulateIncidentMenuOpen(false);
                  const v = vehicles.find((veh) => veh.id === 'veh-ev-101') || vehicles[0];
                  const z = geofenceZones[0];
                  if (v && z) {
                    const evt = geofenceService.simulateGeofenceCrossing(v, z, 'EXIT');
                    setActiveGeofenceAlert(evt);
                  }
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-start gap-2.5 transition-colors"
              >
                <Radio className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-amber-300">Vehicle EXIT Hub Perimeter</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Cross APX-EV-101 outside SF Central Hub perimeter</div>
                </div>
              </button>

              <div className="text-[10px] font-mono uppercase text-rose-400 px-2 py-1 font-bold border-b border-slate-800 pt-2">
                Predictive Traffic & Weather Incidents
              </div>
              <button
                onClick={() => {
                  setIsSimulateIncidentMenuOpen(false);
                  broadcastPredictiveDelayIncident(PRESET_PREDICTIVE_INCIDENTS[0]);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-start gap-2.5 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-rose-300">I-80 Bay Bridge Multi-Car Crash</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">+32m delay · 3-lane blockage at toll merge</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setIsSimulateIncidentMenuOpen(false);
                  broadcastPredictiveDelayIncident(PRESET_PREDICTIVE_INCIDENTS[1]);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-start gap-2.5 transition-colors"
              >
                <CloudRain className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-cyan-300">Atmospheric River Gale Storm</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">+26m delay · 22mm/h downpour & flood</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 'Re-optimize Route' Feature (Live Traffic & Parcel Priorities) */}
        <div className="flex items-center rounded-lg shadow-xl backdrop-blur-md overflow-hidden border border-emerald-400/40 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 transition-all hover:scale-[1.01]">
          <button
            onClick={handleReoptimizeRoute}
            disabled={isReoptimizing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all disabled:opacity-50"
            title="Re-optimize Route: Recalculates waypoints based on real-time traffic speeds & parcel priority levels"
          >
            <RotateCw className={`w-3.5 h-3.5 text-emerald-100 ${isReoptimizing ? 'animate-spin' : ''}`} />
            <span>{isReoptimizing ? 'Re-optimizing...' : 'Re-optimize Route'}</span>
            <span className="hidden sm:inline px-1 py-0.5 rounded bg-emerald-950/60 text-emerald-200 text-[9px] font-mono border border-emerald-400/30">
              TRAFFIC & SLA
            </span>
          </button>
          <button
            onClick={() => setIsReoptimizeModalOpen(true)}
            className="px-1.5 py-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700/60 transition-colors border-l border-emerald-400/30"
            title="Configure Route Priority SLA Weights & Vehicle"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => setIsMultiStopPlannerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-lg shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border border-indigo-400/40"
          title="Multi-Stop Route Planner & Waypoint Optimizer"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-200" />
          <span>Multi-Stop Planner</span>
        </button>

        <button
          onClick={() => setIsAutoOptimizeOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white rounded-lg shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border border-amber-300/30"
          title="Auto-Optimize Courier Route using Live Traffic Data"
        >
          <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
          <span>Auto-Optimize</span>
        </button>

        <button
          onClick={() => setIsRouteOptAiOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border border-emerald-400/40 ring-1 ring-emerald-400/20"
          title="Route Optimization AI: Sequence fleet deliveries to minimize fuel & avoid congestion"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
          <span>Route Optimization AI</span>
        </button>

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
          <span>ORS</span>
        </button>

        <button
          onClick={() => setIsDiagnosticOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 rounded-lg shadow-xl backdrop-blur-md transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Diagnostic</span>
        </button>
      </div>

      {/* Real-Time Re-optimization Progress HUD */}
      {isReoptimizing && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-emerald-500/50 text-slate-100 shadow-2xl backdrop-blur-md animate-fade-in text-xs font-semibold">
          <RotateCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
          <span>{reoptimizeStatusText || 'Re-calculating waypoints based on real-time traffic & parcel priority levels...'}</span>
        </div>
      )}

      {/* Floating Geofence Boundary Crossing Alert Toast */}
      {activeGeofenceAlert && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-2xl animate-fade-in">
          <div className={`p-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all ${
            activeGeofenceAlert.action === 'ENTER'
              ? 'bg-slate-900/95 border-emerald-500/80 shadow-emerald-950/60 ring-2 ring-emerald-500/20'
              : 'bg-slate-900/95 border-amber-500/80 shadow-amber-950/60 ring-2 ring-amber-500/20'
          }`}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${
                  activeGeofenceAlert.action === 'ENTER'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-100 text-xs">
                      Geofence Perimeter Alert:
                    </span>
                    <span className="text-slate-100 font-mono font-bold">{activeGeofenceAlert.vehicleNumber}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold border ${
                        activeGeofenceAlert.action === 'ENTER'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {activeGeofenceAlert.action === 'ENTER' ? 'ENTERED ZONE' : 'EXITED ZONE'}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ({activeGeofenceAlert.driverName || 'Courier'})
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Vehicle has {activeGeofenceAlert.action === 'ENTER' ? 'entered' : 'exited'} the <strong className="text-white font-mono">{activeGeofenceAlert.radiusKm} km</strong> perimeter around <strong className="text-emerald-300">{activeGeofenceAlert.hubName}</strong> ({activeGeofenceAlert.distanceFromCenterKm} km from hub center · {activeGeofenceAlert.speedKmh || 40} km/h).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsGeofenceModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-xs shadow-sm"
                >
                  Manage Zones
                </button>
                <button
                  onClick={() => setActiveGeofenceAlert(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Predictive Delay Incident & Automated Re-routing Alert Banner */}
      {activeIncidentAlert && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-3xl animate-fade-in">
          <div className={`p-3.5 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all ${
            autoRerouteState === 'RECALCULATING'
              ? 'bg-amber-950/90 border-amber-500/60 shadow-amber-950/50'
              : autoRerouteState === 'RE_ROUTED'
              ? 'bg-slate-900/95 border-emerald-500/60 shadow-emerald-950/50'
              : 'bg-rose-950/90 border-rose-500/60 shadow-rose-950/50'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${
                  activeIncidentAlert.type === 'SEVERE_WEATHER_DELAY'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {activeIncidentAlert.type === 'SEVERE_WEATHER_DELAY' ? (
                    <CloudRain className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-100 text-xs">
                      {activeIncidentAlert.type === 'SEVERE_WEATHER_DELAY' ? 'Severe Weather Delay' : 'Major Traffic Incident'}:
                    </span>
                    <span className="text-amber-300 font-semibold">{activeIncidentAlert.corridorName}</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30">
                      +{activeIncidentAlert.currentDelayMin}m DELAY
                    </span>
                    {autoRerouteState === 'RECALCULATING' && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 animate-spin text-amber-400" />
                        AUTOMATED TRIGGER ACTIVE
                      </span>
                    )}
                    {autoRerouteState === 'RE_ROUTED' && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        RE-ROUTED VIA BYPASS
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {autoRerouteState === 'RECALCULATING' ? (
                      <span className="text-amber-200">
                        Automated re-routing trigger engaged: Diverting courier path away from {activeIncidentAlert.highway} via {activeIncidentAlert.recommendedBypass.name}...
                      </span>
                    ) : autoRerouteState === 'RE_ROUTED' ? (
                      <span className="text-emerald-200 font-medium">
                        Courier path automatically recalculated! Avoided {activeIncidentAlert.corridorName} bottleneck via <strong className="text-white">{activeIncidentAlert.recommendedBypass.name}</strong> · Saved <strong className="text-emerald-300 font-mono">~{activeIncidentAlert.recommendedBypass.timeSavedMin} mins</strong> · SAME DAY SLA preserved.
                      </span>
                    ) : (
                      <span className="text-slate-300">{activeIncidentAlert.cause}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {autoRerouteState !== 'RE_ROUTED' && autoRerouteState !== 'RECALCULATING' && (
                  <button
                    onClick={() => handleAutomatedReroute(activeIncidentAlert)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-xs shadow-md shadow-emerald-900/30 flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Recalculate Route</span>
                  </button>
                )}

                <button
                  onClick={() => setIsIncidentDrawerOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium"
                >
                  Inspect Radar
                </button>

                <button
                  onClick={() => {
                    setActiveIncidentAlert(null);
                    setAutoRerouteState('IDLE');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Dismiss Alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Active Re-Optimized Route Intelligence Banner */}
      {activeOptimizedRoute && (
        <div className="absolute top-14 left-3 z-10 flex flex-col gap-2 max-w-2xl animate-fade-in">
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-emerald-500/40 shadow-2xl text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span className="font-bold text-slate-100 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Route Re-optimized:
              </span>
              <span className="text-emerald-300 font-mono font-bold">
                {activeOptimizedRoute.courierName} ({activeOptimizedRoute.vehicleNumber})
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                -{activeOptimizedRoute.timeSavedMinutes}m Saved ({activeOptimizedRoute.timeSavedPercent}%)
              </span>
              <span className="text-slate-300 font-mono text-[11px]">
                · {activeOptimizedRoute.optimizedStops.length} Stops ({activeOptimizedRoute.optimizedTotalDistanceKm} km)
              </span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2 ml-auto">
              {/* Trigger Instant Recalculation */}
              <button
                onClick={handleReoptimizeRoute}
                disabled={isReoptimizing}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 rounded transition-colors"
                title="Re-calculate waypoints with fresh real-time traffic"
              >
                <RotateCw className={`w-3 h-3 ${isReoptimizing ? 'animate-spin' : ''}`} />
                <span>Re-calculate</span>
              </button>

              {/* Toggle Sequence Breakdown */}
              <button
                onClick={() => setShowReoptimizedStopsDetail(!showReoptimizedStopsDetail)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                <span>Stops Sequence</span>
                {showReoptimizedStopsDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <button
                onClick={() => setIsReoptimizeModalOpen(true)}
                className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                Configure
              </button>

              <button
                onClick={handleClearOptimizedRoute}
                className="px-2 py-1 text-[11px] font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Expanded Stops Sequence Breakdown Drawer */}
          {showReoptimizedStopsDetail && (
            <div className="bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-emerald-500/30 shadow-2xl text-xs space-y-2 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
                <span className="font-bold text-slate-200">Re-ordered Stop Sequence</span>
                <span>Priorities & Bottlenecks Evaluated</span>
              </div>

              {activeOptimizedRoute.priorityHighlights && activeOptimizedRoute.priorityHighlights.length > 0 && (
                <div className="p-2 rounded bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-indigo-300 fill-indigo-300 shrink-0" />
                  <span>{activeOptimizedRoute.priorityHighlights[0]}</span>
                </div>
              )}

              {activeOptimizedRoute.trafficBottlenecksAvoided && activeOptimizedRoute.trafficBottlenecksAvoided.length > 0 && (
                <div className="p-2 rounded bg-amber-950/40 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{activeOptimizedRoute.trafficBottlenecksAvoided[0]}</span>
                </div>
              )}

              <div className="space-y-1.5 font-mono text-[11px]">
                {activeOptimizedRoute.optimizedStops.map((stop, idx) => {
                  const stopNum = idx + 1;
                  const wasNum = stop.originalIndex;
                  const isReordered = stopNum !== wasNum;
                  const isSameDay = stop.serviceTier === 'SAME_DAY_PRIORITY';

                  return (
                    <div key={stop.parcelId || idx} className="flex items-center justify-between p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          isSameDay ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                          {stopNum}
                        </span>
                        <span className="font-sans font-semibold text-slate-200">{stop.recipientName}</span>
                        <span className="text-[10px] text-slate-400">({stop.trackingNumber})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isSameDay ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {stop.serviceTier.replace(/_/g, ' ')}
                        </span>
                        {isReordered && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            WAS #{wasNum}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Active Multi-Stop Plan Banner (When not in re-optimized view) */}
      {!activeOptimizedRoute && activeMultiStopPlan && (
        <div className="absolute top-14 left-3 z-10 flex flex-wrap items-center gap-3 bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-indigo-500/40 shadow-2xl animate-fade-in text-xs max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping inline-block" />
            <span className="font-semibold text-slate-100">
              Active Multi-Stop Itinerary:
            </span>
            <span className="text-indigo-300 font-mono font-bold">
              {activeMultiStopPlan.orderedWaypoints.length} Stops ({activeMultiStopPlan.totalDistanceKm} km)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
              {Math.floor(activeMultiStopPlan.totalDurationMinutes / 60)}h {activeMultiStopPlan.totalDurationMinutes % 60}m Total
            </span>
            {activeMultiStopPlan.timeSavedMinutes > 0 && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30">
                -{activeMultiStopPlan.timeSavedMinutes}m ({activeMultiStopPlan.timeSavedPercent}%)
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
              {activeMultiStopPlan.engine === 'GOOGLE_MAPS' ? 'Google Maps Routes' : 'OpenRouteService'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2">
            <button
              onClick={() => setIsMultiStopPlannerOpen(true)}
              className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              Modify Plan
            </button>
            <button
              onClick={handleClearMultiStopPlan}
              className="px-2 py-1 text-[11px] font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Floating Active Route Optimization AI Plan Banner */}
      {activeAiPlan && (
        <div className="absolute top-14 left-3 z-20 flex flex-col gap-2 max-w-xl animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-emerald-500/50 shadow-2xl text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100">
                    Route Optimization AI Plan:
                  </span>
                  <span className="text-emerald-300 font-mono font-bold">
                    {activeAiPlan.selectedVehicleCount} Vehicles · {activeAiPlan.totalParcelsCount} Stops
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                    {activeAiPlan.overallFuelEfficiencyScore}/100 ECO
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                  <span>{activeAiPlan.totalDistanceKm} km</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">-{activeAiPlan.totalFuelSavedLiters}L diesel saved</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">-{activeAiPlan.totalCo2SavedKg} kg CO₂</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsRouteOptAiOpen(true)}
                className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors shadow-sm"
              >
                Inspect Plan
              </button>
              <button
                onClick={handleClearAiPlan}
                className="px-2 py-1 text-[11px] font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 rounded transition-colors"
                title="Clear AI Overlay from map"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Content Mount */}
      {mapProvider === 'GOOGLE_MAPS' ? (
        <GoogleLogisticsMap
          hubs={hubs}
          vehicles={vehicles}
          parcels={parcels}
          activeRoutePlan={activeMultiStopPlan}
          onOpenMultiStopPlanner={() => setIsMultiStopPlannerOpen(true)}
          onOpenAutoOptimizer={() => setIsAutoOptimizeOpen(true)}
          onReoptimizeRoute={handleReoptimizeRoute}
          isReoptimizing={isReoptimizing}
          isPlaybackActive={isPlaybackActive}
          playbackRoute={activePlaybackRoute}
          playbackIndex={playbackIndex}
          playbackAutoFollow={playbackAutoFollow}
          onStartVehiclePlayback={handleStartVehiclePlayback}
          geofenceZones={geofenceZones}
          showGeofences={showGeofences}
          className="w-full h-full"
        />
      ) : (
        <div ref={mapContainerRef} className="w-full h-full" />
      )}

      {/* Historical Route Playback Interactive Console */}
      {isPlaybackActive && activePlaybackRoute && (
        <RoutePlaybackControl
          routes={playbackRoutes}
          activeRoute={activePlaybackRoute}
          currentIndex={playbackIndex}
          isPlaying={isPlaybackPlaying}
          playbackSpeed={playbackSpeed}
          autoFollow={playbackAutoFollow}
          isLooping={playbackLoop}
          onSelectRoute={(newRoute) => {
            setActivePlaybackRoute(newRoute);
            setPlaybackIndex(0);
            handleFitPlaybackRoute(newRoute);
          }}
          onTogglePlay={() => setIsPlaybackPlaying(!isPlaybackPlaying)}
          onSeek={(idx) => setPlaybackIndex(idx)}
          onReset={() => {
            setPlaybackIndex(0);
            setIsPlaybackPlaying(false);
          }}
          onSpeedChange={(spd) => setPlaybackSpeed(spd)}
          onToggleAutoFollow={() => setPlaybackAutoFollow(!playbackAutoFollow)}
          onToggleLoop={() => setPlaybackLoop(!playbackLoop)}
          onClose={() => {
            setIsPlaybackActive(false);
            setIsPlaybackPlaying(false);
          }}
        />
      )}

      {/* Floating OpenRouteService (ORS) Geospatial Operations Panel */}
      {showOrsToolbox && !isPlaybackActive && (
        <div className="absolute bottom-4 right-4 z-20 w-full max-w-xl max-h-[85%] overflow-y-auto shadow-2xl animate-fade-in">
          <OpenRouteServiceToolbox
            hubs={hubs}
            vehicles={vehicles}
            parcels={parcels}
            onApplyRouteToMap={handleApplyOrsRoute}
            onSelectHubIsochrone={handleApplyIsochrone}
            onClearOverlay={() => {
              handleClearOrsOverlay();
              handleClearOptimizedRoute();
              handleClearMultiStopPlan();
            }}
            onOpenAutoOptimizer={() => setIsAutoOptimizeOpen(true)}
            onOpenMultiStopPlanner={() => setIsMultiStopPlannerOpen(true)}
            isOverlayActive={!!activeOrsResult || !!activeOptimizedRoute || !!activeMultiStopPlan}
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

      {/* Auto-Optimize Courier Route Modal (OpenRouteService Traffic Engine) */}
      <AutoOptimizeRouteModal
        isOpen={isAutoOptimizeOpen}
        onClose={() => setIsAutoOptimizeOpen(false)}
        vehicles={vehicles}
        parcels={parcels}
        onApplyRouteToMap={handleApplyOptimizedRoute}
      />

      {/* Multi-Stop Planner Modal (Google Maps Platform Routes API & ORS) */}
      <MultiStopPlannerModal
        isOpen={isMultiStopPlannerOpen}
        onClose={() => setIsMultiStopPlannerOpen(false)}
        hubs={hubs}
        vehicles={vehicles}
        parcels={parcels}
        onApplyPlanToMap={handleApplyMultiStopPlan}
      />

      {/* Re-optimize Route Modal (Real-time traffic & Parcel Priority SLAs) */}
      <ReoptimizeRouteModal
        isOpen={isReoptimizeModalOpen}
        onClose={() => setIsReoptimizeModalOpen(false)}
        vehicles={vehicles}
        parcels={parcels}
        onApplyRouteToMap={handleApplyOptimizedRoute}
      />

      {/* Predictive Delay Radar Modal / Drawer (Detect Incidents & Auto-Trigger Recalculation) */}
      {isIncidentDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Predictive Delay Intelligence & Automated Re-routing Control</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Map Link: Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live telemetry bottleneck analysis. Severe incidents automatically trigger optimal courier path recalculation on the map.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsIncidentDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Close Radar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PredictiveDelayWidget
              onRerouteApplied={(corridorName, parcelId) => {
                handleReoptimizeRoute();
              }}
            />
          </div>
        </div>
      )}

      {/* Geofence Perimeter & Delivery Zone Intelligence Module */}
      <GeofenceModuleModal
        isOpen={isGeofenceModalOpen}
        onClose={() => setIsGeofenceModalOpen(false)}
        vehicles={vehicles}
        hubs={hubs}
        onFlyToZone={(zone) => {
          if (mapInstanceRef.current && zone.centerLat && zone.centerLng) {
            mapInstanceRef.current.setView([zone.centerLat, zone.centerLng], 12);
          }
        }}
      />

      {/* Route Optimization AI Multi-Vehicle Sequence Planner */}
      <RouteOptimizationAI
        isOpen={isRouteOptAiOpen}
        onClose={() => setIsRouteOptAiOpen(false)}
        vehicles={vehicles}
        parcels={parcels}
        hubs={hubs}
        onPreviewPlanOnMap={handleApplyAiOptimizationPlan}
      />
    </div>
  );
};
