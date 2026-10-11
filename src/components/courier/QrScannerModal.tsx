import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  ArrowRight,
  ShieldCheck,
  Package
} from 'lucide-react';
import { Parcel } from '../../types';
import { storage } from '../../services/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onParcelScanned: (parcel: Parcel, actionType: 'CHECK_IN' | 'LOAD_VAN' | 'DELIVER') => void;
}

export const QrScannerModal: React.FC<Props> = ({ isOpen, onClose, onParcelScanned }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [scannedParcel, setScannedParcel] = useState<Parcel | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);

  if (!isOpen) return null;

  const handleLookup = (searchVal: string) => {
    setSearchError(null);
    const found = storage.getParcelByTracking(searchVal);
    if (found) {
      setScannedParcel(found);
    } else {
      setSearchError(`No parcel record matched token: "${searchVal}". Check QR integrity.`);
      setScannedParcel(null);
    }
  };

  const handlePresetSelect = (tracking: string) => {
    setTokenInput(tracking);
    handleLookup(tracking);
  };

  const allParcels = storage.getParcels();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Optical QR Custody Scanner
              </h3>
              <p className="text-xs text-slate-400">
                Field terminal scanner for hub operators and delivery couriers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Scanner Viewfinder Simulation */}
          <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-indigo-500/40 bg-slate-950 flex flex-col items-center justify-center py-8 px-4 text-center">
            {/* Viewfinder Target corners */}
            <div className="relative w-48 h-48 border-2 border-indigo-500/50 rounded-lg flex items-center justify-center bg-indigo-950/20">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
              
              {/* Laser animation beam */}
              <div className="absolute left-2 right-2 h-[2px] bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />

              <div className="flex flex-col items-center text-slate-400 text-xs">
                <Camera className="w-8 h-8 text-indigo-400/80 mb-2 animate-bounce" />
                <span>Align QR Label Here</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 font-mono">
              OPTICAL SENSOR ACTIVE · ISO/IEC 18004 SPECIFICATION
            </p>
          </div>

          {/* Quick Select Presets for Testing */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 block">
              Quick Scan Available Parcels:
            </span>
            <div className="flex flex-wrap gap-2">
              {allParcels.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.trackingNumber)}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
                >
                  {p.trackingNumber}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input or Barcode Gun Entry */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Scan Token / Tracking Number
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLookup(tokenInput);
                  }}
                  placeholder="e.g. LF-2026-89410-APX"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleLookup(tokenInput)}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Scan Token
              </button>
            </div>
          </div>

          {searchError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Scanned Parcel Result & Custody Action Card */}
          {scannedParcel && (
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block">
                    SCANNED IDENTITY CONFIRMED
                  </span>
                  <h4 className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                    {scannedParcel.trackingNumber}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Recipient: {scannedParcel.recipient.name} ({scannedParcel.recipient.city})
                  </p>
                </div>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  {scannedParcel.status}
                </span>
              </div>

              {/* Custody Action Buttons */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Select Custody Handover Operation:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      onParcelScanned(scannedParcel, 'CHECK_IN');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-xs space-y-1"
                  >
                    <div className="font-semibold text-blue-400">Hub Check-In</div>
                    <div className="text-[10px] text-slate-400">Conveyor sortation scan</div>
                  </button>

                  <button
                    onClick={() => {
                      onParcelScanned(scannedParcel, 'LOAD_VAN');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-xs space-y-1"
                  >
                    <div className="font-semibold text-amber-400">Load to Van</div>
                    <div className="text-[10px] text-slate-400">Out for final delivery</div>
                  </button>

                  <button
                    onClick={() => {
                      onParcelScanned(scannedParcel, 'DELIVER');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-800/80 text-left transition-colors text-xs space-y-1"
                  >
                    <div className="font-semibold text-emerald-400">Capture POD</div>
                    <div className="text-[10px] text-slate-300">Recipient signature</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
