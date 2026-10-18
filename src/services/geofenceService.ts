import { storage } from './storage';
import { GeofenceZone, Vehicle, BranchHub, GeofenceEvent, GeofenceActionType } from '../types';

export interface VehicleGeofenceStatus {
  vehicleId: string;
  vehicleNumber: string;
  driverName?: string;
  geofenceId: string;
  hubId: string;
  hubName: string;
  radiusKm: number;
  distanceKm: number;
  isInside: boolean;
  speedKmh?: number;
  lastCheckedAt: string;
}

// Calculate geodesic haversine distance in km
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
  return Math.round(R * c * 100) / 100;
}

/**
 * Real-Time Geofence Monitoring Engine
 * Evaluates vehicle locations against perimeter zones around logistics hubs
 * and triggers immediate alerts and audit logs upon boundary crossing (ENTER / EXIT).
 */
export class GeofenceService {
  private static instance: GeofenceService;
  // Key format: `${vehicleId}_${geofenceId}` -> boolean (wasInside)
  private vehicleStateMap: Map<string, boolean> = new Map();

  private constructor() {
    this.loadStateFromStorage();
  }

  public static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  private loadStateFromStorage(): void {
    try {
      const raw = localStorage.getItem('logiflows_vehicle_geofence_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach((k) => {
          this.vehicleStateMap.set(k, parsed[k]);
        });
      }
    } catch (e) {
      console.error('Failed to load geofence state from storage:', e);
    }
  }

  private persistState(): void {
    try {
      const obj: Record<string, boolean> = {};
      this.vehicleStateMap.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem('logiflows_vehicle_geofence_state', JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to persist geofence state:', e);
    }
  }

  /**
   * Check all vehicles against active geofence zones and trigger ENTER/EXIT events
   */
  public evaluateFleetGeofences(
    vehicles: Vehicle[],
    zones: GeofenceZone[]
  ): { statuses: VehicleGeofenceStatus[]; triggeredEvents: GeofenceEvent[] } {
    const statuses: VehicleGeofenceStatus[] = [];
    const triggeredEvents: GeofenceEvent[] = [];

    const activeZones = zones.filter((z) => z.enabled);

    for (const vehicle of vehicles) {
      if (!vehicle.lastLocation || !vehicle.lastLocation.lat || !vehicle.lastLocation.lng) {
        continue;
      }

      const vLat = vehicle.lastLocation.lat;
      const vLng = vehicle.lastLocation.lng;

      for (const zone of activeZones) {
        const distanceKm = calculateDistanceKm(vLat, vLng, zone.centerLat, zone.centerLng);
        const isInsideNow = distanceKm <= zone.radiusKm;
        const stateKey = `${vehicle.id}_${zone.id}`;
        const wasInside = this.vehicleStateMap.get(stateKey);

        statuses.push({
          vehicleId: vehicle.id,
          vehicleNumber: vehicle.vehicleNumber,
          driverName: vehicle.driverName,
          geofenceId: zone.id,
          hubId: zone.hubId,
          hubName: zone.hubName,
          radiusKm: zone.radiusKm,
          distanceKm,
          isInside: isInsideNow,
          speedKmh: vehicle.lastLocation.speedKmh,
          lastCheckedAt: new Date().toISOString(),
        });

        // Detect State Transitions (ENTER / EXIT)
        if (wasInside !== undefined && wasInside !== isInsideNow) {
          const action: GeofenceActionType = isInsideNow ? 'ENTER' : 'EXIT';

          const shouldNotify =
            (action === 'ENTER' && zone.notifyOnEnter) ||
            (action === 'EXIT' && zone.notifyOnExit);

          if (shouldNotify) {
            const recorded = storage.recordGeofenceEvent({
              geofenceId: zone.id,
              geofenceName: zone.name,
              hubId: zone.hubId,
              hubName: zone.hubName,
              vehicleId: vehicle.id,
              vehicleNumber: vehicle.vehicleNumber,
              driverName: vehicle.driverName,
              action,
              distanceFromCenterKm: distanceKm,
              radiusKm: zone.radiusKm,
              speedKmh: vehicle.lastLocation.speedKmh,
              lat: vLat,
              lng: vLng,
            });
            triggeredEvents.push(recorded);
          }
        }

        // Update state in map
        this.vehicleStateMap.set(stateKey, isInsideNow);
      }
    }

    this.persistState();
    return { statuses, triggeredEvents };
  }

  /**
   * Manually test / simulate a vehicle crossing into or out of a hub geofence
   */
  public simulateGeofenceCrossing(
    vehicle: Vehicle,
    zone: GeofenceZone,
    action: GeofenceActionType
  ): GeofenceEvent {
    const isEntering = action === 'ENTER';
    const targetDistance = isEntering ? zone.radiusKm * 0.45 : zone.radiusKm * 1.35;

    // Simulate coordinates based on hub center offset
    // 1 deg lat ~ 111 km
    const latOffset = (targetDistance / 111) * (isEntering ? 0.7 : 1.1);
    const lngOffset = (targetDistance / (111 * Math.cos((zone.centerLat * Math.PI) / 180))) * (isEntering ? 0.7 : 1.1);

    const simLat = zone.centerLat + latOffset;
    const simLng = zone.centerLng + lngOffset;

    // Update vehicle location in storage
    storage.updateVehicleLocation(
      vehicle.id,
      simLat,
      simLng,
      isEntering ? 45 : 225,
      isEntering ? 38 : 55
    );

    // Update memory map state
    const stateKey = `${vehicle.id}_${zone.id}`;
    this.vehicleStateMap.set(stateKey, isEntering);
    this.persistState();

    // Record verified event and notification
    return storage.recordGeofenceEvent({
      geofenceId: zone.id,
      geofenceName: zone.name,
      hubId: zone.hubId,
      hubName: zone.hubName,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      driverName: vehicle.driverName,
      action,
      distanceFromCenterKm: Math.round(targetDistance * 10) / 10,
      radiusKm: zone.radiusKm,
      speedKmh: isEntering ? 38 : 55,
      lat: simLat,
      lng: simLng,
    });
  }
}

export const geofenceService = GeofenceService.getInstance();
