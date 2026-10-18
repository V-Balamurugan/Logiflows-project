import { Parcel, RegionalDemandForecast, RegionalDailyForecastPoint, RegionalCapacityPreAllocationPlan, SurgeAlertLevel } from '../types';
import { storage } from './storage';

export interface RegionalZoneConfig {
  regionId: string;
  regionName: string;
  regionCode: string;
  primaryHubId: string;
  primaryHubName: string;
  keyMunicipalities: string[];
  historicalDailyBaseVolume: number;
  surgeFactor: number;
  surgeAlertLevel: SurgeAlertLevel;
  surgeDriver: string;
  peakDeliveryWindow: string;
  defaultCouriers: number;
  dayMultipliers: number[]; // 7 days: Sun, Mon, Tue, Wed, Thu, Fri, Sat
}

export const REGIONAL_ZONE_CONFIGS: RegionalZoneConfig[] = [
  {
    regionId: 'reg-silicon-valley',
    regionName: 'Silicon Valley Tech Corridor',
    regionCode: 'SV-SJC',
    primaryHubId: 'hub-apx-sjc',
    primaryHubName: 'Apex Silicon Valley Tech DC',
    keyMunicipalities: ['San Jose', 'Santa Clara', 'Sunnyvale', 'Palo Alto', 'Cupertino', 'Mountain View'],
    historicalDailyBaseVolume: 1240,
    surgeFactor: 1.42,
    surgeAlertLevel: 'CRITICAL_SURGE',
    surgeDriver: 'Q4 Enterprise Hardware Refresh & Semiconductor Foundry Logistics Surge',
    peakDeliveryWindow: '08:30 - 13:00',
    defaultCouriers: 36,
    dayMultipliers: [0.75, 1.25, 1.45, 1.40, 1.35, 1.15, 0.85]
  },
  {
    regionId: 'reg-east-bay',
    regionName: 'East Bay Maritime & Industrial',
    regionCode: 'EB-OAK',
    primaryHubId: 'hub-apx-oak',
    primaryHubName: 'Apex Central Maritime Sorting Hub',
    keyMunicipalities: ['Oakland', 'Berkeley', 'Hayward', 'Fremont', 'San Leandro', 'Richmond'],
    historicalDailyBaseVolume: 1480,
    surgeFactor: 1.32,
    surgeAlertLevel: 'HIGH_SURGE',
    surgeDriver: 'Port of Oakland Container Vessel Berth Clearance & Intermodal Transfer Backlog',
    peakDeliveryWindow: '06:00 - 11:30',
    defaultCouriers: 42,
    dayMultipliers: [0.65, 1.30, 1.35, 1.28, 1.30, 1.22, 0.70]
  },
  {
    regionId: 'reg-sf-metro',
    regionName: 'San Francisco Urban Core',
    regionCode: 'SF-DOWNTOWN',
    primaryHubId: 'hub-apx-sfo',
    primaryHubName: 'Apex Peninsula Last-Mile Depot',
    keyMunicipalities: ['San Francisco', 'Daly City', 'South San Francisco', 'Brisbane'],
    historicalDailyBaseVolume: 890,
    surgeFactor: 1.18,
    surgeAlertLevel: 'ELEVATED',
    surgeDriver: 'Commercial District Corporate Supplies & Hospitality Restock Demands',
    peakDeliveryWindow: '09:30 - 14:00',
    defaultCouriers: 26,
    dayMultipliers: [0.80, 1.10, 1.15, 1.20, 1.22, 1.25, 0.90]
  },
  {
    regionId: 'reg-peninsula',
    regionName: 'Peninsula & SFO Gateway',
    regionCode: 'PEN-SFO',
    primaryHubId: 'hub-apx-sfo',
    primaryHubName: 'Apex Peninsula Last-Mile Depot',
    keyMunicipalities: ['San Mateo', 'Redwood City', 'Burlingame', 'Foster City', 'San Bruno', 'Millbrae'],
    historicalDailyBaseVolume: 670,
    surgeFactor: 1.12,
    surgeAlertLevel: 'NORMAL',
    surgeDriver: 'Biotech Corridor Medical Samples & Regular Commercial Parcels',
    peakDeliveryWindow: '11:00 - 15:30',
    defaultCouriers: 20,
    dayMultipliers: [0.60, 1.05, 1.10, 1.12, 1.15, 1.18, 0.75]
  },
  {
    regionId: 'reg-tri-valley',
    regionName: 'Tri-Valley Distribution Sector',
    regionCode: 'TV-PLN',
    primaryHubId: 'hub-apx-oak',
    primaryHubName: 'Apex Central Maritime Sorting Hub',
    keyMunicipalities: ['Pleasanton', 'Dublin', 'Livermore', 'San Ramon', 'Danville'],
    historicalDailyBaseVolume: 520,
    surgeFactor: 1.24,
    surgeAlertLevel: 'ELEVATED',
    surgeDriver: 'Wholesale B2B Fulfillment & Suburban Commercial Parcel Expansion',
    peakDeliveryWindow: '10:00 - 14:30',
    defaultCouriers: 16,
    dayMultipliers: [0.55, 1.15, 1.20, 1.25, 1.22, 1.20, 0.80]
  }
];

const PARCELS_PER_COURIER_SHIFT = 34; // Average standard capacity per courier per day
const STORAGE_PLAN_KEY = 'logiflows_regional_capacity_plans';

class RegionalDemandForecastService {
  /**
   * Generates Regional Demand Forecasts for each zone based on historical baselines,
   * live storage parcels, surge multiplier, and admin pre-allocations.
   */
  public getRegionalDemandForecasts(
    parcels: Parcel[],
    surgeMultiplier = 1.0,
    customAllocations?: Record<string, number>
  ): RegionalDemandForecast[] {
    const today = new Date();
    const savedPlan = this.getSavedPreAllocationPlan(storage.getActiveTenantId());

    return REGIONAL_ZONE_CONFIGS.map((cfg) => {
      // 1. Correlate live parcels assigned or destined to this region
      const liveParcelsInRegion = parcels.filter((p) => {
        const destCity = p.recipient.city.toLowerCase();
        return cfg.keyMunicipalities.some((m) => destCity.includes(m.toLowerCase()));
      });

      // Calibrate base volume with live parcel pool
      const liveParcelVolumeBoost = liveParcelsInRegion.length * 8;
      const baseDailyVolume = cfg.historicalDailyBaseVolume + liveParcelVolumeBoost;

      // Effective surge factor with admin simulation multiplier
      const effectiveSurgeFactor = Math.max(1.0, 1.0 + (cfg.surgeFactor - 1.0) * surgeMultiplier);
      const predictedSurgeVolume = Math.round(baseDailyVolume * effectiveSurgeFactor);

      // Courier capacities
      const defaultCourierCount = cfg.defaultCouriers;
      const preAllocated = customAllocations?.[cfg.regionId] ?? 
        savedPlan?.allocations?.[cfg.regionId] ?? 
        defaultCourierCount;

      const courierCapacityParcels = preAllocated * PARCELS_PER_COURIER_SHIFT;
      const capacityDelta = courierCapacityParcels - predictedSurgeVolume;
      const capacityCoveragePct = Math.round((courierCapacityParcels / predictedSurgeVolume) * 100);

      // Recommended couriers to achieve 108% safety margin
      const recommendedCouriers = Math.ceil((predictedSurgeVolume * 1.08) / PARCELS_PER_COURIER_SHIFT);

      // Overtime risk: if capacity < volume, deficit must be absorbed through overtime
      const overtimeRiskHours = capacityDelta < 0
        ? Math.round((Math.abs(capacityDelta) / 5) * 10) / 10 // ~5 parcels/hr on overtime
        : 0;

      // SLA safety probability calculation
      let slaSafetyProbabilityPct = 99.2;
      if (capacityCoveragePct < 100) {
        slaSafetyProbabilityPct = Math.max(68.0, 98.0 - (100 - capacityCoveragePct) * 1.8);
      } else if (capacityCoveragePct > 115) {
        slaSafetyProbabilityPct = 99.8;
      }
      slaSafetyProbabilityPct = Math.round(slaSafetyProbabilityPct * 10) / 10;

      // Dynamic surge risk classification based on surge factor and coverage deficit
      let surgeRiskLevel: SurgeAlertLevel = cfg.surgeAlertLevel;
      if (effectiveSurgeFactor >= 1.35 || capacityCoveragePct < 85) {
        surgeRiskLevel = 'CRITICAL_SURGE';
      } else if (effectiveSurgeFactor >= 1.25 || capacityCoveragePct < 95) {
        surgeRiskLevel = 'HIGH_SURGE';
      } else if (effectiveSurgeFactor >= 1.12) {
        surgeRiskLevel = 'ELEVATED';
      } else {
        surgeRiskLevel = 'NORMAL';
      }

      // Generate 7-day rolling timeline
      const dailyTimeline: RegionalDailyForecastPoint[] = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dayIdx = targetDate.getDay();
        const dayMultiplier = cfg.dayMultipliers[dayIdx] || 1.0;
        
        const dayHistorical = Math.round(cfg.historicalDailyBaseVolume * dayMultiplier);
        // Surge impact concentrated mid-week for commercial logistics
        const surgeWeight = (dayIdx >= 1 && dayIdx <= 4) ? effectiveSurgeFactor : 1.05;
        const dayPredicted = Math.round(dayHistorical * surgeWeight);
        const isSurgeDay = dayPredicted > (dayHistorical * 1.18);

        const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayNames[dayIdx]} ${dateStr}`;

        dailyTimeline.push({
          dayLabel,
          dateStr,
          historicalBaseline: dayHistorical,
          predictedVolume: dayPredicted,
          allocatedCapacity: courierCapacityParcels,
          isSurgeDay,
          surgeReason: isSurgeDay ? cfg.surgeDriver : undefined
        });
      }

      return {
        regionId: cfg.regionId,
        regionName: cfg.regionName,
        regionCode: cfg.regionCode,
        primaryHubId: cfg.primaryHubId,
        primaryHubName: cfg.primaryHubName,
        keyMunicipalities: cfg.keyMunicipalities,
        historicalDailyAvgVolume: baseDailyVolume,
        predictedSurgeVolume,
        surgeFactor: Math.round(effectiveSurgeFactor * 100) / 100,
        surgeRiskLevel,
        surgeDriver: cfg.surgeDriver,
        peakDeliveryWindow: cfg.peakDeliveryWindow,
        currentAllocatedCouriers: defaultCourierCount,
        recommendedCouriers,
        preAllocatedCouriers: preAllocated,
        courierCapacityParcels,
        capacityDelta,
        capacityCoveragePct,
        overtimeRiskHours,
        slaSafetyProbabilityPct,
        dailyTimeline
      };
    });
  }

  /**
   * Aggregates 7-day daily timelines across all regions into a composite macro forecast
   */
  public getAggregatedDemandTimeline(forecasts: RegionalDemandForecast[]): Array<{
    dayLabel: string;
    dateStr: string;
    historicalBaseline: number;
    predictedVolume: number;
    allocatedCapacity: number;
    surgeDelta: number;
    coveragePct: number;
  }> {
    if (forecasts.length === 0) return [];

    const daysCount = forecasts[0].dailyTimeline.length;
    const aggregated = [];

    for (let dayIdx = 0; dayIdx < daysCount; dayIdx++) {
      let totalHistorical = 0;
      let totalPredicted = 0;
      let totalCapacity = 0;
      const dayRef = forecasts[0].dailyTimeline[dayIdx];

      forecasts.forEach((f) => {
        const point = f.dailyTimeline[dayIdx];
        if (point) {
          totalHistorical += point.historicalBaseline;
          totalPredicted += point.predictedVolume;
          totalCapacity += point.allocatedCapacity;
        }
      });

      const coveragePct = Math.round((totalCapacity / totalPredicted) * 100);
      aggregated.push({
        dayLabel: dayRef.dayLabel,
        dateStr: dayRef.dateStr,
        historicalBaseline: totalHistorical,
        predictedVolume: totalPredicted,
        allocatedCapacity: totalCapacity,
        surgeDelta: totalPredicted - totalHistorical,
        coveragePct
      });
    }

    return aggregated;
  }

  /**
   * Algorithmic Auto-Balancer: Distributes couriers proportionally to projected surge volumes,
   * guaranteeing zero negative deficit where possible.
   */
  public autoBalanceCapacity(
    forecasts: RegionalDemandForecast[],
    totalPoolCouriers = 145
  ): Record<string, number> {
    const totalPredictedVolume = forecasts.reduce((sum, f) => sum + f.predictedSurgeVolume, 0);
    const allocations: Record<string, number> = {};

    let allocatedSum = 0;

    forecasts.forEach((f) => {
      // Proportional ratio
      const share = f.predictedSurgeVolume / totalPredictedVolume;
      const couriersNeeded = Math.round(totalPoolCouriers * share);
      allocations[f.regionId] = Math.max(10, couriersNeeded);
      allocatedSum += allocations[f.regionId];
    });

    // Reconcile rounding discrepancy to match totalPoolCouriers
    const diff = totalPoolCouriers - allocatedSum;
    if (diff !== 0 && forecasts.length > 0) {
      // Add or subtract from the highest volume region (Silicon Valley or East Bay)
      const topRegion = forecasts.reduce((max, f) => f.predictedSurgeVolume > max.predictedSurgeVolume ? f : max, forecasts[0]);
      allocations[topRegion.regionId] = Math.max(10, allocations[topRegion.regionId] + diff);
    }

    return allocations;
  }

  /**
   * Persists the Capacity Pre-Allocation Plan to storage and emits an operational notification
   */
  public savePreAllocationPlan(plan: RegionalCapacityPreAllocationPlan): void {
    try {
      const raw = localStorage.getItem(STORAGE_PLAN_KEY);
      const plans: Record<string, RegionalCapacityPreAllocationPlan> = raw ? JSON.parse(raw) : {};
      plans[plan.tenantId] = plan;
      localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(plans));

      // Emit platform notification for dispatchers
      storage.addNotification({
        title: 'Regional Capacity Pre-Allocation Committed',
        message: `Fleet operational capacity plan locked for ${plan.activeSurgeZonesCount} surge zones. Total capacity: ${plan.totalCourierCapacity} parcels across ${Object.values(plan.allocations).reduce((a, b) => a + b, 0)} couriers (${plan.overallCoveragePct}% coverage).`,
        category: 'SYSTEM_ALERT',
        severity: plan.overallCoveragePct >= 100 ? 'INFO' : 'CRITICAL'
      });

      storage.notify();
    } catch (e) {
      console.error('Failed saving regional pre-allocation plan:', e);
    }
  }

  /**
   * Retrieves the current saved Pre-Allocation Plan for the active tenant
   */
  public getSavedPreAllocationPlan(tenantId: string): RegionalCapacityPreAllocationPlan | null {
    try {
      const raw = localStorage.getItem(STORAGE_PLAN_KEY);
      if (!raw) return null;
      const plans: Record<string, RegionalCapacityPreAllocationPlan> = JSON.parse(raw);
      return plans[tenantId] || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Resets pre-allocations to OEM defaults
   */
  public resetToDefaults(tenantId: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_PLAN_KEY);
      if (!raw) return;
      const plans: Record<string, RegionalCapacityPreAllocationPlan> = JSON.parse(raw);
      delete plans[tenantId];
      localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(plans));
      storage.notify();
    } catch (e) {
      console.error('Failed resetting pre-allocations:', e);
    }
  }
}

export const regionalDemandForecastService = new RegionalDemandForecastService();
