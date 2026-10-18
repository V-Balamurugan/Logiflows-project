import React, { useState } from 'react';
import { 
  Truck, 
  BatteryCharging, 
  Zap, 
  Gauge, 
  MapPin, 
  User, 
  CheckCircle2, 
  Fuel, 
  TrendingUp, 
  TrendingDown,
  Sliders, 
  Wrench, 
  Send, 
  Radio,
  Trophy,
  Leaf,
  Activity,
  Network
} from 'lucide-react';
import { storage } from '../../services/storage';
import { FleetFuelConsumptionMonitor } from '../analytics/FleetFuelConsumptionMonitor';
import { GeofenceSetupView } from './GeofenceSetupView';
import { FleetMaintenanceModule } from '../fleet/FleetMaintenanceModule';
import { MassDispatchModule } from '../fleet/MassDispatchModule';
import { DriverPerformanceLeaderboard } from '../fleet/DriverPerformanceLeaderboard';
import { RouteCarbonEstimatorModule } from '../fleet/RouteCarbonEstimatorModule';
import { VehicleHealthMonitor } from '../fleet/VehicleHealthMonitor';
import { CapacityBalancingEngine } from '../fleet/CapacityBalancingEngine';
import { EnergyEfficiencyTrendChart } from '../fleet/EnergyEfficiencyTrendChart';

export const FleetView: React.FC = () => {
  const currentTenantId = storage.getActiveTenantId();
  const vehicles = storage.getVehicles(currentTenantId);
  const [activeTab, setActiveTab] = useState<
    'capacity_balancing' | 'energy_efficiency' | 'health_monitor' | 'route_carbon' | 'driver_leaderboard' | 'maintenance_predictive' | 'mass_dispatch' | 'fuel_monitor' | 'vehicle_grid' | 'geofence_setup'
  >('energy_efficiency');

  const electricCount = vehicles.filter((v) => v.type === 'ELECTRIC_VAN' || v.type === 'CARGO_EBIKE').length;
  const onRouteCount = vehicles.filter((v) => v.status === 'ON_ROUTE').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            CAPACITY BALANCING ENGINE · PREDICTIVE HUB CONGESTION & IDLE REDUCTION
          </span>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            <span>Fleet Operations, Capacity Balancing & Predictive Network Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Predicts future intake hub congestion, loading dock dwell times, and automatically reroutes commercial vehicles to eliminate idle waste.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('capacity_balancing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'capacity_balancing'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Network className="w-4 h-4 text-indigo-300" />
            <span>Capacity Balancing</span>
          </button>
          <button
            onClick={() => setActiveTab('energy_efficiency')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'energy_efficiency'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-emerald-300" />
            <span>Energy Efficiency Trend</span>
          </button>
          <button
            onClick={() => setActiveTab('health_monitor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'health_monitor'
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-rose-300" />
            <span>Vehicle Health Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('route_carbon')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'route_carbon'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Leaf className="w-4 h-4 text-emerald-300" />
            <span>Route CO₂ & Fuel Estimator</span>
          </button>

          <button
            onClick={() => setActiveTab('driver_leaderboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'driver_leaderboard'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Driver Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance_predictive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'maintenance_predictive'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4 text-indigo-200" />
            <span>Maintenance & Failure Prediction</span>
          </button>

          <button
            onClick={() => setActiveTab('mass_dispatch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'mass_dispatch'
                ? 'bg-purple-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-purple-200" />
            <span>Batch Mass-Dispatch</span>
          </button>

          <button
            onClick={() => setActiveTab('fuel_monitor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'fuel_monitor'
                ? 'bg-amber-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Fuel className="w-4 h-4 text-amber-200" />
            <span>Fuel & Cost Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicle_grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'vehicle_grid'
                ? 'bg-blue-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-blue-200" />
            <span>Hardware Grid ({vehicles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('geofence_setup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'geofence_setup'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-200" />
            <span>Geofence Setup</span>
          </button>
        </div>
      </div>

      {/* Tab: Capacity Balancing Engine & Predictive Hub Rerouting */}
      {activeTab === 'capacity_balancing' && (
        <CapacityBalancingEngine vehicles={vehicles} />
      )}

      {/* Tab: Energy Efficiency Trend & Long-Term Fleet Sustainability */}
      {activeTab === 'energy_efficiency' && (
        <EnergyEfficiencyTrendChart vehicles={vehicles} />
      )}

      {/* Tab -2: Vehicle Health Monitor & Simulated Telemetry */}
      {activeTab === 'health_monitor' && (
        <VehicleHealthMonitor vehicles={vehicles} />
      )}

      {/* Tab -1: Route Fuel Efficiency & CO2 Estimator */}
      {activeTab === 'route_carbon' && (
        <RouteCarbonEstimatorModule vehicles={vehicles} />
      )}

      {/* Tab 0: Driver Performance & Fuel Efficiency Leaderboard */}
      {activeTab === 'driver_leaderboard' && (
        <DriverPerformanceLeaderboard />
      )}

      {/* Tab 1: Predictive Maintenance & Mechanical Failure Prediction */}
      {activeTab === 'maintenance_predictive' && (
        <FleetMaintenanceModule vehicles={vehicles} />
      )}

      {/* Tab 2: Mass Batch Dispatch Engine */}
      {activeTab === 'mass_dispatch' && (
        <MassDispatchModule vehicles={vehicles} />
      )}

      {/* Tab 3: Fuel & Projected Cost Monitor */}
      {activeTab === 'fuel_monitor' && (
        <FleetFuelConsumptionMonitor vehicles={vehicles} />
      )}

      {/* Tab 2: Vehicle Hardware & Battery Grid */}
      {activeTab === 'vehicle_grid' && (

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {vehicles.map((veh) => {
          const isOnRoute = veh.status === 'ON_ROUTE';
          return (
            <div
              key={veh.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {veh.vehicleNumber}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    {veh.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isOnRoute
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {veh.status}
                </span>
              </div>

              {/* Battery or Fuel Level Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Battery / Range:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {veh.batteryOrFuelPct}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      veh.batteryOrFuelPct < 25
                        ? 'bg-rose-500'
                        : veh.batteryOrFuelPct < 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${veh.batteryOrFuelPct}%` }}
                  />
                </div>
              </div>

              {/* Payload & Driver */}
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Driver:</span>
                  <span className="font-semibold text-slate-200">{veh.driverName || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payload Load:</span>
                  <span className="font-mono text-slate-200">{veh.currentLoadKg} / {veh.capacityKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telemetry Speed:</span>
                  <span className="font-mono text-emerald-400">{veh.lastLocation?.speedKmh || 0} km/h</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Tab 3: Hub Geofence Perimeter Setup & Ingress/Egress Alerts */}
      {activeTab === 'geofence_setup' && (
        <GeofenceSetupView vehicles={vehicles} />
      )}
    </div>
  );
};
