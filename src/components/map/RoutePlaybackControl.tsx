import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Compass, 
  Gauge, 
  Zap, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ChevronDown, 
  X, 
  Sparkles, 
  Maximize2, 
  Minimize2,
  Navigation,
  Eye,
  Repeat,
  Flag,
  Share2,
  AlertCircle
} from 'lucide-react';
import { CompletedDeliveryRoute, HistoricalGPSPoint } from '../../services/routePlaybackService';

interface Props {
  routes: CompletedDeliveryRoute[];
  activeRoute: CompletedDeliveryRoute;
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  autoFollow: boolean;
  isLooping: boolean;
  onSelectRoute: (route: CompletedDeliveryRoute) => void;
  onTogglePlay: () => void;
  onSeek: (index: number) => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleAutoFollow: () => void;
  onToggleLoop: () => void;
  onClose: () => void;
}

export const RoutePlaybackControl: React.FC<Props> = ({
  routes,
  activeRoute,
  currentIndex,
  isPlaying,
  playbackSpeed,
  autoFollow,
  isLooping,
  onSelectRoute,
  onTogglePlay,
  onSeek,
  onReset,
  onSpeedChange,
  onToggleAutoFollow,
  onToggleLoop,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showRouteSelector, setShowRouteSelector] = useState(false);

  const totalPoints = activeRoute.points.length;
  const currentPoint: HistoricalGPSPoint | undefined = activeRoute.points[currentIndex] || activeRoute.points[0];

  const progressPct = totalPoints > 1 ? Math.min(100, Math.round((currentIndex / (totalPoints - 1)) * 100)) : 0;
  const distanceCoveredKm = +((progressPct / 100) * activeRoute.totalDistanceKm).toFixed(1);
  const minutesElapsed = Math.round((progressPct / 100) * activeRoute.durationMinutes);

  // Compass direction label
  const getCompassHeading = (heading: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return `${heading}° ${directions[index]}`;
  };

  // Find recent milestone
  const activeMilestone = [...activeRoute.points]
    .slice(0, currentIndex + 1)
    .reverse()
    .find((p) => p.milestone)?.milestone;

  return (
    <div className="absolute bottom-4 left-3 right-3 sm:left-4 sm:right-4 z-20 transition-all select-none max-w-4xl mx-auto">
      {/* Outer Card with Glassmorphism */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-950/50 overflow-hidden text-slate-100">
        
        {/* Top Header / Status Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-indigo-400">
                HISTORICAL ROUTE PLAYBACK
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-semibold text-slate-200">
                {activeRoute.trackingNumber}
              </span>
            </div>

            {/* Delivery Route Selector Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowRouteSelector(!showRouteSelector)}
                className="flex items-center gap-1.5 text-[11px] font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                title="Select vehicle or completed delivery run to replay"
              >
                <Truck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Change Vehicle / Run</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Selector Menu */}
              {showRouteSelector && (
                <div className="absolute bottom-full mb-2 left-0 w-84 bg-slate-900/98 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs animate-fade-in space-y-1.5">
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-slate-800">
                    <span>Fleet & Parcel Telemetry Tracks</span>
                    <span className="text-indigo-400">{routes.length} Tracks</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {routes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          onSelectRoute(r);
                          setShowRouteSelector(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg transition-all flex flex-col gap-0.5 ${
                          r.id === activeRoute.id
                            ? 'bg-gradient-to-r from-purple-950/70 to-indigo-950/70 border border-purple-500/60 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-emerald-300">{r.vehicleNumber}</span>
                            <span className="text-[10px] text-slate-400">· {r.courierName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">{r.totalDistanceKm} km</span>
                        </div>
                        <div className="text-[11px] text-slate-300 truncate">
                          {r.originCity} → {r.destCity}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5 font-mono">
                          <span className="truncate">{r.trackingNumber}</span>
                          <span>{r.durationMinutes}m ({r.points.length} pts)</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono">
              {minutesElapsed}m / {activeRoute.durationMinutes}m ({progressPct}%)
            </span>

            {/* Toggle Auto Follow Camera */}
            <button
              onClick={onToggleAutoFollow}
              className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 border ${
                autoFollow
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={autoFollow ? 'Auto-pan camera active (tracking vehicle)' : 'Auto-pan camera disabled'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[10px] font-mono">
                {autoFollow ? 'Follow Cam: ON' : 'Follow Cam: OFF'}
              </span>
            </button>

            {/* Minimize Toggle */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title={isMinimized ? 'Expand Playback Controls' : 'Minimize Playback Controls'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close Playback */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors ml-1"
              title="Exit Historical Route Playback"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body (when not minimized) */}
        {!isMinimized && (
          <div className="p-4 space-y-3.5">
            {/* Live Telemetry HUD Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {/* Speed */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Current Speed</span>
                  <span className="font-mono text-sm font-bold text-slate-100">
                    {currentPoint?.speedKmh || 0} <span className="text-[10px] text-slate-400">km/h</span>
                  </span>
                </div>
              </div>

              {/* Progress Distance */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Distance Done</span>
                  <span className="font-mono text-sm font-bold text-slate-100">
                    {distanceCoveredKm} <span className="text-[10px] text-slate-400">/ {activeRoute.totalDistanceKm} km</span>
                  </span>
                </div>
              </div>

              {/* Battery / Fuel */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Vehicle Battery</span>
                  <span className="font-mono text-sm font-bold text-amber-300">
                    {currentPoint?.batteryPct || 90}%
                  </span>
                </div>
              </div>

              {/* Heading / Compass */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Bearing</span>
                  <span className="font-mono text-xs font-bold text-cyan-200">
                    {getCompassHeading(currentPoint?.heading || 0)}
                  </span>
                </div>
              </div>

              {/* Courier & Van */}
              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
                    {activeRoute.vehicleNumber}
                  </span>
                  <span className="font-bold text-xs text-slate-200 truncate block">
                    {activeRoute.courierName}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Segment / Active Milestone Callout */}
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-400 text-[11px]">Location:</span>
                <span className="font-medium text-slate-200 truncate">
                  {currentPoint?.stepDescription || 'Navigating route waypoints'}
                </span>
              </div>

              {activeMilestone && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold shrink-0">
                  <Flag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{activeMilestone.title}</span>
                  <span className="text-[10px] font-mono text-emerald-400/80">({activeMilestone.time})</span>
                </div>
              )}
            </div>

            {/* Interactive Timeline Scrubbing Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Start: {activeRoute.startTime} ({activeRoute.originCity})</span>
                <span className="text-indigo-400 font-bold">{progressPct}%</span>
                <span>Delivered: {activeRoute.completedTime} ({activeRoute.destCity})</span>
              </div>

              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max={Math.max(1, totalPoints - 1)}
                  value={currentIndex}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Milestone Ticks along the track */}
              <div className="flex justify-between px-1 text-[9px] font-mono text-slate-500">
                <span>Origin Hub</span>
                <span>Highway Transit</span>
                <span>Urban Arterial</span>
                <span>Final Approach</span>
                <span>Signed & POD</span>
              </div>
            </div>

            {/* Playback Transport Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
              {/* Transport Buttons */}
              <div className="flex items-center gap-2">
                {/* Reset / Rewind */}
                <button
                  onClick={onReset}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shadow-sm"
                  title="Rewind to start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Play / Pause Primary Button */}
                <button
                  onClick={onTogglePlay}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                  }`}
                  title={isPlaying ? 'Pause Animation' : 'Play Historical Route Animation'}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-white" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Play Path</span>
                    </>
                  )}
                </button>

                {/* Loop Toggle */}
                <button
                  onClick={onToggleLoop}
                  className={`p-2 rounded-xl text-xs transition-colors border ${
                    isLooping
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title={isLooping ? 'Auto-repeat on completion: ON' : 'Auto-repeat: OFF'}
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>

              {/* Playback Speed Multipliers */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                {[0.5, 1, 2, 5, 10].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onSpeedChange(spd)}
                    className={`px-2 py-1 rounded-lg transition-colors text-[11px] font-mono ${
                      playbackSpeed === spd
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Quick Trip Proof of Delivery Summary Badge */}
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-[11px]">
                  POD: <strong className="text-slate-200">{activeRoute.podConfirmationCode}</strong>
                </span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-[11px]">
                  CO₂: <strong className="text-emerald-400">{activeRoute.co2EmissionsKg} kg</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
