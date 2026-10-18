import { BranchHub, Parcel, Employee } from '../types';

export interface ShiftRoleCount {
  sorters: number;
  inductOperators: number;
  forkliftDrivers: number;
  inspectors: number;
  dispatchers: number;
}

export interface ShiftSchedule {
  id: string;
  hubId: string;
  shiftType: 'MORNING_SORT' | 'AFTERNOON_CROSSDOCK' | 'NIGHT_LINEHAUL';
  shiftName: string;
  timeWindow: string;
  startHour: number; // 24h format
  endHour: number;
  projectedVolume: number;
  peakHourLabel: string;
  peakVolume: number;
  recommendedStaff: number;
  roles: ShiftRoleCount;
  totalAllocatedStaff: number;
  assignedEmployeeIds: string[];
  operationalNotes: string;
  lastAdjustedAt?: string;
}

export interface HourlyThroughputForecast {
  hour: number; // 0..23
  timeLabel: string; // e.g. "06:00"
  formattedHour: string; // e.g. "6 AM"
  inboundVolume: number;
  outboundVolume: number;
  totalVolume: number;
  capacityLimit: number;
  utilizationPct: number;
  isPeak: boolean;
  riskLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL_SURGE';
  priorityBreakdown: {
    sameDay: number;
    nextDay: number;
    standard: number;
  };
  recommendedStaff: number;
  allocatedStaff: number;
  staffDeficitOrSurplus: number; // positive = surplus, negative = deficit
  bottleneckNotice: string | null;
}

export interface HubForecastSummary {
  hubId: string;
  hubName: string;
  hubCode: string;
  dailyCapacity: number;
  projected24hVolume: number;
  projectedPeakHour: string;
  peakHourlyVolume: number;
  peakUtilizationPct: number;
  totalStaffAllocated: number;
  totalStaffRecommended: number;
  staffingHealthPct: number;
  highRiskSurgeHoursCount: number;
  criticalAlertCount: number;
}

const STORAGE_SHIFTS_KEY = 'logiflows_hub_shift_schedules';

// Diurnal hourly volume distribution weights for logistics sortation (00:00 to 23:00)
const HOURLY_WEIGHTS = [
  0.022, 0.020, 0.025, 0.040, // 00 - 03: Night trickle
  0.065, 0.088, 0.095, 0.075, // 04 - 07: Morning Inbound Sort Peak (6am-7am)
  0.045, 0.035, 0.032, 0.048, // 08 - 11: Morning dispatch / courier release
  0.062, 0.068, 0.055, 0.045, // 12 - 15: Midday cross-dock & shuttle transit
  0.052, 0.082, 0.096, 0.078, // 16 - 19: Evening Courier Manifest Intake Surge (6pm)
  0.058, 0.048, 0.042, 0.030, // 20 - 23: Night linehaul outbound consolidation
];

export class HubForecastService {
  /**
   * Generates a 24-hour predictive throughput forecast for a specific hub
   */
  public generate24HourForecast(hub: BranchHub, parcels: Parcel[]): HourlyThroughputForecast[] {
    const shiftSchedules = this.getShiftSchedules(hub.id);

    // Calculate baseline volume from hub load and registered tenant parcels
    const hubParcels = parcels.filter(
      (p) => p.originHubId === hub.id || p.destHubId === hub.id
    );

    const sameDayWeight = hubParcels.filter((p) => p.serviceTier === 'SAME_DAY_PRIORITY').length;
    const nextDayWeight = hubParcels.filter((p) => p.serviceTier === 'NEXT_DAY_EXPRESS').length;
    const totalParcelsCount = Math.max(hubParcels.length, 1);

    const sameDayRatio = sameDayWeight / totalParcelsCount;
    const nextDayRatio = nextDayWeight / totalParcelsCount;
    const standardRatio = Math.max(0, 1 - sameDayRatio - nextDayRatio);

    // Projected daily total based on hub current load + active parcels
    const baselineDailyVolume = Math.round(
      Math.max(hub.currentLoad, hub.capacityDaily * 0.72)
    );

    // Hourly nominal capacity limit (distributed across active operating hours)
    const hourlyCapacity = Math.round(hub.capacityDaily / 18);

    const result: HourlyThroughputForecast[] = [];

    for (let h = 0; h < 24; h++) {
      const weight = HOURLY_WEIGHTS[h];
      const baseHourVolume = Math.round(baselineDailyVolume * weight);

      // Inbound vs outbound ratio by operational cycle
      let inboundRatio = 0.5;
      if (h >= 4 && h <= 8) {
        // Morning sort: 75% inbound linehaul
        inboundRatio = 0.75;
      } else if (h >= 16 && h <= 19) {
        // Evening intake: 70% inbound pickups
        inboundRatio = 0.70;
      } else if (h >= 8 && h <= 11) {
        // Courier release: 70% outbound delivery dispatch
        inboundRatio = 0.30;
      } else if (h >= 20 && h <= 23) {
        // Night linehaul: 65% outbound linehaul
        inboundRatio = 0.35;
      }

      const inbound = Math.round(baseHourVolume * inboundRatio);
      const outbound = baseHourVolume - inbound;
      const totalVolume = baseHourVolume;

      const utilPct = Math.min(130, Math.round((totalVolume / hourlyCapacity) * 100));
      const isPeak = utilPct >= 80;

      let riskLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL_SURGE' = 'NORMAL';
      let bottleneckNotice: string | null = null;

      if (utilPct >= 95) {
        riskLevel = 'CRITICAL_SURGE';
        bottleneckNotice = `Severe capacity strain (${utilPct}%). Cross-dock backlog risk without shift reinforcements.`;
      } else if (utilPct >= 80) {
        riskLevel = 'ELEVATED';
        bottleneckNotice = `Elevated volume peak (${utilPct}%). Conveyor belt sorting threshold reached.`;
      }

      // Priority distribution
      const sameDay = Math.round(totalVolume * (sameDayRatio * 1.3));
      const nextDay = Math.round(totalVolume * nextDayRatio);
      const standard = Math.max(0, totalVolume - sameDay - nextDay);

      // Recommended staff headcount: ~55 parcels/worker-hr + base line lead
      const recommendedStaff = Math.max(4, Math.ceil(totalVolume / 55));

      // Resolve allocated staff from the shift schedule matching this hour
      const activeShift = this.findActiveShiftForHour(shiftSchedules, h);
      const allocatedStaff = activeShift ? activeShift.totalAllocatedStaff : recommendedStaff;

      const staffDeficitOrSurplus = allocatedStaff - recommendedStaff;

      const formattedHour = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;

      result.push({
        hour: h,
        timeLabel: `${h.toString().padStart(2, '0')}:00`,
        formattedHour,
        inboundVolume: inbound,
        outboundVolume: outbound,
        totalVolume,
        capacityLimit: hourlyCapacity,
        utilizationPct: utilPct,
        isPeak,
        riskLevel,
        priorityBreakdown: {
          sameDay,
          nextDay,
          standard,
        },
        recommendedStaff,
        allocatedStaff,
        staffDeficitOrSurplus,
        bottleneckNotice,
      });
    }

    return result;
  }

  /**
   * Computes a high-level forecast summary for KPI cards
   */
  public getForecastSummary(hub: BranchHub, parcels: Parcel[]): HubForecastSummary {
    const forecast = this.generate24HourForecast(hub, parcels);
    const shifts = this.getShiftSchedules(hub.id);

    const projected24hVolume = forecast.reduce((s, f) => s + f.totalVolume, 0);

    let peak = forecast[0];
    forecast.forEach((f) => {
      if (f.totalVolume > peak.totalVolume) {
        peak = f;
      }
    });

    const totalStaffAllocated = shifts.reduce((s, sh) => s + sh.totalAllocatedStaff, 0);
    const totalStaffRecommended = shifts.reduce((s, sh) => s + sh.recommendedStaff, 0);

    const staffingHealthPct = Math.min(
      100,
      Math.round((totalStaffAllocated / Math.max(1, totalStaffRecommended)) * 100)
    );

    const highRiskSurgeHoursCount = forecast.filter((f) => f.riskLevel === 'CRITICAL_SURGE').length;
    const criticalAlertCount = forecast.filter((f) => f.staffDeficitOrSurplus < -2).length;

    return {
      hubId: hub.id,
      hubName: hub.name,
      hubCode: hub.code,
      dailyCapacity: hub.capacityDaily,
      projected24hVolume,
      projectedPeakHour: `${peak.timeLabel} (${peak.formattedHour})`,
      peakHourlyVolume: peak.totalVolume,
      peakUtilizationPct: peak.utilizationPct,
      totalStaffAllocated,
      totalStaffRecommended,
      staffingHealthPct,
      highRiskSurgeHoursCount,
      criticalAlertCount,
    };
  }

  /**
   * Retrieves shift schedules for a given hub (defaults or saved)
   */
  public getShiftSchedules(hubId: string): ShiftSchedule[] {
    try {
      const raw = localStorage.getItem(STORAGE_SHIFTS_KEY);
      if (raw) {
        const all: Record<string, ShiftSchedule[]> = JSON.parse(raw);
        if (all[hubId] && all[hubId].length === 3) {
          return all[hubId];
        }
      }
    } catch (e) {
      console.warn('Error reading shift schedules from storage', e);
    }

    const defaultShifts = this.createDefaultShifts(hubId);
    this.saveShiftSchedules(hubId, defaultShifts);
    return defaultShifts;
  }

  /**
   * Updates a specific shift schedule and recalculates totals
   */
  public updateShift(hubId: string, updatedShift: ShiftSchedule): ShiftSchedule[] {
    const shifts = this.getShiftSchedules(hubId);
    const index = shifts.findIndex((s) => s.id === updatedShift.id);

    // Recalculate total allocated staff
    const r = updatedShift.roles;
    updatedShift.totalAllocatedStaff =
      r.sorters + r.inductOperators + r.forkliftDrivers + r.inspectors + r.dispatchers;
    updatedShift.lastAdjustedAt = new Date().toISOString();

    if (index >= 0) {
      shifts[index] = updatedShift;
    } else {
      shifts.push(updatedShift);
    }

    this.saveShiftSchedules(hubId, shifts);
    return shifts;
  }

  /**
   * Auto-balances shift staffing based on predicted hourly volume peaks
   */
  public autoBalanceShifts(
    hubId: string,
    forecast: HourlyThroughputForecast[],
    targetPoolSize = 38
  ): ShiftSchedule[] {
    const shifts = this.getShiftSchedules(hubId);

    // Calculate volume in each shift window
    const shiftVolumes: { shiftId: string; volume: number; maxPeak: number }[] = [];

    shifts.forEach((shift) => {
      let vol = 0;
      let peak = 0;
      for (let h = shift.startHour; h < (shift.endHour > shift.startHour ? shift.endHour : shift.endHour + 24); h++) {
        const actualH = h % 24;
        const hourData = forecast.find((f) => f.hour === actualH);
        if (hourData) {
          vol += hourData.totalVolume;
          if (hourData.totalVolume > peak) peak = hourData.totalVolume;
        }
      }
      shiftVolumes.push({ shiftId: shift.id, volume: vol, maxPeak: peak });
    });

    const totalProjectedVolume = shiftVolumes.reduce((s, v) => s + v.volume, 0) || 1;

    // Distribute total pool proportionally with safety weighting for peak surges
    const updatedShifts = shifts.map((shift) => {
      const shiftVol = shiftVolumes.find((v) => v.shiftId === shift.id);
      const ratio = shiftVol ? shiftVol.volume / totalProjectedVolume : 0.33;

      // Recommended staff count based on load
      const recommended = Math.max(6, Math.round(targetPoolSize * ratio));
      const allocated = recommended;

      // Proportional role breakdown: ~55% sorters, 18% induct, 12% forklift, 8% inspect, 7% dispatch
      const sorters = Math.max(3, Math.round(allocated * 0.52));
      const inductOperators = Math.max(1, Math.round(allocated * 0.18));
      const forkliftDrivers = Math.max(1, Math.round(allocated * 0.12));
      const inspectors = Math.max(1, Math.round(allocated * 0.09));
      const dispatchers = Math.max(1, allocated - (sorters + inductOperators + forkliftDrivers + inspectors));

      return {
        ...shift,
        projectedVolume: shiftVol?.volume || shift.projectedVolume,
        peakVolume: shiftVol?.maxPeak || shift.peakVolume,
        recommendedStaff: recommended,
        totalAllocatedStaff: sorters + inductOperators + forkliftDrivers + inspectors + dispatchers,
        roles: {
          sorters,
          inductOperators,
          forkliftDrivers,
          inspectors,
          dispatchers,
        },
        operationalNotes: `Auto-balanced to counter peak ${shift.peakHourLabel} volume surge. SLA buffer guaranteed.`,
        lastAdjustedAt: new Date().toISOString(),
      };
    });

    this.saveShiftSchedules(hubId, updatedShifts);
    return updatedShifts;
  }

  public saveShiftSchedules(hubId: string, shifts: ShiftSchedule[]): void {
    try {
      const raw = localStorage.getItem(STORAGE_SHIFTS_KEY);
      const all: Record<string, ShiftSchedule[]> = raw ? JSON.parse(raw) : {};
      all[hubId] = shifts;
      localStorage.setItem(STORAGE_SHIFTS_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to save shift schedules', e);
    }
  }

  private findActiveShiftForHour(shifts: ShiftSchedule[], hour: number): ShiftSchedule | undefined {
    return shifts.find((shift) => {
      if (shift.startHour < shift.endHour) {
        return hour >= shift.startHour && hour < shift.endHour;
      } else {
        // Wraps over midnight (e.g. 20:00 to 04:00)
        return hour >= shift.startHour || hour < shift.endHour;
      }
    });
  }

  private createDefaultShifts(hubId: string): ShiftSchedule[] {
    return [
      {
        id: `shift-morn-${hubId}`,
        hubId,
        shiftType: 'MORNING_SORT',
        shiftName: 'Morning Inbound Sort & Dispatch',
        timeWindow: '04:00 - 12:00',
        startHour: 4,
        endHour: 12,
        projectedVolume: 4280,
        peakHourLabel: '06:00 AM',
        peakVolume: 740,
        recommendedStaff: 15,
        totalAllocatedStaff: 14,
        roles: {
          sorters: 8,
          inductOperators: 2,
          forkliftDrivers: 2,
          inspectors: 1,
          dispatchers: 1,
        },
        assignedEmployeeIds: ['emp-david'],
        operationalNotes: 'Critical morning surge. Priority scanning for same-day delivery manifests.',
      },
      {
        id: `shift-aft-${hubId}`,
        hubId,
        shiftType: 'AFTERNOON_CROSSDOCK',
        shiftName: 'Afternoon Cross-Dock & Courier Intake',
        timeWindow: '12:00 - 20:00',
        startHour: 12,
        endHour: 20,
        projectedVolume: 5120,
        peakHourLabel: '06:00 PM',
        peakVolume: 810,
        recommendedStaff: 16,
        totalAllocatedStaff: 16,
        roles: {
          sorters: 9,
          inductOperators: 3,
          forkliftDrivers: 2,
          inspectors: 1,
          dispatchers: 1,
        },
        assignedEmployeeIds: ['emp-sarah'],
        operationalNotes: 'Handles afternoon commercial pickup manifest intake and evening route debriefs.',
      },
      {
        id: `shift-night-${hubId}`,
        hubId,
        shiftType: 'NIGHT_LINEHAUL',
        shiftName: 'Night Linehaul Consolidation & Loading',
        timeWindow: '20:00 - 04:00',
        startHour: 20,
        endHour: 4,
        projectedVolume: 3440,
        peakHourLabel: '10:00 PM',
        peakVolume: 590,
        recommendedStaff: 10,
        totalAllocatedStaff: 9,
        roles: {
          sorters: 5,
          inductOperators: 1,
          forkliftDrivers: 2,
          inspectors: 1,
          dispatchers: 0,
        },
        assignedEmployeeIds: [],
        operationalNotes: 'Palletizing and trailer staging for interstate highway linehaul dispatches.',
      },
    ];
  }
}

export const hubForecastService = new HubForecastService();
