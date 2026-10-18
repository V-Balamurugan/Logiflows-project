import { 
  Parcel, 
  ParcelStatus, 
  CustodyEventType, 
  ProofOfDelivery, 
  CustodyEvent 
} from '../types';
import { requestBackgroundSync } from './serviceWorkerRegistration';

export type CellularSimulationMode = 
  | 'AUTO'                // Natural browser navigator.onLine & network state
  | 'ONLINE_5G'          // High-speed 5G / Broadband (30ms RTT)
  | 'POOR_COVERAGE_2G'   // Subterranean / Spotty 2G / Edge (1200ms RTT, jitter)
  | 'OFFLINE_DEADZONE';   // Concrete basement / Freight elevator / No signal (0 bars)

export type SyncOperationType = 
  | 'UPDATE_PARCEL_STATUS'
  | 'SUBMIT_POD'
  | 'ASSIGN_PARCEL'
  | 'REORDER_STOPS'
  | 'BOOK_PARCEL'
  | 'COURIER_GPS_BREADCRUMB';

export type SyncItemStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SyncOperation {
  id: string;
  clientActionId: string;
  type: SyncOperationType;
  entityId: string;
  trackingNumber?: string;
  summary: string;
  payload: any;
  queuedAt: string;
  syncedAt?: string;
  retryCount: number;
  status: SyncItemStatus;
  error?: string;
  courierId?: string;
  courierName?: string;
  cellularModeWhenQueued: CellularSimulationMode;
}

export interface OfflineSyncState {
  isOnline: boolean;
  effectiveMode: CellularSimulationMode;
  simulationMode: CellularSimulationMode;
  pendingCount: number;
  syncingCount: number;
  syncedCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  signalStrengthBars: number; // 0 to 4
  latencyMs: number;
  carrierName: string;
}

const OUTBOX_STORAGE_KEY = 'logiflows_offline_outbox';
const SYNC_STATE_STORAGE_KEY = 'logiflows_cellular_sim_mode';

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private listeners: Set<(state: OfflineSyncState) => void> = new Set();
  private outbox: SyncOperation[] = [];
  private simulationMode: CellularSimulationMode = 'AUTO';
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private autoSyncTimer: any = null;

  private constructor() {
    this.loadState();
    this.initNetworkListeners();
    this.startPeriodicSyncCheck();
  }

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  private loadState(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedMode = localStorage.getItem(SYNC_STATE_STORAGE_KEY) as CellularSimulationMode;
      if (savedMode) {
        this.simulationMode = savedMode;
      }

      const savedOutbox = localStorage.getItem(OUTBOX_STORAGE_KEY);
      if (savedOutbox) {
        this.outbox = JSON.parse(savedOutbox);
      }
    } catch (e) {
      console.warn('[OfflineSync] Failed to load state from localStorage:', e);
      this.outbox = [];
    }
  }

  private persistOutbox(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(this.outbox));
    } catch (e) {
      console.warn('[OfflineSync] Failed to persist outbox:', e);
    }
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.notifyListeners();
      this.triggerAutoSync();
    });

    window.addEventListener('offline', () => {
      this.notifyListeners();
    });
  }

  private startPeriodicSyncCheck(): void {
    if (typeof window === 'undefined') return;

    this.autoSyncTimer = setInterval(() => {
      if (this.isNetworkAvailable() && this.getPendingOperations().length > 0 && !this.isSyncing) {
        this.processOutboxQueue();
      }
    }, 12000);
  }

  public isNetworkAvailable(): boolean {
    if (typeof window === 'undefined') return true;

    if (this.simulationMode === 'OFFLINE_DEADZONE') {
      return false;
    }
    if (this.simulationMode === 'ONLINE_5G' || this.simulationMode === 'POOR_COVERAGE_2G') {
      return true;
    }
    return window.navigator.onLine;
  }

  public getSignalStrengthBars(): number {
    if (!this.isNetworkAvailable()) return 0;
    if (this.simulationMode === 'POOR_COVERAGE_2G') return 1;
    if (this.simulationMode === 'ONLINE_5G') return 4;
    return 3;
  }

  public getEstimatedLatencyMs(): number {
    if (!this.isNetworkAvailable()) return 9999;
    if (this.simulationMode === 'POOR_COVERAGE_2G') return 1450;
    if (this.simulationMode === 'ONLINE_5G') return 32;
    return 75;
  }

  public getCarrierName(): string {
    if (this.simulationMode === 'OFFLINE_DEADZONE') return 'No Cellular Service (Dead Zone)';
    if (this.simulationMode === 'POOR_COVERAGE_2G') return 'FirstNet LTE (1 Bar - Fringe)';
    if (this.simulationMode === 'ONLINE_5G') return 'Verizon 5G Ultra Wideband';
    return 'Logistics Private APN';
  }

  public getState(): OfflineSyncState {
    const isOnline = this.isNetworkAvailable();
    const pending = this.outbox.filter((op) => op.status === 'PENDING').length;
    const syncing = this.outbox.filter((op) => op.status === 'SYNCING').length;
    const synced = this.outbox.filter((op) => op.status === 'SYNCED').length;
    const failed = this.outbox.filter((op) => op.status === 'FAILED').length;

    return {
      isOnline,
      effectiveMode: this.simulationMode,
      simulationMode: this.simulationMode,
      pendingCount: pending,
      syncingCount: syncing,
      syncedCount: synced,
      failedCount: failed,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      signalStrengthBars: this.getSignalStrengthBars(),
      latencyMs: this.getEstimatedLatencyMs(),
      carrierName: this.getCarrierName(),
    };
  }

  public setSimulationMode(mode: CellularSimulationMode): void {
    this.simulationMode = mode;
    try {
      localStorage.setItem(SYNC_STATE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    this.notifyListeners();

    if (this.isNetworkAvailable()) {
      this.triggerAutoSync();
    }
  }

  public enqueueOperation(op: Omit<SyncOperation, 'id' | 'queuedAt' | 'retryCount' | 'status' | 'cellularModeWhenQueued'>): SyncOperation {
    const newOperation: SyncOperation = {
      ...op,
      id: `sync-op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING',
      cellularModeWhenQueued: this.simulationMode,
    };

    // Prepend or append to outbox
    this.outbox.unshift(newOperation);
    this.persistOutbox();
    this.notifyListeners();

    // If online, immediately attempt sync or request SW background sync
    if (this.isNetworkAvailable()) {
      requestBackgroundSync('sync-courier-outbox').catch(() => {});
      this.triggerAutoSync();
    }

    return newOperation;
  }

  public getOutbox(): SyncOperation[] {
    return [...this.outbox];
  }

  public getPendingOperations(): SyncOperation[] {
    return this.outbox.filter((op) => op.status === 'PENDING' || op.status === 'FAILED');
  }

  public async triggerAutoSync(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.isNetworkAvailable()) return;

    const pending = this.getPendingOperations();
    if (pending.length === 0) return;

    await this.processOutboxQueue();
  }

  public async processOutboxQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (!this.isNetworkAvailable()) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let successCount = 0;
    let failCount = 0;

    const pending = this.outbox.filter((op) => op.status === 'PENDING' || op.status === 'FAILED');

    // Simulate realistic mobile network batch round trip
    const latency = this.simulationMode === 'POOR_COVERAGE_2G' ? 1400 : 350;

    for (const op of pending) {
      // Double check connection
      if (!this.isNetworkAvailable()) {
        op.status = 'PENDING';
        break;
      }

      op.status = 'SYNCING';
      this.notifyListeners();

      try {
        await new Promise((resolve) => setTimeout(resolve, latency / 2));

        // Simulate rare packet drop if on 2G fringe mode
        if (this.simulationMode === 'POOR_COVERAGE_2G' && Math.random() < 0.25 && op.retryCount === 0) {
          throw new Error('Carrier TCP timeout (retransmitting packet)');
        }

        // Successfully pushed to server
        op.status = 'SYNCED';
        op.syncedAt = new Date().toISOString();
        op.error = undefined;
        successCount++;
      } catch (err: any) {
        op.retryCount += 1;
        op.status = op.retryCount > 3 ? 'FAILED' : 'PENDING';
        op.error = err?.message || 'Sync failed';
        failCount++;
      }

      this.persistOutbox();
      this.notifyListeners();
    }

    this.isSyncing = false;
    this.lastSyncedAt = new Date().toISOString();
    this.persistOutbox();
    this.notifyListeners();

    // Trigger local storage custom event so UI views refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('logiflows:sync-completed', {
        detail: { successCount, failCount, timestamp: this.lastSyncedAt }
      }));
    }

    return { synced: successCount, failed: failCount };
  }

  public clearSyncedOperations(): void {
    this.outbox = this.outbox.filter((op) => op.status !== 'SYNCED');
    this.persistOutbox();
    this.notifyListeners();
  }

  public retryFailedOperations(): void {
    this.outbox.forEach((op) => {
      if (op.status === 'FAILED') {
        op.status = 'PENDING';
        op.retryCount = 0;
        op.error = undefined;
      }
    });
    this.persistOutbox();
    this.notifyListeners();
    this.triggerAutoSync();
  }

  public subscribe(listener: (state: OfflineSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }
}

export const offlineSyncService = OfflineSyncService.getInstance();
