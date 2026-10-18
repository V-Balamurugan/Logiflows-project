/**
 * LogiFlows Logistics Platform - Core Domain Types & Contracts
 * Compliant with Master Architecture Specification
 */

export type UserRole = 
  | 'PLATFORM_ADMIN'
  | 'TENANT_OWNER'
  | 'TENANT_ADMIN'
  | 'COURIER'
  | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string; // empty for platform admin or independent customer
  branchId?: string;
  avatarUrl?: string;
  phone?: string;
}

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PROVISIONING';
export type TenantTier = 'ENTERPRISE_PLUS' | 'REGIONAL_PRO' | 'GROWTH';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  tier: TenantTier;
  status: TenantStatus;
  primaryContact: string;
  contactEmail: string;
  region: string;
  branchCount: number;
  activeParcelsCount: number;
  createdAt: string;
  features: {
    predictiveAi: boolean;
    iotTelemetry: boolean;
    multiHubRouting: boolean;
  };
}

export type HubType = 'REGIONAL_SORTING_HUB' | 'DISTRIBUTION_CENTER' | 'LAST_MILE_DEPOT';
export type HubStatus = 'OPERATIONAL' | 'CONGESTED' | 'MAINTENANCE';

export interface BranchHub {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: HubType;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  lat: number;
  lng: number;
  capacityDaily: number;
  currentLoad: number; // packages currently handling
  status: HubStatus;
  contactPhone: string;
  managerName: string;
}

export type VehicleType = 'ELECTRIC_VAN' | 'SPRINTER_VAN' | 'HEAVY_HAUL' | 'CARGO_EBIKE';
export type VehicleStatus = 'AVAILABLE' | 'ON_ROUTE' | 'MAINTENANCE' | 'IDLE';

export interface Vehicle {
  id: string;
  tenantId: string;
  branchId: string;
  vehicleNumber: string;
  type: VehicleType;
  driverName?: string;
  driverId?: string;
  status: VehicleStatus;
  batteryOrFuelPct: number;
  capacityKg: number;
  currentLoadKg: number;
  lastLocation: {
    lat: number;
    lng: number;
    updatedAt: string;
    speedKmh?: number;
    heading: number;
  };
  odometerKm?: number;
  dailyMileageKm?: number;
  engineHours?: number;
  dailyEngineHours?: number;
  fuelType?: 'DIESEL' | 'ELECTRIC' | 'UNLEADED';
  avgConsumptionPer100Km?: number;
}

export interface Employee {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  email: string;
  phone: string;
  role: 'TENANT_ADMIN' | 'COURIER' | 'DISPATCHER' | 'HUB_OPERATOR';
  status: 'ACTIVE' | 'ON_SHIFT' | 'OFF_SHIFT';
  activeDeliveriesCount: number;
  assignedVehicleId?: string;
  rating: number;
  totalCompletedDeliveries: number;
}

export type PackageType = 
  | 'STANDARD_BOX' 
  | 'DOCUMENT' 
  | 'FRAGILE_ELECTRONICS' 
  | 'EXPRESS_PERISHABLE' 
  | 'HEAVY_FREIGHT';

export type ServiceTier = 
  | 'SAME_DAY_PRIORITY' 
  | 'NEXT_DAY_EXPRESS' 
  | 'STANDARD_GROUND';

export type ParcelStatus = 
  | 'BOOKED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'AT_ORIGIN_HUB'
  | 'IN_TRANSIT_HUB_TRANSFER'
  | 'AT_DESTINATION_HUB'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_ATTEMPTED'
  | 'EXCEPTION_RECORDED';

export type CustodyEventType = 
  | 'BOOKING_CREATED'
  | 'CARRIER_ACCEPTED'
  | 'COURIER_PICKUP'
  | 'HUB_CHECK_IN'
  | 'SORTATION_COMPLETE'
  | 'INTER_HUB_DISPATCH'
  | 'DESTINATION_HUB_RECEIVED'
  | 'OUT_FOR_DELIVERY_DISPATCH'
  | 'DELIVERY_ATTEMPTED'
  | 'DELIVERY_COMPLETED'
  | 'EXCEPTION_LOGGED';

export interface CustodyEvent {
  id: string;
  parcelId: string;
  timestamp: string;
  eventType: CustodyEventType;
  locationName: string;
  branchCode?: string;
  lat?: number;
  lng?: number;
  operatorName: string;
  operatorRole: string;
  operatorId: string;
  notes: string;
  verificationHash: string; // Cryptographic audit trail integrity
}

export interface DelayRiskAssessment {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number; // 0-100%
  predictedDelayMinutes: number;
  primaryRiskFactor: string;
  recommendedMitigation: string;
  calculatedAt: string;
  modelConfidenceFeatures: {
    weatherRisk: string;
    trafficCongestion: string;
    hubBacklogImpact: string;
    transitDistanceKm: number;
  };
}

export interface ProofOfDelivery {
  timestamp: string;
  recipientName: string;
  signatureDataUrl?: string;
  confirmationCode: string;
  photoUrl?: string;
  notes?: string;
  podGeoLat: number;
  podGeoLng: number;
  verifiedByCourierId: string;
}

export interface AddressInfo {
  name: string;
  company?: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface Parcel {
  id: string;
  trackingNumber: string; // e.g. LF-2026-89410-APX
  qrToken: string; // Secure token encoded in QR code
  tenantId: string;
  originHubId: string;
  destHubId: string;
  sender: AddressInfo;
  recipient: AddressInfo;
  packageType: PackageType;
  serviceTier: ServiceTier;
  weightKg: number;
  dimensions: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  declaredValueUsd: number;
  specialInstructions?: string;
  status: ParcelStatus;
  createdAt: string;
  estimatedDeliveryDate: string;
  assignedCourierId?: string;
  assignedVehicleId?: string;
  routeStopOrder?: number;
  currentGeo?: {
    lat: number;
    lng: number;
    lastUpdated: string;
    heading?: number;
  };
  custodyEvents: CustodyEvent[];
  custodyDocuments?: CustodyDocument[];
  delayRisk: DelayRiskAssessment;
  proofOfDelivery?: ProofOfDelivery;
  shippingFeeUsd: number;
}

export type CustodyDocumentType = 
  | 'DIGITAL_DELIVERY_SIGNATURE'
  | 'CUSTOMS_CLEARANCE_FORM'
  | 'CHAIN_OF_CUSTODY_TRANSFER'
  | 'BILL_OF_LADING'
  | 'INSPECTION_PHOTO';

export interface CustodyDocument {
  id: string;
  parcelId: string;
  documentType: CustodyDocumentType;
  documentName: string;
  fileDataUrl: string;
  uploadedAt: string;
  uploadedByName: string;
  uploadedByRole: string;
  fileSizeKb: number;
  verificationHash: string;
  notes?: string;
}

export interface MicroserviceNode {
  id: string;
  name: string;
  serviceType: 'CORE_BACKEND' | 'DATABASE' | 'CACHE' | 'ML_INFERENCE' | 'EVENT_BUS' | 'GEOSPATIAL';
  technology: string;
  status: 'HEALTHY' | 'DEGRADED' | 'SCALING';
  latencyMs: number;
  requestsPerSec: number;
  uptimePct: number;
  version: string;
  description: string;
  instancesCount: number;
}

export interface MapDiagnosticState {
  jwtStatus: 'VALID' | 'EXPIRED' | 'UNAUTHORIZED';
  tokenExpiresAt: string;
  tenantMembershipVerified: boolean;
  tenantIdChecked: string;
  postgisGeomValid: boolean;
  tileServerStatus: 'ONLINE' | 'RATE_LIMITED' | 'NETWORK_ERROR';
  activeHubMarkersCount: number;
  activeVehicleMarkersCount: number;
  lastPingMs: number;
}

export type NotificationCategory = 'STATUS_CHANGE' | 'DELIVERY_DELAY' | 'COURIER_TASK' | 'SYSTEM_ALERT';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  timestamp: string;
  read: boolean;
  parcelId?: string;
  trackingNumber?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  actionUrl?: string;
}

export interface PriorityBufferRule {
  priority: ServiceTier;
  label: string;
  warningBufferMinutes: number; // Time buffer before warning alert triggers
  criticalBufferMinutes: number; // Time buffer before critical breach alert triggers
  minDelayRiskScore: number; // e.g. 50 score
  autoDispatchBypass: boolean; // Auto propose bypass reroute
  notifyRecipientSms: boolean; // Auto trigger customer notification
  soundChime: boolean;
}

export interface DelayThresholdConfig {
  id: string;
  tenantId: string;
  lastUpdated: string;
  updatedBy: string;
  enabledGlobalAlerts: boolean;
  corridorSensitivity: 'STRICT' | 'STANDARD' | 'LENIENT';
  rules: Record<ServiceTier, PriorityBufferRule>;
  autoTriggerIncidentTicket: boolean;
}

export interface DelayThresholdBreachEvaluation {
  parcel: Parcel;
  priority: ServiceTier;
  predictedDelayMinutes: number;
  breachSeverity: 'CRITICAL_BREACH' | 'WARNING_BUFFER' | 'WITHIN_BUFFER';
  bufferAllocatedMinutes: number;
  bufferDeficitMinutes: number; // >0 means predicted delay exceeds buffer
  recommendedAction: string;
  alertDispatched: boolean;
}

export type GeofenceActionType = 'ENTER' | 'EXIT';

export interface GeofenceZone {
  id: string;
  hubId: string;
  hubName: string;
  tenantId: string;
  name: string;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  enabled: boolean;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
  colorHex?: string;
  lastTriggeredAt?: string;
  activeVehiclesInsideCount?: number;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  geofenceName: string;
  hubId: string;
  hubName: string;
  vehicleId: string;
  vehicleNumber: string;
  driverName?: string;
  action: GeofenceActionType; // ENTER or EXIT
  distanceFromCenterKm: number;
  radiusKm: number;
  timestamp: string;
  speedKmh?: number;
  lat: number;
  lng: number;
  acknowledged?: boolean;
}

export interface RouteFuelLogEntry {
  id: string;
  tenantId: string;
  courierId: string;
  courierName: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  fuelType: 'ELECTRIC' | 'DIESEL' | 'UNLEADED';
  routeName: string;
  routeCode: string;
  date: string;
  displayDate: string;
  distanceKm: number;
  fuelConsumed: number;
  fuelUnit: 'L' | 'kWh';
  efficiency: number; // L/100km or kWh/100km
  targetEfficiency: number; // Baseline benchmark for vehicle
  efficiencyDeltaPct: number; // Negative means more efficient than baseline
  fuelCostUsd: number;
  costPerKmUsd: number;
  co2EmissionsKg: number;
  stopsCount: number;
  trafficConditions: 'LIGHT' | 'MODERATE' | 'CONGESTED';
  ecoScore: number; // 0-100 rating
  notes?: string;
  createdAt: string;
}

// --- Vehicle Maintenance & Predictive Failure Types ---
export type MaintenanceServiceType = 
  | 'OIL_FILTER_CHANGE'
  | 'BRAKE_SYSTEM_SERVICE'
  | 'TIRE_ROTATION_REPLACEMENT'
  | 'BATTERY_PACK_DIAGNOSTIC'
  | 'TRANSMISSION_FLUID'
  | 'SUSPENSION_STEERING'
  | 'ANNUAL_SAFETY_INSPECTION'
  | 'MOTOR_INVERTER_CALIBRATION';

export interface MaintenanceLogEntry {
  id: string;
  tenantId: string;
  vehicleId: string;
  vehicleNumber: string;
  serviceDate: string;
  odometerAtServiceKm: number;
  serviceType: MaintenanceServiceType;
  technicianOrShop: string;
  costUsd: number;
  notes: string;
  nextServiceOdometerKm: number;
  nextServiceDate: string;
  engineHoursAtService?: number;
  nextServiceEngineHours?: number;
  criticalStatus: 'GOOD' | 'UPCOMING' | 'OVERDUE';
  performedItems: string[];
}

export interface PredictiveComponentHealth {
  componentName: string;
  wearPct: number; // 0-100%
  riskLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL';
  failureMode: string;
  urgencyWindow: string;
  actionRecommendation: string;
  historicalAnomalyDetected: boolean;
}

export interface PredictiveMechanicalFailure {
  vehicleId: string;
  vehicleNumber: string;
  overallHealthScore: number; // 0 - 100
  failureRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  projectedFailureKm: number;
  engineHours?: number;
  engineHoursRemaining?: number;
  isServiceDue?: boolean;
  serviceDuePriority?: 'HIGH' | 'CRITICAL' | 'NORMAL';
  serviceDueReason?: string;
  telemetryFactors: {
    brakeWearPct: number;
    batteryDegradationOrEngineThermalStress: number;
    transmissionStrainIndex: number;
    tireTreadWearPct: number;
    vibrationAnomaly: boolean;
    oilOrCoolantLifePct: number;
  };
  predictedComponents: PredictiveComponentHealth[];
  lastTelemetrySync: string;
  recommendedAction: string;
}

// --- Mass-Dispatching Batch Assignment Types ---
export type BatchDispatchStrategy = 
  | 'BALANCED_WORKLOAD'
  | 'GEO_CLUSTERING'
  | 'SLA_PRIORITY'
  | 'MAX_CAPACITY_PACKING';

export interface VehicleBatchAssignment {
  vehicle: Vehicle;
  assignedCourier?: Employee;
  parcels: Parcel[];
  totalWeightKg: number;
  capacityUtilizationPct: number;
  estimatedStops: number;
  estimatedRouteKm: number;
  estimatedDurationMin: number;
  primaryZone: string;
}

export interface BatchDispatchPlan {
  id: string;
  strategy: BatchDispatchStrategy;
  totalParcelsCount: number;
  totalWeightKg: number;
  vehiclesCount: number;
  assignments: VehicleBatchAssignment[];
  unassignedParcels: Parcel[];
  createdAt: string;
}

// --- Capacity Balancing & Predictive Hub Rerouting Types ---
export interface HubHourlyForecast {
  hourLabel: string;
  projectedPackages: number;
  utilizationPct: number;
  estimatedGateDwellMin: number;
  risk: 'OPTIMAL' | 'MODERATE' | 'CONGESTED' | 'CRITICAL';
}

export interface HubCongestionForecast {
  hubId: string;
  hubCode: string;
  hubName: string;
  hubType: HubType;
  capacityDaily: number;
  currentLoad: number;
  currentUtilizationPct: number;
  status: HubStatus;
  activeDocks: number;
  totalDocks: number;
  avgGateWaitMin: number;
  projectedPeakHour: string;
  projectedPeakUtilizationPct: number;
  hourlyForecast: HubHourlyForecast[];
  inboundEnRouteVehiclesCount: number;
  surplusCapacityPackages: number;
}

export interface VehicleRerouteSuggestion {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  driverName: string;
  vehicleType: VehicleType;
  currentLoadKg: number;
  capacityKg: number;
  currentDestinationHubId: string;
  currentDestinationHubName: string;
  currentDestinationHubCode: string;
  currentCongestionLevel: number;
  currentEstimatedWaitMin: number;
  suggestedHubId: string;
  suggestedHubName: string;
  suggestedHubCode: string;
  suggestedCongestionLevel: number;
  suggestedEstimatedWaitMin: number;
  idleTimeSavedMin: number;
  distanceDeltaKm: number;
  travelTimeDeltaMin: number;
  netTimeSavedMin: number;
  idleFuelSavedLiters: number;
  co2SavedKg: number;
  parcelsOnboardCount: number;
  rationale: string;
  status: 'PROPOSED' | 'APPLIED' | 'DISMISSED';
  appliedAt?: string;
}

export interface CapacityBalancingMetrics {
  totalHubsMonitored: number;
  congestedHubsCount: number;
  totalIdleMinutesSaved: number;
  totalReroutesSuggested: number;
  totalReroutesApplied: number;
  fuelSavedLiters: number;
  co2AvoidedKg: number;
  averageFleetDwellReductionPct: number;
}

// --- Route Optimization AI Types ---
export interface OptimizedRouteStop {
  sequenceNumber: number;
  parcelId: string;
  trackingNumber: string;
  recipientName: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
  weightKg: number;
  remainingPayloadKg: number;
  serviceTier: string;
  etaMinutes: number;
  estimatedArrivalClock: string;
  trafficCondition: 'FREE_FLOW' | 'MODERATE' | 'CONGESTED';
  trafficDelayMin: number;
  legDistanceKm: number;
  legFuelConsumed: number;
}

export interface OptimizedVehicleRouteSequence {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  driverName: string;
  initialFuelPct: number;
  initialPayloadKg: number;
  capacityKg: number;
  fuelType: 'DIESEL' | 'ELECTRIC' | 'UNLEADED';
  totalStops: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  fuelConsumedAmount: number; // liters or kWh
  fuelSavedAmount: number;
  fuelEfficiencyScore: number; // 0-100 rating
  co2EmittedKg: number;
  co2SavedKg: number;
  routeCoordinates: [number, number][]; // [lat, lng][]
  color: string;
  stops: OptimizedRouteStop[];
}

export interface MultiVehicleAiOptimizationPlan {
  id: string;
  timestamp: string;
  selectedVehicleCount: number;
  totalParcelsCount: number;
  totalWeightKg: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  totalFuelSavedLiters: number;
  totalKwhConserved: number;
  totalCo2SavedKg: number;
  overallFuelEfficiencyScore: number; // 0 - 100
  averagePayloadUtilizationPct: number;
  trafficAvoidanceScorePct: number;
  vehicleRoutes: OptimizedVehicleRouteSequence[];
  unassignedParcels: Parcel[];
}

// --- Regional Demand Forecast & Courier Pre-Allocation Types ---
export type SurgeAlertLevel = 'NORMAL' | 'ELEVATED' | 'HIGH_SURGE' | 'CRITICAL_SURGE';

export interface RegionalDailyForecastPoint {
  dayLabel: string;
  dateStr: string;
  historicalBaseline: number;
  predictedVolume: number;
  allocatedCapacity: number;
  isSurgeDay: boolean;
  surgeReason?: string;
}

export interface RegionalDemandForecast {
  regionId: string;
  regionName: string;
  regionCode: string;
  primaryHubId: string;
  primaryHubName: string;
  keyMunicipalities: string[];
  historicalDailyAvgVolume: number;
  predictedSurgeVolume: number;
  surgeFactor: number; // e.g. 1.35 for +35%
  surgeRiskLevel: SurgeAlertLevel;
  surgeDriver: string;
  peakDeliveryWindow: string;
  currentAllocatedCouriers: number;
  recommendedCouriers: number;
  preAllocatedCouriers: number;
  courierCapacityParcels: number;
  capacityDelta: number; // positive = surplus, negative = deficit
  capacityCoveragePct: number;
  overtimeRiskHours: number;
  slaSafetyProbabilityPct: number;
  dailyTimeline: RegionalDailyForecastPoint[];
}

export interface RegionalCapacityPreAllocationPlan {
  id: string;
  tenantId: string;
  updatedAt: string;
  totalPredictedVolume: number;
  totalCourierCapacity: number;
  overallCoveragePct: number;
  activeSurgeZonesCount: number;
  allocations: Record<string, number>; // regionId -> courier count
  notes: string;
  status: 'DRAFT' | 'COMMITTED';
}

// --- Compliance Audit & Safety Protocol Deviation Types ---
export type RegulatoryFramework = 
  | 'DOT_FMCSA'      // Hours of service, continuous drive duration, cargo stability
  | 'OSHA_SAFETY'    // Material handling, heavy package lift limits (>25kg dual operator)
  | 'FDA_GDP'        // Good Distribution Practice, perishable cold-chain integrity
  | 'ISO_28000'      // Supply chain security, chain-of-custody seal & cryptographic hashes
  | 'EPA_CLEAN_AIR'; // Green corridor fleet emissions & excessive vehicle idling

export type SafetyDeviationSeverity = 'CRITICAL' | 'WARNING' | 'MINOR';
export type SafetyDeviationStatus = 'FLAGGED' | 'UNDER_INVESTIGATION' | 'CAPA_SUBMITTED' | 'RESOLVED_CLEARED';

export type SafetyDeviationCategory = 
  | 'COLD_CHAIN_TEMPERATURE_BREACH'
  | 'HEAVY_LIFT_PROTOCOL_BREACH'
  | 'EXCESSIVE_COURIER_HOURS'
  | 'CHAIN_OF_CUSTODY_HASH_MISMATCH'
  | 'UNATTENDED_DELIVERY_BREACH'
  | 'DWELL_TIME_EXCEEDED'
  | 'SPEED_GOVERNOR_EXCEEDED';

export interface CustodyHandoffRecord {
  handoffId: string;
  parcelId: string;
  trackingNumber: string;
  fromPartyName: string;
  fromPartyRole: string;
  toPartyName: string;
  toPartyRole: string;
  locationName: string;
  timestamp: string;
  eventType: CustodyEventType;
  verificationHash: string;
  hashIntegrityStatus: 'VERIFIED' | 'TAMPER_ALERT' | 'UNVERIFIED';
  dwellMinutes: number;
  hasSafetyDeviation: boolean;
  deviationCategory?: SafetyDeviationCategory;
  deviationSeverity?: SafetyDeviationSeverity;
}

export interface SafetyProtocolDeviation {
  id: string;
  parcelId: string;
  trackingNumber: string;
  framework: RegulatoryFramework;
  severity: SafetyDeviationSeverity;
  category: SafetyDeviationCategory;
  title: string;
  description: string;
  timestamp: string;
  locationName: string;
  responsibleParty: {
    id: string;
    name: string;
    role: string;
  };
  regulatoryStandard: string; // e.g. "49 CFR § 395.3", "OSHA 1910.176", "21 CFR Part 11 / GDP"
  correctiveActionPlan: string; // CAPA protocol
  status: SafetyDeviationStatus;
  evidenceNotes: string;
  resolvedAt?: string;
  resolvedBy?: string;
  auditorNotes?: string;
}

export interface RegulatoryAuditReportSummary {
  auditPeriod: string;
  generatedAt: string;
  tenantId: string;
  tenantName: string;
  complianceHealthScore: number; // 0 - 100%
  totalCustodyHandoffs: number;
  verifiedHandoffsCount: number;
  custodyIntegrityRate: number; // e.g. 98.4%
  totalDeviationsCount: number;
  criticalDeviationsCount: number;
  warningDeviationsCount: number;
  resolvedDeviationsCount: number;
  frameworkScores: Record<RegulatoryFramework, number>;
  auditReadinessStatus: 'FULLY_COMPLIANT' | 'NEEDS_ATTENTION' | 'NON_COMPLIANT';
}

// --- Energy Efficiency & Fleet Sustainability Trend Types ---
export interface MonthlyEnergyEfficiencyPoint {
  month: string;           // e.g. "Nov 2025"
  shortMonth: string;      // e.g. "Nov"
  isProjected: boolean;
  totalDistanceKm: number;
  dieselLiters: number;
  electricityKWh: number;
  dieselCostUsd: number;
  electricityCostUsd: number;
  totalEnergyCostUsd: number;
  co2EmissionsKg: number;
  co2AvoidedKg: number;
  netCo2MetricTons: number;
  co2AvoidedMetricTons: number;
  efficiencyLPer100KmEq: number; // Fleet equivalent L/100km
  evFleetSharePct: number;       // % fleet electrification
  targetCo2MetricTons: number;   // ESG Net-Zero milestone target
  activeVehiclesCount: number;
}

export interface FleetSustainabilitySummary {
  totalDistanceKm12M: number;
  totalDieselLiters12M: number;
  totalElectricityKWh12M: number;
  totalCo2EmissionsTons12M: number;
  totalCo2AvoidedTons12M: number;
  co2ReductionYoYPct: number;
  currentFleetEfficiencyL100km: number;
  efficiencyImprovementPct: number;
  totalEnergySavingsUsd12M: number;
  currentEvFleetPct: number;
  target2027EvFleetPct: number;
  esgSustainabilityRating: 'LEADERSHIP_A' | 'EXCELLENT_B' | 'TRANSITIONING_C';
}

// --- Fleet ROI Calculator & EV Financial Modeling Types ---
export interface FleetRoiModelInputs {
  convertedVehiclesCount: number;
  dailyMileageKm: number;
  annualOperatingDays: number;
  dieselConsumptionL100km: number;
  dieselPricePerLiter: number;
  evConsumptionKWh100km: number;
  electricityPricePerKWh: number;
  evPurchasePremiumPerVehicle: number; // CapEx delta vs internal combustion
  chargerCostPerVehicle: number;       // Level 2 / Depot DC charger
  govSubsidiesPerVehicle: number;      // IRA 45W / State Clean Fuel Rebates
  carbonCreditPricePerTon: number;     // Carbon offsets / LCFS credit price
  dieselMaintCostPerKm: number;        // Oil, filters, transmission, brakes
  evMaintCostPerKm: number;            // Regenerative braking, zero oil changes
  discountRatePct: number;             // Discount rate for NPV calculation (e.g. 6%)
  analysisYears: number;               // Modeling horizon (e.g. 5 or 7 years)
}

export interface CashFlowYearPoint {
  year: number;
  label: string;
  annualCashFlow: number;
  cumulativeCashFlow: number;
  dieselTco: number;
  evTco: number;
  fuelSavings: number;
  maintSavings: number;
  carbonCredits: number;
}

export interface FleetRoiModelOutputs {
  annualFuelSavingsUsd: number;
  annualMaintenanceSavingsUsd: number;
  annualCarbonCreditRevenueUsd: number;
  annualNetOperatingSavingsUsd: number;
  totalInitialNetCapExUsd: number;
  paybackPeriodYears: number;
  fiveYearNetSavingsUsd: number;
  fiveYearNpvUsd: number;
  fiveYearRoiPct: number;
  annualCo2AbatedMetricTons: number;
  fiveYearCo2AbatedMetricTons: number;
  cashFlowTimeline: CashFlowYearPoint[];
  tcoComparison: {
    diesel5YearTco: number;
    ev5YearTco: number;
    tcoSavingsUsd: number;
    tcoSavingsPct: number;
  };
}

// --- Customer Delivery Feedback & Experience Rating Types ---
export type DeliveryIssueType = 
  | 'DAMAGED_PACKAGE'
  | 'LATE_DELIVERY'
  | 'INSECURE_LOCATION'
  | 'MISSING_SIGNATURE'
  | 'INCORRECT_ADDRESS'
  | 'POOR_COMMUNICATION'
  | 'RUDE_COURIER'
  | 'WEATHER_MISHANDLING';

export interface CustomerParcelFeedback {
  id: string;
  parcelId: string;
  trackingNumber: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  overallRating: number; // 1 to 5 stars
  aspectRatings: {
    deliverySpeed: number;        // 1 to 5
    packageCondition: number;     // 1 to 5
    courierCourtesy: number;      // 1 to 5
    trackingTransparency: number; // 1 to 5
  };
  reportedIssues: DeliveryIssueType[];
  comments: string;
  wouldRecommend: boolean; // NPS Promoter / Detractor
  submittedAt: string;
  courierId?: string;
  courierName?: string;
  status: 'SUBMITTED' | 'REVIEWED' | 'REMEDIED';
}

export interface CustomerFeedbackAnalyticsSummary {
  totalReviewsCount: number;
  averageCsatScore: number; // 1.0 - 5.0
  netPromoterScore: number; // -100 to +100
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  issueFrequency: Array<{
    issue: DeliveryIssueType;
    label: string;
    count: number;
    pct: number;
  }>;
  aspectAverages: {
    speed: number;
    condition: number;
    courtesy: number;
    tracking: number;
  };
  recentFeedback: CustomerParcelFeedback[];
}






