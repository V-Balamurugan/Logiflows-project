import { Parcel, Vehicle } from '../types';

export interface HistoricalGPSPoint {
  lat: number;
  lng: number;
  timestamp: string; // ISO or formatted time
  speedKmh: number;
  heading: number; // 0-360 degrees
  batteryPct: number;
  altitudeMeters: number;
  stepDescription: string;
  milestone?: {
    id: string;
    title: string;
    type: 'DEPARTURE' | 'TRANSIT' | 'CONGESTION' | 'APPROACH' | 'DELIVERED';
    notes: string;
    time: string;
  };
}

export interface CompletedDeliveryRoute {
  id: string;
  parcelId: string;
  trackingNumber: string;
  originName: string;
  originCity: string;
  originCoords: [number, number]; // [lat, lng]
  destName: string;
  destAddress: string;
  destCity: string;
  destCoords: [number, number]; // [lat, lng]
  courierName: string;
  courierId: string;
  vehicleId?: string;
  vehicleNumber: string;
  vehicleType: string;
  deliveryDate: string;
  startTime: string;
  completedTime: string;
  durationMinutes: number;
  totalDistanceKm: number;
  averageSpeedKmh: number;
  co2EmissionsKg: number;
  energyConsumedKwhOrLiters: string;
  recipientName: string;
  podConfirmationCode: string;
  points: HistoricalGPSPoint[];
}

// Compute compass bearing from point 1 to point 2
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);

  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Helper to interpolate dense GPS path between key coordinates
export function interpolateGPSArc(
  keypoints: { lat: number; lng: number; speed: number; label: string; milestone?: HistoricalGPSPoint['milestone'] }[],
  startTimeDate: Date,
  totalDurationMinutes: number,
  initialBattery = 96
): HistoricalGPSPoint[] {
  const result: HistoricalGPSPoint[] = [];
  const totalSegments = keypoints.length - 1;
  if (totalSegments <= 0) return result;

  const totalPoints = 90; // Smooth 90-step telemetry resolution
  const stepsPerSegment = Math.max(2, Math.floor(totalPoints / totalSegments));

  let pointIndex = 0;
  const totalSteps = stepsPerSegment * totalSegments;

  for (let s = 0; s < totalSegments; s++) {
    const p1 = keypoints[s];
    const p2 = keypoints[s + 1];

    for (let k = 0; k < stepsPerSegment; k++) {
      const t = k / stepsPerSegment;
      // Linear interpolation with slight smooth curve
      const lat = p1.lat + (p2.lat - p1.lat) * t;
      const lng = p1.lng + (p2.lng - p1.lng) * t;

      // Speed with minor natural jitter
      const speed = Math.round(p1.speed + (p2.speed - p1.speed) * t + (Math.sin(pointIndex * 0.5) * 3));
      const heading = Math.round(calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng));
      
      const elapsedMinutes = (pointIndex / totalSteps) * totalDurationMinutes;
      const currentTime = new Date(startTimeDate.getTime() + elapsedMinutes * 60 * 1000);
      
      const battery = Math.max(15, +(initialBattery - (pointIndex / totalSteps) * 9.5).toFixed(1));
      const altitude = Math.round(15 + Math.sin(pointIndex * 0.2) * 12 + (s === 1 ? 40 : 0));

      const isFirstOfSegment = k === 0;
      const milestone = isFirstOfSegment && p1.milestone ? p1.milestone : undefined;

      result.push({
        lat: +lat.toFixed(6),
        lng: +lng.toFixed(6),
        timestamp: currentTime.toISOString(),
        speedKmh: Math.max(0, speed),
        heading,
        batteryPct: battery,
        altitudeMeters: altitude,
        stepDescription: p1.label,
        milestone,
      });

      pointIndex++;
    }
  }

  // Final destination point
  const lastKey = keypoints[keypoints.length - 1];
  const finalTime = new Date(startTimeDate.getTime() + totalDurationMinutes * 60 * 1000);
  result.push({
    lat: lastKey.lat,
    lng: lastKey.lng,
    timestamp: finalTime.toISOString(),
    speedKmh: 0,
    heading: result[result.length - 1]?.heading || 0,
    batteryPct: Math.max(15, +(initialBattery - 9.5).toFixed(1)),
    altitudeMeters: 12,
    stepDescription: lastKey.label,
    milestone: lastKey.milestone,
  });

  return result;
}

// Route 1: Oakland Maritime Hub to Embarcadero Pier 38 (San Francisco)
// Actual parcel: LF-2026-89412-APX
const ROUTE_1_KEYPOINTS = [
  { 
    lat: 37.7981, 
    lng: -122.2789, 
    speed: 25, 
    label: 'Apex Central Maritime Sorting Hub (Oakland)',
    milestone: {
      id: 'm1',
      title: 'Hub Dispatch Check-out',
      type: 'DEPARTURE' as const,
      notes: 'Out-for-delivery scan verified by Marcus Vance. Electric cargo van APX-EV-101 departed origin bay.',
      time: '08:32 AM',
    }
  },
  { lat: 37.8055, lng: -122.2902, speed: 45, label: '7th St & Maritime Blvd approach' },
  { lat: 37.8182, lng: -122.3060, speed: 65, label: 'Merging onto I-80 Westbound ramp' },
  { 
    lat: 37.8252, 
    lng: -122.3210, 
    speed: 75, 
    label: 'I-80 West approach to Bay Bridge Toll Plaza',
    milestone: {
      id: 'm2',
      title: 'Toll Plaza Fastrak Clearance',
      type: 'TRANSIT' as const,
      notes: 'Automated fleet transponder validated. Cruising at 75 km/h with low crosswinds.',
      time: '08:41 AM',
    }
  },
  { lat: 37.8205, lng: -122.3485, speed: 70, label: 'San Francisco-Oakland Bay Bridge (Eastern Span)' },
  { 
    lat: 37.8188, 
    lng: -122.3650, 
    speed: 68, 
    label: 'Yerba Buena Island Tunnel transit',
    milestone: {
      id: 'm3',
      title: 'Yerba Buena Mid-Span Transit',
      type: 'TRANSIT' as const,
      notes: 'Tunnel passage completed. Entering western suspension span into San Francisco skyline.',
      time: '08:47 AM',
    }
  },
  { lat: 37.8010, lng: -122.3810, speed: 58, label: 'Bay Bridge Western Suspension Span' },
  { 
    lat: 37.7895, 
    lng: -122.3912, 
    speed: 38, 
    label: 'Fremont St exit onto surface corridor',
    milestone: {
      id: 'm4',
      title: 'San Francisco Surface Off-Ramp',
      type: 'CONGESTION' as const,
      notes: 'Moderate downtown morning traffic. Regenerative braking active (+1.2% battery recharge).',
      time: '08:53 AM',
    }
  },
  { lat: 37.7842, lng: -122.3905, speed: 30, label: 'Howard St & Embarcadero Southbound' },
  { lat: 37.7828, lng: -122.3888, speed: 18, label: 'Approaching Pier 38 maritime commercial gate' },
  { 
    lat: 37.7820, 
    lng: -122.3879, 
    speed: 0, 
    label: '100 Pier 38, The Embarcadero (Destination)',
    milestone: {
      id: 'm5',
      title: 'Direct Recipient Delivery & Signature',
      type: 'DELIVERED' as const,
      notes: 'Parcel handed directly to Sarah Jenkins. Digital biometric signature & photo POD securely logged.',
      time: '08:59 AM',
    }
  },
];

// Route 2: Silicon Valley Tech DC (San Jose) to Mountain View Tech Campus
const ROUTE_2_KEYPOINTS = [
  {
    lat: 37.3861,
    lng: -121.8963,
    speed: 30,
    label: 'Silicon Valley Tech DC (North San Jose)',
    milestone: {
      id: 'm2-1',
      title: 'Cleanroom Sensor Dispatch',
      type: 'DEPARTURE' as const,
      notes: 'Shock & tilt sensor calibrated. High-value optics loaded into secured locker.',
      time: '01:15 PM',
    }
  },
  { lat: 37.3910, lng: -121.9120, speed: 55, label: 'Montague Expressway to US-101 North' },
  { lat: 37.4012, lng: -121.9480, speed: 82, label: 'US-101 Northbound past Great America' },
  { 
    lat: 37.4095, 
    lng: -121.9880, 
    speed: 85, 
    label: 'US-101 North Express Lane (Sunnyvale)',
    milestone: {
      id: 'm2-2',
      title: 'Express Lane Freeway Cruising',
      type: 'TRANSIT' as const,
      notes: 'Cruising at 85 km/h. AI telemetry reporting green corridor with zero congestion.',
      time: '01:26 PM',
    }
  },
  { lat: 37.4180, lng: -122.0450, speed: 70, label: 'US-101 North approaching Moffett Field' },
  { 
    lat: 37.4250, 
    lng: -122.0720, 
    speed: 40, 
    label: 'Shoreline Blvd exit towards Amphitheatre Pkwy',
    milestone: {
      id: 'm2-3',
      title: 'Campus Perimeter Security Arrival',
      type: 'APPROACH' as const,
      notes: 'Visitor pass scanned at Amphitheatre security guardhouse.',
      time: '01:38 PM',
    }
  },
  { lat: 37.4235, lng: -122.0810, speed: 22, label: 'Amphitheatre Pkwy inner road' },
  { 
    lat: 37.4220, 
    lng: -122.0841, 
    speed: 0, 
    label: '1600 Amphitheatre Pkwy, Bldg 42 (Delivered)',
    milestone: {
      id: 'm2-4',
      title: 'Autonomous Lab Reception Delivery',
      type: 'DELIVERED' as const,
      notes: 'Proof of delivery signed by Intake Lead. Temperature & vibration audit verified normal.',
      time: '01:44 PM',
    }
  },
];

// Route 3: SFO Airport Cargo Gateway to Pacific Heights Medical Center
const ROUTE_3_KEYPOINTS = [
  {
    lat: 37.6213,
    lng: -122.3790,
    speed: 28,
    label: 'SFO International Cargo Gateway',
    milestone: {
      id: 'm3-1',
      title: 'Customs Cleared Dispatch',
      type: 'DEPARTURE' as const,
      notes: 'Pharma specimen transferred from air freight container to climate-controlled vehicle.',
      time: '11:05 AM',
    }
  },
  { lat: 37.6620, lng: -122.4040, speed: 78, label: 'US-101 North through South San Francisco' },
  { lat: 37.7120, lng: -122.4080, speed: 75, label: 'US-101 North passing Brisbane / San Bruno Mountain' },
  { 
    lat: 37.7550, 
    lng: -122.4060, 
    speed: 60, 
    label: 'US-101 North near Potrero Hill interchange',
    milestone: {
      id: 'm3-2',
      title: 'Urban Core Transition',
      type: 'TRANSIT' as const,
      notes: 'Navigating northbound merge towards central SF.',
      time: '11:21 AM',
    }
  },
  { lat: 37.7710, lng: -122.4230, speed: 35, label: 'Octavia Blvd surface arterial transition' },
  { lat: 37.7830, lng: -122.4270, speed: 25, label: 'Gough St Northbound' },
  { 
    lat: 37.7915, 
    lng: -122.4342, 
    speed: 0, 
    label: 'Pacific Heights Medical Center (Delivered)',
    milestone: {
      id: 'm3-3',
      title: 'Cold Chain Delivery Verified',
      type: 'DELIVERED' as const,
      notes: 'Hospital lab technician verified dry-ice temperature logger (-21.8°C). Signed.',
      time: '11:34 AM',
    }
  },
];

const INITIAL_COMPLETED_ROUTES: CompletedDeliveryRoute[] = [
  {
    id: 'route-hist-89412',
    parcelId: 'pcl-89412',
    trackingNumber: 'LF-2026-89412-APX',
    originName: 'Apex Central Maritime Sorting Hub',
    originCity: 'Oakland, CA',
    originCoords: [37.7981, -122.2789],
    destName: 'Sarah Jenkins (Apex Marine Engineering)',
    destAddress: '100 Pier 38, The Embarcadero',
    destCity: 'San Francisco, CA',
    destCoords: [37.7820, -122.3879],
    courierName: 'Marcus Vance',
    courierId: 'user-courier',
    vehicleId: 'veh-ev-101',
    vehicleNumber: 'APX-EV-101',
    vehicleType: 'ELECTRIC_VAN',
    deliveryDate: 'Today',
    startTime: '08:32 AM',
    completedTime: '08:59 AM',
    durationMinutes: 27,
    totalDistanceKm: 18.2,
    averageSpeedKmh: 40.4,
    co2EmissionsKg: 0.76, // Electric vehicle low footprint
    energyConsumedKwhOrLiters: '4.8 kWh',
    recipientName: 'Sarah Jenkins',
    podConfirmationCode: 'POD-89412-CONF-559',
    points: interpolateGPSArc(
      ROUTE_1_KEYPOINTS,
      new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      27,
      94
    ),
  },
  {
    id: 'route-hist-89418',
    parcelId: 'pcl-89418',
    trackingNumber: 'LF-2026-89418-APX',
    originName: 'Silicon Valley Tech DC',
    originCity: 'San Jose, CA',
    originCoords: [37.3861, -121.8963],
    destName: 'Mountain View Autonomous AI Lab',
    destAddress: '1600 Amphitheatre Pkwy, Bldg 42',
    destCity: 'Mountain View, CA',
    destCoords: [37.4220, -122.0841],
    courierName: 'Carlos Ramirez',
    courierId: 'emp-carlos',
    vehicleId: 'veh-ev-102',
    vehicleNumber: 'APX-SP-102',
    vehicleType: 'SPRINTER_VAN',
    deliveryDate: 'Today',
    startTime: '01:15 PM',
    completedTime: '01:44 PM',
    durationMinutes: 29,
    totalDistanceKm: 24.5,
    averageSpeedKmh: 50.7,
    co2EmissionsKg: 1.02,
    energyConsumedKwhOrLiters: '6.4 kWh',
    recipientName: 'Dr. Evelyn Ward',
    podConfirmationCode: 'POD-89418-CONF-782',
    points: interpolateGPSArc(
      ROUTE_2_KEYPOINTS,
      new Date(Date.now() - 1000 * 60 * 60 * 5),
      29,
      98
    ),
  },
  {
    id: 'route-hist-89410',
    parcelId: 'pcl-89410',
    trackingNumber: 'LF-2026-89410-APX',
    originName: 'SFO International Cargo Gateway',
    originCity: 'San Francisco Airport',
    originCoords: [37.6213, -122.3790],
    destName: 'Pacific Heights Medical Center',
    destAddress: '2333 Buchanan St',
    destCity: 'San Francisco, CA',
    destCoords: [37.7915, -122.4342],
    courierName: 'Elena Rostova',
    courierId: 'emp-elena',
    vehicleId: 'veh-hyb-204',
    vehicleNumber: 'APX-HYB-204',
    vehicleType: 'HYBRID_VAN',
    deliveryDate: 'Yesterday',
    startTime: '11:05 AM',
    completedTime: '11:34 AM',
    durationMinutes: 29,
    totalDistanceKm: 21.8,
    averageSpeedKmh: 45.1,
    co2EmissionsKg: 2.45,
    energyConsumedKwhOrLiters: '1.9 L Gas + 2.1 kWh',
    recipientName: 'Nurse Supervisor Thorne',
    podConfirmationCode: 'POD-89410-CONF-331',
    points: interpolateGPSArc(
      ROUTE_3_KEYPOINTS,
      new Date(Date.now() - 1000 * 60 * 60 * 24),
      29,
      88
    ),
  },
];

const STORAGE_PLAYBACK_ROUTES_KEY = 'logiflows_historical_delivery_routes';

export class RoutePlaybackService {
  public getAllCompletedRoutes(): CompletedDeliveryRoute[] {
    try {
      const raw = localStorage.getItem(STORAGE_PLAYBACK_ROUTES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading historical playback routes from storage', e);
    }
    // Default fallback
    this.saveRoutes(INITIAL_COMPLETED_ROUTES);
    return INITIAL_COMPLETED_ROUTES;
  }

  public getRouteByParcelId(parcelId: string): CompletedDeliveryRoute | null {
    const all = this.getAllCompletedRoutes();
    return all.find((r) => r.parcelId === parcelId) || null;
  }

  public getRouteById(routeId: string): CompletedDeliveryRoute | null {
    const all = this.getAllCompletedRoutes();
    return all.find((r) => r.id === routeId) || null;
  }

  public saveRoutes(routes: CompletedDeliveryRoute[]): void {
    try {
      localStorage.setItem(STORAGE_PLAYBACK_ROUTES_KEY, JSON.stringify(routes));
    } catch (e) {
      console.error('Failed to save historical playback routes', e);
    }
  }

  // Create a realistic playback trail for any custom completed parcel
  public createHistoricalRouteForParcel(parcel: Parcel): CompletedDeliveryRoute {
    const existing = this.getRouteByParcelId(parcel.id);
    if (existing) return existing;

    const startLat = parcel.sender.lat || 37.7981;
    const startLng = parcel.sender.lng || -122.2789;
    const endLat = parcel.recipient.lat || parcel.proofOfDelivery?.podGeoLat || 37.7820;
    const endLng = parcel.recipient.lng || parcel.proofOfDelivery?.podGeoLng || -122.3879;

    // Midpoint with curve
    const midLat = (startLat + endLat) / 2 + 0.015;
    const midLng = (startLng + endLng) / 2 - 0.012;

    const keypoints = [
      {
        lat: startLat,
        lng: startLng,
        speed: 25,
        label: `${parcel.sender.name || 'Origin'} (${parcel.sender.city})`,
        milestone: {
          id: `m-start-${parcel.id}`,
          title: 'Origin Departure Scanned',
          type: 'DEPARTURE' as const,
          notes: 'Manifest verified and package loaded into vehicle delivery queue.',
          time: '09:00 AM',
        }
      },
      {
        lat: midLat,
        lng: midLng,
        speed: 68,
        label: 'En Route Expressway Transit corridor',
        milestone: {
          id: 'm-mid-' + parcel.id,
          title: 'Expressway Transit Flow',
          type: 'TRANSIT' as const,
          notes: 'Moving within normal speed parameters along primary transit corridor.',
          time: '09:18 AM',
        }
      },
      {
        lat: endLat,
        lng: endLng,
        speed: 0,
        label: `${parcel.recipient.street}, ${parcel.recipient.city} (Destination)`,
        milestone: {
          id: `m-end-${parcel.id}`,
          title: 'Delivery Hand-off & Signature Complete',
          type: 'DELIVERED' as const,
          notes: `Delivered to ${parcel.recipient.name}. Proof of delivery confirmed.`,
          time: '09:35 AM',
        }
      }
    ];

    const durationMin = 35;
    const totalDistKm = +(Math.sqrt(Math.pow((endLat - startLat) * 111, 2) + Math.pow((endLng - startLng) * 88, 2)) * 1.3).toFixed(1);

    const newRoute: CompletedDeliveryRoute = {
      id: `route-gen-${parcel.id}`,
      parcelId: parcel.id,
      trackingNumber: parcel.trackingNumber,
      originName: parcel.sender.name || 'Origin Hub',
      originCity: parcel.sender.city || 'San Francisco, CA',
      originCoords: [startLat, startLng],
      destName: parcel.recipient.name || 'Recipient Destination',
      destAddress: parcel.recipient.street || 'Recipient Address',
      destCity: parcel.recipient.city || 'San Francisco, CA',
      destCoords: [endLat, endLng],
      courierName: parcel.proofOfDelivery?.recipientName ? 'Assigned Courier' : 'Marcus Vance',
      courierId: parcel.assignedCourierId || 'user-courier',
      vehicleNumber: 'APX-EV-101',
      vehicleType: 'ELECTRIC_VAN',
      deliveryDate: 'Recent',
      startTime: '09:00 AM',
      completedTime: '09:35 AM',
      durationMinutes: durationMin,
      totalDistanceKm: totalDistKm,
      averageSpeedKmh: +((totalDistKm / (durationMin / 60))).toFixed(1),
      co2EmissionsKg: +(totalDistKm * 0.042).toFixed(2),
      energyConsumedKwhOrLiters: '5.2 kWh',
      recipientName: parcel.recipient.name,
      podConfirmationCode: parcel.proofOfDelivery?.confirmationCode || `POD-${parcel.trackingNumber.slice(-5)}`,
      points: interpolateGPSArc(keypoints, new Date(Date.now() - 1000 * 60 * 60 * 3), durationMin, 92),
    };

    const all = this.getAllCompletedRoutes();
    all.push(newRoute);
    this.saveRoutes(all);
    return newRoute;
  }

  public getRouteByVehicleId(vehicleId: string): CompletedDeliveryRoute | null {
    const all = this.getAllCompletedRoutes();
    return all.find((r) => r.vehicleId === vehicleId) || null;
  }

  public getRouteByVehicleNumber(vehicleNumber: string): CompletedDeliveryRoute | null {
    const all = this.getAllCompletedRoutes();
    return all.find((r) => r.vehicleNumber === vehicleNumber) || null;
  }

  public createHistoricalRouteForVehicle(vehicle: Vehicle): CompletedDeliveryRoute {
    const existing = this.getRouteByVehicleId(vehicle.id) || this.getRouteByVehicleNumber(vehicle.vehicleNumber);
    if (existing) return existing;

    const currentLat = vehicle.lastLocation?.lat || 37.7749;
    const currentLng = vehicle.lastLocation?.lng || -122.4194;
    const originLat = 37.7981; // Oakland Maritime Sorting Centroid
    const originLng = -122.2789;

    const midLat = (originLat + currentLat) / 2 + 0.012;
    const midLng = (originLng + currentLng) / 2 - 0.01;

    const keypoints = [
      {
        lat: originLat,
        lng: originLng,
        speed: 25,
        label: `${vehicle.vehicleNumber} Base Sorting Hub Departure`,
        milestone: {
          id: `m-veh-start-${vehicle.id}`,
          title: 'Shift Dispatch & Odometer Ignition',
          type: 'DEPARTURE' as const,
          notes: `${vehicle.vehicleNumber} (${vehicle.type.replace(/_/g, ' ')}) departed origin bay with full pre-flight sensor check.`,
          time: '08:15 AM',
        }
      },
      {
        lat: midLat,
        lng: midLng,
        speed: 64,
        label: 'Commercial Arterial Transit Corridor',
        milestone: {
          id: `m-veh-mid-${vehicle.id}`,
          title: 'Arterial Corridor Telemetry Stream',
          type: 'TRANSIT' as const,
          notes: 'Cruising along arterial corridor; GPS telemetry broadcasting heading, speed and battery levels.',
          time: '08:42 AM',
        }
      },
      {
        lat: currentLat,
        lng: currentLng,
        speed: vehicle.lastLocation?.speedKmh || 35,
        label: `Current Real-time Position (${vehicle.vehicleNumber})`,
        milestone: {
          id: `m-veh-end-${vehicle.id}`,
          title: 'Active Delivery Corridor Position',
          type: 'APPROACH' as const,
          notes: `Telemetry verified. Driver: ${vehicle.driverName || 'Courier'}. Battery/Fuel: ${vehicle.batteryOrFuelPct}%.`,
          time: '09:05 AM',
        }
      }
    ];

    const durationMin = 32;
    const totalDistKm = +(Math.sqrt(Math.pow((currentLat - originLat) * 111, 2) + Math.pow((currentLng - originLng) * 88, 2)) * 1.35).toFixed(1);

    const newRoute: CompletedDeliveryRoute = {
      id: `veh-route-${vehicle.id}`,
      parcelId: `veh-task-${vehicle.id}`,
      trackingNumber: `${vehicle.vehicleNumber} (Shift Telemetry Track)`,
      originName: 'Apex Central Maritime Sorting Hub',
      originCity: 'Oakland, CA',
      originCoords: [originLat, originLng],
      destName: `${vehicle.driverName || 'Courier'} (Active Route Run)`,
      destAddress: 'Metropolitan Delivery Zone',
      destCity: 'San Francisco, CA',
      destCoords: [currentLat, currentLng],
      courierName: vehicle.driverName || 'Assigned Courier',
      courierId: vehicle.driverId || 'user-courier',
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.type,
      deliveryDate: 'Today',
      startTime: '08:15 AM',
      completedTime: '08:47 AM',
      durationMinutes: durationMin,
      totalDistanceKm: totalDistKm,
      averageSpeedKmh: +((totalDistKm / (durationMin / 60))).toFixed(1),
      co2EmissionsKg: +(totalDistKm * 0.038).toFixed(2),
      energyConsumedKwhOrLiters: vehicle.fuelType === 'ELECTRIC' ? '5.4 kWh' : '2.1 L',
      recipientName: vehicle.driverName || 'Field Courier',
      podConfirmationCode: `FLEET-${vehicle.vehicleNumber}`,
      points: interpolateGPSArc(keypoints, new Date(Date.now() - 1000 * 60 * 50), durationMin, vehicle.batteryOrFuelPct || 92),
    };

    const all = this.getAllCompletedRoutes();
    all.push(newRoute);
    this.saveRoutes(all);
    return newRoute;
  }
}

export const routePlaybackService = new RoutePlaybackService();
