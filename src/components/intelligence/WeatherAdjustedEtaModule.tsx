import React, { useState, useEffect, useMemo } from 'react';
import { 
  CloudRain, 
  Wind, 
  Eye, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Truck, 
  ShieldAlert, 
  RotateCcw, 
  Sliders, 
  RefreshCw, 
  Activity, 
  ArrowRight, 
  Check, 
  MapPin, 
  Layers,
  Sparkles,
  Download
} from 'lucide-react';
import { 
  mockWeatherService, 
  WeatherStation, 
  WeatherConditionType, 
  WeatherAdjustedParcelRecord 
} from '../../services/mockWeatherService';
import { storage } from '../../services/storage';
import { Parcel } from '../../types';

interface Props {
  className?: string;
  compact?: boolean;
}

export const WeatherAdjustedEtaModule: React.FC<Props> = ({ 
  className = '', 
  compact = false 
}) => {
  const currentTenantId = storage.getActiveTenantId();
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('ws-sf-port');
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');

  // Load weather stations and subscribe to updates
  useEffect(() => {
    mockWeatherService.getRegionalWeather().then(setStations);
    const unsubscribe = mockWeatherService.subscribe(() => {
      mockWeatherService.getRegionalWeather().then(setStations);
    });
    return unsubscribe;
  }, []);

  const activeStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || stations[0] || null;
  }, [stations, selectedStationId]);

  const activeDelayImpact = useMemo(() => {
    if (!activeStation) return null;
    return mockWeatherService.calculateWeatherDelayScore(activeStation);
  }, [activeStation]);

  const rawParcels = useMemo(() => {
    return storage.getParcels(currentTenantId);
  }, [currentTenantId]);

  const weatherAdjustedRecords = useMemo(() => {
    if (!activeStation) return [];
    return mockWeatherService.calculateWeatherAdjustedParcels(rawParcels, activeStation);
  }, [rawParcels, activeStation]);

  const filteredRecords = useMemo(() => {
    if (filterRisk === 'ALL') return weatherAdjustedRecords;
    return weatherAdjustedRecords.filter((r) => r.riskTier === filterRisk);
  }, [weatherAdjustedRecords, filterRisk]);

  const handleSimulateWeather = (condition: WeatherConditionType) => {
    if (!activeStation) return;
    mockWeatherService.updateStationCondition(activeStation.id, condition);
  };

  const handleApplyBatchAdjustment = () => {
    setIsApplyingAdjustment(true);
    setTimeout(() => {
      // Apply delay notification and updated ETA cushion across all in-transit parcels
      weatherAdjustedRecords.forEach((rec) => {
        const parcel = rawParcels.find((p) => p.id === rec.parcelId);
        if (parcel && (parcel.status === 'OUT_FOR_DELIVERY' || parcel.status === 'IN_TRANSIT_HUB_TRANSFER' || parcel.status === 'PICKED_UP')) {
          storage.updateParcelStatus(
            rec.parcelId,
            parcel.status,
            'EXCEPTION_LOGGED',
            activeStation?.name || 'Regional Meteorology Radar',
            `Weather-Adjusted ETA updated: +${rec.additionalDelayMinutes}m due to ${activeStation?.conditionLabel}. New ETA: ${rec.weatherAdjustedEta}.`
          );
        }
      });

      setIsApplyingAdjustment(false);
      setSyncSuccessToast(`Applied weather-adjusted ETAs across ${weatherAdjustedRecords.length} fleet shipments.`);
      setTimeout(() => setSyncSuccessToast(null), 4000);
    }, 600);
  };

  const handleExportCsv = () => {
    const headers = ['TrackingNumber', 'Destination', 'BaselineETA', 'WeatherAdjustedETA', 'DelayMinutes', 'PredictiveDelayScore', 'RiskTier', 'WeatherStation', 'PrimaryHazard'];
    const rows = weatherAdjustedRecords.map(r => [
      r.trackingNumber,
      `"${r.recipientCity}"`,
      r.baselineEta,
      r.weatherAdjustedEta,
      r.additionalDelayMinutes,
      r.predictiveDelayScore,
      r.riskTier,
      `"${r.weatherStationUsed}"`,
      `"${r.primaryHazard}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Weather_Adjusted_ETA_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeStation || !activeDelayImpact) {
    return (
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-400" />
        <p className="text-sm">Initializing regional Doppler weather radar telemetry...</p>
      </div>
    );
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 75) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (score >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (score >= 25) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  const getRiskPillColor = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-xl relative backdrop-blur-sm ${className}`}>
      {/* Toast Notification */}
      {syncSuccessToast && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-semibold shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{syncSuccessToast}</span>
        </div>
      )}

      {/* Header with Title and Operations Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              PREDICTIVE METEOROLOGY · DYNAMIC ROUTE ETA MODULE
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Live Mock Weather API v2.4
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Weather-Adjusted ETA & Route Risk Correlator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time correlation of precipitation, visibility, and bridge crosswinds with predictive delay scores and dispatch delivery cushion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="Download CSV audit report of weather-adjusted ETAs"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleApplyBatchAdjustment}
            disabled={isApplyingAdjustment}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-lg shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
            title="Recalculate and push adjusted ETAs to all fleet vehicles and active shipment manifests"
          >
            {isApplyingAdjustment ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-indigo-200 fill-indigo-200" />
            )}
            <span>Apply Weather ETAs to Fleet</span>
          </button>
        </div>
      </div>

      {/* Regional Station Selector Ticker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            Monitored Regional Weather Stations:
          </span>
          <span className="text-[11px] text-slate-500">
            Click any sector station to calibrate predictive scores
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {stations.map((st) => {
            const isSelected = st.id === selectedStationId;
            const stationImpact = mockWeatherService.calculateWeatherDelayScore(st);
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStationId(st.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500 shadow-lg'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    {st.name}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${getRiskPillColor(stationImpact.riskTier)}`}>
                    {stationImpact.riskTier}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mb-1">
                  {st.corridor}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span className="flex items-center gap-1">
                    <CloudRain className="w-2.5 h-2.5 text-cyan-400" />
                    {st.precipitationMmPerHour}mm/h
                  </span>
                  <span className="font-bold text-amber-300">
                    +{stationImpact.additionalDelayMinutesPerTrip}m
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Observation Card & Stress Scenario Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 rounded-xl bg-slate-950 border border-slate-800">
        {/* Left: Active Station Details & Weather Telemetry (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block">
                ACTIVE RADAR OBSERVATION: {activeStation.region}
              </span>
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{activeStation.name}</span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeStation.conditionLabel}
                </span>
              </h4>
            </div>

            {activeStation.severeAlert && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[11px] font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span className="truncate max-w-xs">{activeStation.severeAlert}</span>
              </div>
            )}
          </div>

          {/* Meteorological Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <CloudRain className="w-3 h-3 text-cyan-400" />
                Precipitation
              </span>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {activeStation.precipitationMmPerHour.toFixed(1)} <span className="text-[10px] text-slate-400">mm/h</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                {activeStation.standingWaterMm > 0 ? `${activeStation.standingWaterMm.toFixed(1)}mm standing water` : 'Dry asphalt'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Wind className="w-3 h-3 text-blue-400" />
                Wind / Gusts
              </span>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {activeStation.windSpeedKmh.toFixed(0)} <span className="text-[10px] text-slate-400">km/h</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                Peak gusts: {activeStation.windGustKmh.toFixed(0)} km/h
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Eye className="w-3 h-3 text-amber-400" />
                Visibility
              </span>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {activeStation.visibilityKm.toFixed(1)} <span className="text-[10px] text-slate-400">km</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                {activeStation.visibilityKm < 1 ? 'High hazard fog' : 'Normal range'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                Road Friction
              </span>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {activeStation.roadFrictionCoeff.toFixed(2)} <span className="text-[10px] text-slate-400">μ</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">
                {activeStation.roadFrictionCoeff < 0.5 ? 'Reduced traction' : 'High grip surface'}
              </div>
            </div>
          </div>

          {/* Interactive Stress Simulation Condition Buttons */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Simulate Weather Scenario (Stress Test):
              </span>
              <button
                onClick={() => mockWeatherService.resetToDefault()}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                title="Reset weather telemetry to live defaults"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { type: 'CLEAR' as const, label: 'Clear & Dry' },
                { type: 'LIGHT_RAIN' as const, label: 'Light Showers' },
                { type: 'HEAVY_DOWNPOUR' as const, label: 'Atmospheric River' },
                { type: 'DENSE_FOG' as const, label: 'Advection Fog' },
                { type: 'GALE_STORM' as const, label: 'Gale Wind Warning' },
                { type: 'ICE_FREEZE' as const, label: 'Black Ice Freeze' },
              ].map((cond) => (
                <button
                  key={cond.type}
                  onClick={() => handleSimulateWeather(cond.type)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    activeStation.condition === cond.type
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {cond.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Predictive Delay Score Correlator & Impact Gauge (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Correlated Predictive Delay Score
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getScoreBadgeColor(activeDelayImpact.predictiveDelayScore)}`}>
              {activeDelayImpact.riskTier} RISK
            </span>
          </div>

          {/* Central Radial / Numeric Gauge */}
          <div className="flex items-center gap-4 py-1">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-slate-950 border-2 border-slate-800">
              <div className="text-center">
                <span className={`text-3xl font-extrabold font-mono ${activeDelayImpact.predictiveDelayScore > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {activeDelayImpact.predictiveDelayScore}
                </span>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">/ 100</span>
              </div>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Added Transit Delay:</span>
                <span className="font-mono font-bold text-amber-300">
                  +{activeDelayImpact.additionalDelayMinutesPerTrip} mins
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Velocity Reduction:</span>
                <span className="font-mono font-bold text-rose-300">
                  -{activeDelayImpact.estimatedSpeedReductionPct}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Braking Distance Factor:</span>
                <span className="font-mono font-bold text-slate-200">
                  {activeDelayImpact.brakingDistanceMultiplier}x
                </span>
              </div>
            </div>
          </div>

          {/* Adverse Hazard Factors List */}
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] space-y-1">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
              Correlated Road Hazards:
            </span>
            {activeDelayImpact.adverseRiskFactors.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 text-slate-300">
                <span className="text-indigo-400 font-bold">•</span>
                <span className="leading-tight">{f}</span>
              </div>
            ))}
          </div>

          {/* Operational Mitigation */}
          <div className="text-[11px] text-slate-400 bg-indigo-950/30 border border-indigo-500/20 p-2 rounded-lg">
            <strong className="text-indigo-300">Dispatcher Action:</strong> {activeDelayImpact.operationalRecommendation}
          </div>
        </div>
      </div>

      {/* Affected Parcels in Transit: Baseline ETA vs Weather-Adjusted ETA */}
      {!compact && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                Active In-Transit Shipments · Weather-Adjusted ETA Manifest
              </h4>
              <p className="text-[11px] text-slate-400">
                Comparing scheduled SLA baseline delivery target with meteorological predictive delay.
              </p>
            </div>

            {/* Risk Filter Buttons */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold">
              {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setFilterRisk(tier)}
                  className={`px-2 py-1 rounded transition-colors ${
                    filterRisk === tier
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Shipment Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Tracking / Destination</th>
                  <th className="py-2.5 px-3">Courier / Sector</th>
                  <th className="py-2.5 px-3">Baseline ETA</th>
                  <th className="py-2.5 px-3 text-indigo-300">Weather-Adjusted ETA</th>
                  <th className="py-2.5 px-3">Delay Delta</th>
                  <th className="py-2.5 px-3 text-center">Delay Score</th>
                  <th className="py-2.5 px-3">Primary Weather Hazard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No in-transit shipments matching the selected risk tier.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={rec.parcelId} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                        <div>{rec.trackingNumber}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{rec.recipientCity}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <div>{rec.assignedCourierName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{rec.weatherStationUsed}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {rec.baselineEta}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{rec.weatherAdjustedEta}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-400">
                        +{rec.additionalDelayMinutes} mins
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${getRiskPillColor(rec.riskTier)}`}>
                          {rec.predictiveDelayScore}/100 ({rec.riskTier})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs truncate" title={rec.primaryHazard}>
                        {rec.primaryHazard}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
