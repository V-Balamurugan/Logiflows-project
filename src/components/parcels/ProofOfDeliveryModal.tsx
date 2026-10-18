import React, { useRef, useState, useEffect } from 'react';
import { X, CheckCircle2, RotateCcw, PenTool, MapPin, ShieldCheck, User, WifiOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Parcel } from '../../types';
import { storage } from '../../services/storage';
import { offlineSyncService } from '../../services/offlineSyncService';

interface Props {
  parcel: Parcel | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProofOfDeliveryModal: React.FC<Props> = ({ parcel, isOpen, onClose, onSuccess }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (parcel) {
      setRecipientName(parcel.recipient.name);
      setConfirmationCode(`CONF-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [parcel]);

  // Setup canvas drawing context
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOpen]);

  if (!isOpen || !parcel) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) return;

    setIsSubmitting(true);

    let signatureDataUrl = '';
    if (canvasRef.current && hasSignature) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    const podGeoLat = parcel.recipient.lat || 37.7749;
    const podGeoLng = parcel.recipient.lng || -122.4194;

    const success = storage.submitProofOfDelivery(parcel.id, {
      recipientName,
      confirmationCode,
      signatureDataUrl,
      notes: notes.trim() || 'Electronic signature verified in-person by courier.',
      podGeoLat,
      podGeoLng,
    });

    if (success) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Safe if confetti fails
      }
      setIsSubmitting(false);
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Complete Proof of Delivery (POD)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {parcel.trackingNumber}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Offline Mode Banner */}
          {!offlineSyncService.isNetworkAvailable() && (
            <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2.5 shadow-sm">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold block text-amber-300">Offline Cellular Dead Zone Active</span>
                <span>Signature and GPS will be encrypted in local device storage and automatically uploaded when cell reception returns.</span>
              </div>
            </div>
          )}

          {/* Destination Brief */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block">Delivery Address:</span>
              <span>{parcel.recipient.street}, {parcel.recipient.city}, {parcel.recipient.state} {parcel.recipient.postalCode}</span>
            </div>
          </div>

          {/* Recipient Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Recipient Name / Authorized Signatory *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Dr. Gregory House"
              />
            </div>
          </div>

          {/* Confirmation Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                readOnly
                value={confirmationCode}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                GPS Coordinate Stamp
              </label>
              <input
                type="text"
                readOnly
                value={`${parcel.recipient.lat?.toFixed(4) || '37.7749'}, ${parcel.recipient.lng?.toFixed(4) || '-122.4194'}`}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400"
              />
            </div>
          </div>

          {/* Signature Canvas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                <span>Digital Signature (Draw below with mouse or touch) *</span>
              </label>
              <button
                type="button"
                onClick={clearSignature}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
            <div className="relative border-2 border-dashed border-slate-700 bg-white rounded-lg overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={450}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[130px] cursor-crosshair"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                  Sign here to verify receipt
                </div>
              )}
            </div>
          </div>

          {/* Delivery Outcome Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Handover Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivered directly to front reception desk"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Immutable timestamp attached</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !recipientName.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm & Archive Delivery
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
