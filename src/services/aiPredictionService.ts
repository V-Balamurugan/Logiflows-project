import { DelayRiskAssessment, PackageType, ServiceTier } from '../types';

interface PredictionFeatures {
  distanceKm: number;
  originHubCurrentLoadPct: number;
  destHubCurrentLoadPct: number;
  packageType: PackageType;
  serviceTier: ServiceTier;
  weatherCondition?: 'CLEAR' | 'RAIN' | 'FOG' | 'STORM';
  trafficCondition?: 'LIGHT' | 'MODERATE' | 'HEAVY' | 'CONGESTED';
}

/**
 * RandomForest Delay Prediction Classifier Client
 * Simulates microservice RPC: ai-delay-predictor-service:8000/api/v1/predict
 */
export function predictParcelDelay(features: PredictionFeatures): DelayRiskAssessment {
  const {
    distanceKm,
    originHubCurrentLoadPct,
    destHubCurrentLoadPct,
    packageType,
    serviceTier,
    weatherCondition = 'CLEAR',
    trafficCondition = 'MODERATE',
  } = features;

  let riskScore = 0; // 0 - 100

  // Distance weights
  if (distanceKm > 100) riskScore += 25;
  else if (distanceKm > 40) riskScore += 15;
  else riskScore += 5;

  // Hub congestion weights
  if (originHubCurrentLoadPct > 85) riskScore += 20;
  else if (originHubCurrentLoadPct > 70) riskScore += 10;

  if (destHubCurrentLoadPct > 85) riskScore += 20;
  else if (destHubCurrentLoadPct > 70) riskScore += 10;

  // Traffic impact
  if (trafficCondition === 'CONGESTED') riskScore += 30;
  else if (trafficCondition === 'HEAVY') riskScore += 20;
  else if (trafficCondition === 'MODERATE') riskScore += 5;

  // Weather impact
  if (weatherCondition === 'STORM') riskScore += 30;
  else if (weatherCondition === 'RAIN') riskScore += 15;

  // Special package types
  if (packageType === 'EXPRESS_PERISHABLE') riskScore += 10;
  if (packageType === 'HEAVY_FREIGHT') riskScore += 15;

  // Express tier urgency offset
  if (serviceTier === 'SAME_DAY_PRIORITY') {
    riskScore += 10; // Tighter SLA tolerance
  }

  // Derive category
  let level: 'LOW' | 'MEDIUM' | 'HIGH';
  let predictedDelayMinutes = 0;
  let primaryRiskFactor = 'Standard operational transit with normal SLA buffers.';
  let recommendedMitigation = 'Maintain scheduled dispatch route.';
  const confidenceScore = Math.min(98, Math.max(82, Math.floor(86 + Math.random() * 10)));

  if (riskScore >= 60) {
    level = 'HIGH';
    predictedDelayMinutes = Math.floor(45 + Math.random() * 35);
    primaryRiskFactor = `Critical corridor congestion (${trafficCondition}) coupled with high destination hub load (${destHubCurrentLoadPct}% capacity).`;
    recommendedMitigation = 'Reroute vehicle to auxiliary West Depot, adjust customer delivery ETA notification window, and re-balance carrier load.';
  } else if (riskScore >= 35) {
    level = 'MEDIUM';
    predictedDelayMinutes = Math.floor(15 + Math.random() * 20);
    primaryRiskFactor = `Moderate roadway delay in transit corridor with ${trafficCondition.toLowerCase()} traffic flow.`;
    recommendedMitigation = 'Suggest driver utilize express toll lanes or prioritize delivery order within the current run.';
  } else {
    level = 'LOW';
    predictedDelayMinutes = 0;
    primaryRiskFactor = 'Optimal road conditions and healthy hub processing throughput.';
    recommendedMitigation = 'No intervention required. On-time delivery SLA target on track.';
  }

  return {
    level,
    confidenceScore,
    predictedDelayMinutes,
    primaryRiskFactor,
    recommendedMitigation,
    calculatedAt: new Date().toISOString(),
    modelConfidenceFeatures: {
      weatherRisk: weatherCondition,
      trafficCongestion: trafficCondition,
      hubBacklogImpact: destHubCurrentLoadPct > 80 ? 'HIGH_BACKLOG' : 'NOMINAL',
      transitDistanceKm: Math.round(distanceKm * 10) / 10,
    },
  };
}
