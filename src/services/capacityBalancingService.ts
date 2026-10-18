import { 
  BranchHub, 
  Vehicle, 
  Parcel, 
  HubCongestionForecast, 
  HubHourlyForecast, 
  VehicleRerouteSuggestion, 
  CapacityBalancingMetrics 
} from '../types';
import { storage } from './storage';

const BALANCING_STORAGE_KEY = 'logiflows_capacity_balancing_state';

interface BalancingSavedState {
  appliedSuggestionIds: string[];
  dismissedSuggestionIds: string[];
  simulatedSurges: Record<string, number>; // hubId -> additional packages
  autoBalanceEnabled: boolean;
  maxUtilizationThreshold: number; // default 80%
  minIdleCutoffMinutes: number; // default 25 mins
}

class CapacityBalancingService {
  private getSavedState(): BalancingSavedState {
    const raw = localStorage.getItem(BALANCING_STORAGE_KEY);
    if (!raw) {
      return {
        appliedSuggestionIds: [],
        dismissedSuggestionIds: [],
        simulatedSurges: {},
        autoBalanceEnabled: false,
        maxUtilizationThreshold: 80,
        minIdleCutoffMinutes: 25,
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        appliedSuggestionIds: [],
        dismissedSuggestionIds: [],
        simulatedSurges: {},
        autoBalanceEnabled: false,
        maxUtilizationThreshold: 80,
        minIdleCutoffMinutes: 25,
      };
    }
  }

  private saveState(state: BalancingSavedState): void {
    localStorage.setItem(BALANCING_STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Generates hourly predictive congestion curve for a hub over the next 8 hours
   */
  public generateHourlyForecast(
    hub: BranchHub, 
    effectiveLoad: number, 
    capacity: number
  ): HubHourlyForecast[] {
    const currentHour = new Date().getHours();
    const hoursCount = 8;
    const forecast: HubHourlyForecast[] = [];

    // Typical diurnal distribution factors for freight sortation
    const hourMultipliers: Record<number, number> = {
      0: 0.6, 1: 0.5, 2: 0.5, 3: 0.6, 4: 0.8, 5: 1.0, 6: 1.15,
      7: 1.25, 8: 1.2, 9: 1.1, 10: 1.05, 11: 1.0, 12: 0.95,
      13: 1.05, 14: 1.2, 15: 1.3, 16: 1.35, 17: 1.25, 18: 1.1,
      19: 0.95, 20: 0.85, 21: 0.8, 22: 0.75, 23: 0.7
    };

    const isSjc = hub.code.includes('SJC');

    for (let i = 0; i < hoursCount; i++) {
      const h = (currentHour + i) % 24;
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      const baseMult = hourMultipliers[h] || 1.0;
      
      // Simulate peak build-up in congested hubs
      const peakBoost = isSjc && (h >= 13 && h <= 17) ? 1.18 : 1.0;
      const projected = Math.min(
        Math.round(capacity * 1.1),
        Math.round(effectiveLoad * (0.88 + (i * 0.03)) * baseMult * peakBoost)
      );

      const util = Math.round((projected / capacity) * 100);
      let risk: 'OPTIMAL' | 'MODERATE' | 'CONGESTED' | 'CRITICAL' = 'OPTIMAL';
      let dwell = 12;

      if (util >= 92) {
        risk = 'CRITICAL';
        dwell = Math.round(55 + (util - 92) * 4);
      } else if (util >= 82) {
        risk = 'CONGESTED';
        dwell = Math.round(35 + (util - 82) * 2);
      } else if (util >= 68) {
        risk = 'MODERATE';
        dwell = Math.round(18 + (util - 68) * 1.2);
      }

      forecast.push({
        hourLabel: hourStr,
        projectedPackages: projected,
        utilizationPct: util,
        estimatedGateDwellMin: dwell,
        risk
      });
    }

    return forecast;
  }

  /**
   * Forecasts capacity and congestion across all tenant hubs
   */
  public getHubCongestionForecasts(tenantId?: string): HubCongestionForecast[] {
    const hubs = storage.getHubs(tenantId);
    const vehicles = storage.getVehicles(tenantId);
    const state = this.getSavedState();

    return hubs.map((hub) => {
      const additionalSurge = state.simulatedSurges[hub.id] || 0;
      const effectiveLoad = hub.currentLoad + additionalSurge;
      const currentUtilizationPct = Math.round((effectiveLoad / hub.capacityDaily) * 100);

      const isSjc = hub.code.includes('SJC');
      const isOak = hub.code.includes('OAK');
      const isSfo = hub.code.includes('SFO');

      // Dock allocations and turnaround capacity
      const totalDocks = isOak ? 24 : isSjc ? 16 : isSfo ? 10 : 12;
      const activeDocks = isSjc 
        ? Math.min(totalDocks, 15) 
        : isOak 
        ? 18 
        : 5;

      const hourlyForecast = this.generateHourlyForecast(hub, effectiveLoad, hub.capacityDaily);

      // Find peak forecasted hour
      const peakForecast = [...hourlyForecast].sort((a, b) => b.utilizationPct - a.utilizationPct)[0];

      // Gate dwell wait time
      let avgGateWait = 14;
      if (currentUtilizationPct >= 90) {
        avgGateWait = 78;
      } else if (currentUtilizationPct >= 80) {
        avgGateWait = 46;
      } else if (currentUtilizationPct >= 70) {
        avgGateWait = 24;
      }

      // Count incoming vehicles targeting this branch
      const inboundVehicles = vehicles.filter(v => v.branchId === hub.id && v.status === 'ON_ROUTE');

      const surplusCapacity = Math.max(0, hub.capacityDaily - effectiveLoad);

      let status = hub.status;
      if (currentUtilizationPct >= 88) {
        status = 'CONGESTED';
      } else if (status === 'CONGESTED' && currentUtilizationPct < 75) {
        status = 'OPERATIONAL';
      }

      return {
        hubId: hub.id,
        hubCode: hub.code,
        hubName: hub.name,
        hubType: hub.type,
        capacityDaily: hub.capacityDaily,
        currentLoad: effectiveLoad,
        currentUtilizationPct,
        status,
        activeDocks,
        totalDocks,
        avgGateWaitMin: avgGateWait,
        projectedPeakHour: peakForecast.hourLabel,
        projectedPeakUtilizationPct: peakForecast.utilizationPct,
        hourlyForecast,
        inboundEnRouteVehiclesCount: inboundVehicles.length,
        surplusCapacityPackages: surplusCapacity,
      };
    });
  }

  /**
   * Generates optimal vehicle rerouting suggestions to balance hub loads and eliminate idle gate dwell
   */
  public getRerouteSuggestions(tenantId?: string): VehicleRerouteSuggestion[] {
    const hubForecasts = this.getHubCongestionForecasts(tenantId);
    const vehicles = storage.getVehicles(tenantId);
    const state = this.getSavedState();

    // Identify congested hubs (>= maxUtilizationThreshold or >80%)
    const threshold = state.maxUtilizationThreshold || 80;
    const congestedHubs = hubForecasts.filter(h => h.currentUtilizationPct >= threshold || h.status === 'CONGESTED');
    
    // Identify candidate recipient hubs with healthy surplus capacity (< 72% utilization)
    const underutilizedHubs = hubForecasts
      .filter(h => h.currentUtilizationPct < 72 && h.status === 'OPERATIONAL')
      .sort((a, b) => a.currentUtilizationPct - b.currentUtilizationPct);

    if (congestedHubs.length === 0 || underutilizedHubs.length === 0) {
      return [];
    }

    const suggestions: VehicleRerouteSuggestion[] = [];

    // Evaluate vehicles currently headed towards or assigned to congested hubs
    vehicles.forEach((veh) => {
      const targetHub = congestedHubs.find(h => h.hubId === veh.branchId);
      if (!targetHub) return;

      // Select optimal alternative hub
      const candidateHub = underutilizedHubs[0];
      if (!candidateHub) return;

      const suggestionId = `reroute-${veh.id}-${targetHub.hubId}-${candidateHub.hubId}`;
      const isApplied = state.appliedSuggestionIds.includes(suggestionId);
      const isDismissed = state.dismissedSuggestionIds.includes(suggestionId);

      // Quantify idle dwell time saved
      const currentDwell = targetHub.avgGateWaitMin;
      const candidateDwell = candidateHub.avgGateWaitMin;
      const dwellSaved = Math.max(10, currentDwell - candidateDwell);

      // Travel distance delta
      const distanceDelta = veh.type === 'HEAVY_HAUL' ? 12.4 : 8.6;
      const travelTimeDelta = Math.round(distanceDelta * 1.4); // approx 12 mins extra drive
      const netTimeSaved = Math.max(15, dwellSaved - travelTimeDelta);

      // Avoided idle fuel consumption (commercial idle consumes 2.1 - 3.4 L/hr)
      const idleFuelRatePerHour = veh.type === 'HEAVY_HAUL' ? 3.4 : 1.9;
      const fuelSaved = Math.round(((dwellSaved / 60) * idleFuelRatePerHour) * 10) / 10;
      const co2Saved = Math.round(fuelSaved * 2.68 * 10) / 10; // kg CO2

      const parcelsCount = Math.round((veh.currentLoadKg / (veh.capacityKg || 1000)) * 42) || 18;

      suggestions.push({
        id: suggestionId,
        vehicleId: veh.id,
        vehicleNumber: veh.vehicleNumber,
        driverName: veh.driverName || 'Unassigned Fleet Courier',
        vehicleType: veh.type,
        currentLoadKg: veh.currentLoadKg,
        capacityKg: veh.capacityKg,
        currentDestinationHubId: targetHub.hubId,
        currentDestinationHubName: targetHub.hubName,
        currentDestinationHubCode: targetHub.hubCode,
        currentCongestionLevel: targetHub.currentUtilizationPct,
        currentEstimatedWaitMin: targetHub.avgGateWaitMin,
        suggestedHubId: candidateHub.hubId,
        suggestedHubName: candidateHub.hubName,
        suggestedHubCode: candidateHub.hubCode,
        suggestedCongestionLevel: candidateHub.currentUtilizationPct,
        suggestedEstimatedWaitMin: candidateHub.avgGateWaitMin,
        idleTimeSavedMin: dwellSaved,
        distanceDeltaKm: distanceDelta,
        travelTimeDeltaMin: travelTimeDelta,
        netTimeSavedMin: netTimeSaved,
        idleFuelSavedLiters: fuelSaved,
        co2SavedKg: co2Saved,
        parcelsOnboardCount: parcelsCount,
        rationale: `Diverts load from ${targetHub.hubCode} (${targetHub.currentUtilizationPct}% capacity, ${targetHub.avgGateWaitMin}m queue) to ${candidateHub.hubCode} (${candidateHub.currentUtilizationPct}% capacity, open docks). Prevents vehicle idling.`,
        status: isApplied ? 'APPLIED' : isDismissed ? 'DISMISSED' : 'PROPOSED',
        appliedAt: isApplied ? new Date().toISOString() : undefined
      });
    });

    return suggestions;
  }

  /**
   * Applies an optimal vehicle reroute
   */
  public applyReroute(suggestionId: string): boolean {
    const state = this.getSavedState();
    const suggestions = this.getRerouteSuggestions();
    const suggestion = suggestions.find(s => s.id === suggestionId);

    if (!suggestion) return false;

    // Update vehicle branchId in storage
    const vehicles = storage.getVehicles();
    const targetVeh = vehicles.find(v => v.id === suggestion.vehicleId);
    if (targetVeh) {
      targetVeh.branchId = suggestion.suggestedHubId;
      // If idle, update coordinates slightly closer to target hub
      const hubs = storage.getHubs();
      const targetHub = hubs.find(h => h.id === suggestion.suggestedHubId);
      if (targetHub && targetVeh.status === 'AVAILABLE') {
        targetVeh.lastLocation = {
          ...targetVeh.lastLocation,
          lat: targetHub.lat + 0.005,
          lng: targetHub.lng + 0.005,
          updatedAt: new Date().toISOString()
        };
      }
      localStorage.setItem('logiflows_vehicles', JSON.stringify(vehicles));
    }

    if (!state.appliedSuggestionIds.includes(suggestionId)) {
      state.appliedSuggestionIds.push(suggestionId);
    }
    state.dismissedSuggestionIds = state.dismissedSuggestionIds.filter(id => id !== suggestionId);
    this.saveState(state);

    // Audit Notification
    storage.addNotification({
      title: 'Automated Capacity Reroute Executed',
      message: `Vehicle ${suggestion.vehicleNumber} successfully rerouted from ${suggestion.currentDestinationHubCode} to ${suggestion.suggestedHubCode}. Estimated idle dwell reduced by ${suggestion.netTimeSavedMin} minutes (${suggestion.idleFuelSavedLiters}L fuel saved).`,
      category: 'STATUS_CHANGE',
      severity: 'INFO'
    });

    storage.notify();
    return true;
  }

  /**
   * Batch applies all proposed reroute suggestions simultaneously
   */
  public applyAllReroutes(): number {
    const suggestions = this.getRerouteSuggestions();
    const proposed = suggestions.filter(s => s.status === 'PROPOSED');
    let appliedCount = 0;

    proposed.forEach(s => {
      if (this.applyReroute(s.id)) {
        appliedCount++;
      }
    });

    return appliedCount;
  }

  /**
   * Dismisses a suggested reroute
   */
  public dismissReroute(suggestionId: string): void {
    const state = this.getSavedState();
    if (!state.dismissedSuggestionIds.includes(suggestionId)) {
      state.dismissedSuggestionIds.push(suggestionId);
    }
    this.saveState(state);
    storage.notify();
  }

  /**
   * Simulates an unexpected inbound parcel surge at a specific hub to test dynamic balancing
   */
  public simulateHubSurge(hubId: string, additionalPackages: number = 2200): void {
    const state = this.getSavedState();
    state.simulatedSurges[hubId] = (state.simulatedSurges[hubId] || 0) + additionalPackages;
    // Clear previously applied suggestions for this hub so new dynamic reroutes trigger
    state.appliedSuggestionIds = state.appliedSuggestionIds.filter(id => !id.includes(hubId));
    this.saveState(state);

    const hubs = storage.getHubs();
    const hub = hubs.find(h => h.id === hubId);

    storage.addNotification({
      title: 'Simulated Inbound Parcel Surge',
      message: `Surge alert: +${additionalPackages.toLocaleString()} packages injected into ${hub?.name || 'regional hub'}. Capacity balancing engine calculated new vehicle diversions.`,
      category: 'DELIVERY_DELAY',
      severity: 'WARNING'
    });

    storage.notify();
  }

  /**
   * Resets simulated hub volume surges
   */
  public resetSimulatedSurges(): void {
    const state = this.getSavedState();
    state.simulatedSurges = {};
    state.appliedSuggestionIds = [];
    state.dismissedSuggestionIds = [];
    this.saveState(state);
    storage.notify();
  }

  /**
   * Sets auto-balancing toggle
   */
  public setAutoBalanceEnabled(enabled: boolean): void {
    const state = this.getSavedState();
    state.autoBalanceEnabled = enabled;
    this.saveState(state);
    storage.notify();
  }

  public isAutoBalanceEnabled(): boolean {
    return this.getSavedState().autoBalanceEnabled;
  }

  /**
   * Updates balancing threshold parameters
   */
  public updateThresholds(maxUtilization: number, minIdleWait: number): void {
    const state = this.getSavedState();
    state.maxUtilizationThreshold = maxUtilization;
    state.minIdleCutoffMinutes = minIdleWait;
    this.saveState(state);
    storage.notify();
  }

  public getThresholds(): { maxUtilization: number; minIdleWait: number } {
    const state = this.getSavedState();
    return {
      maxUtilization: state.maxUtilizationThreshold || 80,
      minIdleWait: state.minIdleCutoffMinutes || 25
    };
  }

  /**
   * Computes aggregate metrics for capacity balancing
   */
  public getBalancingMetrics(tenantId?: string): CapacityBalancingMetrics {
    const forecasts = this.getHubCongestionForecasts(tenantId);
    const suggestions = this.getRerouteSuggestions(tenantId);
    const state = this.getSavedState();

    const congestedCount = forecasts.filter(f => f.status === 'CONGESTED' || f.currentUtilizationPct >= 80).length;
    
    // Sum from all active and applied suggestions
    const totalIdleSaved = suggestions.reduce((sum, s) => sum + s.netTimeSavedMin, 0);
    const totalFuelSaved = suggestions.reduce((sum, s) => sum + s.idleFuelSavedLiters, 0);
    const totalCo2Saved = suggestions.reduce((sum, s) => sum + s.co2SavedKg, 0);
    const appliedCount = suggestions.filter(s => s.status === 'APPLIED').length;

    return {
      totalHubsMonitored: forecasts.length,
      congestedHubsCount: congestedCount,
      totalIdleMinutesSaved: totalIdleSaved,
      totalReroutesSuggested: suggestions.length,
      totalReroutesApplied: appliedCount,
      fuelSavedLiters: Math.round(totalFuelSaved * 10) / 10,
      co2AvoidedKg: Math.round(totalCo2Saved * 10) / 10,
      averageFleetDwellReductionPct: congestedCount > 0 ? 44 : 0
    };
  }
}

export const capacityBalancingService = new CapacityBalancingService();
