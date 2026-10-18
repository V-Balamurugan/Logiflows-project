import React from 'react';
import { Navigation, Compass, Radio } from 'lucide-react';

interface Props {
  onClick: () => void;
  isOpen?: boolean;
  className?: string;
  badgeText?: string;
}

export const LiveFleetMapFloatingButton: React.FC<Props> = ({
  onClick,
  isOpen = false,
  className = '',
  badgeText = 'LIVE',
}) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-full shadow-2xl shadow-indigo-950/80 border border-indigo-400/40 hover:border-indigo-300 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${
        isOpen ? 'ring-2 ring-indigo-400 shadow-indigo-600/30' : ''
      } ${className}`}
      title="Open Live Fleet Map · Track Active Courier & Next Stop"
      aria-label="Open Live Fleet Map"
    >
      {/* Pulsing Live Radar Dot */}
      <div className="relative flex items-center justify-center shrink-0">
        <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </div>

      {/* Button Icon & Label */}
      <div className="flex items-center gap-1.5">
        <Navigation className="w-3.5 h-3.5 text-indigo-200 group-hover:rotate-12 transition-transform duration-300" />
        <span className="text-xs font-bold tracking-wide">Live Fleet Map</span>
      </div>

      {/* Live Badge */}
      <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-indigo-950/80 text-emerald-300 rounded border border-emerald-500/30 tracking-wider">
        {badgeText}
      </span>
    </button>
  );
};
