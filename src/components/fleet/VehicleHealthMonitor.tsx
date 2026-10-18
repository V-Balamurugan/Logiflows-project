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
  Timer,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  TrendingUp,
  Sparkles
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
  daysToServiceMileage: number;

  // Engine Operating Hours Telemetry
  engineHours: number;
  nextServiceEngineHours: number;
  engineHoursRemaining: number;
  isEngineHoursOverdue: boolean;
  engineHoursDailyRate: number;
  daysToServiceHours: number;

  // High-Priority Predictive Service Due Indicator
  isServiceDue: boolean;
  serviceDuePriority: 'HIGH' | 'CRITICAL' | 'NORMAL';
  serviceDueReason: string;
  serviceDueFactors: {
    engineHoursOverdue: boolean;
    mileageOverdue: boolean;
    mechanicalWearHigh: boolean;
    thermalSpike: boolean;
  };
  predictiveDaysRemaining: number;

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
  const [filterMode, setFilterMode] = useState<'ALL' | 'SERVICE_DUE' | 'CRITICAL' | 'WARNING' | 'HEALTHY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Maintenance Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [modalTargetVehicle, setModalTargetVehicle] = useState<Vehicle | null>(null);
  const [modalEngineHours, setModalEngineHours] = useState<number>(0);
  const [modalNextEngineHours, setModalNextEngineHours] = useState<number>(0);
  const [modalOdometer, setModalOdometer] = useState<number>(0);
  const [modalNextOdometer, setModalNextOdometer] = useState<number>(0);

  // Initialize simulated telemetry baseline per vehicle with dual engine hours & mileage metrics
  const [telemetryData, setTelemetryData] = useState<Record<string, SimulatedVehicleTelemetry>>(() => {
    const logs = fleetMaintenanceService.getMaintenanceLogs(currentTenantId);
    const initialMap: Record<string, SimulatedVehicleTelemetry> = {};

    vehicles.forEach((veh) => {
      const vehLogs = logs.filter(l => l.vehicleId === veh.id);
      const lastLog = vehLogs[0];
      const odo = veh.odometerKm || 45000;
      const nextOdo = lastLog ? lastLog.nextServiceOdometerKm : (odo + 8000);
      const remainingKm = nextOdo - odo;
      const isMileageOverdue = remainingKm <= 0;

      // Realistic baseline per vehicle
      const isOverdueVan = veh.vehicleNumber.includes('SP-102'); // Carlos' van (overdue)
      const isHeavy = veh.vehicleNumber.includes('HV-301');
      const isElectric = veh.type === 'ELECTRIC_VAN' || veh.type === 'CARGO_EBIKE';

      // Engine hours calculation
      const currentHours = veh.engineHours ?? (isHeavy ? 4890 : isOverdueVan ? 2510 : Math.round(odo / 24));
      const nextHours = lastLog?.nextServiceEngineHours ?? (isHeavy ? 5000 : isOverdueVan ? 2450 : (currentHours + 450));
      const hoursRemaining = nextHours - currentHours;
      const isHoursOverdue = hoursRemaining <= 0;
      const dailyHoursRate = veh.dailyEngineHours ?? (isHeavy ? 11.2 : isOverdueVan ? 8.4 : 5.8);

      const engineTemp = isHeavy ? 98 : isElectric ? 42 : 91;
      const brakeMm = isOverdueVan ? 2.6 : 8.4;
      const transSlip = isHeavy ? 8.4 : 4.2;
      const tpms = isOverdueVan 
        ? { frontLeft: 34, frontRight: 35, rearLeft: 27, rearRight: 34 } // Low tire
        : { frontLeft: 35, frontRight: 35, rearLeft: 34, rearRight: 34 };

      // Determine Multi-factor Service Due
      const isServiceDue = isMileageOverdue || isHoursOverdue || brakeMm < 3.0 || engineTemp >= 105;
      const serviceDuePriority: 'HIGH' | 'CRITICAL' | 'NORMAL' = 
        (isMileageOverdue && isHoursOverdue) || brakeMm < 3.0 || engineTemp >= 105 ? 'CRITICAL' :
        isServiceDue ? 'HIGH' : 'NORMAL';

      let serviceDueReason = '';
      if (isMileageOverdue && isHoursOverdue) {
        serviceDueReason = `Dual threshold exceeded: Engine hours (${currentHours.toLocaleString()} / ${nextHours.toLocaleString()} hrs) & Odometer (${odo.toLocaleString()} / ${nextOdo.toLocaleString()} km)`;
      } else if (isHoursOverdue) {
        serviceDueReason = `Engine hours threshold reached: ${currentHours.toLocaleString()} hrs (OEM interval ${nextHours.toLocaleString()} hrs exceeded by ${Math.abs(hoursRemaining)} hrs)`;
      } else if (isMileageOverdue) {
        serviceDueReason = `Mileage milestone overdue: ${odo.toLocaleString()} km (scheduled service threshold ${nextOdo.toLocaleString()} km)`;
      } else if (brakeMm < 3.0) {
        serviceDueReason = `Critical brake friction lining: ${brakeMm}mm (Below 3.0mm minimum commercial safety limit)`;
      } else {
        serviceDueReason = 'Nominal operating range. Next predictive service scheduled.';
      }

      const alarms: string[] = [];
      if (isServiceDue) {
        alarms.push(`🚨 HIGH-PRIORITY SERVICE DUE: ${serviceDueReason}`);
      }
      if (isHoursOverdue) {
        alarms.push(`Engine Operating Hours Limit Exceeded: ${currentHours.toLocaleString()} / ${nextHours.toLocaleString()} hrs`);
      }
      if (isMileageOverdue) {
        alarms.push(`Scheduled Odometer Milestone Overdue by ${Math.abs(remainingKm).toLocaleString()} km`);
      }
      if (brakeMm < 3.0) {
        alarms.push(`Brake Friction Lining at ${brakeMm}mm (Below 3.0mm Safety Limit)`);
      }
      if (tpms.rearLeft < 30) {
        alarms.push(`TPMS: Rear-Left Tire Pressure Low (27 PSI)`);
      }
      if (engineTemp >= 105) {
        alarms.push(`Thermal Alert: Coolant Loop Exceeds 105°C`);
      }
      if (transSlip >= 8.0) {
        alarms.push(`Transmission: Drivetrain Torque Slip Index Elevated (${transSlip}%)`);
      }

      let status: 'CRITICAL_MAINTENANCE' | 'WARNING_ATTENTION' | 'HEALTHY' = 'HEALTHY';
      if (isServiceDue || isMileageOverdue || brakeMm < 3.0 || engineTemp >= 105) {
        status = 'CRITICAL_MAINTENANCE';
      } else if (alarms.length > 0 || remainingKm < 1500 || hoursRemaining < 100) {
        status = 'WARNING_ATTENTION';
      }

      const daysHours = isHoursOverdue ? 0 : Math.round(hoursRemaining / (dailyHoursRate || 6));
      const daysKm = isMileageOverdue ? 0 : Math.round(remainingKm / (veh.dailyMileageKm || 120));

      initialMap[veh.id] = {
        vehicleId: veh.id,
        vehicleNumber: veh.vehicleNumber,
        driverName: veh.driverName || 'Unassigned',
        vehicleType: veh.type,
        currentOdometerKm: odo,
        nextServiceOdometerKm: nextOdo,
        intervalRemainingKm: remainingKm,
        isIntervalOverdue: isMileageOverdue,
        daysToServiceMileage: isMileageOverdue ? -4 : daysKm,

        engineHours: currentHours,
        nextServiceEngineHours: nextHours,
        engineHoursRemaining: hoursRemaining,
        isEngineHoursOverdue: isHoursOverdue,
        engineHoursDailyRate: dailyHoursRate,
        daysToServiceHours: isHoursOverdue ? 0 : daysHours,

        isServiceDue,
        serviceDuePriority,
        serviceDueReason,
        serviceDueFactors: {
          engineHoursOverdue: isHoursOverdue,
          mileageOverdue: isMileageOverdue,
          mechanicalWearHigh: brakeMm < 3.0,
          thermalSpike: engineTemp >= 105
        },
        predictiveDaysRemaining: Math.min(daysHours, daysKm),

        engineOrBatteryTempC: engineTemp,
        brakePadThicknessMm: brakeMm,
        transmissionSlipPct: transSlip,
        tpmsPressurePsi: tpms,
        fluidOrBatteryHealthPct: isOverdueVan ? 18 : 88,
        vibrationRms: isHeavy ? 2.4 : 1.1,
        healthStatus: status,
        activeAlarms: alarms,
        recommendedAction: isServiceDue 
          ? 'Mandatory Service Due: Ground vehicle immediately for scheduled oil overhaul, brake relining, and multi-point certified inspection.' 
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

  // Telemetric Simulation Trigger: Engine Hours Surge (Exceeds Service Limit)
  const handleSimulateEngineHoursSurge = () => {
    const target = vehicles.find(v => v.vehicleNumber.includes('HV-301')) || vehicles[0];
    if (!target) return;

    setTelemetryData(prev => {
      const cur = prev[target.id];
      const newHours = cur.nextServiceEngineHours + 145; // 145 hours overdue!
      const remainingHrs = cur.nextServiceEngineHours - newHours;
      const reason = `Engine duty hours reached ${newHours.toLocaleString()} hrs (OEM limit ${cur.nextServiceEngineHours.toLocaleString()} hrs exceeded by 145 hrs)`;
      
      const updatedAlarms = [
        `🚨 HIGH-PRIORITY SERVICE DUE: ${reason}`,
        `CRITICAL: Engine Duty Hours Exceeded (${newHours.toLocaleString()} / ${cur.nextServiceEngineHours.toLocaleString()} hrs)`,
        ...cur.activeAlarms.filter(a => !a.includes('Engine Duty Hours') && !a.includes('HIGH-PRIORITY'))
      ];

      return {
        ...prev,
        [target.id]: {
          ...cur,
          engineHours: newHours,
          engineHoursRemaining: remainingHrs,
          isEngineHoursOverdue: true,
          isServiceDue: true,
          serviceDuePriority: 'HIGH',
          serviceDueReason: reason,
          serviceDueFactors: {
            ...cur.serviceDueFactors,
            engineHoursOverdue: true
          },
          healthStatus: 'CRITICAL_MAINTENANCE',
          activeAlarms: updatedAlarms,
          recommendedAction: 'Immediate High-Priority Service Due: Ground vehicle for heavy-duty oil overhaul, filter changes, and valve clearance sync.'
        }
      };
    });

    setAdminNotice(`⚡ Engine hours surge simulated on ${target.vehicleNumber}. High-Priority "Service Due" indicator triggered!`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  // Telemetric Simulation Trigger: Mileage Advance (Exceeds Odometer Interval)
  const handleSimulateMileageAdvance = () => {
    const target = vehicles.find(v => v.vehicleNumber.includes('EV-101')) || vehicles[0];
    if (!target) return;

    setTelemetryData(prev => {
      const cur = prev[target.id];
      const newOdo = cur.nextServiceOdometerKm + 1400;
      const newHours = cur.nextServiceEngineHours + 65;
      const reason = `Dual threshold exceeded: Engine hours (${newHours.toLocaleString()} / ${cur.nextServiceEngineHours.toLocaleString()} hrs) & Odometer (${newOdo.toLocaleString()} / ${cur.nextServiceOdometerKm.toLocaleString()} km)`;

      return {
        ...prev,
        [target.id]: {
          ...cur,
          currentOdometerKm: newOdo,
          intervalRemainingKm: cur.nextServiceOdometerKm - newOdo,
          isIntervalOverdue: true,
          daysToServiceMileage: -12,
          engineHours: newHours,
          engineHoursRemaining: cur.nextServiceEngineHours - newHours,
          isEngineHoursOverdue: true,
          daysToServiceHours: 0,
          isServiceDue: true,
          serviceDuePriority: 'CRITICAL',
          serviceDueReason: reason,
          serviceDueFactors: {
            engineHoursOverdue: true,
            mileageOverdue: true,
            mechanicalWearHigh: true,
            thermalSpike: false
          },
          healthStatus: 'CRITICAL_MAINTENANCE',
          activeAlarms: [
            `🚨 HIGH-PRIORITY SERVICE DUE: ${reason}`,
            `MANDATORY: 40,000 km Scheduled Service Overdue by 1,400 km`,
            `Engine Duty Limit Exceeded: ${newHours.toLocaleString()} hrs`,
            ...cur.activeAlarms.filter(a => !a.includes('Overdue') && !a.includes('HIGH-PRIORITY'))
          ],
          recommendedAction: 'Dual Threshold Service Due: Mandatory multi-point safety overhaul & EV powertrain diagnostics.'
        }
      };
    });

    setAdminNotice(`Simulated Mileage & Engine Hours advance on ${target.vehicleNumber}. High-Priority Service Due indicator triggered.`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  const handleSimulateBrakeFailure = () => {
    const target = vehicles.find(v => v.vehicleNumber.includes('SP-102')) || vehicles[0];
    if (!target) return;

    setTelemetryData(prev => ({
      ...prev,
      [target.id]: {
        ...prev[target.id],
        brakePadThicknessMm: 2.1,
        isServiceDue: true,
        serviceDuePriority: 'CRITICAL',
        serviceDueReason: 'Friction lining dropped to 2.1mm (critical wear threshold breached)',
        healthStatus: 'CRITICAL_MAINTENANCE',
        activeAlarms: [
          '🚨 HIGH-PRIORITY SERVICE DUE: Brake lining exhausted (2.1mm)',
          'CRITICAL: Front Brake Pad Sensor 2.1mm (Below 3.0mm Safety Limit)',
          'High Stopping Distance Hazard Detected'
        ],
        recommendedAction: 'Mandatory Emergency Service: Replace friction pad assemblies and resurface rotors.'
      }
    }));

    setAdminNotice(`Simulated Brake Wear Alarm triggered for ${target.vehicleNumber}. High-Priority Service Due flagged.`);
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
        isServiceDue: true,
        serviceDuePriority: 'CRITICAL',
        serviceDueReason: 'Coolant loop thermal spike to 108.5°C (Exceeds 105°C safety redline)',
        healthStatus: 'CRITICAL_MAINTENANCE',
        activeAlarms: [
          '🚨 HIGH-PRIORITY SERVICE DUE: Coolant loop thermal spike (108.5°C)',
          'CRITICAL: Engine Coolant Temperature 108.5°C (Exceeds 105°C Safety Redline)',
          'Auxiliary Radiator Fan Pressure Fault'
        ],
        recommendedAction: 'Coolant Loop Flush & Thermostat Replacement Required. Ground unit immediately.'
      }
    }));

    setAdminNotice(`Simulated Thermal Alarm triggered for ${target.vehicleNumber}. High engine temperature detected.`);
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
      const isHeavy = veh.type === 'HEAVY_HAUL';

      const currentHours = veh.engineHours ?? (isHeavy ? 4800 : 1800);
      const nextHours = currentHours + 600;

      resetMap[veh.id] = {
        vehicleId: veh.id,
        vehicleNumber: veh.vehicleNumber,
        driverName: veh.driverName || 'Unassigned',
        vehicleType: veh.type,
        currentOdometerKm: odo,
        nextServiceOdometerKm: nextOdo,
        intervalRemainingKm: Math.max(800, remainingKm),
        isIntervalOverdue: false,
        daysToServiceMileage: Math.max(10, Math.round(remainingKm / 120)),

        engineHours: currentHours,
        nextServiceEngineHours: nextHours,
        engineHoursRemaining: 600,
        isEngineHoursOverdue: false,
        engineHoursDailyRate: veh.dailyEngineHours ?? 6.2,
        daysToServiceHours: 96,

        isServiceDue: false,
        serviceDuePriority: 'NORMAL',
        serviceDueReason: 'Nominal operating baseline. All telemetric parameters healthy.',
        serviceDueFactors: {
          engineHoursOverdue: false,
          mileageOverdue: false,
          mechanicalWearHigh: false,
          thermalSpike: false
        },
        predictiveDaysRemaining: 45,

        engineOrBatteryTempC: isElectric ? 41.5 : 89.0,
        brakePadThicknessMm: 9.4,
        transmissionSlipPct: 3.8,
        tpmsPressurePsi: { frontLeft: 35, frontRight: 35, rearLeft: 34, rearRight: 34 },
        fluidOrBatteryHealthPct: 94,
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
        isServiceDue: false,
        serviceDuePriority: 'NORMAL',
        activeAlarms: []
      }
    }));
    setAdminNotice(`Vehicle cleared for commercial duty. Status set to AVAILABLE.`);
    setTimeout(() => setAdminNotice(null), 5000);
  };

  // Filtered List & Counts
  const telemetryList = Object.values(telemetryData);
  const serviceDueList = telemetryList.filter(t => t.isServiceDue);
  const serviceDueCount = serviceDueList.length;
  const criticalCount = telemetryList.filter(t => t.healthStatus === 'CRITICAL_MAINTENANCE').length;
  const warningCount = telemetryList.filter(t => t.healthStatus === 'WARNING_ATTENTION').length;
  const healthyCount = telemetryList.filter(t => t.healthStatus === 'HEALTHY' && !t.isServiceDue).length;

  const hoursOverdueCount = telemetryList.filter(t => t.isEngineHoursOverdue).length;
  const mileageOverdueCount = telemetryList.filter(t => t.isIntervalOverdue).length;

  const filteredList = useMemo(() => {
    return telemetryList.filter(t => {
      const matchFilter = 
        filterMode === 'ALL' ? true :
        filterMode === 'SERVICE_DUE' ? t.isServiceDue :
        filterMode === 'CRITICAL' ? t.healthStatus === 'CRITICAL_MAINTENANCE' :
        filterMode === 'WARNING' ? t.healthStatus === 'WARNING_ATTENTION' :
        (t.healthStatus === 'HEALTHY' && !t.isServiceDue);

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
              PREDICTIVE MAINTENANCE ENGINE · ENGINE HOURS & MILEAGE SENSORS
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY STREAM
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-400" />
            <span>Vehicle Health Monitor & Predictive Service Due Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time predictive telemetry evaluating operating engine hours, odometer mileage milestones, thermal curves, and brake lining wear to surface high-priority service due triggers.
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

          {/* Simulate Engine Hours Surge */}
          <button
            onClick={handleSimulateEngineHoursSurge}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all shadow-sm shadow-rose-950/40"
            title="Advance engine operating hours past OEM interval limit"
          >
            <Timer className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Engine Hours Spike</span>
          </button>

          {/* Advance Odometer Milestone */}
          <button
            onClick={handleSimulateMileageAdvance}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
            title="Advance odometer mileage past scheduled interval"
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Simulate Mileage Advance</span>
          </button>

          <button
            onClick={handleSimulateBrakeFailure}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
            title="Simulate brake pad sensor drop to 2.1mm"
          >
            <Disc className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Brake Alarm</span>
          </button>

          <button
            onClick={handleSimulateThermalSpike}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-900/20 hover:bg-rose-900/30 text-rose-200 border border-rose-800/40 text-xs font-semibold transition-colors"
            title="Simulate engine temperature surge to 108°C"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Thermal Spike</span>
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
        {/* KPI 1: High-Priority Service Due (Predictive Indicator) */}
        <div className={`p-4 rounded-xl border space-y-2 transition-all ${
          serviceDueCount > 0 
            ? 'bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500/50 shadow-lg shadow-rose-950/30' 
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              High-Priority Service Due
            </span>
            {serviceDueCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500 text-white animate-pulse">
                ACTION REQUIRED
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-rose-400">
              {serviceDueCount}
            </span>
            <span className="text-xs text-slate-400">units flagged</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
            <span className={hoursOverdueCount > 0 ? 'text-rose-400 font-bold' : ''}>
              Hours: {hoursOverdueCount}
            </span>
            <span>·</span>
            <span className={mileageOverdueCount > 0 ? 'text-amber-400 font-bold' : ''}>
              Mileage: {mileageOverdueCount}
            </span>
          </div>
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
            <span className="text-xs text-slate-400">vehicles (&lt; 1,500 km / 100h)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Advance schedule parts & maintenance bay slot
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
            Engine hours & mileage within OEM tolerances
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
            <span className="text-xs text-slate-400 font-mono">· Dual Sync</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Hours + Mileage Multi-Factor Engine
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-lg">
          {[
            { id: 'ALL', label: `All Vehicles (${telemetryList.length})` },
            { id: 'SERVICE_DUE', label: `🚨 High-Priority Service Due (${serviceDueCount})`, badgeClass: 'text-rose-400 font-bold' },
            { id: 'CRITICAL', label: `Critical Alerts (${criticalCount})`, badgeClass: 'text-rose-400' },
            { id: 'WARNING', label: `Approaching Milestone (${warningCount})`, badgeClass: 'text-amber-400' },
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
              <span className={tab.badgeClass}>{tab.label}</span>
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
                telemetry.isServiceDue
                  ? 'bg-rose-950/25 border-rose-500/50 shadow-md shadow-rose-950/40'
                  : isWarning
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* High-Priority Service Due Banner Indicator */}
              {telemetry.isServiceDue && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-rose-500/25 via-rose-500/15 to-transparent border border-rose-500/40 flex items-start justify-between gap-3 animate-pulse">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
                      <AlertOctagon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black uppercase tracking-wider text-rose-300">
                          HIGH-PRIORITY SERVICE DUE
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/40 text-rose-200 border border-rose-400/40">
                          {telemetry.serviceDuePriority} PRIORITY
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-200 mt-0.5 leading-tight font-medium">
                        {telemetry.serviceDueReason}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-1 rounded border border-rose-500/30 shrink-0">
                    {telemetry.daysToServiceHours <= 0 || telemetry.daysToServiceMileage <= 0 ? 'DUE NOW' : `~${telemetry.predictiveDaysRemaining}d window`}
                  </span>
                </div>
              )}

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
                    {telemetry.vehicleType.replace(/_/g, ' ')} · Odo: {telemetry.currentOdometerKm.toLocaleString()} km · Engine: {telemetry.engineHours.toLocaleString()} hrs
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] ${
                    telemetry.isServiceDue
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : isWarning
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {telemetry.isServiceDue ? 'SERVICE DUE' : isWarning ? 'ATTENTION REQUIRED' : 'NOMINAL HEALTH'}
                  </span>
                </div>
              </div>

              {/* Dual Predictive Maintenance Gauges: Engine Hours & Mileage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Engine Operating Hours Gauge */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Timer className="w-3.5 h-3.5 text-rose-400" />
                      <span>Engine Operating Hours:</span>
                    </span>
                    <span className={`font-mono font-bold text-xs ${
                      telemetry.isEngineHoursOverdue ? 'text-rose-400 animate-pulse' : telemetry.engineHoursRemaining < 100 ? 'text-amber-400' : 'text-slate-200'
                    }`}>
                      {telemetry.isEngineHoursOverdue 
                        ? `OVERDUE by ${Math.abs(telemetry.engineHoursRemaining).toLocaleString()}h`
                        : `${telemetry.engineHoursRemaining.toLocaleString()}h remaining`}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Logged: {telemetry.engineHours.toLocaleString()} hrs</span>
                    <span>Interval Target: {telemetry.nextServiceEngineHours.toLocaleString()} hrs</span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        telemetry.isEngineHoursOverdue ? 'bg-rose-500' : telemetry.engineHoursRemaining < 100 ? 'bg-amber-500' : 'bg-rose-500/80'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, (telemetry.engineHours / telemetry.nextServiceEngineHours) * 100))}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>Duty rate: ~{telemetry.engineHoursDailyRate} hrs/day</span>
                    <span className="font-mono text-slate-300">
                      {telemetry.isEngineHoursOverdue ? 'Exhausted' : `~${telemetry.daysToServiceHours} days to limit`}
                    </span>
                  </div>
                </div>

                {/* 2. Odometer Mileage Gauge */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Odometer Mileage Interval:</span>
                    </span>
                    <span className={`font-mono font-bold text-xs ${
                      telemetry.isIntervalOverdue ? 'text-rose-400 animate-pulse' : telemetry.intervalRemainingKm < 1500 ? 'text-amber-400' : 'text-slate-200'
                    }`}>
                      {telemetry.isIntervalOverdue 
                        ? `OVERDUE by ${Math.abs(telemetry.intervalRemainingKm).toLocaleString()} km`
                        : `${telemetry.intervalRemainingKm.toLocaleString()} km remaining`}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Current: {telemetry.currentOdometerKm.toLocaleString()} km</span>
                    <span>Milestone: {telemetry.nextServiceOdometerKm.toLocaleString()} km</span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        telemetry.isIntervalOverdue ? 'bg-rose-500' : telemetry.intervalRemainingKm < 1500 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, (telemetry.currentOdometerKm / telemetry.nextServiceOdometerKm) * 100))}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>Daily run: ~{veh?.dailyMileageKm || 140} km/day</span>
                    <span className="font-mono text-slate-300">
                      {telemetry.isIntervalOverdue ? 'Exhausted' : `~${telemetry.daysToServiceMileage} days to limit`}
                    </span>
                  </div>
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
                  ) : telemetry.isServiceDue || isCritical ? (
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
                        setModalEngineHours(telemetry.engineHours);
                        setModalNextEngineHours(telemetry.engineHours + 500);
                        setModalOdometer(telemetry.currentOdometerKm);
                        setModalNextOdometer(telemetry.currentOdometerKm + 10000);
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

      {/* Quick Interval Log Modal with Engine Hours & Mileage Calibration */}
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
              Recording this certified service interval resets both engine operating hours and odometer mileage milestones, recalibrates telemetric friction sensors, and clears active High-Priority Service Due alarms.
            </p>

            {/* Target Vehicle Summary */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Target Vehicle:</span>
                <span className="font-bold text-slate-100">{modalTargetVehicle.vehicleNumber}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Vehicle Type:</span>
                <span className="text-slate-200">{modalTargetVehicle.type}</span>
              </div>
            </div>

            {/* Engine Hours & Mileage Form Fields */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Engine Hours at Service:</label>
                <input
                  type="number"
                  value={modalEngineHours}
                  onChange={(e) => setModalEngineHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Next Service Engine Hours Target:</label>
                <input
                  type="number"
                  value={modalNextEngineHours}
                  onChange={(e) => setModalNextEngineHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Odometer at Service (km):</label>
                <input
                  type="number"
                  value={modalOdometer}
                  onChange={(e) => setModalOdometer(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Next Odometer Milestone (km):</label>
                <input
                  type="number"
                  value={modalNextOdometer}
                  onChange={(e) => setModalNextOdometer(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
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
                    odometerAtServiceKm: modalOdometer,
                    serviceType: modalTargetVehicle.type === 'ELECTRIC_VAN' ? 'BATTERY_PACK_DIAGNOSTIC' : 'BRAKE_SYSTEM_SERVICE',
                    technicianOrShop: 'Apex Rapid Telemetry Depot & OEM Overhaul',
                    costUsd: 420,
                    notes: `Certified maintenance logged. Engine hours calibrated at ${modalEngineHours} hrs (next: ${modalNextEngineHours} hrs). Friction lining restored.`,
                    nextServiceOdometerKm: modalNextOdometer,
                    nextServiceDate: '2027-04-15',
                    engineHoursAtService: modalEngineHours,
                    nextServiceEngineHours: modalNextEngineHours,
                    performedItems: ['Brake Rotor Service', 'Engine Oil Flush', 'Diagnostic Bus Calibrated', 'Sensor Recalibration']
                  });

                  // Clear alarms and Service Due in widget state
                  setTelemetryData(prev => ({
                    ...prev,
                    [modalTargetVehicle.id]: {
                      ...prev[modalTargetVehicle.id],
                      healthStatus: 'HEALTHY',
                      isServiceDue: false,
                      serviceDuePriority: 'NORMAL',
                      serviceDueReason: 'Nominal operating range. All maintenance intervals verified.',
                      serviceDueFactors: {
                        engineHoursOverdue: false,
                        mileageOverdue: false,
                        mechanicalWearHigh: false,
                        thermalSpike: false
                      },
                      activeAlarms: [],
                      brakePadThicknessMm: 11.4,
                      engineOrBatteryTempC: modalTargetVehicle.type === 'ELECTRIC_VAN' ? 41.5 : 89.0,
                      currentOdometerKm: modalOdometer,
                      nextServiceOdometerKm: modalNextOdometer,
                      intervalRemainingKm: modalNextOdometer - modalOdometer,
                      isIntervalOverdue: false,
                      daysToServiceMileage: 65,

                      engineHours: modalEngineHours,
                      nextServiceEngineHours: modalNextEngineHours,
                      engineHoursRemaining: modalNextEngineHours - modalEngineHours,
                      isEngineHoursOverdue: false,
                      daysToServiceHours: 75,
                      grounded: false
                    }
                  }));

                  storage.updateVehicleStatus(modalTargetVehicle.id, 'AVAILABLE');
                  setIsLogModalOpen(false);
                  setAdminNotice(`Certified maintenance recorded for ${modalTargetVehicle.vehicleNumber}. High-Priority Service Due cleared and engine hours reset.`);
                  setTimeout(() => setAdminNotice(null), 5000);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
              >
                Confirm & Clear Service Due
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
