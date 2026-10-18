// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useMap 
} from '@vis.gl/react-google-maps';
import { 
  Layers, 
  Maximize2, 
  Navigation, 
  Truck, 
  Warehouse, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Clock, 
  MapPin,
  Compass,
  RotateCw,
  Play
} from 'lucide-react';
import { BranchHub, Vehicle, Parcel, GeofenceZone } from '../../types';
import { MultiStopPlanResult } from '../../services/googleMapsRoutesService';
import { googleMapsRoutesService } from '../../services/googleMapsRoutesService';
import { CompletedDeliveryRoute } from '../../services/routePlaybackService';

declare const google: any;

interface Props {
  hubs: BranchHub[];
  vehicles: Vehicle[];
  parcels: Parcel[];
  activeRoutePlan?: MultiStopPlanResult | null;
  onOpenMultiStopPlanner?: () => void;
  onOpenAutoOptimizer?: () => void;
  onReoptimizeRoute?: () => void;
  isReoptimizing?: boolean;
  className?: string;
  isPlaybackActive?: boolean;
  playbackRoute?: CompletedDeliveryRoute | null;
  playbackIndex?: number;
  playbackAutoFollow?: boolean;
  onStartVehiclePlayback?: (vehicle: Vehicle) => void;
  geofenceZones?: GeofenceZone[];
  showGeofences?: boolean;
}

// Sub-component to manage Route Polyline & camera bounds with useMap()
const GoogleRoutePolyline: React.FC<{ path: [number, number][]; legs?: any[] }> = ({ path }) => {
  const map = useMap();
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!path || path.length < 2) return;

    const latLngPath = path.map(([lat, lng]) => ({ lat, lng }));

    // Primary route polyline
    const poly = new google.maps.Polyline({
      path: latLngPath,
      geodesic: true,
      strokeColor: '#4f46e5',
      strokeOpacity: 0.95,
      strokeWeight: 6,
      map: map,
    });
    polylineRef.current = poly;

    // Fit map bounds to encompass the entire route
    const bounds = new google.maps.LatLngBounds();
    latLngPath.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, path]);

  return null;
};

// Sub-component to manage Historical Route Playback Polyline on Google Maps
const GooglePlaybackPolyline: React.FC<{
  fullPath: [number, number][];
  traversedPath: [number, number][];
  autoFollow?: boolean;
  currentPoint?: { lat: number; lng: number };
}> = ({ fullPath, traversedPath, autoFollow, currentPoint }) => {
  const map = useMap();
  const fullPolyRef = useRef<any>(null);
  const traversedPolyRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    if (fullPolyRef.current) {
      fullPolyRef.current.setMap(null);
      fullPolyRef.current = null;
    }
    if (traversedPolyRef.current) {
      traversedPolyRef.current.setMap(null);
      traversedPolyRef.current = null;
    }

    if (!fullPath || fullPath.length < 2) return;

    // Full historical corridor
    fullPolyRef.current = new google.maps.Polyline({
      path: fullPath.map(([lat, lng]) => ({ lat, lng })),
      geodesic: true,
      strokeColor: '#6366f1',
      strokeOpacity: 0.35,
      strokeWeight: 4,
      map: map,
    });

    // Traversed animated section
    if (traversedPath.length >= 2) {
      traversedPolyRef.current = new google.maps.Polyline({
        path: traversedPath.map(([lat, lng]) => ({ lat, lng })),
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.95,
        strokeWeight: 6,
        map: map,
      });
    }

    // Fit bounds on route mount
    if (fullPath.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      fullPath.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      map.fitBounds(bounds, { top: 70, bottom: 90, left: 70, right: 70 });
    }

    return () => {
      if (fullPolyRef.current) fullPolyRef.current.setMap(null);
      if (traversedPolyRef.current) traversedPolyRef.current.setMap(null);
    };
  }, [map, fullPath, traversedPath]);

  // Pan to vehicle if autoFollow enabled
  useEffect(() => {
    if (!map || !autoFollow || !currentPoint) return;
    map.panTo(currentPoint);
  }, [map, autoFollow, currentPoint]);

  return null;
};

// Sub-component to manage Geofence Perimeter Circles on Google Maps
const GoogleGeofenceCircles: React.FC<{
  zones?: GeofenceZone[];
  show?: boolean;
}> = ({ zones, show = true }) => {
  const map = useMap();
  const circlesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear previous circles
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    if (!show || !zones || zones.length === 0) return;

    zones.filter((z) => z.enabled).forEach((zone) => {
      if (!zone.centerLat || !zone.centerLng) return;

      const circle = new google.maps.Circle({
        strokeColor: zone.colorHex || '#10b981',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: zone.colorHex || '#10b981',
        fillOpacity: 0.12,
        map: map,
        center: { lat: zone.centerLat, lng: zone.centerLng },
        radius: zone.radiusKm * 1000,
      });

      circlesRef.current.push(circle);
    });

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
    };
  }, [map, zones, show]);

  return null;
};

export const GoogleLogisticsMap: React.FC<Props> = ({
  hubs,
  vehicles,
  parcels,
  activeRoutePlan,
  onOpenMultiStopPlanner,
  onOpenAutoOptimizer,
  onReoptimizeRoute,
  isReoptimizing = false,
  className = 'h-[520px]',
  isPlaybackActive = false,
  playbackRoute = null,
  playbackIndex = 0,
  playbackAutoFollow = true,
  onStartVehiclePlayback,
  geofenceZones = [],
  showGeofences = true,
}) => {
  const [showHubs, setShowHubs] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showParcels, setShowParcels] = useState(true);
  const [selectedInfo, setSelectedInfo] = useState<{
    type: 'hub' | 'vehicle' | 'stop';
    title: string;
    details: string;
    pos: { lat: number; lng: number };
    vehicle?: Vehicle;
  } | null>(null);

  const apiKey = googleMapsRoutesService.getApiKey();

  const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // SF Bay Area

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl ${className}`}>
      {/* Top Map Layer Control Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-xl">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-300">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Google Maps Platform</span>
        </div>

        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

        {/* Toggle Hubs */}
        <button
          onClick={() => setShowHubs(!showHubs)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            showHubs ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Regional Hubs"
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
          title="Toggle Fleet Vehicles"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Fleet ({vehicles.length})</span>
        </button>

        {/* Toggle Delivery Stops */}
        <button
          onClick={() => setShowParcels(!showParcels)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            showParcels ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle Delivery Stops"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Stops ({parcels.length})</span>
        </button>
      </div>

      {/* Action Buttons: Re-optimize Route, Multi-Stop Planner & Auto-Optimize */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {onReoptimizeRoute && (
          <button
            onClick={onReoptimizeRoute}
            disabled={isReoptimizing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-lg shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border border-emerald-400/40 disabled:opacity-60"
            title="Re-optimize Route based on live traffic and parcel priority levels"
          >
            <RotateCw className={`w-3.5 h-3.5 text-emerald-200 ${isReoptimizing ? 'animate-spin' : ''}`} />
            <span>{isReoptimizing ? 'Recalculating...' : 'Re-optimize Route'}</span>
          </button>
        )}

        {onOpenMultiStopPlanner && (
          <button
            onClick={onOpenMultiStopPlanner}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border border-indigo-400/40"
            title="Open Multi-Stop Route Planner"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-200" />
            <span>Multi-Stop Planner</span>
          </button>
        )}

        {onOpenAutoOptimizer && (
          <button
            onClick={onOpenAutoOptimizer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-lg shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border border-amber-300/30"
            title="Auto-Optimize Courier Stops"
          >
            <Zap className="w-3.5 h-3.5 text-amber-100 fill-amber-100" />
            <span>Auto-Optimize</span>
          </button>
        )}
      </div>

      {/* Floating Active Plan Details Banner */}
      {activeRoutePlan && (
        <div className="absolute top-14 left-3 z-10 flex flex-wrap items-center gap-3 bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-indigo-500/40 shadow-2xl animate-fade-in text-xs max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="font-semibold text-slate-100">
              Active Multi-Stop Route:
            </span>
            <span className="text-indigo-300 font-mono font-bold">
              {activeRoutePlan.orderedWaypoints.length} Stops ({activeRoutePlan.totalDistanceKm} km)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
              {Math.floor(activeRoutePlan.totalDurationMinutes / 60)}h {activeRoutePlan.totalDurationMinutes % 60}m Total
            </span>
            {activeRoutePlan.timeSavedMinutes > 0 && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30">
                -{activeRoutePlan.timeSavedMinutes}m Saved ({activeRoutePlan.timeSavedPercent}%)
              </span>
            )}
          </div>
          {onOpenMultiStopPlanner && (
            <button
              onClick={onOpenMultiStopPlanner}
              className="ml-auto px-2 py-1 text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-900/50 hover:bg-indigo-800 rounded transition-colors"
            >
              Modify Plan
            </button>
          )}
        </div>
      )}

      {/* Map Canvas powered by @vis.gl/react-google-maps */}
      <APIProvider apiKey={apiKey} libraries={['routes', 'marker']}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={defaultCenter}
          defaultZoom={11}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={false}
          fullscreenControl={false}
        >
          {/* Predefined Geofence Delivery Zones & Hub Perimeters */}
          <GoogleGeofenceCircles zones={geofenceZones} show={showGeofences} />

          {/* Active Route Polyline */}
          {activeRoutePlan?.routePath && !isPlaybackActive && (
            <GoogleRoutePolyline path={activeRoutePlan.routePath} />
          )}

          {/* Historical Route Playback Polyline & Animated Marker */}
          {isPlaybackActive && playbackRoute && (
            <>
              <GooglePlaybackPolyline
                fullPath={playbackRoute.points.map((p) => [p.lat, p.lng])}
                traversedPath={playbackRoute.points.slice(0, playbackIndex + 1).map((p) => [p.lat, p.lng])}
                autoFollow={playbackAutoFollow}
                currentPoint={
                  playbackRoute.points[playbackIndex]
                    ? { lat: playbackRoute.points[playbackIndex].lat, lng: playbackRoute.points[playbackIndex].lng }
                    : undefined
                }
              />

              {/* Origin Marker */}
              <AdvancedMarker
                position={{ lat: playbackRoute.originCoords[0], lng: playbackRoute.originCoords[1] }}
                onClick={() =>
                  setSelectedInfo({
                    type: 'hub',
                    title: `Origin: ${playbackRoute.originName}`,
                    details: `Departed at ${playbackRoute.startTime} · ${playbackRoute.originCity}`,
                    pos: { lat: playbackRoute.originCoords[0], lng: playbackRoute.originCoords[1] },
                  })
                }
              >
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xl border border-white">
                  🏁 Origin
                </div>
              </AdvancedMarker>

              {/* Destination Marker */}
              <AdvancedMarker
                position={{ lat: playbackRoute.destCoords[0], lng: playbackRoute.destCoords[1] }}
                onClick={() =>
                  setSelectedInfo({
                    type: 'stop',
                    title: `Delivered to: ${playbackRoute.recipientName}`,
                    details: `${playbackRoute.destAddress}, ${playbackRoute.destCity} · Signed at ${playbackRoute.completedTime}`,
                    pos: { lat: playbackRoute.destCoords[0], lng: playbackRoute.destCoords[1] },
                  })
                }
              >
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xl border border-white">
                  ✅ Delivered
                </div>
              </AdvancedMarker>

              {/* Animating Historical Vehicle Marker */}
              {playbackRoute.points[playbackIndex] && (
                <AdvancedMarker
                  position={{
                    lat: playbackRoute.points[playbackIndex].lat,
                    lng: playbackRoute.points[playbackIndex].lng,
                  }}
                  onClick={() =>
                    setSelectedInfo({
                      type: 'vehicle',
                      title: `${playbackRoute.vehicleNumber} (${playbackRoute.courierName})`,
                      details: `Speed: ${playbackRoute.points[playbackIndex].speedKmh} km/h · Heading: ${playbackRoute.points[playbackIndex].heading}° · Battery: ${playbackRoute.points[playbackIndex].batteryPct}%`,
                      pos: {
                        lat: playbackRoute.points[playbackIndex].lat,
                        lng: playbackRoute.points[playbackIndex].lng,
                      },
                    })
                  }
                >
                  <div className="relative flex items-center justify-center cursor-pointer">
                    <div className="absolute -inset-2 rounded-full bg-emerald-400/40 animate-ping" />
                    <div
                      className="w-9 h-9 rounded-full bg-slate-950 border-2 border-emerald-400 shadow-2xl flex items-center justify-center text-emerald-400 transition-transform duration-100"
                      style={{
                        transform: `rotate(${playbackRoute.points[playbackIndex].heading}deg)`,
                      }}
                    >
                      <Navigation className="w-5 h-5 fill-emerald-400" />
                    </div>
                    <div className="absolute -bottom-4 bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      {playbackRoute.points[playbackIndex].speedKmh} km/h
                    </div>
                  </div>
                </AdvancedMarker>
              )}
            </>
          )}

          {/* Hubs Advanced Markers */}
          {showHubs &&
            hubs.map((hub) => (
              <AdvancedMarker
                key={hub.id}
                position={{ lat: hub.lat, lng: hub.lng }}
                onClick={() =>
                  setSelectedInfo({
                    type: 'hub',
                    title: hub.name,
                    details: `${hub.code} · ${hub.street}, ${hub.city} · Capacity: ${hub.capacityDaily}/day`,
                    pos: { lat: hub.lat, lng: hub.lng },
                  })
                }
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white shadow-lg border-2 border-white hover:scale-110 transition-transform cursor-pointer">
                  <Warehouse className="w-4 h-4" />
                </div>
              </AdvancedMarker>
            ))}

          {/* Vehicles Advanced Markers */}
          {showVehicles &&
            vehicles.map((veh) => {
              if (!veh.lastLocation) return null;
              return (
                <AdvancedMarker
                  key={veh.id}
                  position={{ lat: veh.lastLocation.lat, lng: veh.lastLocation.lng }}
                  onClick={() =>
                    setSelectedInfo({
                      type: 'vehicle',
                      title: `Vehicle ${veh.vehicleNumber}`,
                      details: `Type: ${veh.type.replace(/_/g, ' ')} · Driver: ${veh.driverName || 'Assigned'} · Speed: ${veh.lastLocation?.speedKmh || 40} km/h · Battery: ${veh.batteryOrFuelPct}%`,
                      pos: { lat: veh.lastLocation!.lat, lng: veh.lastLocation!.lng },
                      vehicle: veh,
                    })
                  }
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white shadow-lg border-2 border-white hover:scale-110 transition-transform cursor-pointer">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                </AdvancedMarker>
              );
            })}

          {/* Waypoints or Parcels Advanced Markers */}
          {activeRoutePlan
            ? activeRoutePlan.orderedWaypoints.map((wp, idx) => {
                const isStart = idx === 0;
                const isEnd = idx === activeRoutePlan.orderedWaypoints.length - 1;
                return (
                  <AdvancedMarker
                    key={`plan-${wp.id}-${idx}`}
                    position={{ lat: wp.lat, lng: wp.lng }}
                    onClick={() =>
                      setSelectedInfo({
                        type: 'stop',
                        title: `Stop #${idx + 1}: ${wp.name}`,
                        details: `${wp.address} ${wp.trackingNumber ? `· Tracking: ${wp.trackingNumber}` : ''}`,
                        pos: { lat: wp.lat, lng: wp.lng },
                      })
                    }
                  >
                    <div
                      className={`flex items-center justify-center rounded-full text-white font-black font-mono shadow-xl border-2 border-white hover:scale-110 transition-transform cursor-pointer ${
                        isStart
                          ? 'w-8 h-8 bg-emerald-600 text-xs'
                          : isEnd
                          ? 'w-8 h-8 bg-rose-600 text-xs'
                          : 'w-7 h-7 bg-indigo-600 text-xs'
                      }`}
                    >
                      {isStart ? 'S' : isEnd ? 'E' : idx}
                    </div>
                  </AdvancedMarker>
                );
              })
            : showParcels &&
              parcels.slice(0, 15).map((pcl) => {
                if (typeof pcl.recipient.lat !== 'number' || typeof pcl.recipient.lng !== 'number') return null;
                return (
                  <AdvancedMarker
                    key={pcl.id}
                    position={{ lat: pcl.recipient.lat, lng: pcl.recipient.lng }}
                    onClick={() =>
                      setSelectedInfo({
                        type: 'stop',
                        title: pcl.trackingNumber,
                        details: `${pcl.recipient.name} · ${pcl.recipient.street}, ${pcl.recipient.city} (${pcl.status})`,
                        pos: { lat: pcl.recipient.lat!, lng: pcl.recipient.lng! },
                      })
                    }
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white shadow-md border-2 border-white hover:scale-110 transition-transform cursor-pointer">
                      <MapPin className="w-3 h-3" />
                    </div>
                  </AdvancedMarker>
                );
              })}

          {/* Selected Marker InfoWindow */}
          {selectedInfo && (
            <InfoWindow
              position={selectedInfo.pos}
              onCloseClick={() => setSelectedInfo(null)}
            >
              <div className="p-1 text-slate-900 max-w-xs space-y-1.5">
                <h4 className="font-bold text-xs">{selectedInfo.title}</h4>
                <p className="text-[11px] text-slate-600">{selectedInfo.details}</p>
                {selectedInfo.vehicle && (
                  <button
                    onClick={() => {
                      onStartVehiclePlayback?.(selectedInfo.vehicle!);
                      setSelectedInfo(null);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer mt-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Replay Vehicle Historical Route</span>
                  </button>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
          <span>Regional Hubs</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ml-2" />
          <span>Fleet Fleet Vehicles</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
          <span>Optimized Stops</span>
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block ml-2" />
          <span>Routes API v2</span>
        </div>
      </div>
    </div>
  );
};
