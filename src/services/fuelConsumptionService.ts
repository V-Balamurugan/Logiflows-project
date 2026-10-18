import { Vehicle } from '../types';

export interface FuelPricePoint {
  date: string;
  dieselPerLiter: number;
  unleadedPerLiter: number;
  electricityPerKWh: number;
  dieselPerGallon: number;
  unleadedPerGallon: number;
}

export interface VehicleConsumptionRecord {
  vehicleId: string;
  vehicleNumber: string;
  type: string;
  fuelType: 'DIESEL' | 'ELECTRIC' | 'UNLEADED';
  driverName: string;
  odometerKm: number;
  dailyMileageKm: number;
  weeklyMileageKm: number;
  monthlyMileageKm: number;
  consumptionPer100Km: number; // Liters or kWh
  unitLabel: 'L' | 'kWh';
  dailyUnitsConsumed: number;
  monthlyUnitsConsumed: number;
  dailyCostUsd: number;
  weeklyCostUsd: number;
  monthlyCostUsd: number;
  costPerKmUsd: number;
  carbonEmittedKgDaily: number;
  carbonSavingsKgVsDiesel: number;
  efficiencyRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_TUNEUP';
}

export interface FleetFuelSummary {
  totalDailyMileageKm: number;
  totalMonthlyMileageKm: number;
  totalDailyCostUsd: number;
  totalMonthlyCostUsd: number;
  totalAnnualProjectedCostUsd: number;
  fleetAvgCostPerKmUsd: number;
  electricFleetPercentage: number;
  monthlySavingsFromEVUsd: number;
  totalMonthlyCO2Kg: number;
  monthlyCO2AvoidedKg: number;
}

// 30-Day Historical Spot Price Telemetry (California Commercial Logistics Corridor Rates)
export const HISTORICAL_FUEL_PRICES: FuelPricePoint[] = [
  { date: 'Sep 12', dieselPerLiter: 1.34, unleadedPerLiter: 1.22, electricityPerKWh: 0.21, dieselPerGallon: 5.07, unleadedPerGallon: 4.62 },
  { date: 'Sep 15', dieselPerLiter: 1.36, unleadedPerLiter: 1.23, electricityPerKWh: 0.21, dieselPerGallon: 5.15, unleadedPerGallon: 4.66 },
  { date: 'Sep 18', dieselPerLiter: 1.35, unleadedPerLiter: 1.21, electricityPerKWh: 0.22, dieselPerGallon: 5.11, unleadedPerGallon: 4.58 },
  { date: 'Sep 21', dieselPerLiter: 1.33, unleadedPerLiter: 1.20, electricityPerKWh: 0.22, dieselPerGallon: 5.03, unleadedPerGallon: 4.54 },
  { date: 'Sep 24', dieselPerLiter: 1.32, unleadedPerLiter: 1.19, electricityPerKWh: 0.21, dieselPerGallon: 5.00, unleadedPerGallon: 4.50 },
  { date: 'Sep 27', dieselPerLiter: 1.31, unleadedPerLiter: 1.18, electricityPerKWh: 0.21, dieselPerGallon: 4.96, unleadedPerGallon: 4.47 },
  { date: 'Sep 30', dieselPerLiter: 1.30, unleadedPerLiter: 1.17, electricityPerKWh: 0.20, dieselPerGallon: 4.92, unleadedPerGallon: 4.43 },
  { date: 'Oct 03', dieselPerLiter: 1.28, unleadedPerLiter: 1.16, electricityPerKWh: 0.20, dieselPerGallon: 4.85, unleadedPerGallon: 4.39 },
  { date: 'Oct 06', dieselPerLiter: 1.29, unleadedPerLiter: 1.15, electricityPerKWh: 0.21, dieselPerGallon: 4.88, unleadedPerGallon: 4.35 },
  { date: 'Oct 08', dieselPerLiter: 1.27, unleadedPerLiter: 1.14, electricityPerKWh: 0.20, dieselPerGallon: 4.81, unleadedPerGallon: 4.32 },
  { date: 'Oct 10', dieselPerLiter: 1.26, unleadedPerLiter: 1.13, electricityPerKWh: 0.19, dieselPerGallon: 4.77, unleadedPerGallon: 4.28 },
  { date: 'Oct 11', dieselPerLiter: 1.25, unleadedPerLiter: 1.12, electricityPerKWh: 0.19, dieselPerGallon: 4.73, unleadedPerGallon: 4.24 },
];

export const CURRENT_SPOT_PRICES = {
  dieselPerLiter: 1.25,
  dieselPerGallon: 4.73,
  unleadedPerLiter: 1.12,
  unleadedPerGallon: 4.24,
  electricityPerKWh: 0.19,
};

export class FuelConsumptionService {
  private static instance: FuelConsumptionService;

  public static getInstance(): FuelConsumptionService {
    if (!FuelConsumptionService.instance) {
      FuelConsumptionService.instance = new FuelConsumptionService();
    }
    return FuelConsumptionService.instance;
  }

  public calculateVehicleConsumption(
    veh: Vehicle,
    priceBasis: {
      dieselPerLiter: number;
      unleadedPerLiter: number;
      electricityPerKWh: number;
    } = CURRENT_SPOT_PRICES,
    mileageMultiplier: number = 1.0
  ): VehicleConsumptionRecord {
    const dailyKm = Math.round((veh.dailyMileageKm || 140) * mileageMultiplier);
    const weeklyKm = dailyKm * 6;
    const monthlyKm = dailyKm * 26; // 26 working delivery shifts

    const fuelType: 'DIESEL' | 'ELECTRIC' | 'UNLEADED' =
      veh.fuelType ||
      (veh.type === 'ELECTRIC_VAN' || veh.type === 'CARGO_EBIKE'
        ? 'ELECTRIC'
        : veh.type === 'HEAVY_HAUL'
        ? 'DIESEL'
        : 'DIESEL');

    // Default consumption rates per 100km if not set
    let rate = veh.avgConsumptionPer100Km;
    if (!rate) {
      if (fuelType === 'ELECTRIC') {
        rate = veh.type === 'CARGO_EBIKE' ? 1.4 : 28.0;
      } else if (fuelType === 'DIESEL') {
        rate = veh.type === 'HEAVY_HAUL' ? 33.5 : 11.2;
      } else {
        rate = 12.4;
      }
    }

    const unitLabel: 'L' | 'kWh' = fuelType === 'ELECTRIC' ? 'kWh' : 'L';
    const dailyUnits = +((dailyKm / 100) * rate).toFixed(2);
    const monthlyUnits = +((monthlyKm / 100) * rate).toFixed(2);

    // Price unit selection
    let unitPrice = priceBasis.dieselPerLiter;
    if (fuelType === 'ELECTRIC') {
      unitPrice = priceBasis.electricityPerKWh;
    } else if (fuelType === 'UNLEADED') {
      unitPrice = priceBasis.unleadedPerLiter;
    }

    const dailyCost = +(dailyUnits * unitPrice).toFixed(2);
    const weeklyCost = +(dailyCost * 6).toFixed(2);
    const monthlyCost = +(dailyCost * 26).toFixed(2);
    const costPerKm = dailyKm > 0 ? +(dailyCost / dailyKm).toFixed(3) : 0;

    // CO2 calculations (kg):
    // Diesel: 2.68 kg CO2/L | Unleaded: 2.31 kg CO2/L | Grid electricity: 0.14 kg CO2/kWh
    let co2Factor = 2.68;
    if (fuelType === 'ELECTRIC') co2Factor = 0.14;
    else if (fuelType === 'UNLEADED') co2Factor = 2.31;

    const carbonEmittedDaily = +(dailyUnits * co2Factor).toFixed(1);

    // Baseline if driven by standard diesel van (~12.5 L/100km)
    const baselineDieselUnits = (dailyKm / 100) * 12.5;
    const baselineDieselCO2 = baselineDieselUnits * 2.68;
    const carbonSavingsDaily = Math.max(0, +(baselineDieselCO2 - carbonEmittedDaily).toFixed(1));

    // Efficiency Rating
    let rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_TUNEUP' = 'GOOD';
    if (fuelType === 'ELECTRIC' || rate < 10) {
      rating = 'EXCELLENT';
    } else if (rate > 25 && veh.type !== 'HEAVY_HAUL') {
      rating = 'NEEDS_TUNEUP';
    }

    return {
      vehicleId: veh.id,
      vehicleNumber: veh.vehicleNumber,
      type: veh.type,
      fuelType,
      driverName: veh.driverName || 'Unassigned',
      odometerKm: veh.odometerKm || 35000,
      dailyMileageKm: dailyKm,
      weeklyMileageKm: weeklyKm,
      monthlyMileageKm: monthlyKm,
      consumptionPer100Km: rate,
      unitLabel,
      dailyUnitsConsumed: dailyUnits,
      monthlyUnitsConsumed: monthlyUnits,
      dailyCostUsd: dailyCost,
      weeklyCostUsd: weeklyCost,
      monthlyCostUsd: monthlyCost,
      costPerKmUsd: costPerKm,
      carbonEmittedKgDaily: carbonEmittedDaily,
      carbonSavingsKgVsDiesel: carbonSavingsDaily,
      efficiencyRating: rating,
    };
  }

  public calculateFleetSummary(
    vehicles: Vehicle[],
    priceBasis: {
      dieselPerLiter: number;
      unleadedPerLiter: number;
      electricityPerKWh: number;
    } = CURRENT_SPOT_PRICES,
    mileageMultiplier: number = 1.0
  ): { records: VehicleConsumptionRecord[]; summary: FleetFuelSummary } {
    const records = vehicles.map((v) =>
      this.calculateVehicleConsumption(v, priceBasis, mileageMultiplier)
    );

    const totalDailyMileage = records.reduce((s, r) => s + r.dailyMileageKm, 0);
    const totalMonthlyMileage = records.reduce((s, r) => s + r.monthlyMileageKm, 0);
    const totalDailyCost = records.reduce((s, r) => s + r.dailyCostUsd, 0);
    const totalMonthlyCost = records.reduce((s, r) => s + r.monthlyCostUsd, 0);
    const totalAnnualCost = +(totalMonthlyCost * 12).toFixed(2);
    const fleetAvgCostPerKm = totalDailyMileage > 0 ? +(totalDailyCost / totalDailyMileage).toFixed(3) : 0;

    const electricCount = records.filter((r) => r.fuelType === 'ELECTRIC').length;
    const electricPercentage = vehicles.length > 0 ? Math.round((electricCount / vehicles.length) * 100) : 0;

    // What if the entire fleet were diesel?
    const allDieselEquivalentMonthlyCost = records.reduce((s, r) => {
      const dieselUnits = (r.monthlyMileageKm / 100) * 11.5;
      return s + dieselUnits * priceBasis.dieselPerLiter;
    }, 0);

    const monthlySavingsFromEV = Math.max(0, +(allDieselEquivalentMonthlyCost - totalMonthlyCost).toFixed(2));
    const totalMonthlyCO2 = Math.round(records.reduce((s, r) => s + r.carbonEmittedKgDaily * 26, 0));
    const monthlyCO2Avoided = Math.round(records.reduce((s, r) => s + r.carbonSavingsKgVsDiesel * 26, 0));

    return {
      records,
      summary: {
        totalDailyMileageKm: totalDailyMileage,
        totalMonthlyMileageKm: totalMonthlyMileage,
        totalDailyCostUsd: +totalDailyCost.toFixed(2),
        totalMonthlyCostUsd: +totalMonthlyCost.toFixed(2),
        totalAnnualProjectedCostUsd: totalAnnualCost,
        fleetAvgCostPerKmUsd: fleetAvgCostPerKm,
        electricFleetPercentage: electricPercentage,
        monthlySavingsFromEVUsd: monthlySavingsFromEV,
        totalMonthlyCO2Kg: totalMonthlyCO2,
        monthlyCO2AvoidedKg: monthlyCO2Avoided,
      },
    };
  }
}

export const fuelConsumptionService = FuelConsumptionService.getInstance();
