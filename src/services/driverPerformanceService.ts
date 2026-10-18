import { storage } from './storage';
import { Employee, RouteFuelLogEntry, Parcel, Vehicle } from '../types';

export interface DriverPerformanceBadge {
  id: string;
  label: string;
  icon: string;
  description: string;
  colorClass: string;
}

export interface CourierPerformanceData {
  courierId: string;
  courierName: string;
  avatarInitials: string;
  branchId: string;
  branchName: string;
  rating: number;
  assignedVehicleId?: string;
  assignedVehicleNumber: string;
  assignedVehicleType: string;
  fuelType: 'ELECTRIC' | 'DIESEL' | 'UNLEADED';

  // Fuel Efficiency & Eco Performance
  averageEcoScore: number; // 0 - 100
  efficiencyVsBaselinePct: number; // negative is better (e.g. -11.2%)
  totalFuelOrEnergyConsumed: number;
  fuelUnit: 'L' | 'kWh';
  averageConsumptionPer100Km: number;
  co2SavedKg: number;
  fuelRank: number;

  // Punctuality & Delivery Reliability
  totalDeliveries: number;
  onTimeDeliveries: number;
  delayedDeliveries: number;
  onTimeDeliveryPct: number; // e.g. 98.4%
  punctualityRank: number;

  // Driving Safety & Telemetry Indices
  smoothBrakingScore: number; // 0 - 100
  speedComplianceScore: number; // 0 - 100
  idleReductionScore: number; // 0 - 100

  // Composite Performance
  compositeScore: number; // 0 - 100
  rank: number;
  previousRank: number;
  rankDelta: number; // +1, 0, -1
  tier: 'CHAMPION' | 'MASTER' | 'ELITE' | 'PRO';

  badges: DriverPerformanceBadge[];
  recentRoutes: RouteFuelLogEntry[];
}

export type LeaderboardSortOption = 
  | 'COMPOSITE' 
  | 'FUEL_EFFICIENCY' 
  | 'ON_TIME_PCT' 
  | 'TOTAL_DELIVERIES' 
  | 'CO2_SAVINGS';

export type TimeframeFilter = 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

class DriverPerformanceService {
  public calculateLeaderboard(
    tenantId?: string,
    sortOption: LeaderboardSortOption = 'COMPOSITE',
    timeframe: TimeframeFilter = 'THIS_MONTH',
    vehicleFilter: 'ALL' | 'ELECTRIC_ONLY' | 'COMBUSTION_ONLY' = 'ALL'
  ): {
    drivers: CourierPerformanceData[];
    fleetAverages: {
      averageEcoScore: number;
      averageOnTimePct: number;
      totalCo2SavedKg: number;
      totalDeliveries: number;
      topPerformer: CourierPerformanceData | null;
    };
  } {
    const tid = tenantId || storage.getActiveTenantId();
    const couriers = storage.getEmployees(tid).filter(e => e.role === 'COURIER');
    const allLogs = storage.getRouteFuelLogs(tid);
    const allParcels = storage.getParcels(tid);
    const allVehicles = storage.getVehicles(tid);
    const allHubs = storage.getHubs(tid);

    // Baseline profiles for known couriers to ensure rich and realistic variation
    const courierBaselines: Record<string, {
      otdPct: number;
      totalDeliv: number;
      ecoBase: number;
      prevRank: number;
      co2Saved: number;
      braking: number;
      speed: number;
      idle: number;
      badges: DriverPerformanceBadge[];
    }> = {
      'emp-aisha': {
        otdPct: 99.4,
        totalDeliv: 860,
        ecoBase: 98.5,
        prevRank: 2,
        co2Saved: 142.5,
        braking: 99,
        speed: 97,
        idle: 100,
        badges: [
          { id: 'b-zero-carbon', label: 'Zero-Emission Pioneer', icon: 'Leaf', description: '100% electric cargo e-bike routes with zero tailpipe emissions.', colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
          { id: 'b-perfect-punctual', label: 'Precision Timing', icon: 'Clock', description: '99.4% on-time delivery rate across congested metro corridors.', colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30' }
        ]
      },
      'user-courier': {
        otdPct: 98.7,
        totalDeliv: 1420,
        ecoBase: 94.6,
        prevRank: 1,
        co2Saved: 188.0,
        braking: 96,
        speed: 98,
        idle: 95,
        badges: [
          { id: 'b-eco-champ', label: 'EV Range Maximizer', icon: 'Zap', description: '11.2% lower kWh consumption than OEM vehicle benchmark.', colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
          { id: 'b-century', label: '1,400+ Shipments Club', icon: 'Award', description: 'Milestone delivery volume maintaining 4.94+ customer rating.', colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30' }
        ]
      },
      'emp-mateo': {
        otdPct: 97.2,
        totalDeliv: 1140,
        ecoBase: 92.0,
        prevRank: 3,
        co2Saved: 94.5,
        braking: 93,
        speed: 96,
        idle: 91,
        badges: [
          { id: 'b-regen-master', label: 'Regen Braking Pro', icon: 'BatteryCharging', description: 'Recovered over 45 kWh through regenerative deceleration.', colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' }
        ]
      },
      'emp-elena': {
        otdPct: 96.0,
        totalDeliv: 1250,
        ecoBase: 89.2,
        prevRank: 4,
        co2Saved: 56.0,
        braking: 90,
        speed: 94,
        idle: 88,
        badges: [
          { id: 'b-hill-climber', label: 'Steep Grade Navigator', icon: 'TrendingUp', description: 'Mastered elevation grade efficiency in Oakland & Berkeley Hills.', colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' }
        ]
      },
      'emp-carlos': {
        otdPct: 95.4,
        totalDeliv: 980,
        ecoBase: 88.0,
        prevRank: 5,
        co2Saved: 48.0,
        braking: 89,
        speed: 92,
        idle: 86,
        badges: [
          { id: 'b-highway-cruiser', label: 'Highway Steady Pacer', icon: 'Truck', description: 'Optimal cruise control throttle on Silicon Valley expressways.', colorClass: 'text-slate-300 bg-slate-800 border-slate-700' }
        ]
      },
      'emp-robert': {
        otdPct: 93.8,
        totalDeliv: 640,
        ecoBase: 85.0,
        prevRank: 6,
        co2Saved: 32.0,
        braking: 88,
        speed: 91,
        idle: 82,
        badges: [
          { id: 'b-heavy-haul', label: 'Commercial Freight Veteran', icon: 'Shield', description: 'Zero safety incidents with class-8 heavy intermodal haulers.', colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20' }
        ]
      }
    };

    let performanceList: CourierPerformanceData[] = couriers.map(courier => {
      const logs = allLogs.filter(l => l.courierId === courier.id);
      const assignedVehicle = allVehicles.find(v => v.id === courier.assignedVehicleId || v.driverId === courier.id);
      const hub = allHubs.find(h => h.id === courier.branchId);

      const baseline = courierBaselines[courier.id] || {
        otdPct: 95.0,
        totalDeliv: courier.totalCompletedDeliveries || 500,
        ecoBase: 88.0,
        prevRank: 5,
        co2Saved: 40.0,
        braking: 90,
        speed: 92,
        idle: 85,
        badges: []
      };

      // Calculate actual average eco score from logs if available
      let avgEcoScore = baseline.ecoBase;
      let avgConsumption = assignedVehicle?.avgConsumptionPer100Km || 25.0;
      let totalConsumed = 0;
      let fuelUnit: 'L' | 'kWh' = (assignedVehicle?.type === 'ELECTRIC_VAN' || assignedVehicle?.type === 'CARGO_EBIKE') ? 'kWh' : 'L';
      let deltaVsBaseline = -5.0;

      if (logs.length > 0) {
        const sumEco = logs.reduce((acc, l) => acc + l.ecoScore, 0);
        avgEcoScore = Math.round((sumEco / logs.length) * 10) / 10;
        totalConsumed = Math.round(logs.reduce((acc, l) => acc + l.fuelConsumed, 0) * 10) / 10;
        fuelUnit = logs[0].fuelUnit;
        avgConsumption = Math.round((logs.reduce((acc, l) => acc + l.efficiency, 0) / logs.length) * 100) / 100;
        deltaVsBaseline = Math.round((logs.reduce((acc, l) => acc + l.efficiencyDeltaPct, 0) / logs.length) * 10) / 10;
      }

      // Timeframe adjustments
      let otdPct = baseline.otdPct;
      let totalDeliveries = courier.totalCompletedDeliveries || baseline.totalDeliv;
      if (timeframe === 'THIS_WEEK') {
        totalDeliveries = Math.round(totalDeliveries * 0.05);
      } else if (timeframe === 'THIS_MONTH') {
        totalDeliveries = Math.round(totalDeliveries * 0.22);
      }

      const onTimeCount = Math.round(totalDeliveries * (otdPct / 100));
      const delayedCount = totalDeliveries - onTimeCount;

      // Composite Driver Score calculation:
      // 45% Fuel / Eco Efficiency + 40% On-Time Delivery % + 15% Customer Rating
      const compositeScore = Math.round(
        (avgEcoScore * 0.45 + otdPct * 0.40 + ((courier.rating / 5.0) * 100) * 0.15) * 10
      ) / 10;

      // Initials
      const parts = courier.name.split(' ');
      const avatarInitials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : courier.name.slice(0, 2).toUpperCase();

      return {
        courierId: courier.id,
        courierName: courier.name,
        avatarInitials,
        branchId: courier.branchId,
        branchName: hub ? hub.name : 'Central Sorting Hub',
        rating: courier.rating,
        assignedVehicleId: assignedVehicle?.id,
        assignedVehicleNumber: assignedVehicle ? assignedVehicle.vehicleNumber : 'Unassigned',
        assignedVehicleType: assignedVehicle ? assignedVehicle.type : 'ELECTRIC_VAN',
        fuelType: assignedVehicle?.fuelType || 'ELECTRIC',

        averageEcoScore: avgEcoScore,
        efficiencyVsBaselinePct: deltaVsBaseline,
        totalFuelOrEnergyConsumed: totalConsumed,
        fuelUnit,
        averageConsumptionPer100Km: avgConsumption,
        co2SavedKg: baseline.co2Saved,
        fuelRank: 0, // Assigned after sort

        totalDeliveries,
        onTimeDeliveries: onTimeCount,
        delayedDeliveries: delayedCount,
        onTimeDeliveryPct: otdPct,
        punctualityRank: 0, // Assigned after sort

        smoothBrakingScore: baseline.braking,
        speedComplianceScore: baseline.speed,
        idleReductionScore: baseline.idle,

        compositeScore,
        rank: 0,
        previousRank: baseline.prevRank,
        rankDelta: 0,
        tier: 'PRO',
        badges: baseline.badges,
        recentRoutes: logs
      };
    });

    // Apply vehicle filter
    if (vehicleFilter === 'ELECTRIC_ONLY') {
      performanceList = performanceList.filter(d => d.fuelType === 'ELECTRIC');
    } else if (vehicleFilter === 'COMBUSTION_ONLY') {
      performanceList = performanceList.filter(d => d.fuelType !== 'ELECTRIC');
    }

    // Rank by Fuel Efficiency
    const fuelSorted = [...performanceList].sort((a, b) => b.averageEcoScore - a.averageEcoScore);
    fuelSorted.forEach((d, idx) => {
      const target = performanceList.find(p => p.courierId === d.courierId);
      if (target) target.fuelRank = idx + 1;
    });

    // Rank by Punctuality
    const punctualitySorted = [...performanceList].sort((a, b) => b.onTimeDeliveryPct - a.onTimeDeliveryPct);
    punctualitySorted.forEach((d, idx) => {
      const target = performanceList.find(p => p.courierId === d.courierId);
      if (target) target.punctualityRank = idx + 1;
    });

    // Final Sort based on user selected sort option
    performanceList.sort((a, b) => {
      if (sortOption === 'FUEL_EFFICIENCY') {
        return b.averageEcoScore - a.averageEcoScore;
      }
      if (sortOption === 'ON_TIME_PCT') {
        return b.onTimeDeliveryPct - a.onTimeDeliveryPct;
      }
      if (sortOption === 'TOTAL_DELIVERIES') {
        return b.totalDeliveries - a.totalDeliveries;
      }
      if (sortOption === 'CO2_SAVINGS') {
        return b.co2SavedKg - a.co2SavedKg;
      }
      // Default COMPOSITE
      return b.compositeScore - a.compositeScore;
    });

    // Assign final ranks and tiers
    performanceList.forEach((d, idx) => {
      d.rank = idx + 1;
      d.rankDelta = d.previousRank - d.rank; // positive means moved up
      if (d.rank === 1) d.tier = 'CHAMPION';
      else if (d.rank <= 3) d.tier = 'MASTER';
      else if (d.rank <= 5) d.tier = 'ELITE';
      else d.tier = 'PRO';
    });

    // Calculate Fleet Averages
    const totalEco = performanceList.reduce((acc, d) => acc + d.averageEcoScore, 0);
    const totalOtd = performanceList.reduce((acc, d) => acc + d.onTimeDeliveryPct, 0);
    const totalCo2 = Math.round(performanceList.reduce((acc, d) => acc + d.co2SavedKg, 0) * 10) / 10;
    const totalDeliv = performanceList.reduce((acc, d) => acc + d.totalDeliveries, 0);

    return {
      drivers: performanceList,
      fleetAverages: {
        averageEcoScore: performanceList.length > 0 ? Math.round((totalEco / performanceList.length) * 10) / 10 : 90,
        averageOnTimePct: performanceList.length > 0 ? Math.round((totalOtd / performanceList.length) * 10) / 10 : 96.5,
        totalCo2SavedKg: totalCo2,
        totalDeliveries: totalDeliv,
        topPerformer: performanceList[0] || null
      }
    };
  }
}

export const driverPerformanceService = new DriverPerformanceService();
