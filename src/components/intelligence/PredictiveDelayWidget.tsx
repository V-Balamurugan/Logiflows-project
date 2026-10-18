import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Navigation, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Zap, 
  Sliders, 
  RefreshCw, 
  ShieldCheck,
  TrendingDown,
  Truck,
  Settings,
  BellRing
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Parcel } from '../../types';
import { DelayThresholdConfigModal } from './DelayThresholdConfigModal';
import { 
  broadcastPredictiveDelayIncident, 
  PRESET_PREDICTIVE_INCIDENTS,
  PredictiveDelayIncident 
} from '../../services/predictiveDelayIncidentService';

interface BottleneckCorridor {
  id: string;
  name: string;
  highway: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  historicalAvgDelayMin: number;
  currentDelayMin: number;
  cause: string;
  recommendedBypass: {
    name: string;
    description: string;
    distanceDeltaKm: number;
    timeSavedMin: number;
    batteryDeltaPct: number;
  };
}

const HISTORICAL_BOTTLENECK_CORRIDORS: BottleneckCorridor[] = [
  {
    id: 'corridor-80-bay-bridge',
    name: 'Bay Bridge Westbound Corridor',
    highway: 'Interstate 80 West',
    severity: 'HIGH',
    historicalAvgDelayMin: 22,
    currentDelayMin: 28,
    cause: 'Toll plaza merging bottleneck and heavy clinical district campus delivery traffic.',
    recommendedBypass: {
      name: 'San Mateo Bridge (CA-92) Bypass via South Peninsula',
      description: 'Divert south via I-880 to CA-92 West, entering San Francisco from the southern arterial ring.',
      distanceDeltaKm: +8.4,
      timeSavedMin: 19,
      batteryDeltaPct: -1.8,
    },
  },
  {
    id: 'corridor-101-south',
    name: 'Silicon Valley Highway 101 South',
    highway: 'US Route 101 South',
    severity: 'MEDIUM',
    historicalAvgDelayMin: 14,
    currentDelayMin: 18,
    cause: 'Peak hour research park exit backlog between Palo Alto and Sunnyvale.',
    recommendedBypass: {
      name: 'Interstate 280 Juniper Expressway',
      description: 'Shift westward to I-280 South. Continuous free-flowing corridor with zero signal delays.',
      distanceDeltaKm: +3.2,
      timeSavedMin: 14,
      batteryDeltaPct: -0.6,
    },
  },
  {
    id: 'corridor-oakland-port',
    name: 'Maritime Port Gate 4 Inbound Inflow',
    highway: 'Maritime St / 7th St',
    severity: 'LOW',
    historicalAvgDelayMin: 8,
    currentDelayMin: 9,
    cause: 'Container offloading shift change queue.',
    recommendedBypass: {
      name: 'West Grand Ave Freight Overpass',
      description: 'Use the dedicated commercial overpass avoiding ground-level freight rail crossings.',
      distanceDeltaKm: +1.1,
      timeSavedMin: 8,
      batteryDeltaPct: -0.2,
    },
  },
];

interface Props {
  onRerouteApplied?: (corridorName: string, parcelId: string) => void;
  className?: string;
  compact?: boolean;
}

export const PredictiveDelayWidget: React.FC<Props> = ({
  onRerouteApplied,
  className = '',
  compact = false,
}) => {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('corridor-80-bay-bridge');
  const [corridors, setCorridors] = useState<BottleneckCorridor[]>(HISTORICAL_BOTTLENECK_CORRIDORS);
  const [simulatedWeather, setSimulatedWeather] = useState<'CLEAR' | 'RAIN' | 'STORM'>('CLEAR');
  const [simulatedTrafficLoad, setSimulatedTrafficLoad] = useState<'NORMAL' | 'PEAK_SPIKE'>('NORMAL');
  const [appliedCorridors, setAppliedCorridors] = useState<Record<string, boolean>>({});
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);

  const parcels = storage.getParcels();
  const activeDelayedParcels = parcels.filter((p) => p.status === 'OUT_FOR_DELIVERY' || p.status === 'IN_TRANSIT_HUB_TRANSFER');

  const selectedCorridor = corridors.find((c) => c.id === selectedCorridorId) || corridors[0];

  const handleSimulateConditions = (weather: 'CLEAR' | 'RAIN' | 'STORM', traffic: 'NORMAL' | 'PEAK_SPIKE') => {
    setIsRecalculating(true);
    setSimulatedWeather(weather);
    setSimulatedTrafficLoad(traffic);

    setTimeout(() => {
      const multiplier = (weather === 'STORM' ? 1.6 : weather === 'RAIN' ? 1.25 : 1.0) * (traffic === 'PEAK_SPIKE' ? 1.4 : 1.0);
      
      const updated = HISTORICAL_BOTTLENECK_CORRIDORS.map((c) => {
        const newDelay = Math.round(c.historicalAvgDelayMin * multiplier);
        const severity: 'HIGH' | 'MEDIUM' | 'LOW' = newDelay > 25 ? 'HIGH' : newDelay > 12 ? 'MEDIUM' : 'LOW';
        return {
          ...c,
          currentDelayMin: newDelay,
          severity,
          recommendedBypass: {
            ...c.recommendedBypass,
            timeSavedMin: Math.round(c.recommendedBypass.timeSavedMin * (multiplier > 1 ? 1.3 : 1)),
          },
        };
      });

      setCorridors(updated);
      setIsRecalculating(false);

      // Automated Detection: If severe weather or major traffic incident is detected, broadcast to LogisticsMap
      const highIncidentCorridor = updated.find((c) => c.severity === 'HIGH') || updated[0];
      if (weather === 'STORM' || traffic === 'PEAK_SPIKE' || (highIncidentCorridor && highIncidentCorridor.severity === 'HIGH')) {
        const isWeatherStorm = weather === 'STORM';
        const incident: PredictiveDelayIncident = {
          id: `inc-auto-${Date.now()}`,
          type: isWeatherStorm ? 'SEVERE_WEATHER_DELAY' : 'MAJOR_TRAFFIC_INCIDENT',
          corridorId: highIncidentCorridor.id,
          corridorName: highIncidentCorridor.name,
          highway: highIncidentCorridor.highway,
          severity: isWeatherStorm ? 'CRITICAL' : 'HIGH',
          currentDelayMin: highIncidentCorridor.currentDelayMin,
          cause: isWeatherStorm
            ? `Severe Weather Storm Detected: Atmospheric downpour along ${highIncidentCorridor.highway} with standing water and 65km/h wind shear.`
            : `Major Traffic Incident Detected: Heavy corridor bottleneck & gridlock along ${highIncidentCorridor.highway} (${highIncidentCorridor.cause}).`,
          timestamp: new Date().toISOString(),
          weatherCondition: isWeatherStorm ? 'GALE_STORM' : weather === 'RAIN' ? 'RAIN' : 'CLEAR',
          trafficCondition: traffic === 'PEAK_SPIKE' ? 'GRIDLOCK' : 'PEAK_SPIKE',
          recommendedBypass: {
            ...highIncidentCorridor.recommendedBypass,
            avoidHighway: highIncidentCorridor.highway,
          },
          triggerSource: 'PredictiveDelayWidget',
          impactedVehicleId: 'veh-ev-101',
          courierName: 'Marcus Vance',
        };
        broadcastPredictiveDelayIncident(incident);
      }
    }, 450);
  };

  const handleBroadcastManualIncident = (type: 'TRAFFIC' | 'WEATHER') => {
    const incident = type === 'WEATHER' ? PRESET_PREDICTIVE_INCIDENTS[1] : PRESET_PREDICTIVE_INCIDENTS[0];
    broadcastPredictiveDelayIncident({
      ...incident,
      id: `manual-trigger-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  };

  const handleApplyReroute = (corridor: BottleneckCorridor) => {
    // Pick the most relevant active parcel (e.g. LF-2026-89410-APX)
    const targetParcel = activeDelayedParcels[0] || parcels[0];
    if (!targetParcel) return;

    // Apply reroute to storage
    storage.updateParcelStatus(
      targetParcel.id,
      targetParcel.status,
      'INTER_HUB_DISPATCH',
      corridor.recommendedBypass.name,
      `AI Predictive Reroute Executed: Bypassed ${corridor.name}. Saved ${corridor.recommendedBypass.timeSavedMin} minutes transit time.`
    );

    // Update delay risk to LOW
    storage.updateParcelDelayAssessment(targetParcel.id, {
      ...targetParcel.delayRisk,
      level: 'LOW',
      predictedDelayMinutes: 0,
      primaryRiskFactor: `Mitigated via ${corridor.recommendedBypass.name}`,
      recommendedMitigation: 'Vehicle routed through free-flowing bypass corridor.',
    });

    setAppliedCorridors((prev) => ({ ...prev, [corridor.id]: true }));

    // Also broadcast incident resolution & reroute trigger
    broadcastPredictiveDelayIncident({
      id: `reroute-exec-${Date.now()}`,
      type: corridor.currentDelayMin > 25 ? 'MAJOR_TRAFFIC_INCIDENT' : 'MAJOR_TRAFFIC_INCIDENT',
      corridorId: corridor.id,
      corridorName: corridor.name,
      highway: corridor.highway,
      severity: corridor.severity === 'HIGH' ? 'CRITICAL' : 'HIGH',
      currentDelayMin: corridor.currentDelayMin,
      cause: `Reroute enforced for ${corridor.name} (${corridor.cause})`,
      timestamp: new Date().toISOString(),
      recommendedBypass: {
        ...corridor.recommendedBypass,
        avoidHighway: corridor.highway,
      },
      triggerSource: 'PredictiveDelayWidget',
      impactedVehicleId: 'veh-ev-101',
      courierName: 'Marcus Vance',
    });

    if (onRerouteApplied) {
      onRerouteApplied(corridor.name, targetParcel.id);
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 ${className}`}>
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Predictive Delay Intelligence</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                RandomForest ML Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Forecasts corridor bottlenecks using historical telemetry vectors and recommends optimal courier bypasses.
            </p>
          </div>
        </div>

        {/* Controls: Live mesh indicator + Threshold Alert Settings */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostGIS Mesh Synced</span>
          </div>

          <button
            onClick={() => setShowThresholdConfig(!showThresholdConfig)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              showThresholdConfig
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            <BellRing className="w-3.5 h-3.5 text-indigo-400" />
            <span>{showThresholdConfig ? 'Hide Threshold Config' : 'Configure Delay Buffers'}</span>
          </button>
        </div>
      </div>

      {/* Conditionally rendered or expanded custom threshold alerts panel */}
      {showThresholdConfig && (
        <div className="animate-fade-in border-b border-slate-800 pb-5">
          <DelayThresholdConfigModal />
        </div>
      )}

      {/* Simulation Scenario Controls */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Real-Time Stress Simulation:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Weather Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px]">
            <span className="px-2 text-slate-500 uppercase font-semibold text-[9px]">Weather:</span>
            {(['CLEAR', 'RAIN', 'STORM'] as const).map((w) => (
              <button
                key={w}
                onClick={() => handleSimulateConditions(w, simulatedTrafficLoad)}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  simulatedWeather === w
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Traffic Spike Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px]">
            <span className="px-2 text-slate-500 uppercase font-semibold text-[9px]">Traffic:</span>
            {(['NORMAL', 'PEAK_SPIKE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleSimulateConditions(simulatedWeather, t)}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  simulatedTrafficLoad === t
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'NORMAL' ? 'Nominal' : 'Peak Jam'}
              </button>
            ))}
          </div>

          {/* Quick Instant Event Trigger Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={() => handleBroadcastManualIncident('TRAFFIC')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition-all"
              title="Dispatches Major Traffic Collision on I-80 corridor to trigger automated re-routing in LogisticsMap"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Simulate I-80 Gridlock</span>
            </button>
            <button
              onClick={() => handleBroadcastManualIncident('WEATHER')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold transition-all"
              title="Dispatches Severe Atmospheric River Gale Storm delay to trigger automated re-routing in LogisticsMap"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Simulate Severe Storm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Bottleneck Radar on Left, Recommended Alternative Route on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Corridor Bottleneck Threats (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Monitored Transit Corridors
          </span>

          <div className="space-y-2">
            {corridors.map((corridor) => {
              const isSelected = corridor.id === selectedCorridorId;
              const isApplied = appliedCorridors[corridor.id];

              return (
                <button
                  key={corridor.id}
                  onClick={() => setSelectedCorridorId(corridor.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-950 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">
                      {corridor.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        corridor.severity === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : corridor.severity === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      +{corridor.currentDelayMin}m Delay
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mb-2 truncate">
                    {corridor.highway} · {corridor.cause}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
                    <span>Hist. Baseline: ~{corridor.historicalAvgDelayMin}m</span>
                    {isApplied ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Reroute Active
                      </span>
                    ) : (
                      <span className="text-indigo-400 font-semibold">
                        View Bypass Suggestion →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Alternative Route Recommendation (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-0.5">
                RECOMMENDED DYNAMIC ALTERNATIVE
              </span>
              <h4 className="text-base font-bold text-slate-100">
                {selectedCorridor.recommendedBypass.name}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {selectedCorridor.recommendedBypass.description}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20">
              <Navigation className="w-5 h-5" />
            </div>
          </div>

          {/* Comparison Matrix */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Estimated Time Saved</span>
              <div className="font-mono text-base font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingDown className="w-4 h-4" />
                <span>-{selectedCorridor.recommendedBypass.timeSavedMin} min</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Corridor Distance</span>
              <div className="font-mono text-base font-bold text-slate-200 mt-0.5">
                +{selectedCorridor.recommendedBypass.distanceDeltaKm} km
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Battery Impact</span>
              <div className="font-mono text-base font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{selectedCorridor.recommendedBypass.batteryDeltaPct}%</span>
              </div>
            </div>
          </div>

          {/* Dispatcher / Courier Reroute Execution CTA */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Target Van: <strong className="text-slate-200 font-mono">APX-EV-101 (Marcus Vance)</strong></span>
            </div>

            <button
              onClick={() => handleApplyReroute(selectedCorridor)}
              disabled={appliedCorridors[selectedCorridor.id]}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl shadow-md transition-all ${
                appliedCorridors[selectedCorridor.id]
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {appliedCorridors[selectedCorridor.id] ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Alternative Route Active in Vehicle GPS</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Transmit Reroute to Active Courier</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
