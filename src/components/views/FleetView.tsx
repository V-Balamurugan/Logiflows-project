import React from 'react';
import { Truck, BatteryCharging, Zap, Gauge, MapPin, User, CheckCircle2 } from 'lucide-react';
import { storage } from '../../services/storage';

export const FleetView: React.FC = () => {
  const currentTenantId = storage.getActiveTenantId();
  const vehicles = storage.getVehicles(currentTenantId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-0.5">
            CONNECTED TELEMETRY · REDIS 7 INGESTION
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Logistics Fleet & Electric Vehicle Operations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live battery levels, current payload capacity, speed telemetry, and driver allocations.
          </p>
        </div>
      </div>

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
    </div>
  );
};
