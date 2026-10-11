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
    speedKmh: number;
    heading: number;
  };
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
