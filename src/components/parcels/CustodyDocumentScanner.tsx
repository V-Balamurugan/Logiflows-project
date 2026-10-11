import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  FileText, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles,
  Zap,
  Image,
  AlertCircle
} from 'lucide-react';
import { CustodyDocumentType, CustodyDocument } from '../../types';
import { storage } from '../../services/storage';

interface Props {
  parcelId: string;
  trackingNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onDocumentAttached: (doc: CustodyDocument) => void;
}

export const CustodyDocumentScanner: React.FC<Props> = ({
  parcelId,
  trackingNumber,
  isOpen,
  onClose,
  onDocumentAttached,
}) => {
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');
  const [documentType, setDocumentType] = useState<CustodyDocumentType>('CUSTOMS_CLEARANCE_FORM');
  const [documentName, setDocumentName] = useState('Customs Clearance Declaration CN23');
  const [notes, setNotes] = useState('Cleared through customs border inspection with verified seal.');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFileSizeKb, setUploadedFileSizeKb] = useState<number>(45);

  useEffect(() => {
    if (documentType === 'CUSTOMS_CLEARANCE_FORM') {
      setDocumentName('Customs Clearance Declaration CN23');
    } else if (documentType === 'DIGITAL_DELIVERY_SIGNATURE') {
      setDocumentName('Consignee Handover Signature Document');
    } else if (documentType === 'CHAIN_OF_CUSTODY_TRANSFER') {
      setDocumentName('Inter-Hub Chain of Custody Transfer Manifest');
    } else if (documentType === 'BILL_OF_LADING') {
      setDocumentName('Commercial Freight Bill of Lading (BOL-402)');
    } else {
      setDocumentName('Cargo Physical Inspection & Seal Verification');
    }
  }, [documentType]);

  // Handle Camera activation
  useEffect(() => {
    if (!isOpen || activeTab !== 'CAMERA' || capturedImageDataUrl) return;

    let mediaStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setCameraError(null);
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          mediaStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setCameraActive(true);
          }
        } else {
          setCameraError('Camera API not accessible in this environment. Use upload or simulated capture.');
        }
      } catch (err: any) {
        console.warn('Camera access denied or unavailable:', err);
        setCameraError('Camera access unavailable. You can use standard file upload or simulate document scan.');
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, activeTab, capturedImageDataUrl]);

  if (!isOpen) return null;

  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImageDataUrl(dataUrl);
        setUploadedFileSizeKb(Math.round((dataUrl.length * 0.75) / 1024));
        setCameraActive(false);
      }
    }
  };

  const handleSimulateDocumentSnapshot = () => {
    // Generate stylized document preview canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Document background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 420);

      // Header Banner
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(20, 20, 560, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`LOGIFLOWS CONTINUOUS CUSTODY: ${documentType}`, 35, 52);

      // Document body text
      ctx.fillStyle = '#334155';
      ctx.font = '14px sans-serif';
      ctx.fillText(`PARCEL TRACKING: ${trackingNumber}`, 35, 105);
      ctx.fillText(`ATTACHED: ${new Date().toLocaleString()}`, 35, 130);
      ctx.fillText(`SECURITY SPEC: ISO/IEC 27001 CUSTODY RECORD`, 35, 155);

      // Lines simulating form entries
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      for (let y = 180; y <= 320; y += 25) {
        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(560, y);
        ctx.stroke();
      }

      // Stamp
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(380, 250, 170, 70);
      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('CUSTOMS / CUSTODY', 395, 275);
      ctx.fillText('VERIFIED SEAL', 415, 300);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImageDataUrl(dataUrl);
      setUploadedFileSizeKb(52);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileSizeKb(Math.round(file.size / 1024));
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImageDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImageDataUrl) return;

    setIsSubmitting(true);

    const doc = storage.attachCustodyDocument(parcelId, {
      parcelId,
      documentType,
      documentName: documentName.trim() || 'Continuous Custody Verification Document',
      fileDataUrl: capturedImageDataUrl,
      fileSizeKb: uploadedFileSizeKb,
      notes: notes.trim(),
    });

    setIsSubmitting(false);
    if (doc) {
      onDocumentAttached(doc);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Scan / Upload Custody Document</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Parcel: {trackingNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => {
              setActiveTab('CAMERA');
              setCapturedImageDataUrl(null);
            }}
            className={`flex-1 py-2.5 px-4 text-center font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'CAMERA'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Optical Camera Scan</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('UPLOAD');
              setCapturedImageDataUrl(null);
            }}
            className={`flex-1 py-2.5 px-4 text-center font-medium transition-colors flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'UPLOAD'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF / File</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleAttach} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Document Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Document Classification *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as CustodyDocumentType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="CUSTOMS_CLEARANCE_FORM">Customs Clearance Form (CN22/CN23)</option>
                <option value="DIGITAL_DELIVERY_SIGNATURE">Consignee Delivery Signature Slip</option>
                <option value="CHAIN_OF_CUSTODY_TRANSFER">Chain of Custody Transfer Manifest</option>
                <option value="BILL_OF_LADING">Commercial Bill of Lading (BOL)</option>
                <option value="INSPECTION_PHOTO">Physical Inspection / Security Seal</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Visual Capture / Upload Container */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Document Visual Evidence *
            </span>

            {capturedImageDataUrl ? (
              /* Preview of captured/uploaded file */
              <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-3 flex flex-col items-center">
                <img
                  src={capturedImageDataUrl}
                  alt="Captured Document"
                  className="max-h-52 w-auto object-contain rounded-lg border border-slate-800 shadow-md"
                />
                <div className="mt-2.5 flex items-center justify-between w-full text-xs text-slate-400">
                  <span className="font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Scanned ({uploadedFileSizeKb} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCapturedImageDataUrl(null)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retake / Rescan</span>
                  </button>
                </div>
              </div>
            ) : activeTab === 'CAMERA' ? (
              /* Live Camera / Viewfinder */
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-indigo-500/40 bg-slate-950 flex flex-col items-center justify-center min-h-[220px]">
                  {cameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-56 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                      <Camera className="w-10 h-10 text-indigo-400 mx-auto opacity-70 animate-pulse" />
                      <p className="text-slate-300 font-medium">Position document inside optical frame</p>
                      {cameraError && (
                        <p className="text-[11px] text-amber-400 max-w-xs mx-auto">
                          {cameraError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Corner Target Guides */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-indigo-400 pointer-events-none" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-indigo-400 pointer-events-none" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-indigo-400 pointer-events-none" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-indigo-400 pointer-events-none" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {cameraActive && (
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Capture Camera Snapshot</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSimulateDocumentSnapshot}
                    className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulate Official Document Scan</span>
                  </button>
                </div>
              </div>
            ) : (
              /* File Upload Zone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-10 h-10 text-slate-500 mb-2" />
                <p className="text-xs font-semibold text-slate-200">
                  Click or drag document to attach
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports PDF declarations, customs stamps, JPG & PNG signatures
                </p>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Customs / Custody Handling Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared through customs border station #04"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-800">
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA-256 Verifiable</span>
            </span>

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
                disabled={isSubmitting || !capturedImageDataUrl}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify & Attach to Custody Chain</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
