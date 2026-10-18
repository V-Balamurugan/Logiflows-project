import { 
  User, 
  Tenant, 
  BranchHub, 
  Vehicle, 
  Employee, 
  Parcel, 
  CustodyEvent, 
  CustodyEventType, 
  ParcelStatus, 
  VehicleStatus,
  ProofOfDelivery, 
  MicroserviceNode, 
  MapDiagnosticState,
  DelayRiskAssessment,
  AppNotification,
  CustodyDocument,
  DelayThresholdConfig,
  PriorityBufferRule,
  ServiceTier,
  GeofenceZone,
  GeofenceEvent,
  RouteFuelLogEntry
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_TENANTS, 
  INITIAL_HUBS, 
  INITIAL_VEHICLES, 
  INITIAL_EMPLOYEES, 
  INITIAL_PARCELS, 
  INITIAL_MICROSERVICES,
  INITIAL_ROUTE_FUEL_LOGS
} from '../data/mockData';
import { offlineSyncService } from './offlineSyncService';

const STORAGE_KEYS = {
  CURRENT_USER: 'logiflows_current_user',
  AUTH_TOKEN: 'logiflows_jwt_token',
  CURRENT_TENANT: 'logiflows_current_tenant_id',
  PARCELS: 'logiflows_parcels',
  HUBS: 'logiflows_hubs',
  VEHICLES: 'logiflows_vehicles',
  EMPLOYEES: 'logiflows_employees',
  TENANTS: 'logiflows_tenants',
  SERVICES: 'logiflows_microservices',
  NOTIFICATIONS: 'logiflows_notifications',
  DELAY_THRESHOLDS: 'logiflows_delay_threshold_config',
  GEOFENCE_ZONES: 'logiflows_geofence_zones',
  GEOFENCE_EVENTS: 'logiflows_geofence_events',
  VEHICLE_GEOFENCE_STATE: 'logiflows_vehicle_geofence_state',
  ROUTE_FUEL_LOGS: 'logiflows_route_fuel_logs',
};

// Generate cryptographic-looking hash for custody audits
function generateVerificationHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 12; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export class LogisticsStorageService {
  private static instance: LogisticsStorageService;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.initDefaults();
    if (typeof window !== 'undefined') {
      window.addEventListener('logiflows:sync-completed', () => {
        this.notify();
      });
    }
  }

  public static getInstance(): LogisticsStorageService {
    if (!LogisticsStorageService.instance) {
      LogisticsStorageService.instance = new LogisticsStorageService();
    }
    return LogisticsStorageService.instance;
  }

  private initDefaults(): void {
    if (!localStorage.getItem(STORAGE_KEYS.TENANTS)) {
      localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(INITIAL_TENANTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HUBS)) {
      localStorage.setItem(STORAGE_KEYS.HUBS, JSON.stringify(INITIAL_HUBS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PARCELS)) {
      localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(INITIAL_PARCELS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_MICROSERVICES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      const initialNotifs: AppNotification[] = [
        {
          id: 'notif-01',
          title: 'Delivery Delay Alert',
          message: 'Bay Bridge westbound corridor delay detected (+28m) affecting parcel LF-2026-89410-APX. AI alternative route available.',
          category: 'DELIVERY_DELAY',
          timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          read: false,
          parcelId: 'pcl-89410',
          trackingNumber: 'LF-2026-89410-APX',
          severity: 'WARNING',
        },
        {
          id: 'notif-02',
          title: 'Pending Courier Itinerary Run',
          message: 'Van APX-EV-101 has 3 priority deliveries scheduled for the San Francisco clinical district route.',
          category: 'COURIER_TASK',
          timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          read: false,
          severity: 'INFO',
        },
        {
          id: 'notif-03',
          title: 'Proof of Delivery Completed',
          message: 'Parcel LF-2026-89412-APX delivered to Sarah Jenkins. Digital signature and GPS coordinates verified.',
          category: 'STATUS_CHANGE',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          read: true,
          parcelId: 'pcl-89412',
          trackingNumber: 'LF-2026-89412-APX',
          severity: 'INFO',
        },
      ];
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initialNotifs));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default to Tenant Owner for full platform capability inspection
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[1]));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIn0.logiflows_valid_session_token');
      localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, 'tenant-apex');
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROUTE_FUEL_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.ROUTE_FUEL_LOGS, JSON.stringify(INITIAL_ROUTE_FUEL_LOGS));
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // --- Auth & Session State ---
  public getCurrentUser(): User {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : INITIAL_USERS[1];
  }

  public setCurrentUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    if (user.tenantId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, user.tenantId);
    }
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, `eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIn0.${user.id}_valid_token`);
    this.notify();
  }

  public getAuthToken(): string {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || 'valid_jwt_token';
  }

  public setAuthToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    this.notify();
  }

  public getAllUsers(): User[] {
    return INITIAL_USERS;
  }

  public getActiveTenantId(): string {
    const user = this.getCurrentUser();
    if (user.tenantId) return user.tenantId;
    return localStorage.getItem(STORAGE_KEYS.CURRENT_TENANT) || 'tenant-apex';
  }

  public setActiveTenantId(tenantId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, tenantId);
    this.notify();
  }

  // --- Tenants ---
  public getTenants(): Tenant[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TENANTS);
    return raw ? JSON.parse(raw) : INITIAL_TENANTS;
  }

  public getTenantById(id: string): Tenant | undefined {
    return this.getTenants().find((t) => t.id === id);
  }

  public addTenant(newTenant: Omit<Tenant, 'id' | 'createdAt' | 'branchCount' | 'activeParcelsCount'>): Tenant {
    const tenants = this.getTenants();
    const created: Tenant = {
      ...newTenant,
      id: `tenant-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      branchCount: 0,
      activeParcelsCount: 0,
    };
    tenants.push(created);
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    this.notify();
    return created;
  }

  // --- Hubs ---
  public getHubs(tenantId?: string): BranchHub[] {
    const raw = localStorage.getItem(STORAGE_KEYS.HUBS);
    const hubs: BranchHub[] = raw ? JSON.parse(raw) : INITIAL_HUBS;
    const filterId = tenantId || (this.getCurrentUser().role !== 'PLATFORM_ADMIN' ? this.getActiveTenantId() : undefined);
    if (!filterId) return hubs;
    return hubs.filter((h) => h.tenantId === filterId);
  }

  public addHub(hubData: Omit<BranchHub, 'id'>): BranchHub {
    const raw = localStorage.getItem(STORAGE_KEYS.HUBS);
    const hubs: BranchHub[] = raw ? JSON.parse(raw) : INITIAL_HUBS;
    const newHub: BranchHub = {
      ...hubData,
      id: `hub-${Date.now().toString(36)}`,
    };
    hubs.push(newHub);
    localStorage.setItem(STORAGE_KEYS.HUBS, JSON.stringify(hubs));
    
    // Increment tenant branch count
    const tenants = this.getTenants();
    const tenantIndex = tenants.findIndex((t) => t.id === hubData.tenantId);
    if (tenantIndex >= 0) {
      tenants[tenantIndex].branchCount += 1;
      localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    }

    this.notify();
    return newHub;
  }

  // --- Fleet / Vehicles ---
  public getVehicles(tenantId?: string): Vehicle[] {
    const raw = localStorage.getItem(STORAGE_KEYS.VEHICLES);
    const vehicles: Vehicle[] = raw ? JSON.parse(raw) : INITIAL_VEHICLES;
    const filterId = tenantId || (this.getCurrentUser().role !== 'PLATFORM_ADMIN' ? this.getActiveTenantId() : undefined);
    if (!filterId) return vehicles;
    return vehicles.filter((v) => v.tenantId === filterId);
  }

  public updateVehicleLocation(vehicleId: string, lat: number, lng: number, heading = 0, speed = 40): void {
    const raw = localStorage.getItem(STORAGE_KEYS.VEHICLES);
    const vehicles: Vehicle[] = raw ? JSON.parse(raw) : INITIAL_VEHICLES;
    const index = vehicles.findIndex((v) => v.id === vehicleId);
    if (index >= 0) {
      vehicles[index].lastLocation = {
        lat,
        lng,
        updatedAt: new Date().toISOString(),
        speedKmh: speed,
        heading,
      };
      // Reduce battery slightly on travel simulation
      if (vehicles[index].batteryOrFuelPct > 15) {
        vehicles[index].batteryOrFuelPct -= 0.5;
      }
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
      this.notify();
    }
  }

  public updateVehicleStatus(vehicleId: string, status: VehicleStatus): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.VEHICLES);
    const vehicles: Vehicle[] = raw ? JSON.parse(raw) : INITIAL_VEHICLES;
    const index = vehicles.findIndex((v) => v.id === vehicleId);
    if (index >= 0) {
      vehicles[index].status = status;
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
      this.addNotification({
        title: `Vehicle ${vehicles[index].vehicleNumber} Status: ${status}`,
        message: `Vehicle ${vehicles[index].vehicleNumber} status updated to ${status}. Telemetry monitor updated.`,
        category: 'STATUS_CHANGE',
        severity: status === 'MAINTENANCE' ? 'CRITICAL' : 'INFO',
      });
      this.notify();
      return true;
    }
    return false;
  }

  // --- Employees ---
  public getEmployees(tenantId?: string): Employee[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    const employees: Employee[] = raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;
    const filterId = tenantId || (this.getCurrentUser().role !== 'PLATFORM_ADMIN' ? this.getActiveTenantId() : undefined);
    if (!filterId) return employees;
    return employees.filter((e) => e.tenantId === filterId);
  }

  // --- Parcels & Custody Ledger ---
  public getParcels(tenantId?: string): Parcel[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    const user = this.getCurrentUser();
    
    // Customer sees only parcels they sent or are recipient of
    if (user.role === 'CUSTOMER') {
      return parcels.filter(
        (p) => p.sender.email.toLowerCase() === user.email.toLowerCase() || 
               p.recipient.email.toLowerCase() === user.email.toLowerCase()
      );
    }

    // Platform admin sees all
    if (user.role === 'PLATFORM_ADMIN') {
      if (tenantId) return parcels.filter((p) => p.tenantId === tenantId);
      return parcels;
    }

    // Tenant scoped
    const filterId = tenantId || this.getActiveTenantId();
    return parcels.filter((p) => p.tenantId === filterId);
  }

  public getParcelByTracking(trackingNumber: string): Parcel | undefined {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    const normalized = trackingNumber.trim().toUpperCase();
    return parcels.find((p) => p.trackingNumber.toUpperCase() === normalized || p.qrToken.toUpperCase() === normalized);
  }

  public bookParcel(newParcelData: Omit<Parcel, 'id' | 'trackingNumber' | 'qrToken' | 'status' | 'createdAt' | 'custodyEvents'>): Parcel {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const tenant = this.getTenantById(newParcelData.tenantId);
    const tenantCode = tenant ? tenant.code : 'APX';
    const trackingNumber = `LF-2026-${randomSuffix}-${tenantCode}`;
    const qrToken = `QR-TOKEN-SECURE-${randomSuffix}-${tenantCode}-HASH${generateVerificationHash().slice(0, 4).toUpperCase()}`;

    const currentUser = this.getCurrentUser();
    const initialCustodyEvent: CustodyEvent = {
      id: `evt-${Date.now().toString(36)}`,
      parcelId: `pcl-${randomSuffix}`,
      timestamp: new Date().toISOString(),
      eventType: 'BOOKING_CREATED',
      locationName: `${newParcelData.sender.city} B2B Portal`,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      operatorId: currentUser.id,
      notes: 'New parcel booking generated via LogiFlows verified API gateway.',
      verificationHash: generateVerificationHash(),
    };

    const newParcel: Parcel = {
      ...newParcelData,
      id: `pcl-${randomSuffix}`,
      trackingNumber,
      qrToken,
      status: 'BOOKED',
      createdAt: new Date().toISOString(),
      custodyEvents: [initialCustodyEvent],
    };

    parcels.unshift(newParcel);
    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));

    // Register in offline synchronization outbox
    offlineSyncService.enqueueOperation({
      clientActionId: `book-${newParcel.id}`,
      type: 'BOOK_PARCEL',
      entityId: newParcel.id,
      trackingNumber: newParcel.trackingNumber,
      summary: `Booked commercial shipment for ${newParcel.recipient.name} (${newParcel.recipient.city})`,
      payload: newParcel,
      courierId: currentUser.id,
      courierName: currentUser.name,
    });

    this.addNotification({
      title: 'New Commercial Booking Created',
      message: `Parcel ${trackingNumber} registered for ${newParcelData.recipient.name} (${newParcelData.recipient.city}). Tracking active.`,
      category: 'STATUS_CHANGE',
      parcelId: newParcel.id,
      trackingNumber: newParcel.trackingNumber,
      severity: 'INFO',
    });

    this.notify();
    return newParcel;
  }

  public updateParcelStatus(
    parcelId: string, 
    newStatus: ParcelStatus, 
    eventType: CustodyEventType, 
    locationName: string, 
    notes: string,
    geoLat?: number,
    geoLng?: number
  ): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    const index = parcels.findIndex((p) => p.id === parcelId);
    if (index === -1) return false;

    const user = this.getCurrentUser();
    const newEvent: CustodyEvent = {
      id: `evt-${Date.now().toString(36)}`,
      parcelId,
      timestamp: new Date().toISOString(),
      eventType,
      locationName,
      lat: geoLat,
      lng: geoLng,
      operatorName: user.name,
      operatorRole: user.role,
      operatorId: user.id,
      notes,
      verificationHash: generateVerificationHash(),
    };

    parcels[index].status = newStatus;
    parcels[index].custodyEvents.push(newEvent);

    if (geoLat && geoLng) {
      parcels[index].currentGeo = {
        lat: geoLat,
        lng: geoLng,
        lastUpdated: new Date().toISOString(),
      };
    }

    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));

    // Register in offline synchronization outbox
    const isOnline = offlineSyncService.isNetworkAvailable();
    offlineSyncService.enqueueOperation({
      clientActionId: `status-${parcelId}-${Date.now()}`,
      type: 'UPDATE_PARCEL_STATUS',
      entityId: parcelId,
      trackingNumber: parcels[index].trackingNumber,
      summary: `Status: ${newStatus.replace(/_/g, ' ')} (${locationName})`,
      payload: {
        newStatus,
        eventType,
        locationName,
        notes,
        geoLat,
        geoLng,
        event: newEvent,
      },
      courierId: user.id,
      courierName: user.name,
    });

    const offlineNote = !isOnline ? ' [Saved in offline outbox — will sync on reconnect]' : '';
    this.addNotification({
      title: `Parcel Status: ${newStatus.replace(/_/g, ' ')}`,
      message: `${parcels[index].trackingNumber} updated to ${newStatus.replace(/_/g, ' ')} at ${locationName}.${offlineNote}`,
      category: 'STATUS_CHANGE',
      parcelId: parcels[index].id,
      trackingNumber: parcels[index].trackingNumber,
      severity: newStatus === 'EXCEPTION_RECORDED' ? 'CRITICAL' : 'INFO',
    });

    this.notify();
    return true;
  }

  public assignParcel(parcelId: string, courierId: string, vehicleId?: string): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    const index = parcels.findIndex((p) => p.id === parcelId);
    if (index === -1) return false;

    const courier = this.getEmployees().find((e) => e.id === courierId);
    const user = this.getCurrentUser();

    parcels[index].assignedCourierId = courierId;
    if (vehicleId) parcels[index].assignedVehicleId = vehicleId;
    if (parcels[index].status === 'BOOKED' || parcels[index].status === 'AT_ORIGIN_HUB' || parcels[index].status === 'AT_DESTINATION_HUB') {
      parcels[index].status = 'OUT_FOR_DELIVERY';
    }

    const event: CustodyEvent = {
      id: `evt-${Date.now().toString(36)}`,
      parcelId,
      timestamp: new Date().toISOString(),
      eventType: 'OUT_FOR_DELIVERY_DISPATCH',
      locationName: 'Dispatch Coordination Desk',
      operatorName: user.name,
      operatorRole: user.role,
      operatorId: user.id,
      notes: `Dispatched to courier ${courier ? courier.name : courierId} ${vehicleId ? `(Vehicle: ${vehicleId})` : ''}`,
      verificationHash: generateVerificationHash(),
    };

    parcels[index].custodyEvents.push(event);
    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));

    // Register in offline sync outbox
    offlineSyncService.enqueueOperation({
      clientActionId: `assign-${parcelId}-${Date.now()}`,
      type: 'ASSIGN_PARCEL',
      entityId: parcelId,
      trackingNumber: parcels[index].trackingNumber,
      summary: `Assigned to courier ${courier ? courier.name : courierId}`,
      payload: { courierId, vehicleId },
      courierId: user.id,
      courierName: user.name,
    });

    this.notify();
    return true;
  }

  public addCustodyEvent(
    parcelId: string, 
    eventData: {
      eventType: CustodyEventType;
      locationName?: string;
      operatorName?: string;
      operatorRole?: string;
      operatorId?: string;
      notes: string;
      verificationHash?: string;
      lat?: number;
      lng?: number;
    }
  ): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    const index = parcels.findIndex((p) => p.id === parcelId);
    if (index === -1) return false;

    const user = this.getCurrentUser();
    const event: CustodyEvent = {
      id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      parcelId,
      timestamp: new Date().toISOString(),
      eventType: eventData.eventType,
      locationName: eventData.locationName || 'Dispatch Logistics Control',
      lat: eventData.lat,
      lng: eventData.lng,
      operatorName: eventData.operatorName || user.name,
      operatorRole: (eventData.operatorRole as any) || user.role,
      operatorId: eventData.operatorId || user.id,
      notes: eventData.notes,
      verificationHash: eventData.verificationHash || generateVerificationHash(),
    };

    parcels[index].custodyEvents.push(event);
    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
    this.notify();
    return true;
  }

  public reorderCourierStops(
    courierId: string,
    orderedParcelIds: string[],
    meta?: { timeSavedMinutes?: number; trafficNotes?: string }
  ): Parcel[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    const now = Date.now();

    const employee = this.getEmployees().find((e) => e.id === courierId);
    const courierName = employee ? employee.name : 'Courier';

    orderedParcelIds.forEach((pid, idx) => {
      const pIndex = parcels.findIndex((p) => p.id === pid);
      if (pIndex >= 0) {
        parcels[pIndex].routeStopOrder = idx + 1;
        // Sequentially adjust ETA by ~25 minutes per stop
        parcels[pIndex].estimatedDeliveryDate = new Date(
          now + (idx + 1) * 25 * 60 * 1000
        ).toISOString();
      }
    });

    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));

    // Register in offline synchronization outbox
    offlineSyncService.enqueueOperation({
      clientActionId: `reorder-${courierId}-${now}`,
      type: 'REORDER_STOPS',
      entityId: courierId,
      summary: `Reordered itinerary for ${courierName} (${orderedParcelIds.length} stops)`,
      payload: { orderedParcelIds, meta },
      courierId,
      courierName,
    });

    const timeSaved = meta?.timeSavedMinutes ? ` Saved approx. ${meta.timeSavedMinutes} minutes.` : '';
    this.addNotification({
      title: 'Itinerary Optimized via OpenRouteService',
      message: `Assigned delivery stops for ${courierName} were reordered using live traffic data.${timeSaved}`,
      category: 'COURIER_TASK',
      severity: 'INFO',
    });

    this.notify();
    return parcels;
  }

  public submitProofOfDelivery(parcelId: string, pod: Omit<ProofOfDelivery, 'timestamp' | 'verifiedByCourierId'>): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    const index = parcels.findIndex((p) => p.id === parcelId);
    if (index === -1) return false;

    const user = this.getCurrentUser();
    const completePod: ProofOfDelivery = {
      ...pod,
      timestamp: new Date().toISOString(),
      verifiedByCourierId: user.id,
    };

    parcels[index].proofOfDelivery = completePod;
    parcels[index].status = 'DELIVERED';

    const event: CustodyEvent = {
      id: `evt-${Date.now().toString(36)}`,
      parcelId,
      timestamp: new Date().toISOString(),
      eventType: 'DELIVERY_COMPLETED',
      locationName: `${parcels[index].recipient.street}, ${parcels[index].recipient.city}`,
      lat: pod.podGeoLat,
      lng: pod.podGeoLng,
      operatorName: user.name,
      operatorRole: user.role,
      operatorId: user.id,
      notes: `Delivered to ${pod.recipientName}. Code verified: ${pod.confirmationCode}. Electronic signature archived.`,
      verificationHash: generateVerificationHash(),
    };

    parcels[index].custodyEvents.push(event);
    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));

    // Register in offline synchronization outbox
    const isOnline = offlineSyncService.isNetworkAvailable();
    offlineSyncService.enqueueOperation({
      clientActionId: `pod-${parcelId}-${Date.now()}`,
      type: 'SUBMIT_POD',
      entityId: parcelId,
      trackingNumber: parcels[index].trackingNumber,
      summary: `Proof of Delivery: ${pod.recipientName} (Sig & GPS recorded)`,
      payload: { completePod, event },
      courierId: user.id,
      courierName: user.name,
    });

    const offlineNote = !isOnline ? ' [Saved in device outbox. Will sync automatically once cellular signal returns]' : '';
    this.addNotification({
      title: 'Proof of Delivery Completed',
      message: `Parcel ${parcels[index].trackingNumber} delivered directly to ${pod.recipientName}. Digital signature & GPS logged.${offlineNote}`,
      category: 'STATUS_CHANGE',
      parcelId: parcels[index].id,
      trackingNumber: parcels[index].trackingNumber,
      severity: 'INFO',
    });

    this.notify();
    return true;
  }

  // --- Delay AI Recalculation ---
  public updateParcelDelayAssessment(parcelId: string, assessment: DelayRiskAssessment): void {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : INITIAL_PARCELS;
    const index = parcels.findIndex((p) => p.id === parcelId);
    if (index >= 0) {
      parcels[index].delayRisk = assessment;
      localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
      this.notify();
    }
  }

  // --- Microservices Mesh ---
  public getMicroservices(): MicroserviceNode[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
    return raw ? JSON.parse(raw) : INITIAL_MICROSERVICES;
  }

  public toggleMicroserviceStatus(serviceId: string): void {
    const services = this.getMicroservices();
    const index = services.findIndex((s) => s.id === serviceId);
    if (index >= 0) {
      services[index].status = services[index].status === 'HEALTHY' ? 'DEGRADED' : 'HEALTHY';
      services[index].latencyMs = services[index].status === 'HEALTHY' ? Math.floor(Math.random() * 10 + 2) : 240;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
      this.notify();
    }
  }

  // --- Map Diagnostic Engine (Part 7 Resolution) ---
  public runMapDiagnostics(): MapDiagnosticState {
    const token = this.getAuthToken();
    const user = this.getCurrentUser();
    const hubs = this.getHubs();
    const vehicles = this.getVehicles();

    // Check JWT integrity
    const isTokenValid = token.length > 20 && !token.includes('expired');
    const hasTenantMembership = user.role === 'PLATFORM_ADMIN' || (user.tenantId && user.tenantId.length > 0);
    const areCoordsValid = hubs.every((h) => !isNaN(h.lat) && !isNaN(h.lng) && h.lat !== 0);

    return {
      jwtStatus: isTokenValid ? 'VALID' : 'EXPIRED',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
      tenantMembershipVerified: Boolean(hasTenantMembership),
      tenantIdChecked: user.tenantId || this.getActiveTenantId(),
      postgisGeomValid: areCoordsValid,
      tileServerStatus: 'ONLINE',
      activeHubMarkersCount: hubs.length,
      activeVehicleMarkersCount: vehicles.length,
      lastPingMs: Math.floor(18 + Math.random() * 12),
    };
  }

  // --- Real-time Notifications Engine ---
  public getNotifications(): AppNotification[] {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  }

  public addNotification(data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
    const notifications = this.getNotifications();
    const newNotif: AppNotification = {
      ...data,
      id: `notif-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    notifications.unshift(newNotif);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    this.notify();
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const notifications = this.getNotifications();
    const index = notifications.findIndex((n) => n.id === id);
    if (index >= 0) {
      notifications[index].read = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
      this.notify();
    }
  }

  public markAllNotificationsAsRead(): void {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    this.notify();
  }

  public clearNotifications(): void {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    this.notify();
  }

  // --- Continuous Custody Documents Engine ---
  public attachCustodyDocument(
    parcelId: string, 
    docData: Omit<CustodyDocument, 'id' | 'uploadedAt' | 'verificationHash' | 'uploadedByName' | 'uploadedByRole'>
  ): CustodyDocument | null {
    const raw = localStorage.getItem(STORAGE_KEYS.PARCELS);
    const parcels: Parcel[] = raw ? JSON.parse(raw) : [];
    const index = parcels.findIndex((p) => p.id === parcelId);
    if (index === -1) return null;

    const user = this.getCurrentUser();
    const verificationHash = generateVerificationHash();
    const docId = `doc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;

    const newDoc: CustodyDocument = {
      ...docData,
      id: docId,
      uploadedAt: new Date().toISOString(),
      uploadedByName: user.name,
      uploadedByRole: user.role,
      verificationHash,
    };

    if (!parcels[index].custodyDocuments) {
      parcels[index].custodyDocuments = [];
    }
    parcels[index].custodyDocuments!.unshift(newDoc);

    // Record immutable Custody Event audit log entry
    const auditEvent: CustodyEvent = {
      id: `evt-${Date.now().toString(36)}`,
      parcelId,
      timestamp: new Date().toISOString(),
      eventType: 'CARRIER_ACCEPTED',
      locationName: 'Continuous Custody Documentation Station',
      operatorName: user.name,
      operatorRole: user.role,
      operatorId: user.id,
      notes: `Continuous Custody document attached: "${newDoc.documentName}" (${newDoc.documentType.replace(/_/g, ' ')}). Doc integrity hash: #${verificationHash}.`,
      verificationHash,
    };

    parcels[index].custodyEvents.push(auditEvent);
    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));

    this.addNotification({
      title: 'Custody Document Attached',
      message: `Document "${newDoc.documentName}" was cryptographically attached to parcel ${parcels[index].trackingNumber}.`,
      category: 'STATUS_CHANGE',
      parcelId,
      trackingNumber: parcels[index].trackingNumber,
      severity: 'INFO',
    });

    this.notify();
    return newDoc;
  }

  // --- Predictive Delay Alert Thresholds & Priority Buffer Configuration ---
  public getDefaultThresholdConfig(tenantId?: string): DelayThresholdConfig {
    const tid = tenantId || this.getActiveTenantId();
    return {
      id: `thresh-cfg-${tid}`,
      tenantId: tid,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Operations Dispatcher',
      enabledGlobalAlerts: true,
      corridorSensitivity: 'STANDARD',
      autoTriggerIncidentTicket: true,
      rules: {
        SAME_DAY_PRIORITY: {
          priority: 'SAME_DAY_PRIORITY',
          label: 'Same-Day Urgent SLA',
          warningBufferMinutes: 10, // Alert when delay exceeds 10m
          criticalBufferMinutes: 20, // Critical breach if delay exceeds 20m
          minDelayRiskScore: 35,
          autoDispatchBypass: true,
          notifyRecipientSms: true,
          soundChime: true,
        },
        NEXT_DAY_EXPRESS: {
          priority: 'NEXT_DAY_EXPRESS',
          label: 'Next-Day Express Priority',
          warningBufferMinutes: 25,
          criticalBufferMinutes: 45,
          minDelayRiskScore: 45,
          autoDispatchBypass: true,
          notifyRecipientSms: true,
          soundChime: false,
        },
        STANDARD_GROUND: {
          priority: 'STANDARD_GROUND',
          label: 'Standard Ground Economy',
          warningBufferMinutes: 45,
          criticalBufferMinutes: 90,
          minDelayRiskScore: 60,
          autoDispatchBypass: false,
          notifyRecipientSms: false,
          soundChime: false,
        },
      },
    };
  }

  public getDelayThresholdConfig(tenantId?: string): DelayThresholdConfig {
    const tid = tenantId || this.getActiveTenantId();
    const raw = localStorage.getItem(`${STORAGE_KEYS.DELAY_THRESHOLDS}_${tid}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse threshold config:', e);
      }
    }
    const defaults = this.getDefaultThresholdConfig(tid);
    this.saveDelayThresholdConfig(defaults);
    return defaults;
  }

  public saveDelayThresholdConfig(config: DelayThresholdConfig): void {
    const tid = config.tenantId || this.getActiveTenantId();
    const updated: DelayThresholdConfig = {
      ...config,
      tenantId: tid,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(`${STORAGE_KEYS.DELAY_THRESHOLDS}_${tid}`, JSON.stringify(updated));
    this.notify();
  }

  public resetDelayThresholdConfig(tenantId?: string): DelayThresholdConfig {
    const tid = tenantId || this.getActiveTenantId();
    const defaults = this.getDefaultThresholdConfig(tid);
    this.saveDelayThresholdConfig(defaults);
    return defaults;
  }

  // --- Geofence Zones & Proximity Alert System ---
  public getDefaultGeofenceZones(tenantId?: string): GeofenceZone[] {
    const hubs = this.getHubs(tenantId);
    return hubs.map((hub, idx) => ({
      id: `geo-zone-${hub.id}`,
      hubId: hub.id,
      hubName: hub.name,
      tenantId: hub.tenantId,
      name: `${hub.name} Perimeter`,
      radiusKm: idx === 0 ? 5.0 : idx === 1 ? 3.5 : 4.0, // default radius
      centerLat: hub.lat,
      centerLng: hub.lng,
      enabled: true,
      notifyOnEnter: true,
      notifyOnExit: true,
      colorHex: idx === 0 ? '#10b981' : idx === 1 ? '#6366f1' : '#f59e0b',
      lastTriggeredAt: undefined,
    }));
  }

  public getGeofenceZones(tenantId?: string): GeofenceZone[] {
    const tid = tenantId || this.getActiveTenantId();
    const raw = localStorage.getItem(`${STORAGE_KEYS.GEOFENCE_ZONES}_${tid}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse geofence zones:', e);
      }
    }
    const defaults = this.getDefaultGeofenceZones(tid);
    this.saveGeofenceZones(defaults, tid);
    return defaults;
  }

  public saveGeofenceZones(zones: GeofenceZone[], tenantId?: string): void {
    const tid = tenantId || this.getActiveTenantId();
    localStorage.setItem(`${STORAGE_KEYS.GEOFENCE_ZONES}_${tid}`, JSON.stringify(zones));
    this.notify();
  }

  public updateGeofenceZone(updatedZone: GeofenceZone): void {
    const zones = this.getGeofenceZones(updatedZone.tenantId);
    const index = zones.findIndex((z) => z.id === updatedZone.id);
    if (index >= 0) {
      zones[index] = updatedZone;
    } else {
      zones.push(updatedZone);
    }
    this.saveGeofenceZones(zones, updatedZone.tenantId);
  }

  public addGeofenceZone(newZone: Omit<GeofenceZone, 'id'>): GeofenceZone {
    const zones = this.getGeofenceZones(newZone.tenantId);
    const created: GeofenceZone = {
      ...newZone,
      id: `geo-zone-${Date.now().toString(36)}`,
    };
    zones.push(created);
    this.saveGeofenceZones(zones, newZone.tenantId);
    return created;
  }

  public deleteGeofenceZone(zoneId: string, tenantId?: string): void {
    const tid = tenantId || this.getActiveTenantId();
    const zones = this.getGeofenceZones(tid).filter((z) => z.id !== zoneId);
    this.saveGeofenceZones(zones, tid);
  }

  public getGeofenceEvents(tenantId?: string): GeofenceEvent[] {
    const tid = tenantId || this.getActiveTenantId();
    const raw = localStorage.getItem(`${STORAGE_KEYS.GEOFENCE_EVENTS}_${tid}`);
    return raw ? JSON.parse(raw) : [];
  }

  public recordGeofenceEvent(eventData: Omit<GeofenceEvent, 'id' | 'timestamp'>): GeofenceEvent {
    const tid = this.getActiveTenantId();
    const events = this.getGeofenceEvents(tid);
    const newEvent: GeofenceEvent = {
      ...eventData,
      id: `geo-evt-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    events.unshift(newEvent);
    // Keep last 100 geofence events
    if (events.length > 100) events.pop();
    localStorage.setItem(`${STORAGE_KEYS.GEOFENCE_EVENTS}_${tid}`, JSON.stringify(events));

    // Update zone's last triggered timestamp
    const zones = this.getGeofenceZones(tid);
    const zIdx = zones.findIndex((z) => z.id === eventData.geofenceId);
    if (zIdx >= 0) {
      zones[zIdx].lastTriggeredAt = newEvent.timestamp;
      this.saveGeofenceZones(zones, tid);
    }

    // Trigger platform Notification
    const actionLabel = eventData.action === 'ENTER' ? 'ENTERED' : 'EXITED';
    this.addNotification({
      title: `Geofence Alert: Vehicle ${eventData.vehicleNumber} ${actionLabel}`,
      message: `Vehicle ${eventData.vehicleNumber} (${eventData.driverName || 'Courier'}) has ${actionLabel.toLowerCase()} the ${eventData.radiusKm}km radius zone around ${eventData.hubName} (${eventData.distanceFromCenterKm} km from hub).`,
      category: 'COURIER_TASK',
      severity: eventData.action === 'ENTER' ? 'INFO' : 'WARNING',
    });

    this.notify();
    return newEvent;
  }

  // --- Route Fuel Efficiency Logging ---
  public getRouteFuelLogs(tenantId?: string, courierId?: string): RouteFuelLogEntry[] {
    const tid = tenantId || this.getActiveTenantId();
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTE_FUEL_LOGS);
    let logs: RouteFuelLogEntry[] = raw ? JSON.parse(raw) : INITIAL_ROUTE_FUEL_LOGS;
    if (tid) {
      logs = logs.filter((l) => l.tenantId === tid);
    }
    if (courierId) {
      logs = logs.filter((l) => l.courierId === courierId);
    }
    return logs;
  }

  public addRouteFuelLog(entry: Omit<RouteFuelLogEntry, 'id' | 'createdAt'>): RouteFuelLogEntry {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTE_FUEL_LOGS);
    const logs: RouteFuelLogEntry[] = raw ? JSON.parse(raw) : [...INITIAL_ROUTE_FUEL_LOGS];
    const newEntry: RouteFuelLogEntry = {
      ...entry,
      id: `fuel-log-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.ROUTE_FUEL_LOGS, JSON.stringify(logs));

    // Register offline sync operation
    offlineSyncService.enqueueOperation({
      clientActionId: `fuel-${newEntry.id}`,
      type: 'UPDATE_PARCEL_STATUS' as any,
      entityId: newEntry.id,
      summary: `Logged Route Fuel: ${newEntry.routeName} (${newEntry.fuelConsumed} ${newEntry.fuelUnit} over ${newEntry.distanceKm}km)`,
      payload: newEntry,
    });

    // App Notification
    const deltaSign = newEntry.efficiencyDeltaPct <= 0 ? 'better' : 'higher';
    const deltaStr = Math.abs(newEntry.efficiencyDeltaPct).toFixed(1);
    this.addNotification({
      title: 'Route Fuel Consumption Logged',
      message: `${newEntry.routeName}: ${newEntry.fuelConsumed} ${newEntry.fuelUnit} (${newEntry.efficiency} ${newEntry.fuelUnit}/100km, ${deltaStr}% ${deltaSign} than benchmark). Eco-Score: ${newEntry.ecoScore}/100.`,
      category: 'COURIER_TASK',
      severity: 'INFO',
    });

    this.notify();
    return newEntry;
  }

  public deleteRouteFuelLog(id: string): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTE_FUEL_LOGS);
    if (!raw) return false;
    const logs: RouteFuelLogEntry[] = JSON.parse(raw);
    const filtered = logs.filter((l) => l.id !== id);
    if (filtered.length !== logs.length) {
      localStorage.setItem(STORAGE_KEYS.ROUTE_FUEL_LOGS, JSON.stringify(filtered));
      this.notify();
      return true;
    }
    return false;
  }
}

export const storage = LogisticsStorageService.getInstance();
