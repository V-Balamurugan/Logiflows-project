import React, { useState } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  Plus, 
  Search, 
  Sliders, 
  ShieldAlert, 
  Activity, 
  Zap, 
  Calendar, 
  DollarSign, 
  FileText, 
  Check, 
  X,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { Vehicle, MaintenanceLogEntry, MaintenanceServiceType, PredictiveMechanicalFailure } from '../../types';
import { fleetMaintenanceService } from '../../services/fleetMaintenanceService';
import { storage } from '../../services/storage';

interface Props {
  vehicles: Vehicle[];
}

export const FleetMaintenanceModule: React.FC<Props> = ({ vehicles }) => {
  const currentTenantId = storage.getActiveTenantId();
  const [logs, setLogs] = useState<MaintenanceLogEntry[]>(() => 
    fleetMaintenanceService.getMaintenanceLogs(currentTenantId)
  );
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('ALL');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | null>(null);

  // New Log Form State
  const [formVehicleId, setFormVehicleId] = useState(vehicles[0]?.id || '');
  const [formServiceType, setFormServiceType] = useState<MaintenanceServiceType>('OIL_FILTER_CHANGE');
  const [formOdometer, setFormOdometer] = useState<number>(vehicles[0]?.odometerKm || 45000);
  const [formServiceDate, setFormServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formShop, setFormShop] = useState('');
  const [formCost, setFormCost] = useState<number>(350);
  const [formNotes, setFormNotes] = useState('');
  const [formNextOdo, setFormNextOdo] = useState<number>((vehicles[0]?.odometerKm || 45000) + 10000);
  const [formNextDate, setFormNextDate] = useState<string>('2027-04-15');
  const [formPerformedItems, setFormPerformedItems] = useState<string>('Inspection, Fluid check, Hardware torque verify');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Predictive calculations for all vehicles
  const predictiveFailures: PredictiveMechanicalFailure[] = fleetMaintenanceService.getAllPredictiveFailures(vehicles);

  // Aggregates
  const criticalCount = predictiveFailures.filter(p => p.failureRiskLevel === 'CRITICAL').length;
  const highRiskCount = predictiveFailures.filter(p => p.failureRiskLevel === 'HIGH').length;
  const avgHealth = Math.round(predictiveFailures.reduce((acc, p) => acc + p.overallHealthScore, 0) / (predictiveFailures.length || 1));
  const totalSpendUsd = logs.reduce((acc, l) => acc + l.costUsd, 0);

  const filteredLogs = logs.filter(l => {
    if (selectedVehicleFilter === 'ALL') return true;
    return l.vehicleId === selectedVehicleFilter;
  });

  const handleOpenLogModal = (vehicleId?: string) => {
    const targetVeh = vehicles.find(v => v.id === vehicleId) || vehicles[0];
    if (targetVeh) {
      setFormVehicleId(targetVeh.id);
      setFormOdometer(targetVeh.odometerKm || 45000);
      setFormNextOdo((targetVeh.odometerKm || 45000) + 10000);
      setFormServiceType(targetVeh.type === 'ELECTRIC_VAN' ? 'BATTERY_PACK_DIAGNOSTIC' : 'BRAKE_SYSTEM_SERVICE');
      setFormShop('Bay Area Fleet Pro Maintenance Hub');
    }
    setPreselectedVehicleId(vehicleId || null);
    setIsLogModalOpen(true);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVeh = vehicles.find(v => v.id === formVehicleId);
    if (!targetVeh) return;

    const items = formPerformedItems.split(',').map(s => s.trim()).filter(Boolean);

    const created = fleetMaintenanceService.addMaintenanceLog({
      tenantId: currentTenantId,
      vehicleId: targetVeh.id,
      vehicleNumber: targetVeh.vehicleNumber,
      serviceDate: formServiceDate,
      odometerAtServiceKm: Number(formOdometer),
      serviceType: formServiceType,
      technicianOrShop: formShop || 'Internal Fleet Depot',
      costUsd: Number(formCost),
      notes: formNotes || `Standard ${formServiceType.replace(/_/g, ' ')} completed without incident.`,
      nextServiceOdometerKm: Number(formNextOdo),
      nextServiceDate: formNextDate,
      performedItems: items.length > 0 ? items : ['Standard OEM Inspection']
    });

    setLogs(fleetMaintenanceService.getMaintenanceLogs(currentTenantId));
    setIsLogModalOpen(false);
    setSuccessToast(`Maintenance record logged for ${targetVeh.vehicleNumber}. Next interval set to ${Number(formNextOdo).toLocaleString()} km.`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {successToast && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Fleet Health Score */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Fleet Composite Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-100">{avgHealth}%</span>
            <span className="text-xs text-emerald-400 font-semibold">Nominal Fleet Average</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                avgHealth >= 75 ? 'bg-emerald-500' : avgHealth >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${avgHealth}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Critical Grounding Risk */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Mechanical Failure Risk</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-rose-400">{criticalCount}</span>
            <span className="text-xs text-slate-400">Critical / {highRiskCount} Elevated</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {criticalCount > 0 ? 'Immediate component replacement advised.' : 'No active roadside hazards detected.'}
          </p>
        </div>

        {/* KPI 3: Scheduled Service Intervals */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Logged Intervals</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-100">{logs.length}</span>
            <span className="text-xs text-indigo-300 font-semibold">Recorded Services</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Odometer-synced preventative maintenance tracking.
          </p>
        </div>

        {/* KPI 4: Total Maintenance Investment */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">YTD Service Expenditure</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-slate-100">${totalSpendUsd.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-mono">USD</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Avg ${(totalSpendUsd / (vehicles.length || 1)).toFixed(0)} per fleet unit.
          </p>
        </div>
      </div>

      {/* Predictive Mechanical Failure Intelligence Radar */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-slate-100">
                Predictive Mechanical Failure & Telemetry Wear Diagnostics
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time heuristic & regression wear models analyzing odometer, torque stress, brake cycles, and thermal profiles.
            </p>
          </div>

          <button
            onClick={() => handleOpenLogModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Log Maintenance Interval</span>
          </button>
        </div>

        {/* Grid of Vehicle Predictive Health Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {predictiveFailures.map((pred) => {
            const veh = vehicles.find(v => v.id === pred.vehicleId);
            const isCritical = pred.failureRiskLevel === 'CRITICAL';
            const isHigh = pred.failureRiskLevel === 'HIGH';
            const isModerate = pred.failureRiskLevel === 'MODERATE';

            return (
              <div
                key={pred.vehicleId}
                className={`p-4 rounded-xl border transition-all ${
                  isCritical 
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/30'
                    : isHigh
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                {/* Header with Health Score */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-100">
                        {pred.vehicleNumber}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : isModerate
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {pred.failureRiskLevel} RISK
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                      {veh?.type.replace(/_/g, ' ')} · Odo: {(veh?.odometerKm || 0).toLocaleString()} km
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Gauge className={`w-4 h-4 ${
                        pred.overallHealthScore >= 75 ? 'text-emerald-400' : pred.overallHealthScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`} />
                      <span className="font-mono text-lg font-bold text-slate-100">
                        {pred.overallHealthScore}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Fail Window: ~{pred.projectedFailureKm.toLocaleString()} km
                    </span>
                  </div>
                </div>

                {/* Telemetry Component Bars */}
                <div className="grid grid-cols-2 gap-3 my-3.5 pt-3 border-t border-slate-800/80">
                  {/* Brake Wear */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Brake Lining Wear:</span>
                      <span className={`font-mono font-bold ${
                        pred.telemetryFactors.brakeWearPct >= 80 ? 'text-rose-400' : 'text-slate-200'
                      }`}>
                        {pred.telemetryFactors.brakeWearPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          pred.telemetryFactors.brakeWearPct >= 80 ? 'bg-rose-500' : pred.telemetryFactors.brakeWearPct >= 65 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pred.telemetryFactors.brakeWearPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Thermal / Battery Stress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Powertrain Thermal:</span>
                      <span className={`font-mono font-bold ${
                        pred.telemetryFactors.batteryDegradationOrEngineThermalStress >= 75 ? 'text-amber-400' : 'text-slate-200'
                      }`}>
                        {pred.telemetryFactors.batteryDegradationOrEngineThermalStress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          pred.telemetryFactors.batteryDegradationOrEngineThermalStress >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pred.telemetryFactors.batteryDegradationOrEngineThermalStress}%` }}
                      />
                    </div>
                  </div>

                  {/* Transmission Strain */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Drivetrain Strain:</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {pred.telemetryFactors.transmissionStrainIndex}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          pred.telemetryFactors.transmissionStrainIndex >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${pred.telemetryFactors.transmissionStrainIndex}%` }}
                      />
                    </div>
                  </div>

                  {/* Tire Tread Wear */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Tire Tread Depletion:</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {pred.telemetryFactors.tireTreadWearPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          pred.telemetryFactors.tireTreadWearPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pred.telemetryFactors.tireTreadWearPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Alert / Recommendation */}
                <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  isCritical 
                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    : isHigh
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-slate-400'
                  }`} />
                  <div className="space-y-0.5 flex-1">
                    <span className="font-semibold block">{pred.recommendedAction}</span>
                    {pred.predictedComponents[0] && (
                      <span className="text-[11px] opacity-80 block">
                        Anomaly: {pred.predictedComponents[0].failureMode} ({pred.predictedComponents[0].urgencyWindow})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenLogModal(pred.vehicleId)}
                    className="shrink-0 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition-colors"
                  >
                    Log Service
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Maintenance Log & Scheduled Interval Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Vehicle Maintenance Interval Records</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of shop services, mechanical inspections, and interval milestones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Vehicle:</span>
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="ALL">All Vehicles ({vehicles.length})</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.type})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Vehicle</th>
                <th className="p-3">Service Date</th>
                <th className="p-3">Service Type</th>
                <th className="p-3">Odometer</th>
                <th className="p-3">Shop / Tech</th>
                <th className="p-3">Cost (USD)</th>
                <th className="p-3">Next Service Due</th>
                <th className="p-3">Interval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.map((log) => {
                const targetVeh = vehicles.find(v => v.id === log.vehicleId);
                const isOverdue = targetVeh && (targetVeh.odometerKm || 0) >= log.nextServiceOdometerKm;

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-100">
                      {log.vehicleNumber}
                    </td>
                    <td className="p-3 text-slate-300 font-mono">
                      {log.serviceDate}
                    </td>
                    <td className="p-3 text-slate-200 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                        {log.serviceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {log.odometerAtServiceKm.toLocaleString()} km
                    </td>
                    <td className="p-3 text-slate-400">
                      {log.technicianOrShop}
                    </td>
                    <td className="p-3 font-mono text-emerald-400 font-semibold">
                      ${log.costUsd.toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {log.nextServiceOdometerKm.toLocaleString()} km
                      <span className="block text-[10px] text-slate-500 font-sans">
                        Target: {log.nextServiceDate}
                      </span>
                    </td>
                    <td className="p-3">
                      {isOverdue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          OVERDUE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          IN SERVICE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Maintenance Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Log Vehicle Maintenance Interval
                  </h3>
                  <p className="text-xs text-slate-400">
                    Record certified repair, inspect telemetry triggers, and update interval calendar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vehicle Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Fleet Vehicle
                  </label>
                  <select
                    value={formVehicleId}
                    onChange={(e) => {
                      setFormVehicleId(e.target.value);
                      const target = vehicles.find(v => v.id === e.target.value);
                      if (target) {
                        setFormOdometer(target.odometerKm || 45000);
                        setFormNextOdo((target.odometerKm || 45000) + 10000);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.type.replace(/_/g, ' ')})</option>
                    ))}
                  </select>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Service / Maintenance Type
                  </label>
                  <select
                    value={formServiceType}
                    onChange={(e) => setFormServiceType(e.target.value as MaintenanceServiceType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="OIL_FILTER_CHANGE">Oil & Filter Flush</option>
                    <option value="BRAKE_SYSTEM_SERVICE">Brake Pads & Rotor Overhaul</option>
                    <option value="TIRE_ROTATION_REPLACEMENT">Tire Rotation & Laser Alignment</option>
                    <option value="BATTERY_PACK_DIAGNOSTIC">EV Battery Pack Diagnostic</option>
                    <option value="TRANSMISSION_FLUID">Transmission Fluid Exchange</option>
                    <option value="SUSPENSION_STEERING">Suspension & Steering Linkage</option>
                    <option value="ANNUAL_SAFETY_INSPECTION">Annual DOT / Safety Inspection</option>
                    <option value="MOTOR_INVERTER_CALIBRATION">Traction Motor Calibration</option>
                  </select>
                </div>

                {/* Odometer at service */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Odometer at Service (km)
                  </label>
                  <input
                    type="number"
                    required
                    value={formOdometer}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormOdometer(val);
                      setFormNextOdo(val + 10000);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Service Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Service Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formServiceDate}
                    onChange={(e) => setFormServiceDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Shop / Technician */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Service Facility / Technician
                  </label>
                  <input
                    type="text"
                    required
                    value={formShop}
                    onChange={(e) => setFormShop(e.target.value)}
                    placeholder="e.g. Apex Bay Fleet Depot #2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Service Cost ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Next Odometer Target */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Next Service Interval (km)
                  </label>
                  <input
                    type="number"
                    required
                    value={formNextOdo}
                    onChange={(e) => setFormNextOdo(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Next Target Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formNextDate}
                    onChange={(e) => setFormNextDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Performed items */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Completed Work Items (comma separated)
                </label>
                <input
                  type="text"
                  value={formPerformedItems}
                  onChange={(e) => setFormPerformedItems(e.target.value)}
                  placeholder="Brake pad replacement, Rotor resurfacing, Brake fluid bleed"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Diagnostic Notes & Observations
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Replaced worn pads; measured 11.2mm on new friction surfaces. All fault codes cleared."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Maintenance Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
