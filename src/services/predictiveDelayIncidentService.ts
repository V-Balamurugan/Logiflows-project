export type IncidentType = 'MAJOR_TRAFFIC_INCIDENT' | 'SEVERE_WEATHER_DELAY';

export interface PredictiveDelayIncident {
  id: string;
  type: IncidentType;
  corridorId: string;
  corridorName: string;
  highway: string;
  severity: 'HIGH' | 'CRITICAL';
  currentDelayMin: number;
  cause: string;
  timestamp: string;
  weatherCondition?: 'CLEAR' | 'RAIN' | 'STORM' | 'GALE_STORM' | 'FLASH_FLOOD';
  trafficCondition?: 'NORMAL' | 'PEAK_SPIKE' | 'GRIDLOCK' | 'ACCIDENT_BLOCK';
  recommendedBypass: {
    name: string;
    description: string;
    distanceDeltaKm: number;
    timeSavedMin: number;
    batteryDeltaPct: number;
    avoidHighway: string;
    targetPeninsulaArterial?: string;
  };
  triggerSource: 'PredictiveDelayWidget' | 'DopplerWeatherRadar' | 'CaltransI80IncidentSensor';
  impactedVehicleId?: string;
  courierName?: string;
}

export const PREDICTIVE_DELAY_INCIDENT_EVENT = 'logiflows:predictive-delay-incident';

// Dispatch helper
export function broadcastPredictiveDelayIncident(incident: PredictiveDelayIncident): void {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent<PredictiveDelayIncident>(PREDICTIVE_DELAY_INCIDENT_EVENT, {
    detail: incident,
  });
  window.dispatchEvent(event);
}

// Subscribe helper
export function subscribeToPredictiveDelayIncidents(
  callback: (incident: PredictiveDelayIncident) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<PredictiveDelayIncident>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener(PREDICTIVE_DELAY_INCIDENT_EVENT, listener);
  return () => {
    window.removeEventListener(PREDICTIVE_DELAY_INCIDENT_EVENT, listener);
  };
}

export const PRESET_PREDICTIVE_INCIDENTS: PredictiveDelayIncident[] = [
  {
    id: 'inc-bay-bridge-major-spill',
    type: 'MAJOR_TRAFFIC_INCIDENT',
    corridorId: 'corridor-80-bay-bridge',
    corridorName: 'Bay Bridge Westbound Corridor',
    highway: 'Interstate 80 West',
    severity: 'CRITICAL',
    currentDelayMin: 32,
    cause: 'Multi-vehicle collision & commercial freight trailer blockage across 3 lanes near Treasure Island toll merge.',
    timestamp: new Date().toISOString(),
    trafficCondition: 'GRIDLOCK',
    recommendedBypass: {
      name: 'San Mateo Bridge (CA-92 West) Bypass via Peninsula Arterial',
      description: 'Divert fleet south via I-880 to CA-92 West over San Mateo Bridge into SF southern distribution gateway.',
      distanceDeltaKm: 8.4,
      timeSavedMin: 24,
      batteryDeltaPct: -1.8,
      avoidHighway: 'I-80 Westbound',
      targetPeninsulaArterial: 'CA-92 West / US-101 North',
    },
    triggerSource: 'PredictiveDelayWidget',
    impactedVehicleId: 'veh-ev-101',
    courierName: 'Marcus Vance',
  },
  {
    id: 'inc-atmospheric-river-storm',
    type: 'SEVERE_WEATHER_DELAY',
    corridorId: 'corridor-sf-embarcadero',
    corridorName: 'San Francisco Peninsula & Waterfront',
    highway: 'US-101 North / Embarcadero Overpass',
    severity: 'HIGH',
    currentDelayMin: 26,
    cause: 'Atmospheric River Storm Warning: 22mm/h downpour, standing roadway water (>6.5mm), and bridge wind shear gusts >65km/h.',
    timestamp: new Date().toISOString(),
    weatherCondition: 'GALE_STORM',
    trafficCondition: 'PEAK_SPIKE',
    recommendedBypass: {
      name: 'I-280 Juniper Expressway Elevated Bypass',
      description: 'Reroute vehicle away from low-elevation Embarcadero seawall arterial onto high-drainage I-280 corridor.',
      distanceDeltaKm: 4.1,
      timeSavedMin: 18,
      batteryDeltaPct: -0.9,
      avoidHighway: 'US-101 North Lowland Section',
      targetPeninsulaArterial: 'I-280 Expressway',
    },
    triggerSource: 'PredictiveDelayWidget',
    impactedVehicleId: 'veh-ev-101',
    courierName: 'Marcus Vance',
  },
  {
    id: 'inc-silicon-valley-101-spike',
    type: 'MAJOR_TRAFFIC_INCIDENT',
    corridorId: 'corridor-101-south',
    corridorName: 'Silicon Valley Highway 101 South',
    highway: 'US Route 101 South',
    severity: 'HIGH',
    currentDelayMin: 22,
    cause: 'Severe optical sensor / LiDAR lane closure & emergency infrastructure repair near Palo Alto.',
    timestamp: new Date().toISOString(),
    trafficCondition: 'PEAK_SPIKE',
    recommendedBypass: {
      name: 'Interstate 280 South Foothills Expressway Bypass',
      description: 'Shift westbound to I-280 South. Continuous free-flowing corridor with zero signal delays.',
      distanceDeltaKm: 3.2,
      timeSavedMin: 16,
      batteryDeltaPct: -0.6,
      avoidHighway: 'US Route 101 South',
      targetPeninsulaArterial: 'I-280 South',
    },
    triggerSource: 'PredictiveDelayWidget',
    impactedVehicleId: 'veh-ev-101',
    courierName: 'Marcus Vance',
  },
];
