import { storage } from './storage';
import { Vehicle } from '../types';

export type TerrainProfile = 'FLAT_HIGHWAY' | 'ROLLING_URBAN' | 'STEEP_HILLS';
export type TrafficProfile = 'LIGHT' | 'MODERATE' | 'CONGESTED';

export interface ScheduledRoute {
  id: string;
  routeCode: string;
  name: string;
  originHubName: string;
  originHubCode: string;
  destinationZone: string;
  scheduledDeparture: string;
  estimatedArrival: string;
  totalDistanceKm: number;
  cargoPayloadKg: number;
  stopsCount: number;
  assignedVehicleId: string;
  assignedVehicleNumber: string;
  assignedVehicleType: string;
  fuelType: 'ELECTRIC' | 'DIESEL' | 'UNLEADED';
  driverName: string;
  terrainProfile: TerrainProfile;
  trafficProfile: TrafficProfile;
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED';
}

export interface RouteCarbonImpact {
  route: ScheduledRoute;
  estimatedFuelOrEnergyBurn: number;
  fuelUnit: 'L' | 'kWh';
  consumptionRatePer100Km: number;
  projectedCO2Kg: number;
  baselineDieselCO2Kg: number;
  carbonSavingsKg: number;
  carbonSavingsPct: number;
  carbonPerStopKg: number;
  projectedFuelCostUsd: number;
  treesEquivalentAnnual: number;
  ecoGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  recommendedEcoAlternative?: {
    suggestedVehicleId: string;
    suggestedVehicleNumber: string;
    suggestedVehicleType: string;
    alternativeCO2Kg: number;
    potentialAdditionalCO2SavedKg: number;
    costSavingsUsd: number;
    recommendationReason: string;
  };
}

export interface RouteEstimatorSimulatorInput {
  distanceKm: number;
  cargoPayloadKg: number;
  stopsCount: number;
  vehicleId: string;
  terrain: TerrainProfile;
  traffic: TrafficProfile;
  gridPowerSource: 'CA_STANDARD_GRID' | '100_PCT_SOLAR_RENEWABLE';
}

const INITIAL_SCHEDULED_ROUTES: ScheduledRoute[] = [
  {
    id: 'sched-rt-401',
    routeCode: 'APX-RT-401',
    name: 'Bayview Maritime to SFO Air Cargo Hub Corridor',
    originHubName: 'Apex Central Maritime Sorting Hub',
    originHubCode: 'APX-OAK-01',
    destinationZone: 'San Francisco International Airport Logistics Core',
    scheduledDeparture: '08:30 AM',
    estimatedArrival: '10:15 AM',
    totalDistanceKm: 64.5,
    cargoPayloadKg: 620,
    stopsCount: 14,
    assignedVehicleId: 'veh-ev-101',
    assignedVehicleNumber: 'APX-EV-101',
    assignedVehicleType: 'ELECTRIC_VAN',
    fuelType: 'ELECTRIC',
    driverName: 'Marcus Vance',
    terrainProfile: 'FLAT_HIGHWAY',
    trafficProfile: 'MODERATE',
    status: 'SCHEDULED'
  },
  {
    id: 'sched-rt-402',
    routeCode: 'APX-RT-402',
    name: 'Silicon Valley Tech Park Micro-Distribution Run',
    originHubName: 'Apex Silicon Valley Tech Distribution Center',
    originHubCode: 'APX-SJC-02',
    destinationZone: 'Cupertino & Sunnyvale Enterprise Campuses',
    scheduledDeparture: '09:00 AM',
    estimatedArrival: '11:45 AM',
    totalDistanceKm: 78.0,
    cargoPayloadKg: 850,
    stopsCount: 22,
    assignedVehicleId: 'veh-ev-102',
    assignedVehicleNumber: 'APX-SP-102',
    assignedVehicleType: 'SPRINTER_VAN',
    fuelType: 'DIESEL',
    driverName: 'Carlos Montoya',
    terrainProfile: 'ROLLING_URBAN',
    trafficProfile: 'CONGESTED',
    status: 'SCHEDULED'
  },
  {
    id: 'sched-rt-403',
    routeCode: 'APX-RT-403',
    name: 'Financial District & SOMA Zero-Emission Last-Mile Loop',
    originHubName: 'Apex Peninsula Last-Mile Depot',
    originHubCode: 'APX-SFO-03',
    destinationZone: 'Downtown SF Financial District & Market St',
    scheduledDeparture: '08:00 AM',
    estimatedArrival: '11:30 AM',
    totalDistanceKm: 34.0,
    cargoPayloadKg: 110,
    stopsCount: 38,
    assignedVehicleId: 'veh-ebike-04',
    assignedVehicleNumber: 'APX-EBIKE-04',
    assignedVehicleType: 'CARGO_EBIKE',
    fuelType: 'ELECTRIC',
    driverName: 'Aisha Jordan',
    terrainProfile: 'FLAT_HIGHWAY',
    trafficProfile: 'CONGESTED',
    status: 'SCHEDULED'
  },
  {
    id: 'sched-rt-404',
    routeCode: 'APX-RT-404',
    name: 'South San Francisco Biotech & Peninsula Spine',
    originHubName: 'Apex Peninsula Last-Mile Depot',
    originHubCode: 'APX-SFO-03',
    destinationZone: 'Oyster Point & San Mateo Healthcare Facilities',
    scheduledDeparture: '09:15 AM',
    estimatedArrival: '12:00 PM',
    totalDistanceKm: 58.2,
    cargoPayloadKg: 490,
    stopsCount: 16,
    assignedVehicleId: 'veh-ev-104',
    assignedVehicleNumber: 'APX-EV-104',
    assignedVehicleType: 'ELECTRIC_VAN',
    fuelType: 'ELECTRIC',
    driverName: 'Mateo Chen',
    terrainProfile: 'ROLLING_URBAN',
    trafficProfile: 'LIGHT',
    status: 'SCHEDULED'
  },
  {
    id: 'sched-rt-405',
    routeCode: 'APX-RT-405',
    name: 'East Bay Hills & Berkeley University Elevation Line',
    originHubName: 'Apex Central Maritime Sorting Hub',
    originHubCode: 'APX-OAK-01',
    destinationZone: 'UC Berkeley Campus & Grizzly Peak Deliveries',
    scheduledDeparture: '10:00 AM',
    estimatedArrival: '01:30 PM',
    totalDistanceKm: 52.0,
    cargoPayloadKg: 580,
    stopsCount: 20,
    assignedVehicleId: 'veh-sp-103',
    assignedVehicleNumber: 'APX-SP-103',
    assignedVehicleType: 'SPRINTER_VAN',
    fuelType: 'UNLEADED',
    driverName: 'Elena Rostova',
    terrainProfile: 'STEEP_HILLS',
    trafficProfile: 'MODERATE',
    status: 'SCHEDULED'
  },
  {
    id: 'sched-rt-406',
    routeCode: 'APX-RT-406',
    name: 'Port of Oakland Intermodal Heavy Freight Trunkline',
    originHubName: 'Apex Central Maritime Sorting Hub',
    originHubCode: 'APX-OAK-01',
    destinationZone: 'Fremont Auto Assembly & Warm Springs Warehouses',
    scheduledDeparture: '07:30 AM',
    estimatedArrival: '11:00 AM',
    totalDistanceKm: 114.0,
    cargoPayloadKg: 6400,
    stopsCount: 6,
    assignedVehicleId: 'veh-hv-301',
    assignedVehicleNumber: 'APX-HV-301',
    assignedVehicleType: 'HEAVY_HAUL',
    fuelType: 'DIESEL',
    driverName: 'Robert Lang',
    terrainProfile: 'FLAT_HIGHWAY',
    trafficProfile: 'MODERATE',
    status: 'SCHEDULED'
  }
];

const STORAGE_KEY_ROUTES = 'logiflows_scheduled_routes';

export class RouteCarbonEstimationService {
  public getScheduledRoutes(): ScheduledRoute[] {
    const raw = localStorage.getItem(STORAGE_KEY_ROUTES);
    return raw ? JSON.parse(raw) : INITIAL_SCHEDULED_ROUTES;
  }

  public saveScheduledRoutes(routes: ScheduledRoute[]): void {
    localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes));
  }

  /**
   * Scientific Carbon Emission & Fuel Estimation Engine:
   * Uses GLEC & EPA standard commercial logistics emission factors with adjustments
   * for cargo mass, route topography grade, traffic idling, and electricity grid mix.
   */
  public calculateRouteImpact(
    route: ScheduledRoute,
    overrideVehicle?: Vehicle,
    gridPowerSource: 'CA_STANDARD_GRID' | '100_PCT_SOLAR_RENEWABLE' = 'CA_STANDARD_GRID'
  ): RouteCarbonImpact {
    const vehicles = storage.getVehicles();
    const veh = overrideVehicle || vehicles.find(v => v.id === route.assignedVehicleId) || vehicles[0];

    const isElectric = veh.type === 'ELECTRIC_VAN' || veh.type === 'CARGO_EBIKE';
    const fuelType: 'ELECTRIC' | 'DIESEL' | 'UNLEADED' = isElectric ? 'ELECTRIC' : (veh.fuelType || 'DIESEL');

    // Base consumption rates per 100km
    let baseRate = veh.avgConsumptionPer100Km || (
      veh.type === 'CARGO_EBIKE' ? 1.35 :
      veh.type === 'ELECTRIC_VAN' ? 26.5 :
      veh.type === 'HEAVY_HAUL' ? 33.5 :
      fuelType === 'UNLEADED' ? 12.4 : 11.2
    );

    // 1. Cargo payload mass adjustment: ~0.5% consumption increase per 100kg
    const payloadMultiplier = 1 + (route.cargoPayloadKg / 100) * 0.005;

    // 2. Terrain Profile adjustment
    let terrainMultiplier = 1.0;
    if (route.terrainProfile === 'FLAT_HIGHWAY') {
      terrainMultiplier = 0.94;
    } else if (route.terrainProfile === 'ROLLING_URBAN') {
      terrainMultiplier = 1.05;
    } else if (route.terrainProfile === 'STEEP_HILLS') {
      // EVs recover ~35% energy on descent via regenerative braking
      terrainMultiplier = isElectric ? 1.08 : 1.20;
    }

    // 3. Traffic Congestion profile
    let trafficMultiplier = 1.0;
    if (route.trafficProfile === 'LIGHT') {
      trafficMultiplier = 0.95;
    } else if (route.trafficProfile === 'MODERATE') {
      trafficMultiplier = 1.05;
    } else if (route.trafficProfile === 'CONGESTED') {
      // ICE vehicles suffer severe penalty during stop-and-go idle; EVs do not idle burn fuel
      trafficMultiplier = isElectric ? 1.06 : 1.24;
    }

    // Adjusted consumption per 100 km
    const adjustedRate = +(baseRate * payloadMultiplier * terrainMultiplier * trafficMultiplier).toFixed(2);
    const fuelUnit: 'L' | 'kWh' = isElectric ? 'kWh' : 'L';
    const totalBurn = +((route.totalDistanceKm / 100) * adjustedRate).toFixed(2);

    // Emission Factors (kg CO2 per unit)
    // CA Grid: 0.14 kg CO2/kWh | 100% Solar: 0.03 kg CO2/kWh (lifecycle)
    // Diesel: 2.68 kg CO2/L | Unleaded: 2.31 kg CO2/L
    let co2Factor = 2.68;
    if (fuelType === 'ELECTRIC') {
      co2Factor = gridPowerSource === '100_PCT_SOLAR_RENEWABLE' ? 0.03 : 0.14;
    } else if (fuelType === 'UNLEADED') {
      co2Factor = 2.31;
    }

    const projectedCO2Kg = +(totalBurn * co2Factor).toFixed(2);

    // Baseline: Standard diesel delivery van burning 12.5 L/100km * 2.68 = 0.335 kg CO2/km
    const baselineDieselUnits = (route.totalDistanceKm / 100) * 12.5 * payloadMultiplier;
    const baselineDieselCO2Kg = +(baselineDieselUnits * 2.68).toFixed(2);

    const carbonSavingsKg = Math.max(0, +(baselineDieselCO2Kg - projectedCO2Kg).toFixed(2));
    const carbonSavingsPct = Math.round((carbonSavingsKg / baselineDieselCO2Kg) * 100);
    const carbonPerStopKg = route.stopsCount > 0 ? +(projectedCO2Kg / route.stopsCount).toFixed(3) : 0;

    // Fuel Cost Estimation
    const unitPrice = fuelType === 'ELECTRIC' ? 0.19 : fuelType === 'UNLEADED' ? 1.12 : 1.25;
    const projectedFuelCostUsd = +(totalBurn * unitPrice).toFixed(2);

    // Mature trees annual carbon offset equivalent (1 tree absorbs ~21.77 kg CO2/yr)
    const treesEquivalentAnnual = +(carbonSavingsKg / 21.77).toFixed(1);

    // Eco Grade
    let ecoGrade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
    if (veh.type === 'CARGO_EBIKE') ecoGrade = 'A+';
    else if (isElectric) ecoGrade = 'A';
    else if (fuelType === 'DIESEL' && adjustedRate <= 11.5) ecoGrade = 'B';
    else if (veh.type === 'HEAVY_HAUL') ecoGrade = 'D';
    else ecoGrade = 'C';

    // Proactive Eco-Optimization Recommendation (if route uses diesel or gas and an EV is viable)
    let recommendedEcoAlternative = undefined;
    if (!isElectric && route.cargoPayloadKg <= 1200) {
      const availableEV = vehicles.find(v => v.type === 'ELECTRIC_VAN' && v.id !== veh.id);
      if (availableEV) {
        const evBurn = (route.totalDistanceKm / 100) * (availableEV.avgConsumptionPer100Km || 26.5) * payloadMultiplier * 1.02;
        const evCO2 = +(evBurn * 0.14).toFixed(2);
        const additionalSaved = Math.max(0, +(projectedCO2Kg - evCO2).toFixed(2));
        const evCost = +(evBurn * 0.19).toFixed(2);
        const costSaved = Math.max(0, +(projectedFuelCostUsd - evCost).toFixed(2));

        recommendedEcoAlternative = {
          suggestedVehicleId: availableEV.id,
          suggestedVehicleNumber: availableEV.vehicleNumber,
          suggestedVehicleType: availableEV.type,
          alternativeCO2Kg: evCO2,
          potentialAdditionalCO2SavedKg: additionalSaved,
          costSavingsUsd: costSaved,
          recommendationReason: `Switch to ${availableEV.vehicleNumber} (Electric) to eliminate ${additionalSaved} kg CO₂ emissions and save $${costSaved} in operational energy cost.`
        };
      }
    }

    return {
      route,
      estimatedFuelOrEnergyBurn: totalBurn,
      fuelUnit,
      consumptionRatePer100Km: adjustedRate,
      projectedCO2Kg,
      baselineDieselCO2Kg,
      carbonSavingsKg,
      carbonSavingsPct,
      carbonPerStopKg,
      projectedFuelCostUsd,
      treesEquivalentAnnual,
      ecoGrade,
      recommendedEcoAlternative
    };
  }

  public calculateAllScheduledRoutesImpact(): {
    impacts: RouteCarbonImpact[];
    summary: {
      totalDistanceKm: number;
      totalProjectedCO2Kg: number;
      totalBaselineCO2Kg: number;
      totalCarbonSavedKg: number;
      overallFleetReductionPct: number;
      totalFuelCostUsd: number;
      electricRoutesCount: number;
      combustionRoutesCount: number;
      equivalentTreesPlanted: number;
    };
  } {
    const routes = this.getScheduledRoutes();
    const impacts = routes.map(r => this.calculateRouteImpact(r));

    const totalDistance = Math.round(impacts.reduce((acc, i) => acc + i.route.totalDistanceKm, 0) * 10) / 10;
    const totalProjected = Math.round(impacts.reduce((acc, i) => acc + i.projectedCO2Kg, 0) * 10) / 10;
    const totalBaseline = Math.round(impacts.reduce((acc, i) => acc + i.baselineDieselCO2Kg, 0) * 10) / 10;
    const totalSaved = Math.round(impacts.reduce((acc, i) => acc + i.carbonSavingsKg, 0) * 10) / 10;
    const totalCost = Math.round(impacts.reduce((acc, i) => acc + i.projectedFuelCostUsd, 0) * 100) / 100;
    const electricCount = impacts.filter(i => i.fuelUnit === 'kWh').length;
    const combustionCount = impacts.length - electricCount;
    const overallReduction = totalBaseline > 0 ? Math.round((totalSaved / totalBaseline) * 100) : 0;
    const equivalentTrees = +(totalSaved / 21.77).toFixed(1);

    return {
      impacts,
      summary: {
        totalDistanceKm: totalDistance,
        totalProjectedCO2Kg: totalProjected,
        totalBaselineCO2Kg: totalBaseline,
        totalCarbonSavedKg: totalSaved,
        overallFleetReductionPct: overallReduction,
        totalFuelCostUsd: totalCost,
        electricRoutesCount: electricCount,
        combustionRoutesCount: combustionCount,
        equivalentTreesPlanted: equivalentTrees
      }
    };
  }

  /**
   * Reassign a scheduled route to an eco-optimized alternative vehicle
   */
  public reassignRouteVehicle(routeId: string, newVehicleId: string): ScheduledRoute | null {
    const routes = this.getScheduledRoutes();
    const vehicles = storage.getVehicles();
    const index = routes.findIndex(r => r.id === routeId);
    if (index === -1) return null;

    const newVeh = vehicles.find(v => v.id === newVehicleId);
    if (!newVeh) return null;

    const isElectric = newVeh.type === 'ELECTRIC_VAN' || newVeh.type === 'CARGO_EBIKE';

    routes[index].assignedVehicleId = newVeh.id;
    routes[index].assignedVehicleNumber = newVeh.vehicleNumber;
    routes[index].assignedVehicleType = newVeh.type;
    routes[index].fuelType = isElectric ? 'ELECTRIC' : (newVeh.fuelType || 'DIESEL');
    if (newVeh.driverName) {
      routes[index].driverName = newVeh.driverName;
    }

    this.saveScheduledRoutes(routes);

    // Notification
    storage.addNotification({
      title: 'Route Assigned to Eco-Vehicle',
      message: `${routes[index].name} successfully reassigned to ${newVeh.vehicleNumber} (${newVeh.type.replace(/_/g, ' ')}). Lower CO₂ footprint active.`,
      category: 'STATUS_CHANGE',
      severity: 'INFO'
    });

    return routes[index];
  }
}

export const routeCarbonEstimationService = new RouteCarbonEstimationService();
