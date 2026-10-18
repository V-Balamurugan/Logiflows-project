import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Wrench, 
  Gauge, 
  Zap, 
  Truck, 
  Flame, 
  Disc, 
  Cpu, 
  Radio, 
  RefreshCw, 
  Search, 
  X, 
  Sliders, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import { Vehicle, MaintenanceLogEntry } from '../../types';
import { storage } from '../../services/storage';
import { fleetMaintenanceService } from '../../services/fleetMaintenanceService';

interface Props {
  vehicles: Vehicle[];
}

export interface SimulatedVehicleTelemetry {
  vehicleId: string;
  vehicleNumber: string;
  driverName: string;
  vehicleType: string;
  currentOdometerKm: number;
  nextServiceOdometerKm: number;
  intervalRemainingKm: number;
  isIntervalOverdue: boolean;
  daysToService: number;

  // Live Telemetric Sensor Readings
  engineOrBatteryTempC: number;
  brakePadThicknessMm: number;
  transmissionSlipPct: number;
  tpmsPressurePsi: {
    frontLeft: number;
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  fluidOrBatteryHealthPct: number;
  vibrationRms: number; // m/s2

  // Diagnostic Status
  healthStatus: 'CRITICAL_MAINTENANCE' | 'WARNING_ATTENTION' | 'HEALTHY';
  activeAlarms: string[];
  recommendedAction: string;
  grounded: boolean;
}

export const VehicleHealthMonitor: React.FC<Props> = ({ vehicles }) => {
  const currentTenantId = storage.getActiveTenantId();
  const [telemetryStreamActive, setTelemetryStreamActive] = useState(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Maintenance Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [modalTargetVehicle, setModalTargetVehicle] = useState<Vehicle | null>(null);

  // Initialize simulated telemetry baseline per vehicle
  const [telemetryData, setTelemetryData] = useState<Record<string, SimulatedVehicleTelemetry>>(() => {
    const logs = fleetMaintenanceService.getMaintenanceLogs(currentTenantId);
    const initialMap: Record<string, SimulatedVehicleTelemetry> = {};

    vehicles.forEach((veh) => {
      const vehLogs = logs.filter(l => l.vehicleId === veh.id);
      const lastLog = vehLogs[0];
      const odo = veh.odometerKm || 45000;
      const nextOdo = lastLog ? lastLog.nextServiceOdometerKm : (odo + 8000);
      const remainingKm = nextOdo - odo;
      const isOverdue = remainingKm <= 0;

      // Realistic initial conditions per vehicle
      const isOverdueVan = veh.vehicleNumber.includes('SP-102'); // Carlos' van (overdue)
      const isHeavy = veh.vehicleNumber.includes('HV-301');
      const isElectric = veh.type === 'ELECTRIC_VAN' || veh.type === 'CARGO_EBIKE';

      const engineTemp = isHeavy ? 98 : isElectric ? 42 : 91;
      const brakeMm = isOverdueVan ? 2.6 : 8.4;
      const transSlip = isHeavy ? 8.4 : 4.2;
      const tpms = isOverdueVan 
        ? { frontLeft: 34, frontRight: 35, rearLeft: 27, rearRight: 34 } // Low tire
        : { frontLeft: 35, frontRight: 35, rearLeft: 34, rearRight: 34 };

      const alarms: string[] = [];
      if (isOverdue) alarms.push(`Scheduled Maintenance Interval Overdue by ${Math.abs(remainingKm).toLocaleString()} km`);
      if (brakeMm < 3.0) alarms.push(`Brake Friction Lining at ${brakeMm}mm (Below 3.0mm Safety Limit)`);
      if (tpms.rearLeft < 30) alarms.push(`TPMS: Rear-Left Tire Pressure Low (27 PSI)`);
      if (engineTemp >= 105) alarms.push(`Thermal Alert: Coolant Loop Exceeds 105°C`);
      if (transSlip >= 8.0) alarms.push(`Transmission: Drivetrain Torque Slip Index Elevated (${transSlip}%)`);

      let status: 'CRITICAL_MAINTENANCE' | 'WARNING_ATTENTION' | 'HEALTHY' = 'HEALTHY';
      if (isOverdue || brakeMm < 3.0 || engineTemp >= 105) {
        status = 'CRITICAL_MAINTENANCE';
      } else if (alarms.length > 0 || remainingKm < 1500) {
        status = 'WARNING_ATTENTION';
      }

      initialMap[veh.id] = {
        vehicleId: veh.id,
        vehicleNumber: veh.vehicleNumber,
        driverName: veh.driverName || 'Unassigned',
        vehicleType: veh.type,
        currentOdometerKm: odo,
        nextServiceOdometerKm: nextOdo,
        intervalRemainingKm: remainingKm,
        isIntervalOverdue: isOverdue,
        daysToService: isOverdue ? -4 : Math.round(remainingKm / 120),
        engineOrBatteryTempC: engineTemp,
        brakePadThicknessMm: brakeMm,
        transmissionSlipPct: transSlip,
        tpmsPressurePsi: tpms,
        fluidOrBatteryHealthPct: isOverdueVan ? 18 : 88,
        vibrationRms: isHeavy ? 2.4 : 1.1,
        healthStatus: status,
        activeAlarms: alarms,
        recommendedAction: isOverdue 
          ? 'Ground vehicle immediately for 50,000 km certified overhaul & brake replacement.' 
          : 'Vehicle telemetry nominal. No immediate shop grounding required.',
        grounded: veh.status === 'MAINTENANCE'
      };
    });

    return initialMap;
  });

  // Live Telemetry Pulse Simulation (subtle sensor jitter when active)
  useEffect(() => {
    if (!telemetryStreamActive) return;

    const interval = setInterval(() => {
      setTelemetryData(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          const item = { ...next[id] };
          // Subtle realistic telemetry noise (0.2°C, 0.1 PSI)
          const tempDelta = (Math.random() - 0.5) * 0.4;
          item.engineOrBatteryTempC = Math.round((item.engineOrBatteryTempC + tempDelta) * 10) / 10;
          
          const psiDelta = (Math.random() - 0.5) * 0.2;
          item.tpmsPressurePsi = {
            ...item.tpmsPressurePsi,
            frontLeft: Math.round((item.tpmsPressurePsi.frontLeft + psiDelta) * 10) / 10
          };

          next[id] = item;
        });
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [telemetryStreamActive]);

  // Telemetric Simulation Triggers
  const handleSimulateBrakeFailure = () => {
    const target = vehicles.find(v => v.vehicleNumber.includes('SP-102')) || vehicles[0];
    if (!target) return;

    setTelemetryData(prev => ({
      ...prev,
      [target.id]: {
        ...prev[target.id],
        brakePadThicknessMm: 2.1,
        healthStatus: 'CRITICAL_MAINTENANCE',
        activeAlarms: [
          'CRITICAL: Front Brake Pad Sensor 2.1mm (Friction lining exhausted)',
          'High Stopping Distance Hazard Detected'
        ],
        recommendedAction: 'Mandatory Emergency Service: Replace friction pad assemblies and resurface rotors.'
      }
    }));

    setAdminNotice(`Simulated Brake Wear Alarm triggered for ${target.vehicleNumber}. Critical maintenance interval flagged.`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  const handleSimulateThermalSpike = () => {
    const target = vehicles.find(v => v.vehicleNumber.includes('HV-301')) || vehicles[1];
    if (!target) return;

    setTelemetryData(prev => ({
      ...prev,
      [target.id]: {
        ...prev[target.id],
        engineOrBatteryTempC: 108.5,
        healthStatus: 'CRITICAL_MAINTENANCE',
        activeAlarms: [
          'CRITICAL: Engine Coolant Temperature 108.5°C (Exceeds 105°C Safety Redline)',
          'Auxiliary Radiator Fan Pressure Fault'
        ],
        recommendedAction: 'Coolant Loop Flush & Thermostat Replacement Required. Ground unit immediately.'
      }
    }));

    setAdminNotice(`Simulated Thermal Alarm triggered for ${target.vehicleNumber}. High engine temperature detected.`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  const handleSimulateIntervalExpiry = () => {
    const target = vehicles.find(v => v.vehicleNumber.includes('EV-101')) || vehicles[0];
    if (!target) return;

    setTelemetryData(prev => {
      const odo = prev[target.id].currentOdometerKm + 9200;
      return {
        ...prev,
        [target.id]: {
          ...prev[target.id],
          currentOdometerKm: odo,
          intervalRemainingKm: -1200,
          isIntervalOverdue: true,
          daysToService: -10,
          healthStatus: 'CRITICAL_MAINTENANCE',
          activeAlarms: [
            'MANDATORY: 40,000 km Scheduled Service Interval Overdue by 1,200 km',
            'DOT Commercial Fleet Inspection Warranty Expired'
          ],
          recommendedAction: 'Schedule certified multi-point safety inspection & EV battery diagnostics.'
        }
      };
    });

    setAdminNotice(`Simulated Odometer Advance: Scheduled service interval expired on ${target.vehicleNumber}.`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  const handleResetTelemetry = () => {
    const logs = fleetMaintenanceService.getMaintenanceLogs(currentTenantId);
    const resetMap: Record<string, SimulatedVehicleTelemetry> = {};

    vehicles.forEach((veh) => {
      const vehLogs = logs.filter(l => l.vehicleId === veh.id);
      const lastLog = vehLogs[0];
      const odo = veh.odometerKm || 45000;
      const nextOdo = lastLog ? lastLog.nextServiceOdometerKm : (odo + 8000);
      const remainingKm = nextOdo - odo;
      const isElectric = veh.type === 'ELECTRIC_VAN' || veh.type === 'CARGO_EBIKE';

      resetMap[veh.id] = {
        vehicleId: veh.id,
        vehicleNumber: veh.vehicleNumber,
        driverName: veh.driverName || 'Unassigned',
        vehicleType: veh.type,
        currentOdometerKm: odo,
        nextServiceOdometerKm: nextOdo,
        intervalRemainingKm: Math.max(500, remainingKm),
        isIntervalOverdue: false,
        daysToService: Math.max(5, Math.round(remainingKm / 120)),
        engineOrBatteryTempC: isElectric ? 41.5 : 89.0,
        brakePadThicknessMm: 7.8,
        transmissionSlipPct: 3.8,
        tpmsPressurePsi: { frontLeft: 35, frontRight: 35, rearLeft: 34, rearRight: 34 },
        fluidOrBatteryHealthPct: 92,
        vibrationRms: 1.1,
        healthStatus: 'HEALTHY',
        activeAlarms: [],
        recommendedAction: 'Vehicle telemetry nominal. Next service in nominal range.',
        grounded: false
      };
    });

    setTelemetryData(resetMap);
    setAdminNotice('All vehicle telemetric sensors reset to factory baseline.');
    setTimeout(() => setAdminNotice(null), 4000);
  };

  // Admin Action: Ground Vehicle
  const handleGroundVehicle = (vehId: string) => {
    storage.updateVehicleStatus(vehId, 'MAINTENANCE');
    setTelemetryData(prev => ({
      ...prev,
      [vehId]: {
        ...prev[vehId],
        grounded: true
      }
    }));
    setAdminNotice(`Vehicle grounded. Status set to MAINTENANCE; blocked from dispatch until certified.`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  // Admin Action: Return Vehicle to Service
  const handleReturnToService = (vehId: string) => {
    storage.updateVehicleStatus(vehId, 'AVAILABLE');
    setTelemetryData(prev => ({
      ...prev,
      [vehId]: {
        ...prev[vehId],
        grounded: false,
        healthStatus: 'HEALTHY',
        activeAlarms: []
      }
    }));
    setAdminNotice(`Vehicle cleared for commercial duty. Status set to AVAILABLE.`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  // Filtered List
  const telemetryList = Object.values(telemetryData);
  const criticalCount = telemetryList.filter(t => t.healthStatus === 'CRITICAL_MAINTENANCE').length;
  const warningCount = telemetryList.filter(t => t.healthStatus === 'WARNING_ATTENTION').length;
  const healthyCount = telemetryList.filter(t => t.healthStatus === 'HEALTHY').length;

  const filteredList = useMemo(() => {
    return telemetryList.filter(t => {
      const matchFilter = 
        filterMode === 'ALL' ? true :
        filterMode === 'CRITICAL' ? t.healthStatus === 'CRITICAL_MAINTENANCE' :
        filterMode === 'WARNING' ? t.healthStatus === 'WARNING_ATTENTION' :
        t.healthStatus === 'HEALTHY';

      const matchSearch = 
        searchQuery === '' ||
        t.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.driverName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchFilter && matchSearch;
    });
  }, [telemetryList, filterMode, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {adminNotice && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>{adminNotice}</span>
          </div>
          <button onClick={() => setAdminNotice(null)} className="text-indigo-400 hover:text-indigo-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Widget Header & Telemetry Stream Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold block">
              REAL-TIME IOT TELEMETRY HARNESS · VEHICLE HEALTH & INTERVAL MONITOR
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY STREAM
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-400" />
            <span>Vehicle Health Monitor & Maintenance Interval Alarms</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitors real-time engine temperature, brake friction wear, TPMS tire pressure, and odometer maintenance milestones to proactively prevent roadside faults.
          </p>
        </div>

        {/* Telemetry Simulation Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTelemetryStreamActive(!telemetryStreamActive)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
              telemetryStreamActive
                ? 'bg-slate-800 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle live telemetry sensor jitter"
          >
            <Radio className={`w-3.5 h-3.5 ${telemetryStreamActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{telemetryStreamActive ? 'Live Stream Active' : 'Stream Paused'}</span>
          </button>

          <button
            onClick={handleSimulateBrakeFailure}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
            title="Simulate brake pad sensor drop to 2.1mm"
          >
            <Disc className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Brake Alarm</span>
          </button>

          <button
            onClick={handleSimulateThermalSpike}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
            title="Simulate engine temperature surge to 108°C"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Thermal Spike</span>
          </button>

          <button
            onClick={handleSimulateIntervalExpiry}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
            title="Advance odometer past scheduled service interval"
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Expire Interval</span>
          </button>

          <button
            onClick={handleResetTelemetry}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Reset telemetry baseline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Critical Maintenance Due */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Critical Maintenance Due</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-rose-400">
              {criticalCount}
            </span>
            <span className="text-xs text-slate-400">vehicles flagged</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {criticalCount > 0 ? 'Mandatory shop grounding recommended' : 'Zero critical mechanical faults detected'}
          </p>
        </div>

        {/* KPI 2: Approaching Service Milestone */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Approaching Interval Milestone</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-amber-400">
              {warningCount}
            </span>
            <span className="text-xs text-slate-400">vehicles (&lt; 1,500 km)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Advance schedule parts & maintenance slot
          </p>
        </div>

        {/* KPI 3: Healthy Nominal Fleet Units */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Nominal In-Service Units</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-emerald-400">
              {healthyCount}
            </span>
            <span className="text-xs text-slate-400">of {telemetryList.length} units</span>
          </div>
          <p className="text-[11px] text-slate-500">
            All telemetric sensors within OEM tolerances
          </p>
        </div>

        {/* KPI 4: Fleet Telemetry Sync */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Telemetry Diagnostic Bus</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono font-bold text-slate-100">CAN-Bus v2.4</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            6 IoT sensors / unit · 3.5s refresh
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg">
          {[
            { id: 'ALL', label: `All Vehicles (${telemetryList.length})` },
            { id: 'CRITICAL', label: `Critical Maintenance (${criticalCount})`, badgeClass: 'text-rose-400' },
            { id: 'WARNING', label: `Approaching Interval (${warningCount})`, badgeClass: 'text-amber-400' },
            { id: 'HEALTHY', label: `Healthy (${healthyCount})`, badgeClass: 'text-emerald-400' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterMode === tab.id
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vehicle number or driver..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Live Vehicle Telemetric Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredList.map((telemetry) => {
          const veh = vehicles.find(v => v.id === telemetry.vehicleId);
          const isCritical = telemetry.healthStatus === 'CRITICAL_MAINTENANCE';
          const isWarning = telemetry.healthStatus === 'WARNING_ATTENTION';
          const isGrounded = telemetry.grounded || veh?.status === 'MAINTENANCE';

          return (
            <div
              key={telemetry.vehicleId}
              className={`p-5 rounded-xl border transition-all space-y-4 ${
                isCritical 
                  ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/30'
                  : isWarning
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header Bar */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-slate-100">
                      {telemetry.vehicleNumber}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-300 font-semibold">
                      {telemetry.driverName}
                    </span>
                    {isGrounded && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500 text-white animate-pulse">
                        GROUNDED FOR MAINTENANCE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {telemetry.vehicleType.replace(/_/g, ' ')} · Odo: {telemetry.currentOdometerKm.toLocaleString()} km
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] ${
                    isCritical 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : isWarning
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {isCritical ? 'CRITICAL MAINTENANCE DUE' : isWarning ? 'ATTENTION REQUIRED' : 'NOMINAL HEALTH'}
                  </span>
                </div>
              </div>

              {/* Maintenance Interval Proximity Bar */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Next Scheduled Maintenance Interval:</span>
                  </span>
                  <span className={`font-mono font-bold ${
                    telemetry.isIntervalOverdue ? 'text-rose-400' : telemetry.intervalRemainingKm < 1500 ? 'text-amber-400' : 'text-slate-200'
                  }`}>
                    {telemetry.isIntervalOverdue 
                      ? `OVERDUE by ${Math.abs(telemetry.intervalRemainingKm).toLocaleString()} km`
                      : `${telemetry.intervalRemainingKm.toLocaleString()} km remaining`}
                  </span>
                </div>

                {/* Interval Target Milestone */}
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Current: {telemetry.currentOdometerKm.toLocaleString()} km</span>
                  <span>Target: {telemetry.nextServiceOdometerKm.toLocaleString()} km ({telemetry.daysToService <= 0 ? 'Due Now' : `~${telemetry.daysToService} days`})</span>
                </div>

                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      telemetry.isIntervalOverdue ? 'bg-rose-500' : telemetry.intervalRemainingKm < 1500 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, (telemetry.currentOdometerKm / telemetry.nextServiceOdometerKm) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Real-Time Sensor Telemetry Grid (6 Gauges) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Gauge 1: Engine/Battery Temperature */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>Thermal</span>
                    </span>
                    <span className={`font-mono font-bold ${
                      telemetry.engineOrBatteryTempC >= 105 ? 'text-rose-400 animate-pulse' : 'text-slate-200'
                    }`}>
                      {telemetry.engineOrBatteryTempC}°C
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${telemetry.engineOrBatteryTempC >= 105 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (telemetry.engineOrBatteryTempC / 120) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Gauge 2: Brake Pad Thickness Sensor */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Disc className="w-3 h-3 text-indigo-400" />
                      <span>Brake Lining</span>
                    </span>
                    <span className={`font-mono font-bold ${
                      telemetry.brakePadThicknessMm < 3.0 ? 'text-rose-400 animate-pulse' : 'text-slate-200'
                    }`}>
                      {telemetry.brakePadThicknessMm} mm
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${telemetry.brakePadThicknessMm < 3.0 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (telemetry.brakePadThicknessMm / 12) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Gauge 3: Transmission Slip Index */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-blue-400" />
                      <span>Torque Slip</span>
                    </span>
                    <span className={`font-mono font-bold ${
                      telemetry.transmissionSlipPct >= 8.0 ? 'text-amber-400' : 'text-slate-200'
                    }`}>
                      {telemetry.transmissionSlipPct}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${telemetry.transmissionSlipPct >= 8.0 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min(100, telemetry.transmissionSlipPct * 8)}%` }}
                    />
                  </div>
                </div>

                {/* Gauge 4: TPMS 4-Wheel Pressure Array */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">TPMS Array</span>
                    <span className="font-mono text-[10px] text-slate-300">PSI</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-slate-300">
                    <span className={telemetry.tpmsPressurePsi.frontLeft < 30 ? 'text-rose-400 font-bold' : ''}>
                      {telemetry.tpmsPressurePsi.frontLeft}
                    </span>
                    <span className={telemetry.tpmsPressurePsi.frontRight < 30 ? 'text-rose-400 font-bold' : ''}>
                      {telemetry.tpmsPressurePsi.frontRight}
                    </span>
                    <span className={telemetry.tpmsPressurePsi.rearLeft < 30 ? 'text-rose-400 font-bold' : ''}>
                      {telemetry.tpmsPressurePsi.rearLeft}
                    </span>
                    <span className={telemetry.tpmsPressurePsi.rearRight < 30 ? 'text-rose-400 font-bold' : ''}>
                      {telemetry.tpmsPressurePsi.rearRight}
                    </span>
                  </div>
                </div>

                {/* Gauge 5: Fluid / Battery SoH */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Fluid / SoH</span>
                    <span className="font-mono font-bold text-slate-200">
                      {telemetry.fluidOrBatteryHealthPct}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${telemetry.fluidOrBatteryHealthPct < 25 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${telemetry.fluidOrBatteryHealthPct}%` }}
                    />
                  </div>
                </div>

                {/* Gauge 6: Drivetrain Vibration */}
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Vibration</span>
                    <span className="font-mono font-bold text-slate-200">
                      {telemetry.vibrationRms} m/s²
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${telemetry.vibrationRms >= 2.5 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${Math.min(100, telemetry.vibrationRms * 25)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Active Telemetry Alarms Alert Box */}
              {telemetry.activeAlarms.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Active Telemetric Maintenance Triggers:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300/90 pl-1">
                    {telemetry.activeAlarms.map((alarm, idx) => (
                      <li key={idx}>{alarm}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-300 pt-1 border-t border-rose-500/20">
                    <strong className="text-slate-200">Action:</strong> {telemetry.recommendedAction}
                  </p>
                </div>
              )}

              {/* Admin Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-500 font-mono">
                  Unit ID: {telemetry.vehicleId}
                </span>

                <div className="flex items-center gap-2">
                  {isGrounded ? (
                    <button
                      onClick={() => handleReturnToService(telemetry.vehicleId)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Clear & Return to Service</span>
                    </button>
                  ) : isCritical ? (
                    <button
                      onClick={() => handleGroundVehicle(telemetry.vehicleId)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/30 transition-colors animate-pulse"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Ground Vehicle (Block Dispatch)</span>
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      const v = vehicles.find(item => item.id === telemetry.vehicleId);
                      if (v) {
                        setModalTargetVehicle(v);
                        setIsLogModalOpen(true);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Log Service Interval</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Interval Log Modal */}
      {isLogModalOpen && modalTargetVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Log Certified Maintenance: {modalTargetVehicle.vehicleNumber}
                </h3>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Recording this certified service interval will reset telemetry wear sensors, update the vehicle odometer milestone, and clear active maintenance alarms.
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Target Vehicle:</span>
                <span className="font-bold text-slate-100">{modalTargetVehicle.vehicleNumber}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Current Odometer:</span>
                <span className="text-indigo-400">{(modalTargetVehicle.odometerKm || 45000).toLocaleString()} km</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Next Recommended Interval:</span>
                <span className="text-emerald-400">{((modalTargetVehicle.odometerKm || 45000) + 10000).toLocaleString()} km</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  fleetMaintenanceService.addMaintenanceLog({
                    tenantId: currentTenantId,
                    vehicleId: modalTargetVehicle.id,
                    vehicleNumber: modalTargetVehicle.vehicleNumber,
                    serviceDate: new Date().toISOString().split('T')[0],
                    odometerAtServiceKm: modalTargetVehicle.odometerKm || 45000,
                    serviceType: modalTargetVehicle.type === 'ELECTRIC_VAN' ? 'BATTERY_PACK_DIAGNOSTIC' : 'BRAKE_SYSTEM_SERVICE',
                    technicianOrShop: 'Apex Rapid Telemetry Service Depot',
                    costUsd: 380,
                    notes: 'Certified telemetry overhaul completed. Friction lining restored to 11.4mm, all sensors verified nominal.',
                    nextServiceOdometerKm: (modalTargetVehicle.odometerKm || 45000) + 10000,
                    nextServiceDate: '2027-04-15',
                    performedItems: ['Brake Rotor Service', 'Diagnostic Bus Flush', 'Sensor Recalibration']
                  });

                  // Clear alarms in widget state
                  setTelemetryData(prev => ({
                    ...prev,
                    [modalTargetVehicle.id]: {
                      ...prev[modalTargetVehicle.id],
                      healthStatus: 'HEALTHY',
                      activeAlarms: [],
                      brakePadThicknessMm: 11.2,
                      engineOrBatteryTempC: modalTargetVehicle.type === 'ELECTRIC_VAN' ? 41.5 : 89.0,
                      isIntervalOverdue: false,
                      intervalRemainingKm: 10000,
                      grounded: false
                    }
                  }));

                  storage.updateVehicleStatus(modalTargetVehicle.id, 'AVAILABLE');
                  setIsLogModalOpen(false);
                  setAdminNotice(`Certified maintenance logged for ${modalTargetVehicle.vehicleNumber}. Telemetry sensors restored.`);
                  setTimeout(() => setAdminNotice(null), 5000);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
              >
                Confirm & Clear Alarms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
