import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  Navigation, 
  MapPin, 
  Truck, 
  X, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Zap, 
  Compass, 
  Crosshair, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  Layers
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Parcel, Vehicle, Employee, BranchHub } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // If provided, forces a specific courier (used in CourierDashboard); otherwise, tenant admin can switch
  courierId?: string;
  className?: string;
}

// Distance helper using Haversine formula
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const LiveFleetMapOverlay: React.FC<Props> = ({
  isOpen,
  onClose,
  courierId: initialCourierId,
  className = '',
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const currentUser = storage.getCurrentUser();
  const parcels = storage.getParcels(currentTenantId);
  const vehicles = storage.getVehicles(currentTenantId);
  const hubs = storage.getHubs(currentTenantId);
  const couriers = storage.getEmployees(currentTenantId).filter((e) => e.role === 'COURIER');

  // Identify all active couriers (either passed in, on-shift, or with assigned parcels/vehicles)
  const availableCouriers = useMemo(() => {
    if (initialCourierId) {
      const match = couriers.find((c) => c.id === initialCourierId);
      if (match) return [match];
      // If courier is the logged-in user:
      if (currentUser.id === initialCourierId) {
        return [{
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone || '+1 (555) 891-2309',
          role: 'COURIER' as const,
          tenantId: currentUser.tenantId,
          status: 'ON_SHIFT' as const,
          activeDeliveriesCount: 4,
          assignedVehicleId: 'veh-ev-101',
          rating: 4.94,
          totalCompletedDeliveries: 1420,
        }];
      }
    }

    if (couriers.length > 0) return couriers;

    // Fallback default courier
    return [{
      id: 'user-courier',
      name: 'Marcus Vance',
      email: 'marcus.vance@apexlogistics.com',
      phone: '+1 (555) 891-2309',
      role: 'COURIER' as const,
      tenantId: currentTenantId,
      status: 'ON_SHIFT' as const,
      activeDeliveriesCount: 3,
      assignedVehicleId: 'veh-ev-101',
      rating: 4.94,
      totalCompletedDeliveries: 1420,
    }];
  }, [couriers, initialCourierId, currentUser, currentTenantId]);

  // Selected courier state (defaults to passed courier or first available active courier)
  const [selectedCourierId, setSelectedCourierId] = useState<string>(
    initialCourierId || (availableCouriers[0]?.id ?? 'user-courier')
  );

  useEffect(() => {
    if (initialCourierId) {
      setSelectedCourierId(initialCourierId);
    } else if (!selectedCourierId && availableCouriers.length > 0) {
      setSelectedCourierId(availableCouriers[0].id);
    }
  }, [initialCourierId, availableCouriers]);

  // Expand / compact view mode
  const [isExpanded, setIsExpanded] = useState(false);

  // Active courier object
  const activeCourier = useMemo(() => {
    return availableCouriers.find((c) => c.id === selectedCourierId) || availableCouriers[0];
  }, [availableCouriers, selectedCourierId]);

  // Find assigned vehicle for active courier
  const activeVehicle = useMemo(() => {
    if (!activeCourier) return vehicles[0];
    return (
      vehicles.find((v) => v.driverId === activeCourier.id || v.id === activeCourier.assignedVehicleId) ||
      vehicles.find((v) => v.status === 'ON_ROUTE') ||
      vehicles[0]
    );
  }, [vehicles, activeCourier]);

  // Find next delivery stop for active courier
  const courierParcels = useMemo(() => {
    if (!activeCourier) return [];
    return parcels.filter(
      (p) =>
        (p.assignedCourierId === activeCourier.id ||
         (activeCourier.id === 'user-courier' && p.status === 'OUT_FOR_DELIVERY')) &&
        p.status !== 'DELIVERED'
    ).sort((a, b) => (a.routeStopOrder ?? 99) - (b.routeStopOrder ?? 99));
  }, [parcels, activeCourier]);

  const nextDelivery = courierParcels[0] || null;

  // Primary Hub as fallback destination if all parcels delivered
  const primaryHub = hubs[0] || {
    name: 'Central Depot Base',
    street: '450 Airport Blvd',
    city: 'South San Francisco',
    lat: 37.6547,
    lng: -122.4077,
  };

  // Determine Active Courier location
  const courierPos = useMemo<{ lat: number; lng: number }>(() => {
    if (activeVehicle?.lastLocation?.lat && activeVehicle?.lastLocation?.lng) {
      return {
        lat: activeVehicle.lastLocation.lat,
        lng: activeVehicle.lastLocation.lng,
      };
    }
    if (nextDelivery?.currentGeo?.lat && nextDelivery?.currentGeo?.lng) {
      return {
        lat: nextDelivery.currentGeo.lat,
        lng: nextDelivery.currentGeo.lng,
      };
    }
    // Default urban San Francisco coordinates
    return { lat: 37.7749, lng: -122.4194 };
  }, [activeVehicle, nextDelivery]);

  // Determine Next Destination location
  const destPos = useMemo<{ lat: number; lng: number; label: string; address: string }>(() => {
    if (nextDelivery && nextDelivery.recipient) {
      const lat = nextDelivery.recipient.lat ?? 37.7634;
      const lng = nextDelivery.recipient.lng ?? -122.4580;
      return {
        lat,
        lng,
        label: `${nextDelivery.recipient.name} ${nextDelivery.recipient.company ? `(${nextDelivery.recipient.company})` : ''}`,
        address: `${nextDelivery.recipient.street}, ${nextDelivery.recipient.city}`,
      };
    }
    return {
      lat: primaryHub.lat,
      lng: primaryHub.lng,
      label: primaryHub.name,
      address: `${primaryHub.street}, ${primaryHub.city}`,
    };
  }, [nextDelivery, primaryHub]);

  // Calculate distance & ETA relative metrics
  const directDistanceKm = useMemo(() => {
    return calculateDistanceKm(courierPos.lat, courierPos.lng, destPos.lat, destPos.lng);
  }, [courierPos, destPos]);

  const estimatedDrivingKm = Math.round(directDistanceKm * 1.32 * 10) / 10;
  const speedKmh = activeVehicle?.lastLocation?.speedKmh || 42;
  const baselineDriveMinutes = Math.max(3, Math.round((estimatedDrivingKm / speedKmh) * 60));
  const delayCushion = nextDelivery?.delayRisk?.predictedDelayMinutes || 0;
  const totalEtaMinutes = baselineDriveMinutes + delayCushion;

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Initialize and update Leaflet map with ONLY the active courier and next destination
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Destroy existing instance if container re-rendered
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [courierPos.lat, courierPos.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      // Smooth Voyager Carto dark/light hybrid tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean previous markers & route
    if (courierMarkerRef.current) {
      courierMarkerRef.current.remove();
      courierMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    // 1. ACTIVE COURIER MARKER (Pulsing live radar indicator with courier badge)
    const courierHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; items-center; justify-content: center;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.35);
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          z-index: 10;
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background: #0f172a;
          border: 3px solid #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.6);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
        </div>
        <div style="
          position: absolute;
          bottom: -18px;
          white-space: nowrap;
          background: #0f172a;
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #e2e8f0;
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        ">
          ${activeCourier?.name?.split(' ')[0] || 'Courier'} (${speedKmh} km/h)
        </div>
      </div>
    `;

    const courierIcon = L.divIcon({
      html: courierHtml,
      className: 'courier-live-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const courierMarker = L.marker([courierPos.lat, courierPos.lng], { icon: courierIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: inherit; color: #0f172a; padding: 2px;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; display: flex; align-items: center; gap: 4px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
            ${activeCourier?.name || 'Active Courier'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            Vehicle: <strong>${activeVehicle?.vehicleNumber || 'Van'}</strong>
          </div>
          <div style="font-size: 11px; color: #475569;">
            Live Speed: <strong>${speedKmh} km/h</strong> · Battery: <strong>${activeVehicle?.batteryOrFuelPct || 82}%</strong>
          </div>
        </div>
      `);
    courierMarkerRef.current = courierMarker;

    // 2. NEXT DELIVERY DESTINATION MARKER (Vibrant destination flag / target pin)
    const destHtml = `
      <div style="position: relative; width: 42px; height: 42px; display: flex; items-center; justify-content: center;">
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          background: #0f172a;
          border: 3px solid #f43f5e;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(244, 63, 94, 0.6);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
        <div style="
          position: absolute;
          bottom: -18px;
          white-space: nowrap;
          background: #0f172a;
          border: 1px solid rgba(244, 63, 94, 0.4);
          color: #fecdd3;
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        ">
          ${nextDelivery ? 'Next Stop #1' : 'Depot Base'}
        </div>
      </div>
    `;

    const destIcon = L.divIcon({
      html: destHtml,
      className: 'dest-destination-marker',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

    const destMarker = L.marker([destPos.lat, destPos.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: inherit; color: #0f172a; padding: 2px;">
          <div style="font-weight: 800; font-size: 13px; color: #e11d48;">
            ${nextDelivery ? 'Next Delivery Destination' : 'Operational Base Depot'}
          </div>
          <div style="font-weight: 600; font-size: 12px; margin-top: 3px;">
            ${destPos.label}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            ${destPos.address}
          </div>
          ${nextDelivery ? `
            <div style="font-size: 10px; font-family: monospace; color: #4f46e5; margin-top: 4px; font-weight: bold;">
              Tracking: ${nextDelivery.trackingNumber}
            </div>
          ` : ''}
        </div>
      `);
    destMarkerRef.current = destMarker;

    // 3. ROUTE LINE CONNECTING COURIER AND DESTINATION
    // Background glow line
    const bgLine = L.polyline(
      [
        [courierPos.lat, courierPos.lng],
        [destPos.lat, destPos.lng],
      ],
      {
        color: '#4338ca',
        weight: 6,
        opacity: 0.5,
      }
    ).addTo(map);

    // Foreground dashed vector line
    const fgLine = L.polyline(
      [
        [courierPos.lat, courierPos.lng],
        [destPos.lat, destPos.lng],
      ],
      {
        color: '#6366f1',
        weight: 3.5,
        dashArray: '8, 8',
        opacity: 0.95,
      }
    ).addTo(map);

    routePolylineRef.current = fgLine;

    // Clean up background line on re-render
    const lineCleanup = () => {
      bgLine.remove();
      fgLine.remove();
    };

    // Auto-fit bounds strictly around courier and next destination with padding
    const bounds = L.latLngBounds(
      [courierPos.lat, courierPos.lng],
      [destPos.lat, destPos.lng]
    );
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 15,
      animate: true,
    });

    // Invalidate size once DOM stabilizes
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 180);

    return () => {
      clearTimeout(timer);
      lineCleanup();
    };
  }, [isOpen, courierPos, destPos, activeCourier, activeVehicle, nextDelivery, speedKmh]);

  // Handle ESC key to close overlay
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Recenter actions
  const handleFitRoute = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds(
      [courierPos.lat, courierPos.lng],
      [destPos.lat, destPos.lng]
    );
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  };

  const handleCenterCourier = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([courierPos.lat, courierPos.lng], 15, { animate: true });
    courierMarkerRef.current?.openPopup();
  };

  const handleCenterDestination = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([destPos.lat, destPos.lng], 15, { animate: true });
    destMarkerRef.current?.openPopup();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out font-sans ${
        isExpanded
          ? 'inset-3 sm:inset-6 md:inset-12 flex items-center justify-center p-0'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[440px] max-w-[calc(100vw-2rem)]'
      } ${className}`}
    >
      {/* Expanded backdrop scrim */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Main Tactical Card Container */}
      <div
        className={`w-full bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl shadow-slate-950/90 flex flex-col overflow-hidden text-slate-100 ${
          isExpanded ? 'h-full max-h-[90vh]' : 'max-h-[85vh]'
        }`}
      >
        {/* Overlay Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  LIVE FLEET MAP
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  POINT-TO-POINT HUD
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                {activeCourier?.name || 'Active Courier'} · Relative to Next Drop
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Courier selector if opened from Tenant Admin and multiple couriers exist */}
            {!initialCourierId && availableCouriers.length > 1 && (
              <div className="relative">
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 pr-6 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                  title="Switch Active Courier"
                >
                  {availableCouriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title={isExpanded ? 'Dock to bottom-right' : 'Expand Tactical View'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Close Live Fleet Map"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tactical Sub-Bar: Courier & Vehicle Snapshot */}
        <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300 gap-2 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-mono font-semibold text-slate-200 truncate">
              {activeVehicle?.vehicleNumber || 'APX-EV-101'}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 truncate">
              {activeVehicle?.type?.replace(/_/g, ' ') || 'Electric Van'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <Zap className="w-3 h-3 text-emerald-400" />
              {activeVehicle?.batteryOrFuelPct ?? 82}%
            </span>
            <span className="text-slate-400 font-bold">
              {speedKmh} km/h
            </span>
          </div>
        </div>

        {/* Dedicated Map Container (Showing ONLY active courier & next destination) */}
        <div className="relative flex-1 min-h-[240px] sm:min-h-[280px]">
          <div
            ref={mapContainerRef}
            className={`w-full h-full ${isExpanded ? 'min-h-[400px]' : 'min-h-[260px]'}`}
            style={{ background: '#0b1120' }}
          />

          {/* Map Floating Control Pills */}
          <div className="absolute bottom-2.5 left-2.5 z-[400] flex items-center gap-1.5">
            <button
              onClick={handleFitRoute}
              className="px-2.5 py-1 text-[10px] font-bold bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 transition-colors"
            >
              <Crosshair className="w-3 h-3 text-indigo-400" />
              Fit Route
            </button>
            <button
              onClick={handleCenterCourier}
              className="px-2 py-1 text-[10px] font-semibold bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 transition-colors"
            >
              <Navigation className="w-2.5 h-2.5 text-emerald-400" />
              Courier
            </button>
            <button
              onClick={handleCenterDestination}
              className="px-2 py-1 text-[10px] font-semibold bg-slate-900/90 hover:bg-slate-800 text-rose-300 border border-rose-500/30 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 transition-colors"
            >
              <MapPin className="w-2.5 h-2.5 text-rose-400" />
              Drop Stop
            </button>
          </div>

          {/* Map Overlay Badge: Telemetry Status */}
          <div className="absolute top-2.5 left-2.5 z-[400] px-2 py-1 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-md text-[10px] font-mono text-slate-300 shadow flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-indigo-400 animate-spin-slow" />
            <span>GPS Lock · Vector direct</span>
          </div>
        </div>

        {/* Live Relative Distance & ETA Metrics HUD */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 space-y-2.5 shrink-0">
          {/* Quick Stats Ribbon */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Distance</span>
              <span className="text-base font-bold font-mono text-indigo-400">
                {directDistanceKm} km
              </span>
              <span className="text-[9px] text-slate-500 block">Direct vector</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Relative ETA</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ~{totalEtaMinutes} min
              </span>
              <span className="text-[9px] text-slate-500 block">
                {delayCushion > 0 ? `+${delayCushion}m buffer` : 'On target'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Service Tier</span>
              <span className="text-xs font-bold font-mono text-amber-300 truncate block mt-0.5">
                {nextDelivery?.serviceTier?.replace(/_/g, ' ') || 'STANDARD'}
              </span>
              <span className="text-[9px] text-slate-500 block truncate">
                {nextDelivery ? `${nextDelivery.weightKg} kg` : 'Return leg'}
              </span>
            </div>
          </div>

          {/* Next Delivery Stop Specifics Card */}
          <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-400" />
                Target Stop: {nextDelivery ? 'Delivery Consignment' : 'Operational Base'}
              </span>
              {nextDelivery && (
                <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                  {nextDelivery.trackingNumber}
                </span>
              )}
            </div>

            <div className="font-semibold text-slate-100 text-xs truncate">
              {destPos.label}
            </div>

            <div className="text-[11px] text-slate-400 truncate">
              {destPos.address}
            </div>

            {nextDelivery?.specialInstructions && (
              <div className="text-[10px] text-amber-300/90 italic truncate pt-0.5">
                Note: {nextDelivery.specialInstructions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
