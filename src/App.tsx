import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { User, Parcel } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PlatformAdminDashboard } from './components/dashboards/PlatformAdminDashboard';
import { TenantOwnerDashboard } from './components/dashboards/TenantOwnerDashboard';
import { TenantAdminDashboard } from './components/dashboards/TenantAdminDashboard';
import { CourierDashboard } from './components/dashboards/CourierDashboard';
import { CustomerDashboard } from './components/dashboards/CustomerDashboard';
import { LogisticsMap } from './components/map/LogisticsMap';
import { HubsView } from './components/views/HubsView';
import { FleetView } from './components/views/FleetView';
import { EmployeesView } from './components/views/EmployeesView';
import { ParcelsView } from './components/views/ParcelsView';
import { PublicTrackingPage } from './components/public/PublicTrackingPage';
import { ParcelBookingModal } from './components/parcels/ParcelBookingModal';
import { ShippingLabelModal } from './components/parcels/ShippingLabelModal';
import { ProofOfDeliveryModal } from './components/parcels/ProofOfDeliveryModal';
import { QrScannerModal } from './components/courier/QrScannerModal';
import { MicroservicesTopologyModal } from './components/architecture/MicroservicesTopologyModal';
import { ParcelDetailModal } from './components/parcels/ParcelDetailModal';
import { PerformanceMetricsView } from './components/analytics/PerformanceMetricsView';
import { PredictiveDelayWidget } from './components/intelligence/PredictiveDelayWidget';
import { NotificationPanel } from './components/notifications/NotificationPanel';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => storage.getCurrentUser());
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [labelParcel, setLabelParcel] = useState<Parcel | null>(null);
  const [isPodOpen, setIsPodOpen] = useState(false);
  const [podParcel, setPodParcel] = useState<Parcel | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isTopologyOpen, setIsTopologyOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setCurrentUser(storage.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const handleOpenDetail = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setIsDetailModalOpen(true);
  };

  const handleOpenLabel = (parcel: Parcel) => {
    setLabelParcel(parcel);
    setIsLabelOpen(true);
  };

  const handleOpenPod = (parcel: Parcel) => {
    setPodParcel(parcel);
    setIsPodOpen(true);
  };

  const handleParcelScanned = (
    parcel: Parcel,
    actionType: 'CHECK_IN' | 'LOAD_VAN' | 'DELIVER'
  ) => {
    if (actionType === 'CHECK_IN') {
      storage.updateParcelStatus(
        parcel.id,
        'AT_DESTINATION_HUB',
        'HUB_CHECK_IN',
        'Sortation Conveyor Station #02',
        'Optical QR Scan confirmed arrival at sorting facility.'
      );
    } else if (actionType === 'LOAD_VAN') {
      storage.updateParcelStatus(
        parcel.id,
        'OUT_FOR_DELIVERY',
        'OUT_FOR_DELIVERY_DISPATCH',
        'Loading Dock #4',
        'Scanned into courier delivery vehicle manifest.'
      );
    } else if (actionType === 'DELIVER') {
      handleOpenPod(parcel);
    }
  };

  // If in public tracking standalone view
  if (activeView === 'public-tracking') {
    return (
      <PublicTrackingPage
        onBackToApp={() => setActiveView('dashboard')}
        onPrintLabel={handleOpenLabel}
      />
    );
  }

  const hubs = storage.getHubs();
  const vehicles = storage.getVehicles();
  const parcels = storage.getParcels();

  // Render role-specific dashboard
  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'PLATFORM_ADMIN':
        return (
          <PlatformAdminDashboard
            onOpenTopology={() => setIsTopologyOpen(true)}
            onSelectTenant={(tId) => {
              storage.setActiveTenantId(tId);
              setActiveView('dashboard');
            }}
          />
        );
      case 'TENANT_OWNER':
        return (
          <TenantOwnerDashboard
            onSelectParcel={handleOpenDetail}
            onOpenBooking={() => setIsBookingOpen(true)}
            onNavigateMetrics={() => setActiveView('metrics')}
          />
        );
      case 'TENANT_ADMIN':
        return (
          <TenantAdminDashboard
            onSelectParcel={handleOpenDetail}
            onOpenBooking={() => setIsBookingOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onPrintLabel={handleOpenLabel}
          />
        );
      case 'COURIER':
        return (
          <CourierDashboard
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenPod={handleOpenPod}
            onSelectParcel={handleOpenDetail}
          />
        );
      case 'CUSTOMER':
        return (
          <CustomerDashboard
            onOpenBooking={() => setIsBookingOpen(true)}
            onSelectParcel={handleOpenDetail}
            onPrintLabel={handleOpenLabel}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Bar Header */}
      <Header
        currentUser={currentUser}
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenTopology={() => setIsTopologyOpen(true)}
        onNavigatePublicTracking={() => setActiveView('public-tracking')}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Workspace Canvas: Sidebar + Scrollable Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentUser={currentUser}
          activeView={activeView}
          setActiveView={setActiveView}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenTopology={() => setIsTopologyOpen(true)}
          onOpenTracking={() => setActiveView('public-tracking')}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeView === 'dashboard' && renderDashboard()}
            {activeView === 'metrics' && <PerformanceMetricsView />}
            {activeView === 'delay-intelligence' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">
                    Predictive Delay Intelligence & Corridor Bottleneck Analysis
                  </h2>
                  <p className="text-xs text-slate-400">
                    Continuous ML monitoring of regional freight and courier routes with alternative bypass recommendations.
                  </p>
                </div>
                <PredictiveDelayWidget />
              </div>
            )}
            {activeView === 'parcels' && (
              <ParcelsView
                onSelectParcel={handleOpenDetail}
                onOpenBooking={() => setIsBookingOpen(true)}
                onPrintLabel={handleOpenLabel}
              />
            )}
            {activeView === 'map' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">
                      Geospatial Command & OpenRouteService (ORS) Routing
                    </h2>
                    <p className="text-xs text-slate-400">
                      Real-time interactive fleet telemetry, OpenRouteService road directions, isochrone reachability zones, and sorting depots.
                    </p>
                  </div>
                </div>
                <LogisticsMap
                  hubs={hubs}
                  vehicles={vehicles}
                  parcels={parcels}
                  className="h-[640px]"
                />
              </div>
            )}
            {activeView === 'hubs' && <HubsView />}
            {activeView === 'fleet' && <FleetView />}
            {activeView === 'employees' && <EmployeesView />}
            {activeView === 'tenants' && (
              <PlatformAdminDashboard
                onOpenTopology={() => setIsTopologyOpen(true)}
                onSelectTenant={(tId) => {
                  storage.setActiveTenantId(tId);
                  setActiveView('dashboard');
                }}
              />
            )}
            {activeView === 'courier-deliveries' && (
              <CourierDashboard
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenPod={handleOpenPod}
                onSelectParcel={handleOpenDetail}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals & Dialogs */}
      <ParcelBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={(newPcl) => {
          setSelectedParcel(newPcl);
          setIsDetailModalOpen(true);
        }}
      />

      <ShippingLabelModal
        parcel={labelParcel}
        isOpen={isLabelOpen}
        onClose={() => setIsLabelOpen(false)}
      />

      <ProofOfDeliveryModal
        parcel={podParcel}
        isOpen={isPodOpen}
        onClose={() => setIsPodOpen(false)}
        onSuccess={() => {
          // Handled via storage update
        }}
      />

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onParcelScanned={handleParcelScanned}
      />

      <MicroservicesTopologyModal
        isOpen={isTopologyOpen}
        onClose={() => setIsTopologyOpen(false)}
      />

      <ParcelDetailModal
        parcel={selectedParcel}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onPrintLabel={handleOpenLabel}
      />

      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onSelectParcelByTracking={(tracking) => {
          const found = storage.getParcelByTracking(tracking);
          if (found) {
            handleOpenDetail(found);
          }
        }}
      />
    </div>
  );
}
