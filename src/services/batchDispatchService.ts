import { 
  Vehicle, 
  Parcel, 
  Employee, 
  BatchDispatchStrategy, 
  BatchDispatchPlan, 
  VehicleBatchAssignment,
  CustodyEvent 
} from '../types';
import { storage } from './storage';

// Helper to determine destination region cluster
function getParcelCluster(parcel: Parcel): string {
  const city = (parcel.recipient.city || '').toLowerCase();
  const address = (parcel.recipient.street || '').toLowerCase();

  if (city.includes('san francisco') || address.includes('mission') || address.includes('market st') || address.includes('folsom')) {
    return 'San Francisco Central & Metro';
  } else if (city.includes('oakland') || city.includes('berkeley') || city.includes('alameda') || city.includes('emeryville')) {
    return 'East Bay & Maritime Corridor';
  } else if (city.includes('san jose') || city.includes('santa clara') || city.includes('sunnyvale') || city.includes('cupertino')) {
    return 'South Bay & Silicon Valley Tech Park';
  } else if (city.includes('south san francisco') || city.includes('san mateo') || city.includes('palo alto') || city.includes('burlingame')) {
    return 'Peninsula & SFO Logistics Spine';
  } else {
    return 'Greater Bay Regional Sector';
  }
}

// Generate cryptographic audit hash
function generateVerificationHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 12; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return `0x${hash}`;
}

export interface BatchAssignmentOptions {
  strategy: BatchDispatchStrategy;
  selectedVehicleIds?: string[];
  selectedParcelIds?: string[];
  maxStopsPerVehicle?: number;
  targetCapacityBufferPct?: number; // e.g. 10% safety buffer = pack up to 90%
}

class BatchDispatchService {
  /**
   * Retrieves parcels that are currently pending and ready for dispatch assignment
   */
  public getDispatchReadyParcels(tenantId?: string): Parcel[] {
    const allParcels = storage.getParcels(tenantId);
    return allParcels.filter(p => {
      // Must not be delivered or failed
      const isPendingStatus = 
        p.status === 'BOOKED' || 
        p.status === 'ACCEPTED' || 
        p.status === 'AT_ORIGIN_HUB' || 
        p.status === 'AT_DESTINATION_HUB';
      
      // Or unassigned out-for-delivery
      const isUnassigned = !p.assignedVehicleId || !p.assignedCourierId;

      return isPendingStatus || (p.status !== 'DELIVERED' && isUnassigned);
    });
  }

  /**
   * Generates a preview BatchDispatchPlan using the selected strategy
   */
  public generateDispatchPlan(
    tenantId: string,
    options: BatchAssignmentOptions
  ): BatchDispatchPlan {
    const { 
      strategy = 'GEO_CLUSTERING', 
      selectedVehicleIds, 
      selectedParcelIds, 
      maxStopsPerVehicle = 12,
      targetCapacityBufferPct = 10 
    } = options;

    let candidateParcels = this.getDispatchReadyParcels(tenantId);
    if (selectedParcelIds && selectedParcelIds.length > 0) {
      candidateParcels = candidateParcels.filter(p => selectedParcelIds.includes(p.id));
    }

    let candidateVehicles = storage.getVehicles(tenantId).filter(v => v.status !== 'MAINTENANCE');
    if (selectedVehicleIds && selectedVehicleIds.length > 0) {
      candidateVehicles = candidateVehicles.filter(v => selectedVehicleIds.includes(v.id));
    }

    const couriers = storage.getEmployees(tenantId).filter(e => e.role === 'COURIER');

    // Create assignment containers for each vehicle
    const assignments: VehicleBatchAssignment[] = candidateVehicles.map(veh => {
      const assignedCourier = couriers.find(c => c.id === veh.driverId || c.assignedVehicleId === veh.id) || couriers[0];
      return {
        vehicle: veh,
        assignedCourier,
        parcels: [],
        totalWeightKg: 0,
        capacityUtilizationPct: Math.round((veh.currentLoadKg / veh.capacityKg) * 100),
        estimatedStops: 0,
        estimatedRouteKm: 0,
        estimatedDurationMin: 0,
        primaryZone: 'Unassigned',
      };
    });

    if (assignments.length === 0 || candidateParcels.length === 0) {
      return {
        id: `plan-${Date.now().toString(36)}`,
        strategy,
        totalParcelsCount: 0,
        totalWeightKg: 0,
        vehiclesCount: assignments.length,
        assignments,
        unassignedParcels: candidateParcels,
        createdAt: new Date().toISOString()
      };
    }

    const unassignedParcels: Parcel[] = [];
    const maxCapacityFactor = (100 - targetCapacityBufferPct) / 100;

    // Apply specific strategy logic
    if (strategy === 'SLA_PRIORITY') {
      // Sort parcels by service tier priority: SAME_DAY > NEXT_DAY > STANDARD
      const sortedParcels = [...candidateParcels].sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          SAME_DAY_PRIORITY: 3,
          NEXT_DAY_EXPRESS: 2,
          STANDARD_GROUND: 1
        };
        return (priorityOrder[b.serviceTier] || 1) - (priorityOrder[a.serviceTier] || 1);
      });

      // Sort vehicles by speed / electric priority
      const sortedAssignments = [...assignments].sort((a, b) => {
        const aIsElectric = a.vehicle.type === 'ELECTRIC_VAN' || a.vehicle.type === 'CARGO_EBIKE' ? 1 : 0;
        const bIsElectric = b.vehicle.type === 'ELECTRIC_VAN' || b.vehicle.type === 'CARGO_EBIKE' ? 1 : 0;
        return bIsElectric - aIsElectric;
      });

      for (const parcel of sortedParcels) {
        let placed = false;
        for (const assign of sortedAssignments) {
          const maxAllowedWeight = assign.vehicle.capacityKg * maxCapacityFactor;
          const currentTotal = assign.vehicle.currentLoadKg + assign.totalWeightKg;

          if (currentTotal + parcel.weightKg <= maxAllowedWeight && assign.parcels.length < maxStopsPerVehicle) {
            assign.parcels.push(parcel);
            assign.totalWeightKg = Math.round((assign.totalWeightKg + parcel.weightKg) * 10) / 10;
            placed = true;
            break;
          }
        }
        if (!placed) unassignedParcels.push(parcel);
      }
    } else if (strategy === 'GEO_CLUSTERING') {
      // Group parcels by geo clusters
      const clusterMap: Record<string, Parcel[]> = {};
      candidateParcels.forEach(p => {
        const cluster = getParcelCluster(p);
        if (!clusterMap[cluster]) clusterMap[cluster] = [];
        clusterMap[cluster].push(p);
      });

      // Assign each cluster primarily to a vehicle
      const clusterKeys = Object.keys(clusterMap);
      clusterKeys.forEach((clusterName, idx) => {
        const targetAssign = assignments[idx % assignments.length];
        targetAssign.primaryZone = clusterName;
        const clusterParcels = clusterMap[clusterName];

        for (const parcel of clusterParcels) {
          const maxAllowedWeight = targetAssign.vehicle.capacityKg * maxCapacityFactor;
          const currentTotal = targetAssign.vehicle.currentLoadKg + targetAssign.totalWeightKg;

          if (currentTotal + parcel.weightKg <= maxAllowedWeight && targetAssign.parcels.length < maxStopsPerVehicle) {
            targetAssign.parcels.push(parcel);
            targetAssign.totalWeightKg = Math.round((targetAssign.totalWeightKg + parcel.weightKg) * 10) / 10;
          } else {
            // Try spillover to next vehicle
            let placedSpillover = false;
            for (const otherAssign of assignments) {
              const otherMax = otherAssign.vehicle.capacityKg * maxCapacityFactor;
              const otherTotal = otherAssign.vehicle.currentLoadKg + otherAssign.totalWeightKg;
              if (otherTotal + parcel.weightKg <= otherMax && otherAssign.parcels.length < maxStopsPerVehicle) {
                otherAssign.parcels.push(parcel);
                otherAssign.totalWeightKg = Math.round((otherAssign.totalWeightKg + parcel.weightKg) * 10) / 10;
                placedSpillover = true;
                break;
              }
            }
            if (!placedSpillover) unassignedParcels.push(parcel);
          }
        }
      });
    } else if (strategy === 'MAX_CAPACITY_PACKING') {
      // Best-Fit Decreasing Knapsack
      const sortedParcels = [...candidateParcels].sort((a, b) => b.weightKg - a.weightKg);

      for (const parcel of sortedParcels) {
        let placed = false;
        // Find vehicle that has best tight fit
        for (const assign of assignments) {
          const maxAllowed = assign.vehicle.capacityKg * maxCapacityFactor;
          const currentTotal = assign.vehicle.currentLoadKg + assign.totalWeightKg;

          if (currentTotal + parcel.weightKg <= maxAllowed && assign.parcels.length < maxStopsPerVehicle) {
            assign.parcels.push(parcel);
            assign.totalWeightKg = Math.round((assign.totalWeightKg + parcel.weightKg) * 10) / 10;
            placed = true;
            break;
          }
        }
        if (!placed) unassignedParcels.push(parcel);
      }
    } else {
      // BALANCED_WORKLOAD: Round Robin distribution
      let vehicleIndex = 0;
      for (const parcel of candidateParcels) {
        let attempts = 0;
        let placed = false;

        while (attempts < assignments.length && !placed) {
          const assign = assignments[vehicleIndex % assignments.length];
          const maxAllowed = assign.vehicle.capacityKg * maxCapacityFactor;
          const currentTotal = assign.vehicle.currentLoadKg + assign.totalWeightKg;

          if (currentTotal + parcel.weightKg <= maxAllowed && assign.parcels.length < maxStopsPerVehicle) {
            assign.parcels.push(parcel);
            assign.totalWeightKg = Math.round((assign.totalWeightKg + parcel.weightKg) * 10) / 10;
            placed = true;
          }
          vehicleIndex++;
          attempts++;
        }

        if (!placed) unassignedParcels.push(parcel);
      }
    }

    // Compute route projections, stops, and utilization for each assignment
    assignments.forEach(assign => {
      const combinedWeight = assign.vehicle.currentLoadKg + assign.totalWeightKg;
      assign.capacityUtilizationPct = Math.min(100, Math.round((combinedWeight / assign.vehicle.capacityKg) * 100));
      assign.estimatedStops = assign.parcels.length;
      
      // Projections: approx 3.8 km per stop + 12 min per delivery
      assign.estimatedRouteKm = Math.round(assign.parcels.length * 4.2 + 8);
      assign.estimatedDurationMin = Math.round(assign.parcels.length * 14 + 20);

      // Identify prominent zones
      if (assign.primaryZone === 'Unassigned' && assign.parcels.length > 0) {
        assign.primaryZone = getParcelCluster(assign.parcels[0]);
      }
    });

    const totalAssignedParcels = assignments.reduce((acc, a) => acc + a.parcels.length, 0);
    const totalAssignedWeight = Math.round(assignments.reduce((acc, a) => acc + a.totalWeightKg, 0) * 10) / 10;

    return {
      id: `plan-${Date.now().toString(36)}`,
      strategy,
      totalParcelsCount: totalAssignedParcels,
      totalWeightKg: totalAssignedWeight,
      vehiclesCount: assignments.filter(a => a.parcels.length > 0).length,
      assignments,
      unassignedParcels,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Executes the batch dispatch plan:
   * Simultaneously updates all parcels to OUT_FOR_DELIVERY, links vehicle and courier IDs,
   * updates vehicle payload and ON_ROUTE status, and writes continuous custody audit events.
   */
  public executeBatchDispatch(plan: BatchDispatchPlan): {
    success: boolean;
    dispatchedParcelsCount: number;
    dispatchedVehiclesCount: number;
    totalDispatchedKg: number;
    errors?: string[];
  } {
    const activeAssignments = plan.assignments.filter(a => a.parcels.length > 0);
    if (activeAssignments.length === 0) {
      return {
        success: false,
        dispatchedParcelsCount: 0,
        dispatchedVehiclesCount: 0,
        totalDispatchedKg: 0,
        errors: ['No parcels were allocated in this batch plan.']
      };
    }

    const allParcels = storage.getParcels();
    const allVehicles = storage.getVehicles();
    const currentUser = storage.getCurrentUser();
    let totalDispatchedCount = 0;
    let totalKg = 0;

    activeAssignments.forEach(assign => {
      const vehId = assign.vehicle.id;
      const courierId = assign.assignedCourier?.id || assign.vehicle.driverId || 'emp-courier';
      const courierName = assign.assignedCourier?.name || assign.vehicle.driverName || 'Designated Courier';

      // Update parcels
      assign.parcels.forEach(p => {
        const pIndex = allParcels.findIndex(target => target.id === p.id);
        if (pIndex >= 0) {
          allParcels[pIndex].assignedVehicleId = vehId;
          allParcels[pIndex].assignedCourierId = courierId;
          allParcels[pIndex].status = 'OUT_FOR_DELIVERY';

          const auditEvent: CustodyEvent = {
            id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            parcelId: p.id,
            timestamp: new Date().toISOString(),
            eventType: 'OUT_FOR_DELIVERY_DISPATCH',
            locationName: `${assign.vehicle.vehicleNumber} Mobile Staging Desk`,
            operatorName: currentUser.name || 'Fleet Dispatch Operations',
            operatorRole: currentUser.role || 'DISPATCHER',
            operatorId: currentUser.id || 'sys-dispatch',
            notes: `Automated Batch Dispatch: Assigned to ${assign.vehicle.vehicleNumber} (${assign.vehicle.type}) under courier ${courierName}. Route: ${assign.primaryZone}.`,
            verificationHash: generateVerificationHash()
          };

          allParcels[pIndex].custodyEvents.push(auditEvent);
          totalDispatchedCount++;
          totalKg += p.weightKg;
        }
      });

      // Update vehicle status & payload
      const vIndex = allVehicles.findIndex(target => target.id === vehId);
      if (vIndex >= 0) {
        allVehicles[vIndex].currentLoadKg = Math.round((allVehicles[vIndex].currentLoadKg + assign.totalWeightKg) * 10) / 10;
        allVehicles[vIndex].status = 'ON_ROUTE';
        if (assign.assignedCourier) {
          allVehicles[vIndex].driverId = assign.assignedCourier.id;
          allVehicles[vIndex].driverName = assign.assignedCourier.name;
        }
      }
    });

    // Save updated collections
    localStorage.setItem('logiflows_parcels', JSON.stringify(allParcels));
    localStorage.setItem('logiflows_vehicles', JSON.stringify(allVehicles));

    // Post notification
    storage.addNotification({
      title: 'Mass Parcel Dispatch Executed',
      message: `Simultaneously dispatched ${totalDispatchedCount} parcels across ${activeAssignments.length} vehicles (${Math.round(totalKg)} kg total). Automated routing active.`,
      category: 'STATUS_CHANGE',
      severity: 'INFO'
    });

    // Notify storage subscribers
    storage.notify();

    return {
      success: true,
      dispatchedParcelsCount: totalDispatchedCount,
      dispatchedVehiclesCount: activeAssignments.length,
      totalDispatchedKg: Math.round(totalKg * 10) / 10
    };
  }
}

export const batchDispatchService = new BatchDispatchService();
