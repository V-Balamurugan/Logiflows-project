import { PackageType, ServiceTier } from '../types';

export interface DimensionSpecs {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface RateEstimateParams {
  dimensions: DimensionSpecs;
  weightKg: number;
  distanceKm: number;
  packageType: PackageType;
  serviceTier: ServiceTier;
  declaredValueUsd?: number;
  includeCarbonOffset?: boolean;
}

export interface CostLineItem {
  id: string;
  name: string;
  description: string;
  amount: number;
  isDiscount?: boolean;
  isOptional?: boolean;
}

export interface ShippingCostQuote {
  totalUsd: number;
  subtotalUsd: number;
  fuelSurchargeUsd: number;
  insuranceUsd: number;
  carbonOffsetUsd: number;
  
  // Dimensional weight analysis
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  isVolumetricDominant: boolean;
  cubicMeters: number;

  // Distance analysis
  distanceKm: number;
  distanceBand: 'LOCAL_METRO' | 'REGIONAL' | 'INTERCITY';

  // ETA & SLA
  serviceTier: ServiceTier;
  estimatedTransitHours: number;
  deliveryTimeframeText: string;

  // Breakdown line items
  lineItems: CostLineItem[];

  // Metadata
  tariffCode: string;
  calculatedAt: string;
}

export interface TierComparisonOption {
  tier: ServiceTier;
  name: string;
  transitHours: number;
  timeframeText: string;
  totalCostUsd: number;
  isCheapest: boolean;
  isFastest: boolean;
  badge?: string;
}

/**
 * Mock Commercial Logistics Rate Service
 * Computes deterministic, real-time B2B parcel pricing based on IATA volumetric weights,
 * corridor distance tiers, commodity handling types, and carrier fuel indexes.
 */
class ShippingRateService {
  private static readonly DIM_DIVISOR = 5000; // Standard IATA / Express courier dimensional divisor (cm³/kg)
  private static readonly FUEL_SURCHARGE_PCT = 0.068; // 6.8% fluctuating fuel index

  /**
   * Calculates volumetric (dimensional) weight: (L x W x H) / 5000
   */
  public calculateVolumetricWeight(dims: DimensionSpecs): number {
    const l = Math.max(1, dims.lengthCm || 1);
    const w = Math.max(1, dims.widthCm || 1);
    const h = Math.max(1, dims.heightCm || 1);
    const raw = (l * w * h) / ShippingRateService.DIM_DIVISOR;
    return Math.round(raw * 100) / 100;
  }

  /**
   * Primary quote calculation engine
   */
  public calculateQuote(params: RateEstimateParams): ShippingCostQuote {
    const {
      dimensions,
      weightKg,
      distanceKm: rawDistance,
      packageType,
      serviceTier,
      declaredValueUsd = 0,
      includeCarbonOffset = false,
    } = params;

    const actualWeight = Math.max(0.1, weightKg || 1);
    const volWeight = this.calculateVolumetricWeight(dimensions);
    const billableWeight = Math.max(actualWeight, volWeight);
    const isVolumetricDominant = volWeight > actualWeight;
    const cubicMeters = Math.round(((dimensions.lengthCm * dimensions.widthCm * dimensions.heightCm) / 1000000) * 1000) / 1000;

    const distanceKm = Math.max(2, Math.round(rawDistance || 15));

    // Distance band identification
    let distanceBand: 'LOCAL_METRO' | 'REGIONAL' | 'INTERCITY' = 'LOCAL_METRO';
    if (distanceKm > 100) {
      distanceBand = 'INTERCITY';
    } else if (distanceKm > 25) {
      distanceBand = 'REGIONAL';
    }

    const lineItems: CostLineItem[] = [];

    // 1. Base Freight Charge by Service Tier
    let baseRate = 12.00;
    let baseSlaHours = 36;
    let timeframeText = '1 - 2 Business Days';

    if (serviceTier === 'SAME_DAY_PRIORITY') {
      baseRate = 44.00;
      baseSlaHours = 3.5;
      timeframeText = 'Same Day within 4 Hours';
    } else if (serviceTier === 'NEXT_DAY_EXPRESS') {
      baseRate = 26.00;
      baseSlaHours = 14;
      timeframeText = 'Next Morning by 10:30 AM';
    } else {
      baseRate = 14.50;
      baseSlaHours = 28;
      timeframeText = 'Standard 1 - 2 Business Days';
    }

    lineItems.push({
      id: 'base-freight',
      name: `${serviceTier.replace(/_/g, ' ')} Base Freight`,
      description: `Guaranteed courier dispatch slot & terminal clearance`,
      amount: baseRate,
    });

    // 2. Billable Weight Charge ($2.75 per kg above base 1kg)
    const excessWeight = Math.max(0, billableWeight - 1);
    const weightRatePerKg = serviceTier === 'SAME_DAY_PRIORITY' ? 4.50 : serviceTier === 'NEXT_DAY_EXPRESS' ? 3.25 : 2.50;
    const weightCharge = Math.round(excessWeight * weightRatePerKg * 100) / 100;

    if (weightCharge > 0) {
      lineItems.push({
        id: 'billable-weight',
        name: `Weight Tier (${billableWeight.toFixed(2)} kg)`,
        description: isVolumetricDominant
          ? `Volumetric dimensional rating (${dimensions.lengthCm}x${dimensions.widthCm}x${dimensions.heightCm}cm / 5000)`
          : `Actual gross physical mass (${actualWeight.toFixed(2)} kg)`,
        amount: weightCharge,
      });
    }

    // 3. Corridor Mileage & Distance Charge
    let perKmRate = 0.32;
    if (serviceTier === 'SAME_DAY_PRIORITY') perKmRate = 0.65;
    else if (serviceTier === 'NEXT_DAY_EXPRESS') perKmRate = 0.45;

    const distanceCharge = Math.round(distanceKm * perKmRate * 100) / 100;
    lineItems.push({
      id: 'corridor-distance',
      name: `Transit Corridor (${distanceKm} km)`,
      description: `${distanceBand.replace('_', ' ')} line-haul routing at $${perKmRate.toFixed(2)}/km`,
      amount: distanceCharge,
    });

    // 4. Commodity / Special Handling Surcharge
    let handlingFee = 0;
    let handlingDesc = '';
    switch (packageType) {
      case 'FRAGILE_ELECTRONICS':
        handlingFee = 12.50;
        handlingDesc = 'Anti-shock shockwatch monitoring & padded cage sorting';
        break;
      case 'EXPRESS_PERISHABLE':
        handlingFee = 18.00;
        handlingDesc = 'Active cold-chain thermal logger & expedite route prioritization';
        break;
      case 'HEAVY_FREIGHT':
        handlingFee = 32.00;
        handlingDesc = 'Hydraulic lift-gate handling & pallet strapping compliance';
        break;
      case 'DOCUMENT':
        handlingFee = -2.50;
        handlingDesc = 'Letter-pack courier discount rebate';
        break;
      default:
        handlingFee = 0;
        handlingDesc = 'Standard automated sorting facility stream';
    }

    if (handlingFee !== 0) {
      lineItems.push({
        id: 'commodity-handling',
        name: `Handling: ${packageType.replace(/_/g, ' ')}`,
        description: handlingDesc,
        amount: handlingFee,
        isDiscount: handlingFee < 0,
      });
    }

    // Subtotal before fuel & protection
    const operationalSubtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);

    // 5. Fuel Surcharge
    const fuelSurchargeUsd = Math.round(operationalSubtotal * ShippingRateService.FUEL_SURCHARGE_PCT * 100) / 100;
    lineItems.push({
      id: 'fuel-surcharge',
      name: 'Dynamic Fuel Surcharge (6.8%)',
      description: 'Indexed to EIA commercial diesel spot parity',
      amount: fuelSurchargeUsd,
    });

    // 6. Declared Value Cargo Protection
    let insuranceUsd = 0;
    if (declaredValueUsd > 100) {
      const insurableAmount = declaredValueUsd - 100;
      insuranceUsd = Math.round(Math.max(1.50, insurableAmount * 0.0075) * 100) / 100;
      lineItems.push({
        id: 'declared-value-insurance',
        name: `Cargo Risk Protection ($${declaredValueUsd.toLocaleString()})`,
        description: 'First $100 complimentary; 0.75% comprehensive freight indemnity',
        amount: insuranceUsd,
      });
    }

    // 7. Carbon Offset Option
    let carbonOffsetUsd = 0;
    if (includeCarbonOffset) {
      carbonOffsetUsd = 1.50;
      lineItems.push({
        id: 'carbon-neutral-offset',
        name: 'Verified Carbon Offset',
        description: 'Gold Standard certified solar/reforestation credit retirement',
        amount: carbonOffsetUsd,
        isOptional: true,
      });
    }

    const totalUsd = Math.round(lineItems.reduce((acc, item) => acc + item.amount, 0) * 100) / 100;
    const subtotalUsd = Math.round(operationalSubtotal * 100) / 100;

    return {
      totalUsd,
      subtotalUsd,
      fuelSurchargeUsd,
      insuranceUsd,
      carbonOffsetUsd,
      actualWeightKg: actualWeight,
      volumetricWeightKg: volWeight,
      billableWeightKg: Math.round(billableWeight * 100) / 100,
      isVolumetricDominant,
      cubicMeters,
      distanceKm,
      distanceBand,
      serviceTier,
      estimatedTransitHours: baseSlaHours,
      deliveryTimeframeText: timeframeText,
      lineItems,
      tariffCode: `TRF-${Math.floor(1000 + (distanceKm % 899))}-${serviceTier.slice(0, 3)}`,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates comparative quote across all service tiers for instant customer decision-making
   */
  public compareServiceTiers(params: Omit<RateEstimateParams, 'serviceTier'>): TierComparisonOption[] {
    const tiers: ServiceTier[] = ['STANDARD_GROUND', 'NEXT_DAY_EXPRESS', 'SAME_DAY_PRIORITY'];
    
    const results = tiers.map((tier) => {
      const quote = this.calculateQuote({ ...params, serviceTier: tier });
      let name = 'Standard Ground';
      if (tier === 'NEXT_DAY_EXPRESS') name = 'Next Day Express';
      if (tier === 'SAME_DAY_PRIORITY') name = 'Same Day Priority';

      return {
        tier,
        name,
        transitHours: quote.estimatedTransitHours,
        timeframeText: quote.deliveryTimeframeText,
        totalCostUsd: quote.totalUsd,
        isCheapest: false,
        isFastest: false,
      };
    });

    // Determine cheapest and fastest
    let minCost = Infinity;
    let minTime = Infinity;
    results.forEach((r) => {
      if (r.totalCostUsd < minCost) minCost = r.totalCostUsd;
      if (r.transitHours < minTime) minTime = r.transitHours;
    });

    return results.map((r) => {
      const isCheapest = r.totalCostUsd === minCost;
      const isFastest = r.transitHours === minTime;
      let badge: string | undefined;
      if (isFastest && !isCheapest) badge = 'Fastest Delivery';
      else if (isCheapest) badge = 'Best Value';
      else if (r.tier === 'NEXT_DAY_EXPRESS') badge = 'Most Popular';

      return {
        ...r,
        isCheapest,
        isFastest,
        badge,
      };
    });
  }

  /**
   * Helper to estimate route distance between two postal codes or city names
   */
  public estimateDistance(
    senderPostal: string,
    recipientPostal: string,
    senderCity: string,
    recipientCity: string
  ): number {
    // If same city or postal, local metro corridor
    const sCity = senderCity.trim().toLowerCase();
    const rCity = recipientCity.trim().toLowerCase();
    const sPost = parseInt(senderPostal.trim(), 10) || 94607;
    const rPost = parseInt(recipientPostal.trim(), 10) || 94143;

    if (sCity === rCity && Math.abs(sPost - rPost) < 10) {
      return 8.5; // Intra-city local
    }

    // Bay area known routes approximation
    if (
      (sCity.includes('oakland') && rCity.includes('san francisco')) ||
      (sCity.includes('san francisco') && rCity.includes('oakland'))
    ) {
      return 18.2;
    }
    if (
      (sCity.includes('san jose') && rCity.includes('san francisco')) ||
      (sCity.includes('san francisco') && rCity.includes('san jose'))
    ) {
      return 78.4;
    }

    // Deterministic hash based on postal delta
    const postalDelta = Math.abs(sPost - rPost);
    const estimated = 12 + ((postalDelta * 1.7) % 85);
    return Math.round(estimated * 10) / 10;
  }
}

export const shippingRateService = new ShippingRateService();
