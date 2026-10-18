// Source: Google Maps Platform Code Assist
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Compass, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Clock, 
  Truck, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  RotateCcw,
  Navigation,
  Share2,
  FileText
} from 'lucide-react';
import { BranchHub, Vehicle, Parcel } from '../../types';
import { storage } from '../../services/storage';
import { 
  googleMapsRoutesService, 
  PlannerWaypoint, 
  MultiStopPlanResult 
} from '../../services/googleMapsRoutesService';
import { openRouteService } from '../../services/openRouteService';
import { GoogleLogisticsMap } from './GoogleLogisticsMap';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  hubs: BranchHub[];
  vehicles: Vehicle[];
  parcels: Parcel[];
  onApplyPlanToMap?: (result: MultiStopPlanResult) => void;
}

export const MultiStopPlannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  hubs,
  vehicles,
  parcels,
  onApplyPlanToMap,
}) => {
  // Couriers list
  const employees = storage.getEmployees();
  const couriers = employees.filter((e) => e.role === 'COURIER');

  const [selectedCourierId, setSelectedCourierId] = useState<string>(
    couriers[0]?.id || 'user-courier'
  );

  const [routingEngine, setRoutingEngine] = useState<'GOOGLE_MAPS' | 'OPEN_ROUTE_SERVICE'>('GOOGLE_MAPS');
  const [travelMode, setTravelMode] = useState<'DRIVE' | 'TWO_WHEELER' | 'WALK'>('DRIVE');
  const [isRoundTrip, setIsRoundTrip] = useState(true);

  // Waypoints state
  const [origin, setOrigin] = useState<PlannerWaypoint | null>(null);
  const [destination, setDestination] = useState<PlannerWaypoint | null>(null);
  const [intermediateWaypoints, setIntermediateWaypoints] = useState<PlannerWaypoint[]>([]);

  // Calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [planResult, setPlanResult] = useState<MultiStopPlanResult | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize waypoints based on selected courier and their assigned parcels
  useEffect(() => {
    if (!isOpen) return;

    const courier = couriers.find((c) => c.id === selectedCourierId);
    const courierVehicle = vehicles.find((v) => v.driverId === selectedCourierId) || vehicles[0];

    // Starting Point: Vehicle's last location or default Hub
    const startPoint: PlannerWaypoint = {
      id: 'origin-start',
      name: courierVehicle
        ? `Courier Vehicle ${courierVehicle.vehicleNumber} (${courier?.name || 'Assigned'})`
        : hubs[0]?.name || 'Depot Hub',
      address: courierVehicle?.lastLocation
        ? 'Current Fleet GPS Telemetry Vector'
        : hubs[0] ? `${hubs[0].street}, ${hubs[0].city}` : '100 Terminal St',
      lat: courierVehicle?.lastLocation?.lat || hubs[0]?.lat || 37.7749,
      lng: courierVehicle?.lastLocation?.lng || hubs[0]?.lng || -122.4194,
      stopType: 'DEPOT',
    };
    setOrigin(startPoint);

    // Intermediate stops: Get assigned parcels for this courier
    const assignedParcels = parcels.filter(
      (p) =>
        (p.assignedCourierId === selectedCourierId ||
          p.assignedCourierId === 'user-courier') &&
        p.status !== 'DELIVERED'
    );

    const stops: PlannerWaypoint[] = assignedParcels.map((pcl, i) => ({
      id: pcl.id,
      parcelId: pcl.id,
      trackingNumber: pcl.trackingNumber,
      name: pcl.recipient.name,
      recipientName: pcl.recipient.name,
      company: pcl.recipient.company,
      address: `${pcl.recipient.street}, ${pcl.recipient.city}`,
      lat: pcl.recipient.lat || 37.7749,
      lng: pcl.recipient.lng || -122.4194,
      stopType: 'DELIVERY',
    }));

    // If courier has fewer than 3 parcels, supplement with interesting Bay Area delivery destinations
    if (stops.length < 3) {
      const extraStops: PlannerWaypoint[] = [
        {
          id: 'custom-wp-1',
          name: 'Salesforce Transit Center Parcel Locker',
          address: '425 Mission St, San Francisco, CA',
          lat: 37.7897,
          lng: -122.3972,
          stopType: 'DELIVERY',
        },
        {
          id: 'custom-wp-2',
          name: 'UCSF Medical Center Pharmacy Hub',
          address: '505 Parnassus Ave, San Francisco, CA',
          lat: 37.7631,
          lng: -122.4578,
          stopType: 'DELIVERY',
        },
        {
          id: 'custom-wp-3',
          name: 'Mission Bay BioTech Campus Hub',
          address: '1600 Owens St, San Francisco, CA',
          lat: 37.7675,
          lng: -122.3925,
          stopType: 'DELIVERY',
        },
      ];
      stops.push(...extraStops.slice(0, 3 - stops.length));
    }

    setIntermediateWaypoints(stops);

    // Destination: Return to starting hub or last stop
    const destPoint: PlannerWaypoint = {
      id: 'dest-end',
      name: `Return Depot: ${hubs[0]?.name || 'Apex Central Maritime Hub'}`,
      address: hubs[0] ? `${hubs[0].street}, ${hubs[0].city}` : '100 Terminal St, Oakland Port',
      lat: hubs[0]?.lat || 37.7981,
      lng: hubs[0]?.lng || -122.2798,
      stopType: 'DEPOT',
    };
    setDestination(destPoint);
    setPlanResult(null);
  }, [isOpen, selectedCourierId]);

  // Compute Multi-Stop Route using selected Engine
  const handleCalculateRoute = async () => {
    if (!origin || !destination) return;
    setIsCalculating(true);
    setErrorMsg(null);

    try {
      const endPoint = isRoundTrip ? origin : destination;

      if (routingEngine === 'GOOGLE_MAPS') {
        const result = await googleMapsRoutesService.computeOptimizedMultiStopRoute({
          origin,
          destination: endPoint,
          intermediates: intermediateWaypoints,
          travelMode,
          optimizeWaypointOrder: true,
        });
        setPlanResult(result);
      } else {
        // OpenRouteService matrix and multi-stop TSP solver
        const courier = couriers.find((c) => c.id === selectedCourierId);
        const courierVehicle = vehicles.find((v) => v.driverId === selectedCourierId) || vehicles[0];

        const waypointsList: any[] = intermediateWaypoints.map((w, i) => ({
          parcelId: w.parcelId || w.id,
          trackingNumber: w.trackingNumber || `WP-${i + 1}`,
          recipientName: w.name,
          company: w.company,
          address: w.address,
          city: 'San Francisco',
          lat: w.lat,
          lng: w.lng,
          serviceTier: 'SAME_DAY_PRIORITY',
          originalIndex: i + 1,
        }));

        const orsResult = await openRouteService.optimizeCourierRoute(
          { id: selectedCourierId, name: courier?.name || 'Courier' },
          {
            id: courierVehicle?.id || 'veh-1',
            vehicleNumber: courierVehicle?.vehicleNumber || 'EV-101',
            lastLocation: { lat: origin.lat, lng: origin.lng, name: origin.name },
          },
          waypointsList,
          travelMode === 'TWO_WHEELER' ? 'cycling-regular' : 'driving-car'
        );

        // Map ORS result to multiStopPlanResult schema
        const mappedLegs = orsResult.segments.map((seg) => ({
          legIndex: seg.segmentIndex,
          fromName: seg.fromName,
          toName: seg.toName,
          distanceKm: seg.distanceKm,
          durationMinutes: seg.durationMinutes,
          startLocation: { lat: seg.fromCoord[0], lng: seg.fromCoord[1] },
          endLocation: { lat: seg.toCoord[0], lng: seg.toCoord[1] },
        }));

        const mappedResult: MultiStopPlanResult = {
          engine: 'OPEN_ROUTE_SERVICE',
          totalDurationMinutes: orsResult.optimizedTotalDurationMinutes,
          totalDistanceKm: orsResult.optimizedTotalDistanceKm,
          initialDurationMinutes: orsResult.originalTotalDurationMinutes,
          timeSavedMinutes: orsResult.timeSavedMinutes,
          timeSavedPercent: orsResult.timeSavedPercent,
          legs: mappedLegs,
          orderedWaypoints: [
            origin,
            ...orsResult.optimizedStops.map((s) => ({
              id: s.parcelId,
              name: s.recipientName,
              address: s.address,
              lat: s.lat,
              lng: s.lng,
              trackingNumber: s.trackingNumber,
              stopType: 'DELIVERY' as const,
            })),
            endPoint,
          ],
          originalWaypoints: [origin, ...intermediateWaypoints, endPoint],
          routePath: orsResult.fullRouteCoordinates,
          optimizedIndices: orsResult.optimizedStops.map((s) => s.originalIndex - 1),
          isOptimized: true,
          computedAt: new Date().toISOString(),
        };

        setPlanResult(mappedResult);
      }
    } catch (err) {
      console.error('Failed optimizing multi-stop route:', err);
      setErrorMsg('Unable to load route data. Please check your network or API quota.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Add custom waypoint
  const handleAddCustomWaypoint = () => {
    const newId = `custom-stop-${Date.now()}`;
    const newWp: PlannerWaypoint = {
      id: newId,
      name: `Manual Delivery Stop #${intermediateWaypoints.length + 1}`,
      address: 'Market St & 4th St, San Francisco, CA',
      lat: +(37.7858 + (Math.random() - 0.5) * 0.04).toFixed(5),
      lng: +(-122.4065 + (Math.random() - 0.5) * 0.04).toFixed(5),
      stopType: 'CUSTOM',
    };
    setIntermediateWaypoints([...intermediateWaypoints, newWp]);
    setPlanResult(null);
  };

  // Remove waypoint
  const handleRemoveWaypoint = (id: string) => {
    setIntermediateWaypoints(intermediateWaypoints.filter((w) => w.id !== id));
    setPlanResult(null);
  };

  // Move waypoint up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...intermediateWaypoints];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setIntermediateWaypoints(next);
    setPlanResult(null);
  };

  // Move waypoint down
  const handleMoveDown = (index: number) => {
    if (index === intermediateWaypoints.length - 1) return;
    const next = [...intermediateWaypoints];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setIntermediateWaypoints(next);
    setPlanResult(null);
  };

  // Apply optimized route to courier itinerary in storage
  const handleApplyToCourier = () => {
    if (!planResult) return;

    // Collect parcel IDs from ordered waypoints
    const orderedParcelIds = planResult.orderedWaypoints
      .map((w) => w.parcelId || w.id)
      .filter((id) => parcels.some((p) => p.id === id));

    if (orderedParcelIds.length > 0) {
      storage.reorderCourierStops(selectedCourierId, orderedParcelIds, {
        timeSavedMinutes: planResult.timeSavedMinutes,
        trafficNotes: `Multi-Stop Planner via ${planResult.engine === 'GOOGLE_MAPS' ? 'Google Maps Routes API v2' : 'OpenRouteService'}`,
      });
    }

    if (onApplyPlanToMap) {
      onApplyPlanToMap(planResult);
    }

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 1800);
  };

  // Export CSV itinerary
  const handleExportCsv = () => {
    if (!planResult) return;

    const headers = [
      'Stop #',
      'Location Name',
      'Address',
      'Stop Type',
      'Tracking Number',
      'Leg Distance (km)',
      'Estimated Transit (mins)',
      'Engine'
    ].join(',') + '\n';

    const rows = planResult.orderedWaypoints.map((wp, idx) => {
      const leg = planResult.legs[idx];
      return [
        idx + 1,
        `"${wp.name.replace(/"/g, '""')}"`,
        `"${wp.address.replace(/"/g, '""')}"`,
        wp.stopType || 'DELIVERY',
        wp.trackingNumber || 'N/A',
        leg?.distanceKm || 0,
        leg?.durationMinutes || 0,
        planResult.engine
      ].join(',');
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-stop-manifest-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-lg">
              <Compass className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Multi-Stop Route Planner & Waypoint Optimizer
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {routingEngine === 'GOOGLE_MAPS' ? 'Google Maps Routes API v2' : 'OpenRouteService Matrix'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Define complex multi-stop delivery routes, reorder waypoints for minimal duration, and sync to driver manifest.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content: Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: Configuration & Waypoints List (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto space-y-5 bg-slate-900/60 max-h-[70vh] lg:max-h-none">
            {/* Courier Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Assigned Courier & Fleet Asset
              </label>
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email}) · {c.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Engine & Travel Mode Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Routing Engine
                </label>
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                  <button
                    onClick={() => {
                      setRoutingEngine('GOOGLE_MAPS');
                      setPlanResult(null);
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                      routingEngine === 'GOOGLE_MAPS'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Google Maps
                  </button>
                  <button
                    onClick={() => {
                      setRoutingEngine('OPEN_ROUTE_SERVICE');
                      setPlanResult(null);
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                      routingEngine === 'OPEN_ROUTE_SERVICE'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    OpenRoute
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Travel Mode
                </label>
                <select
                  value={travelMode}
                  onChange={(e) => {
                    setTravelMode(e.target.value as any);
                    setPlanResult(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="DRIVE">Delivery Van (Drive)</option>
                  <option value="TWO_WHEELER">Cargo E-Bike / Moto</option>
                  <option value="WALK">Walking Courier</option>
                </select>
              </div>
            </div>

            {/* Round Trip Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-xs text-slate-300 font-medium">
                Round Trip Return to Start Depot
              </span>
              <button
                onClick={() => {
                  setIsRoundTrip(!isRoundTrip);
                  setPlanResult(null);
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isRoundTrip ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isRoundTrip ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Stops List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Waypoints ({intermediateWaypoints.length} Intermediate Stops)
                </span>
                <button
                  onClick={handleAddCustomWaypoint}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stop</span>
                </button>
              </div>

              {/* Origin item */}
              {origin && (
                <div className="p-2.5 mb-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    S
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-300 truncate">
                        {origin.name}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                        START
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {origin.address}
                    </p>
                  </div>
                </div>
              )}

              {/* Draggable/Reorderable Waypoints */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {intermediateWaypoints.map((wp, idx) => (
                  <div
                    key={wp.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center gap-2 group transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {wp.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {wp.address}
                      </div>
                    </div>

                    {/* Up / Down Controls */}
                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === intermediateWaypoints.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveWaypoint(wp.id)}
                        className="p-1 text-rose-400 hover:text-rose-200 rounded hover:bg-rose-950/40 ml-1"
                        title="Remove Stop"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* End Point */}
              {destination && (
                <div className="p-2.5 mt-2 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    E
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-rose-300 truncate">
                        {isRoundTrip ? `Round Trip Loop: Return to Start` : destination.name}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-400">
                        END
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {isRoundTrip ? origin?.address : destination.address}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculateRoute}
              disabled={isCalculating || intermediateWaypoints.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 shadow-xl disabled:opacity-50 transition-all cursor-pointer"
            >
              {isCalculating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Computing Optimal Route Sequence...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Optimize Multi-Stop Route ({routingEngine === 'GOOGLE_MAPS' ? 'Google Maps' : 'OpenRoute'})</span>
                </>
              )}
            </button>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Right Column: Visualization & Optimized Trip Metrics (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-4 max-h-[70vh] lg:max-h-none">
            {planResult ? (
              <div className="space-y-4">
                {/* Result KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Optimized Duration
                    </span>
                    <div className="text-base font-extrabold text-indigo-400 font-mono">
                      {Math.floor(planResult.totalDurationMinutes / 60)}h{' '}
                      {planResult.totalDurationMinutes % 60}m
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Total trip time
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Time Saved
                    </span>
                    <div className="text-base font-extrabold text-emerald-400 font-mono">
                      -{planResult.timeSavedMinutes} mins
                    </div>
                    <span className="text-[10px] text-emerald-500 font-semibold">
                      +{planResult.timeSavedPercent}% faster
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Total Distance
                    </span>
                    <div className="text-base font-extrabold text-slate-100 font-mono">
                      {planResult.totalDistanceKm} km
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {(planResult.totalDistanceKm * 0.621371).toFixed(1)} miles
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Routing Engine
                    </span>
                    <div className="text-xs font-bold text-slate-200 mt-1 truncate">
                      {planResult.engine === 'GOOGLE_MAPS' ? 'Google Routes v2' : 'OpenRouteService'}
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono">
                      TSP Optimized
                    </span>
                  </div>
                </div>

                {/* Map Preview */}
                <div className="h-56 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                  <GoogleLogisticsMap
                    hubs={hubs}
                    vehicles={vehicles}
                    parcels={parcels}
                    activeRoutePlan={planResult}
                    className="h-full"
                  />
                </div>

                {/* Leg-by-Leg Itinerary Breakdown Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Leg-by-Leg Turn & Distance Schedule ({planResult.legs.length} Legs)
                  </h4>
                  <div className="max-h-44 overflow-y-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">Leg</th>
                          <th className="p-2">Segment Waypoints</th>
                          <th className="p-2 text-right">Distance</th>
                          <th className="p-2 text-right">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono text-[11px]">
                        {planResult.legs.map((leg) => (
                          <tr key={leg.legIndex} className="hover:bg-slate-800/40">
                            <td className="p-2 font-bold text-indigo-400">
                              #{leg.legIndex}
                            </td>
                            <td className="p-2 font-sans">
                              <span className="text-slate-200">{leg.fromName}</span>
                              <span className="text-slate-500 mx-1.5">→</span>
                              <span className="text-indigo-300 font-semibold">{leg.toName}</span>
                            </td>
                            <td className="p-2 text-right text-slate-300">
                              {leg.distanceKm} km
                            </td>
                            <td className="p-2 text-right text-emerald-400 font-bold">
                              {leg.durationMinutes} min
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
                <div className="p-4 rounded-full bg-indigo-900/20 text-indigo-400 border border-indigo-500/20 mb-3">
                  <Navigation className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">
                  Ready to Plan Multi-Stop Route
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Adjust waypoints, choose travel mode and engine, then click{' '}
                  <strong className="text-indigo-400">Optimize Multi-Stop Route</strong> to calculate the fastest delivery sequence.
                </p>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {planResult && (
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Itinerary CSV</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyToCourier}
                  disabled={!planResult}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all ${
                    appliedSuccess
                      ? 'bg-emerald-600'
                      : planResult
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-md cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {appliedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Manifest Synced!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Apply Sequence to Courier Itinerary</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
