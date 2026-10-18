import { Parcel, Employee, Vehicle, ServiceTier } from '../types';

export interface CourierCandidateScore {
  courier: Employee;
  vehicle?: Vehicle;
  distanceKm: number;
  priorityScore: number;
  workloadPenalty: number;
  ratingBonus: number;
  totalScore: number; // 0 to 100+ (higher is better)
  matchConfidence: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'LOW';
  matchReason: string;
}

export interface AutoDispatchSuggestion {
  parcel: Parcel;
  bestCandidate: CourierCandidateScore;
  alternateCandidates: CourierCandidateScore[];
  dispatchUrgency: 'CRITICAL_IMMEDIATE' | 'HIGH_PRIORITY' | 'STANDARD_SCHEDULE';
  recommendedAt: string;
}

// Service Tier weight scoring
const PRIORITY_WEIGHTS: Record<ServiceTier, number> = {
  SAME_DAY_PRIORITY: 50,
  NEXT_DAY_EXPRESS: 30,
  STANDARD_GROUND: 15,
};

// Calculate geodesic haversine distance in km
export function calculateHaversineDistanceKm(
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
  return Math.round(R * c * 10) / 10;
}

/**
 * Auto-Dispatch Algorithm Service
 * Evaluates candidate couriers for pickup requests based on real-time distance proximity,
 * parcel priority SLAs, active courier workload, and rating tier.
 */
export class AutoDispatchService {
  private static instance: AutoDispatchService;

  public static getInstance(): AutoDispatchService {
    if (!AutoDispatchService.instance) {
      AutoDispatchService.instance = new AutoDispatchService();
    }
    return AutoDispatchService.instance;
  }

  /**
   * Evaluates available couriers and returns ranked dispatch suggestions for an unassigned pickup parcel.
   */
  public evaluateDispatchCandidates(
    parcel: Parcel,
    couriers: Employee[],
    vehicles: Vehicle[],
    activeParcels: Parcel[]
  ): AutoDispatchSuggestion | null {
    // Only evaluate couriers who are active or on shift
    const availableCouriers = couriers.filter(
      (c) => c.role === 'COURIER' && (c.status === 'ON_SHIFT' || c.status === 'ACTIVE')
    );

    if (availableCouriers.length === 0) return null;

    // Parcel pickup location (origin sender coords)
    const pickupLat = parcel.sender.lat || 37.7749;
    const pickupLng = parcel.sender.lng || -122.4194;

    const basePriorityScore = PRIORITY_WEIGHTS[parcel.serviceTier] || 15;

    const candidateScores: CourierCandidateScore[] = availableCouriers.map((courier) => {
      // Find assigned vehicle
      const vehicle = vehicles.find(
        (v) => v.id === courier.assignedVehicleId || v.driverId === courier.id
      );

      // Courier position (from vehicle lastLocation or default hub)
      const courierLat = vehicle?.lastLocation?.lat || 37.7833;
      const courierLng = vehicle?.lastLocation?.lng || -122.4167;

      const directDistanceKm = calculateHaversineDistanceKm(courierLat, courierLng, pickupLat, pickupLng);
      // Factored road distance
      const distanceKm = Math.max(0.8, Math.round(directDistanceKm * 1.3 * 10) / 10);

      // Distance score: closer is better. 0 km = 50 pts, decays to 0 pts at 40 km
      const distanceScore = Math.max(0, 50 - distanceKm * 1.25);

      // Count actual current active stops for this courier
      const courierStops = activeParcels.filter(
        (p) => p.assignedCourierId === courier.id && p.status !== 'DELIVERED'
      ).length;

      // Workload penalty: each active stop deducts 4 points
      const workloadPenalty = courierStops * 4;

      // Courier rating bonus: (rating - 4.0) * 10 pts
      const ratingBonus = Math.max(0, Math.round(((courier.rating || 4.8) - 4.0) * 10));

      // Capacity check: vehicle current load vs capacity
      let capacityPenalty = 0;
      if (vehicle && vehicle.capacityKg > 0) {
        const remainingCapacityKg = vehicle.capacityKg - (vehicle.currentLoadKg || 0);
        if (remainingCapacityKg < (parcel.weightKg || 1)) {
          capacityPenalty = 30; // severe penalty if over capacity
        }
      }

      // Delay risk amplification: if parcel is high risk or Same Day Priority, distance matters even more
      const urgencyMultiplier = parcel.serviceTier === 'SAME_DAY_PRIORITY' ? 1.4 : 1.0;

      const totalScore = Math.max(
        5,
        Math.round((distanceScore * urgencyMultiplier + basePriorityScore + ratingBonus - workloadPenalty - capacityPenalty) * 10) / 10
      );

      let matchConfidence: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'LOW' = 'MODERATE';
      if (totalScore >= 80) matchConfidence = 'EXCELLENT';
      else if (totalScore >= 60) matchConfidence = 'HIGH';
      else if (totalScore >= 40) matchConfidence = 'MODERATE';
      else matchConfidence = 'LOW';

      // Match Reason
      const reasons: string[] = [];
      if (distanceKm <= 5) reasons.push(`${distanceKm} km nearby radius`);
      else reasons.push(`${distanceKm} km corridor distance`);

      if (parcel.serviceTier === 'SAME_DAY_PRIORITY') {
        reasons.push('SAME-DAY SLA prioritized');
      }

      if (courierStops <= 2) {
        reasons.push(`low load (${courierStops} active stops)`);
      } else {
        reasons.push(`${courierStops} current stops`);
      }

      const matchReason = reasons.join(' · ');

      return {
        courier,
        vehicle,
        distanceKm,
        priorityScore: basePriorityScore,
        workloadPenalty,
        ratingBonus,
        totalScore,
        matchConfidence,
        matchReason,
      };
    });

    // Sort candidates descending by total score
    candidateScores.sort((a, b) => b.totalScore - a.totalScore);

    const bestCandidate = candidateScores[0];
    const alternateCandidates = candidateScores.slice(1);

    let dispatchUrgency: 'CRITICAL_IMMEDIATE' | 'HIGH_PRIORITY' | 'STANDARD_SCHEDULE' = 'STANDARD_SCHEDULE';
    if (parcel.serviceTier === 'SAME_DAY_PRIORITY' || parcel.delayRisk?.level === 'HIGH') {
      dispatchUrgency = 'CRITICAL_IMMEDIATE';
    } else if (parcel.serviceTier === 'NEXT_DAY_EXPRESS' || parcel.delayRisk?.level === 'MEDIUM') {
      dispatchUrgency = 'HIGH_PRIORITY';
    }

    return {
      parcel,
      bestCandidate,
      alternateCandidates,
      dispatchUrgency,
      recommendedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates auto-dispatch suggestions for a set of pickup requests.
   */
  public generateSuggestionsForPickups(
    pickups: Parcel[],
    couriers: Employee[],
    vehicles: Vehicle[],
    activeParcels: Parcel[]
  ): AutoDispatchSuggestion[] {
    const suggestions: AutoDispatchSuggestion[] = [];

    // Prioritize high-priority shipments first
    const sortedPickups = [...pickups].sort((a, b) => {
      const weightA = PRIORITY_WEIGHTS[a.serviceTier] || 0;
      const weightB = PRIORITY_WEIGHTS[b.serviceTier] || 0;
      return weightB - weightA;
    });

    for (const pickup of sortedPickups) {
      const suggestion = this.evaluateDispatchCandidates(
        pickup,
        couriers,
        vehicles,
        activeParcels
      );
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }
}

export const autoDispatchService = AutoDispatchService.getInstance();
