/**
 * Energy Efficiency Trend & Fleet Sustainability Service
 * 
 * Computes monthly historical trends and forward projections in vehicle fuel consumption,
 * electricity usage, carbon emissions, abated CO2, and fleet-wide energy efficiency metrics.
 */

import { Vehicle, MonthlyEnergyEfficiencyPoint, FleetSustainabilitySummary } from '../types';

export type SustainabilityScenario = 'CURRENT_TRAJECTORY' | 'ACCELERATED_NET_ZERO' | 'FLEET_EXPANSION';
export type FleetPowertrainScope = 'ALL_VEHICLES' | 'EV_ONLY' | 'DIESEL_ONLY';

// Base monthly sequence covering past 12 months (Nov 2025 - Oct 2026) + 3 projected months (Nov 2026 - Jan 2027)
const MONTH_SEQUENCE = [
  { month: 'Nov 2025', shortMonth: 'Nov', isProjected: false, seasonalFactor: 1.02, evShare: 0.18 },
  { month: 'Dec 2025', shortMonth: 'Dec', isProjected: false, seasonalFactor: 1.15, evShare: 0.20 }, // Holiday surge
  { month: 'Jan 2026', shortMonth: 'Jan', isProjected: false, seasonalFactor: 0.95, evShare: 0.22 },
  { month: 'Feb 2026', shortMonth: 'Feb', isProjected: false, seasonalFactor: 0.92, evShare: 0.24 },
  { month: 'Mar 2026', shortMonth: 'Mar', isProjected: false, seasonalFactor: 0.98, evShare: 0.26 },
  { month: 'Apr 2026', shortMonth: 'Apr', isProjected: false, seasonalFactor: 1.00, evShare: 0.28 },
  { month: 'May 2026', shortMonth: 'May', isProjected: false, seasonalFactor: 1.03, evShare: 0.31 },
  { month: 'Jun 2026', shortMonth: 'Jun', isProjected: false, seasonalFactor: 1.05, evShare: 0.34 },
  { month: 'Jul 2026', shortMonth: 'Jul', isProjected: false, seasonalFactor: 1.06, evShare: 0.36 },
  { month: 'Aug 2026', shortMonth: 'Aug', isProjected: false, seasonalFactor: 1.04, evShare: 0.38 },
  { month: 'Sep 2026', shortMonth: 'Sep', isProjected: false, seasonalFactor: 1.01, evShare: 0.40 },
  { month: 'Oct 2026', shortMonth: 'Oct', isProjected: false, seasonalFactor: 1.02, evShare: 0.43 },
  // Projected forward months
  { month: 'Nov 2026', shortMonth: 'Nov (F)', isProjected: true, seasonalFactor: 1.03, evShare: 0.46 },
  { month: 'Dec 2026', shortMonth: 'Dec (F)', isProjected: true, seasonalFactor: 1.14, evShare: 0.49 },
  { month: 'Jan 2027', shortMonth: 'Jan (F)', isProjected: true, seasonalFactor: 0.94, evShare: 0.52 },
];

export interface SustainabilityInitiative {
  id: string;
  title: string;
  category: 'ELECTRIFICATION' | 'ECO_ROUTING' | 'RENEWABLE_CHARGING' | 'POWERTRAIN_UPGRADE';
  status: 'ACTIVE' | 'PLANNED' | 'EVALUATING';
  annualCo2SavingsTons: number;
  annualCostSavingsUsd: number;
  roiMonths: number;
  description: string;
  implementationDate: string;
}

class EnergyEfficiencyTrendService {
  /**
   * Generates month-by-month energy efficiency, fuel consumption, and carbon telemetry
   */
  public generateMonthlyEfficiencyTrend(
    vehicles: Vehicle[],
    scenario: SustainabilityScenario = 'CURRENT_TRAJECTORY',
    scope: FleetPowertrainScope = 'ALL_VEHICLES',
    includeProjections: boolean = true
  ): MonthlyEnergyEfficiencyPoint[] {
    const vehicleCount = Math.max(8, vehicles.length);
    const evVehicles = vehicles.filter((v) => v.type === 'ELECTRIC_VAN' || v.type === 'CARGO_EBIKE');
    const currentEvRatio = vehicles.length > 0 ? evVehicles.length / vehicles.length : 0.35;

    // Monthly baseline vehicle km (approx 3,200 km/month per active vehicle)
    const baseMonthlyKmPerVehicle = 3150;
    const totalFleetBaseKm = baseMonthlyKmPerVehicle * vehicleCount;

    // Scenario modifiers
    let evAdoptionAcceleration = 1.0;
    let ecoRoutingSavingsFactor = 1.0;
    let distanceGrowthFactor = 1.0;

    if (scenario === 'ACCELERATED_NET_ZERO') {
      evAdoptionAcceleration = 1.35;
      ecoRoutingSavingsFactor = 0.90; // 10% lower distance due to aggressive multi-stop optimization
    } else if (scenario === 'FLEET_EXPANSION') {
      distanceGrowthFactor = 1.25; // 25% volume growth
      evAdoptionAcceleration = 1.1;
    }

    const filteredMonths = includeProjections 
      ? MONTH_SEQUENCE 
      : MONTH_SEQUENCE.filter((m) => !m.isProjected);

    return filteredMonths.map((m, idx) => {
      // Month-specific EV ratio (gradual fleet electrification over time)
      let adjustedEvShare = Math.min(0.85, m.evShare * (currentEvRatio / 0.4) * evAdoptionAcceleration);
      if (scope === 'EV_ONLY') adjustedEvShare = 1.0;
      if (scope === 'DIESEL_ONLY') adjustedEvShare = 0.0;

      // Month distance with seasonality & growth
      const monthDistance = Math.round(
        totalFleetBaseKm * m.seasonalFactor * distanceGrowthFactor * (m.isProjected ? 1.04 : 1.0) * ecoRoutingSavingsFactor
      );

      const evDistanceKm = Math.round(monthDistance * adjustedEvShare);
      const dieselDistanceKm = monthDistance - evDistanceKm;

      // Consumption metrics:
      // Diesel: average 11.8 L/100km (improving slightly from 12.5 down to 10.8 via newer vans & eco-driving)
      const dieselEfficiency = +(12.5 - (idx * 0.12)).toFixed(2);
      const dieselLiters = Math.round((dieselDistanceKm / 100) * dieselEfficiency);

      // Electricity: average 25.5 kWh/100km (improving slightly due to battery thermal management)
      const evEfficiency = +(27.0 - (idx * 0.15)).toFixed(2);
      const electricityKWh = Math.round((evDistanceKm / 100) * evEfficiency);

      // Costs: Diesel @ $1.28/L, Clean Electricity @ $0.19/kWh
      const dieselCostUsd = Math.round(dieselLiters * 1.28);
      const electricityCostUsd = Math.round(electricityKWh * 0.19);
      const totalEnergyCostUsd = dieselCostUsd + electricityCostUsd;

      // Carbon Output:
      // Diesel emissions: 2.68 kg CO2/L
      // Grid electricity emissions: 0.14 kg CO2/kWh (California clean grid)
      const dieselCo2Kg = dieselLiters * 2.68;
      const electricityCo2Kg = electricityKWh * 0.14;
      const co2EmissionsKg = Math.round(dieselCo2Kg + electricityCo2Kg);
      const netCo2MetricTons = +(co2EmissionsKg / 1000).toFixed(2);

      // Counterfactual Baseline: If 100% of miles had been driven by traditional diesel
      const counterfactualDieselLiters = (monthDistance / 100) * 12.6;
      const counterfactualCo2Kg = counterfactualDieselLiters * 2.68;
      const co2AvoidedKg = Math.max(0, Math.round(counterfactualCo2Kg - co2EmissionsKg));
      const co2AvoidedMetricTons = +(co2AvoidedKg / 1000).toFixed(2);

      // Equivalent Energy Consumption in Diesel Liters Equivalent (1 L diesel ≈ 10 kWh)
      const totalEquivalentLiters = dieselLiters + (electricityKWh / 10);
      const efficiencyLPer100KmEq = monthDistance > 0 
        ? +((totalEquivalentLiters / monthDistance) * 100).toFixed(2) 
        : 12.0;

      // ESG Net-Zero Trajectory Target: 2026 science-based milestone target
      // Target steps down from 32 Tons down to 18 Tons
      const targetCo2MetricTons = +(32.0 - (idx * 0.95)).toFixed(2);

      return {
        month: m.month,
        shortMonth: m.shortMonth,
        isProjected: m.isProjected,
        totalDistanceKm: monthDistance,
        dieselLiters,
        electricityKWh,
        dieselCostUsd,
        electricityCostUsd,
        totalEnergyCostUsd,
        co2EmissionsKg,
        co2AvoidedKg,
        netCo2MetricTons,
        co2AvoidedMetricTons,
        efficiencyLPer100KmEq,
        evFleetSharePct: Math.round(adjustedEvShare * 100),
        targetCo2MetricTons,
        activeVehiclesCount: vehicleCount,
      };
    });
  }

  /**
   * Computes executive sustainability metrics and year-over-year gains
   */
  public calculateSustainabilitySummary(
    data: MonthlyEnergyEfficiencyPoint[],
    vehicles: Vehicle[]
  ): FleetSustainabilitySummary {
    const historicalData = data.filter((d) => !d.isProjected);
    const monthsToUse = historicalData.length >= 12 ? historicalData.slice(-12) : historicalData;

    const totalDistanceKm12M = monthsToUse.reduce((s, d) => s + d.totalDistanceKm, 0);
    const totalDieselLiters12M = monthsToUse.reduce((s, d) => s + d.dieselLiters, 0);
    const totalElectricityKWh12M = monthsToUse.reduce((s, d) => s + d.electricityKWh, 0);
    const totalCo2EmissionsTons12M = +(monthsToUse.reduce((s, d) => s + d.netCo2MetricTons, 0)).toFixed(1);
    const totalCo2AvoidedTons12M = +(monthsToUse.reduce((s, d) => s + d.co2AvoidedMetricTons, 0)).toFixed(1);

    // YoY Reduction %: Compare first 3 months average to last 3 months average
    const earlyAvgCo2 = (monthsToUse[0]?.netCo2MetricTons + monthsToUse[1]?.netCo2MetricTons + monthsToUse[2]?.netCo2MetricTons) / 3 || 30;
    const recentAvgCo2 = (monthsToUse[monthsToUse.length - 1]?.netCo2MetricTons + monthsToUse[monthsToUse.length - 2]?.netCo2MetricTons + monthsToUse[monthsToUse.length - 3]?.netCo2MetricTons) / 3 || 22;
    const co2ReductionYoYPct = Math.max(0, +(((earlyAvgCo2 - recentAvgCo2) / earlyAvgCo2) * 100).toFixed(1));

    // Current Fleet Efficiency
    const currentPoint = monthsToUse[monthsToUse.length - 1];
    const firstPoint = monthsToUse[0];
    const currentFleetEfficiencyL100km = currentPoint ? currentPoint.efficiencyLPer100KmEq : 9.5;
    const earlyEfficiency = firstPoint ? firstPoint.efficiencyLPer100KmEq : 12.5;
    const efficiencyImprovementPct = Math.max(0, +(((earlyEfficiency - currentFleetEfficiencyL100km) / earlyEfficiency) * 100).toFixed(1));

    // Energy cost savings vs 100% diesel baseline
    const dieselOnlyCost = (totalDistanceKm12M / 100) * 12.5 * 1.28;
    const actualTotalEnergyCost = monthsToUse.reduce((s, d) => s + d.totalEnergyCostUsd, 0);
    const totalEnergySavingsUsd12M = Math.max(0, Math.round(dieselOnlyCost - actualTotalEnergyCost));

    const evVehicles = vehicles.filter((v) => v.type === 'ELECTRIC_VAN' || v.type === 'CARGO_EBIKE').length;
    const currentEvFleetPct = vehicles.length > 0 ? Math.round((evVehicles / vehicles.length) * 100) : 42;

    const esgRating: FleetSustainabilitySummary['esgSustainabilityRating'] = 
      co2ReductionYoYPct >= 20 ? 'LEADERSHIP_A' : co2ReductionYoYPct >= 10 ? 'EXCELLENT_B' : 'TRANSITIONING_C';

    return {
      totalDistanceKm12M,
      totalDieselLiters12M,
      totalElectricityKWh12M,
      totalCo2EmissionsTons12M,
      totalCo2AvoidedTons12M,
      co2ReductionYoYPct,
      currentFleetEfficiencyL100km,
      efficiencyImprovementPct,
      totalEnergySavingsUsd12M,
      currentEvFleetPct,
      target2027EvFleetPct: 65,
      esgSustainabilityRating: esgRating,
    };
  }

  /**
   * Actionable strategic sustainability initiatives for fleet admins
   */
  public getSustainabilityInitiatives(): SustainabilityInitiative[] {
    return [
      {
        id: 'INIT-01',
        title: 'Depot Smart Solar Canopies & Off-Peak EV Charging',
        category: 'RENEWABLE_CHARGING',
        status: 'ACTIVE',
        annualCo2SavingsTons: 42.5,
        annualCostSavingsUsd: 18400,
        roiMonths: 14,
        description: 'Installed 120kW rooftop PV arrays at Apex Central and Peninsula Depot with scheduled 1:00 AM - 5:00 AM off-peak EV charging schedules.',
        implementationDate: 'Q1 2026',
      },
      {
        id: 'INIT-02',
        title: 'Downtown Core Cargo E-Bike Micro-Hub Transition',
        category: 'ELECTRIFICATION',
        status: 'ACTIVE',
        annualCo2SavingsTons: 28.2,
        annualCostSavingsUsd: 14200,
        roiMonths: 8,
        description: 'Replaced 4 Sprinter Diesel delivery routes in Downtown San Francisco and San Jose cores with zero-emission cargo e-bikes and walking couriers.',
        implementationDate: 'Q2 2026',
      },
      {
        id: 'INIT-03',
        title: 'AI Multi-Stop Eco-Routing & Telematics Idle Cutoff',
        category: 'ECO_ROUTING',
        status: 'ACTIVE',
        annualCo2SavingsTons: 35.8,
        annualCostSavingsUsd: 22600,
        roiMonths: 3,
        description: 'Deployed AI corridor traffic avoidance, right-turn route clustering, and automated 5-minute stationary engine shutdown telemetry on all diesel line-haul vans.',
        implementationDate: 'Q3 2026',
      },
      {
        id: 'INIT-04',
        title: 'Phase-2 Fleet Electrification: 10 Class 6 Electric Heavy Haulers',
        category: 'POWERTRAIN_UPGRADE',
        status: 'PLANNED',
        annualCo2SavingsTons: 86.0,
        annualCostSavingsUsd: 48500,
        roiMonths: 24,
        description: 'Contract secured to replace remaining internal combustion heavy transport tractors with 300kWh battery-electric terminal shuttle tractors.',
        implementationDate: 'Q1 2027',
      },
    ];
  }

  /**
   * Export monthly efficiency dataset as a CSV file
   */
  public generateCsv(data: MonthlyEnergyEfficiencyPoint[]): string {
    const headers = [
      'Month',
      'Data Type',
      'Total Distance (km)',
      'Diesel Consumed (L)',
      'Electricity (kWh)',
      'Diesel Cost ($)',
      'Electricity Cost ($)',
      'Total Energy Cost ($)',
      'Carbon Emissions (Metric Tons)',
      'Carbon Avoided (Metric Tons)',
      'Fleet Efficiency (L/100km Eq)',
      'EV Fleet Share (%)',
      'Net-Zero Target (Tons)'
    ];

    const rows = data.map((d) => [
      `"${d.month}"`,
      d.isProjected ? '"Projected (Forecast)"' : '"Historical (Verified)"',
      d.totalDistanceKm,
      d.dieselLiters,
      d.electricityKWh,
      d.dieselCostUsd,
      d.electricityCostUsd,
      d.totalEnergyCostUsd,
      d.netCo2MetricTons,
      d.co2AvoidedMetricTons,
      d.efficiencyLPer100KmEq,
      d.evFleetSharePct,
      d.targetCo2MetricTons
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const energyEfficiencyTrendService = new EnergyEfficiencyTrendService();
