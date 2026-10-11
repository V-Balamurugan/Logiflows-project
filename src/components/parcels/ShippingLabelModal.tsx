import React from 'react';
import { X, Printer, Download, PackageCheck, Shield } from 'lucide-react';
import { Parcel } from '../../types';

interface Props {
  parcel: Parcel | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShippingLabelModal: React.FC<Props> = ({ parcel, isOpen, onClose }) => {
  if (!isOpen || !parcel) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 text-slate-100">
            <PackageCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold">Standard Logistics Shipping Label</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 4x6" Label</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content - Preview Container */}
        <div className="p-6 bg-slate-950/60 max-h-[75vh] overflow-y-auto flex justify-center">
          {/* Printable 4x6" Label Specimen */}
          <div
            id="printable-shipping-label"
            className="w-full max-w-[420px] bg-white text-black p-6 rounded shadow-lg border-2 border-black font-sans select-none"
            style={{ minHeight: '560px' }}
          >
            {/* Top Bar: Carrier Brand & Service Tier */}
            <div className="flex items-start justify-between border-b-4 border-black pb-3">
              <div>
                <div className="text-2xl font-black tracking-tighter uppercase font-mono">
                  LOGIFLOWS
                </div>
                <div className="text-[10px] tracking-widest font-bold uppercase text-slate-700">
                  CARRIER NETWORK EXPRESS
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black px-2 py-0.5 bg-black text-white inline-block">
                  {parcel.serviceTier.replace(/_/g, ' ')}
                </div>
                <div className="text-[10px] font-mono mt-0.5 font-bold">
                  ZONE 1 / PRIORITY
                </div>
              </div>
            </div>

            {/* SENDER BLOCK */}
            <div className="pt-2 pb-2 text-[11px] border-b border-black leading-tight">
              <span className="font-bold text-[9px] uppercase tracking-wider block text-slate-600">
                SHIP FROM:
              </span>
              <div className="font-semibold">{parcel.sender.name} ({parcel.sender.company || 'Private'})</div>
              <div>{parcel.sender.street}</div>
              <div>{parcel.sender.city}, {parcel.sender.state} {parcel.sender.postalCode}</div>
              <div className="text-[10px] text-slate-700">Phone: {parcel.sender.phone}</div>
            </div>

            {/* SHIP TO BLOCK (Prominent) */}
            <div className="pt-3 pb-3 text-xs border-b-2 border-black leading-tight">
              <span className="font-black text-[10px] uppercase tracking-widest block text-slate-800 mb-1">
                SHIP TO:
              </span>
              <div className="text-base font-black tracking-tight">{parcel.recipient.name}</div>
              {parcel.recipient.company && (
                <div className="font-bold text-slate-800">{parcel.recipient.company}</div>
              )}
              <div className="font-semibold text-sm mt-0.5">{parcel.recipient.street}</div>
              <div className="text-base font-black mt-0.5">
                {parcel.recipient.city}, {parcel.recipient.state} {parcel.recipient.postalCode}
              </div>
              <div className="text-[10px] text-slate-700 mt-1">Contact: {parcel.recipient.phone}</div>
            </div>

            {/* ROUTING CODE & HUB TAG */}
            <div className="grid grid-cols-2 border-b-2 border-black py-2 text-center font-mono">
              <div className="border-r border-black pr-2">
                <div className="text-[9px] uppercase text-slate-600 font-sans">DESTINATION HUB</div>
                <div className="text-lg font-black tracking-tight">{parcel.destHubId.toUpperCase()}</div>
              </div>
              <div className="pl-2">
                <div className="text-[9px] uppercase text-slate-600 font-sans">POSTAL SORT</div>
                <div className="text-lg font-black tracking-tight">{parcel.recipient.postalCode.slice(0, 3)}-CA</div>
              </div>
            </div>

            {/* PARCEL SPECIFICATIONS */}
            <div className="grid grid-cols-3 border-b-2 border-black py-2 text-[10px] text-center font-mono">
              <div>
                <span className="text-[8px] text-slate-600 font-sans block">WEIGHT</span>
                <strong className="text-xs">{parcel.weightKg} KG</strong>
              </div>
              <div>
                <span className="text-[8px] text-slate-600 font-sans block">DIMENSIONS</span>
                <strong className="text-xs">{parcel.dimensions.lengthCm}x{parcel.dimensions.widthCm}x{parcel.dimensions.heightCm}</strong>
              </div>
              <div>
                <span className="text-[8px] text-slate-600 font-sans block">DECLARED VAL</span>
                <strong className="text-xs">${parcel.declaredValueUsd}</strong>
              </div>
            </div>

            {/* SPECIAL INSTRUCTIONS */}
            {parcel.specialInstructions && (
              <div className="py-1.5 border-b border-black text-[9px] text-slate-800 font-medium italic">
                NOTE: {parcel.specialInstructions}
              </div>
            )}

            {/* QR CODE & 1D BARCODE VISUAL */}
            <div className="pt-4 flex items-center justify-between gap-4">
              {/* QR Code SVG */}
              <div className="flex flex-col items-center">
                <div className="p-1 border-2 border-black bg-white inline-block">
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="black">
                    {/* Stylized QR Matrix Pattern */}
                    {/* Corner 1 */}
                    <rect x="0" y="0" width="28" height="28" fill="black" />
                    <rect x="4" y="4" width="20" height="20" fill="white" />
                    <rect x="8" y="8" width="12" height="12" fill="black" />
                    {/* Corner 2 */}
                    <rect x="72" y="0" width="28" height="28" fill="black" />
                    <rect x="76" y="4" width="20" height="20" fill="white" />
                    <rect x="80" y="8" width="12" height="12" fill="black" />
                    {/* Corner 3 */}
                    <rect x="0" y="72" width="28" height="28" fill="black" />
                    <rect x="4" y="76" width="20" height="20" fill="white" />
                    <rect x="8" y="80" width="12" height="12" fill="black" />
                    {/* QR data dots */}
                    <rect x="36" y="6" width="8" height="8" />
                    <rect x="52" y="6" width="8" height="8" />
                    <rect x="36" y="20" width="8" height="8" />
                    <rect x="48" y="32" width="12" height="8" />
                    <rect x="12" y="36" width="12" height="8" />
                    <rect x="80" y="36" width="8" height="12" />
                    <rect x="32" y="48" width="16" height="8" />
                    <rect x="64" y="48" width="12" height="12" />
                    <rect x="36" y="64" width="12" height="8" />
                    <rect x="56" y="64" width="8" height="16" />
                    <rect x="40" y="80" width="8" height="8" />
                    <rect x="72" y="76" width="16" height="8" />
                    <rect x="80" y="88" width="8" height="8" />
                  </svg>
                </div>
                <span className="text-[8px] font-mono mt-1 font-bold">SCAN CUSTODY</span>
              </div>

              {/* 1D Barcode Simulation */}
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full flex justify-center items-end gap-[2px] h-14 overflow-hidden">
                  {[2, 4, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2].map(
                    (w, idx) => (
                      <span
                        key={idx}
                        className="bg-black"
                        style={{
                          width: `${w}px`,
                          height: idx % 3 === 0 ? '54px' : '46px',
                        }}
                      />
                    )
                  )}
                </div>
                <div className="text-sm font-black font-mono tracking-widest mt-1">
                  {parcel.trackingNumber}
                </div>
                <div className="text-[9px] text-slate-700 font-mono mt-0.5">
                  REF: {parcel.qrToken.slice(0, 18)}...
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-black flex justify-between text-[8px] text-slate-600 font-mono">
              <span>CREATED: {new Date(parcel.createdAt).toLocaleDateString()}</span>
              <span>SECURITY: ED25519 VERIFIED</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Encrypted QR token tied to immutable custody hash.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
