import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  MapPin, 
  Truck, 
  Package, 
  Sparkles, 
  FileText, 
  Camera, 
  Upload, 
  Eye, 
  CheckCircle2, 
  FileCheck,
  Download
} from 'lucide-react';
import { Parcel, CustodyDocument } from '../../types';
import { CustodyTimeline } from './CustodyTimeline';
import { CustodyDocumentScanner } from './CustodyDocumentScanner';

interface Props {
  parcel: Parcel | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintLabel: (parcel: Parcel) => void;
}

export const ParcelDetailModal: React.FC<Props> = ({
  parcel,
  isOpen,
  onClose,
  onPrintLabel,
}) => {
  const [isDocScannerOpen, setIsDocScannerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CustodyDocument | null>(null);

  if (!isOpen || !parcel) return null;

  const docs = parcel.custodyDocuments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-bold font-mono text-slate-100">
                {parcel.trackingNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {parcel.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Service: {parcel.serviceTier.replace(/_/g, ' ')} · {parcel.packageType.replace(/_/g, ' ')} ({parcel.weightKg}kg)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintLabel(parcel)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print 4x6 Label</span>
              <span className="sm:hidden">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Origin & Destination Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Sender / Origin
              </span>
              <div className="font-semibold text-slate-200">
                {parcel.sender.name} ({parcel.sender.company || 'Enterprise'})
              </div>
              <div className="text-slate-400">
                {parcel.sender.street}, {parcel.sender.city}, {parcel.sender.state} {parcel.sender.postalCode}
              </div>
              <div className="text-slate-500 text-[11px]">Contact: {parcel.sender.phone}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Recipient / Destination
              </span>
              <div className="font-semibold text-slate-200">
                {parcel.recipient.name} {parcel.recipient.company ? `(${parcel.recipient.company})` : ''}
              </div>
              <div className="text-slate-400">
                {parcel.recipient.street}, {parcel.recipient.city}, {parcel.recipient.state} {parcel.recipient.postalCode}
              </div>
              <div className="text-slate-500 text-[11px]">Contact: {parcel.recipient.phone}</div>
            </div>
          </div>

          {/* AI Delay Intelligence Assessment */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Predictive Delay Intelligence</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  parcel.delayRisk.level === 'HIGH'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : parcel.delayRisk.level === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {parcel.delayRisk.level} RISK (+{parcel.delayRisk.predictedDelayMinutes} min)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Factor: {parcel.delayRisk.primaryRiskFactor}
            </p>
            <p className="text-[11px] text-indigo-400">
              Recommended Mitigation: {parcel.delayRisk.recommendedMitigation}
            </p>
          </div>

          {/* Continuous Custody Documents & Customs Clearances Section */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-100">
                    Continuous Custody & Customs Documents
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cryptographically stamped customs clearance forms, consignee signatures, and custody manifests.
                </p>
              </div>

              <button
                onClick={() => setIsDocScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan / Upload Document</span>
              </button>
            </div>

            {/* Document Cards Grid */}
            {docs.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-1">
                <FileText className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-slate-400 font-medium">No custody documents attached yet</p>
                <p className="text-[11px] text-slate-500">
                  Scan customs declaration CN23, bill of lading, or consignee signature with your camera.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block truncate">
                          {doc.documentType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          VERIFIED
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-200 line-clamp-1">
                        {doc.documentName}
                      </h5>

                      <div className="text-[11px] text-slate-400">
                        By {doc.uploadedByName} · {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-slate-500">
                        #{doc.verificationHash.slice(0, 8)}
                      </span>
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Document</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custody Timeline */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <CustodyTimeline
              events={parcel.custodyEvents}
              trackingNumber={parcel.trackingNumber}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 text-xs">
          <span className="font-mono text-slate-500 truncate max-w-xs">
            QR TOKEN: {parcel.qrToken.slice(0, 24)}...
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Custody Document Scanner Modal */}
      <CustodyDocumentScanner
        parcelId={parcel.id}
        trackingNumber={parcel.trackingNumber}
        isOpen={isDocScannerOpen}
        onClose={() => setIsDocScannerOpen(false)}
        onDocumentAttached={() => {
          // Automatic state sync via storage listener
        }}
      />

      {/* Document Lightbox / Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-100">
                  {previewDoc.documentName}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Classification: {previewDoc.documentType.replace(/_/g, ' ')}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-2 flex justify-center">
              <img
                src={previewDoc.fileDataUrl}
                alt={previewDoc.documentName}
                className="max-h-[360px] w-auto object-contain rounded"
              />
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Uploaded By:</span>
                <span className="font-semibold text-slate-200">{previewDoc.uploadedByName} ({previewDoc.uploadedByRole})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="font-mono text-slate-200">{new Date(previewDoc.uploadedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verification Hash:</span>
                <span className="font-mono text-indigo-400">SHA-256 #{previewDoc.verificationHash}</span>
              </div>
              {previewDoc.notes && (
                <div className="pt-2 text-[11px] text-slate-400 italic">
                  Notes: "{previewDoc.notes}"
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
