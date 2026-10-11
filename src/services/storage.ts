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
  ProofOfDelivery, 
  MicroserviceNode, 
  MapDiagnosticState,
  DelayRiskAssessment,
  AppNotification
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_TENANTS, 
  INITIAL_HUBS, 
  INITIAL_VEHICLES, 
  INITIAL_EMPLOYEES, 
  INITIAL_PARCELS, 
  INITIAL_MICROSERVICES 
} from '../data/mockData';

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
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
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

    this.addNotification({
      title: `Parcel Status: ${newStatus.replace(/_/g, ' ')}`,
      message: `${parcels[index].trackingNumber} updated to ${newStatus.replace(/_/g, ' ')} at ${locationName}.`,
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
    this.notify();
    return true;
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

    this.addNotification({
      title: 'Proof of Delivery Completed',
      message: `Parcel ${parcels[index].trackingNumber} delivered directly to ${pod.recipientName}. Digital signature & GPS logged.`,
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
}

export const storage = LogisticsStorageService.getInstance();
