import React, { useState, useMemo } from 'react';
import { 
  X, 
  Package, 
  MapPin, 
  Truck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PackageType, ServiceTier, Parcel } from '../../types';
import { storage } from '../../services/storage';
import { checkHubServiceability } from '../../services/serviceabilityService';
import { predictParcelDelay } from '../../services/aiPredictionService';
import { ShippingCostEstimator } from './ShippingCostEstimator';
import { shippingRateService, ShippingCostQuote } from '../../services/shippingRateService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newParcel: Parcel) => void;
}

export const ParcelBookingModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const currentUser = storage.getCurrentUser();
  const currentTenantId = storage.getActiveTenantId();
  const hubs = storage.getHubs(currentTenantId);

  // Sender Form State
  const [senderName, setSenderName] = useState(currentUser.name || 'Elena Rostova');
  const [senderCompany, setSenderCompany] = useState('Acme Advanced Labs');
  const [senderPhone, setSenderPhone] = useState('+1 (555) 762-1145');
  const [senderEmail, setSenderEmail] = useState(currentUser.email || 'elena.rostova@acmecorp.com');
  const [senderStreet, setSenderStreet] = useState('1400 Maritime St, Suite 400');
  const [senderCity, setSenderCity] = useState('Oakland');
  const [senderState, setSenderState] = useState('CA');
  const [senderPostal, setSenderPostal] = useState('94607');

  // Recipient Form State
  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientStreet, setRecipientStreet] = useState('');
  const [recipientCity, setRecipientCity] = useState('San Francisco');
  const [recipientState, setRecipientState] = useState('CA');
  const [recipientPostal, setRecipientPostal] = useState('94143');

  // Specs
  const [packageType, setPackageType] = useState<PackageType>('STANDARD_BOX');
  const [serviceTier, setServiceTier] = useState<ServiceTier>('SAME_DAY_PRIORITY');
  const [weightKg, setWeightKg] = useState<number>(3.5);
  const [lengthCm, setLengthCm] = useState<number>(30);
  const [widthCm, setWidthCm] = useState<number>(20);
  const [heightCm, setHeightCm] = useState<number>(15);
  const [declaredValueUsd, setDeclaredValueUsd] = useState<number>(1200);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Distance and Shipping Cost Estimator State
  const [customDistanceKm, setCustomDistanceKm] = useState<number | null>(null);
  const [activeQuote, setActiveQuote] = useState<ShippingCostQuote | null>(null);

  // Computed Corridor Distance
  const effectiveDistanceKm = useMemo(() => {
    if (customDistanceKm !== null) return customDistanceKm;
    return shippingRateService.estimateDistance(senderPostal, recipientPostal, senderCity, recipientCity);
  }, [customDistanceKm, senderPostal, recipientPostal, senderCity, recipientCity]);

  // Compute live serviceability & rate
  const serviceability = useMemo(() => {
    return checkHubServiceability(recipientPostal, recipientCity, hubs, packageType, serviceTier, weightKg);
  }, [recipientPostal, recipientCity, hubs, packageType, serviceTier, weightKg]);

  // Compute live AI delay risk prediction
  const predictedDelay = useMemo(() => {
    return predictParcelDelay({
      distanceKm: effectiveDistanceKm,
      originHubCurrentLoadPct: 75,
      destHubCurrentLoadPct: 68,
      packageType,
      serviceTier,
    });
  }, [effectiveDistanceKm, packageType, serviceTier]);

  if (!isOpen) return null;

  const handleQuickFillRecipient = () => {
    setRecipientName('Dr. Gregory House');
    setRecipientCompany('Bayview Medical Research Block C');
    setRecipientPhone('+1 (415) 555-8834');
    setRecipientEmail('ghouse@bayviewmed.org');
    setRecipientStreet('505 Parnassus Ave, Clinical Core');
    setRecipientCity('San Francisco');
    setRecipientState('CA');
    setRecipientPostal('94143');
    setPackageType('FRAGILE_ELECTRONICS');
    setWeightKg(4.2);
    setDeclaredValueUsd(4500);
    setSpecialInstructions('Priority clinical calibration modules. Do not invert.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientStreet.trim()) return;

    setIsSubmitting(true);

    const originHub = hubs[0] || { id: 'hub-apx-oak' };
    const destHub = hubs[1] || hubs[0] || { id: 'hub-apx-sfo' };

    const newParcel = storage.bookParcel({
      tenantId: currentTenantId,
      originHubId: originHub.id,
      destHubId: destHub.id,
      sender: {
        name: senderName,
        company: senderCompany,
        phone: senderPhone,
        email: senderEmail,
        street: senderStreet,
        city: senderCity,
        state: senderState,
        postalCode: senderPostal,
        country: 'USA',
        lat: 37.8044,
        lng: -122.2712,
      },
      recipient: {
        name: recipientName,
        company: recipientCompany,
        phone: recipientPhone,
        email: recipientEmail,
        street: recipientStreet,
        city: recipientCity,
        state: recipientState,
        postalCode: recipientPostal,
        country: 'USA',
        lat: 37.7634,
        lng: -122.4580,
      },
      packageType,
      serviceTier,
      weightKg,
      dimensions: {
        lengthCm,
        widthCm,
        heightCm,
      },
      declaredValueUsd,
      specialInstructions,
      estimatedDeliveryDate: new Date(
        Date.now() + (activeQuote?.estimatedTransitHours || serviceability.estimatedTransitHours) * 3600 * 1000
      ).toISOString(),
      delayRisk: predictedDelay,
      shippingFeeUsd: activeQuote ? activeQuote.totalUsd : serviceability.baseShippingCostUsd,
    });

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Safe fallback
    }

    setIsSubmitting(false);
    onSuccess(newParcel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Book B2B Commercial Parcel
              </h3>
              <p className="text-xs text-slate-400">
                Automated Serviceability & Dynamic Route Generation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleQuickFillRecipient}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
            >
              Demo Fill Form
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wizard Step Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => setStep(1)}
            className={`flex-1 py-2.5 px-4 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
              step === 1 ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>1. Origin & Recipient Route</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              ~{effectiveDistanceKm} km
            </span>
          </button>
          <button
            onClick={() => setStep(2)}
            className={`flex-1 py-2.5 px-4 text-center font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
              step === 2 ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>2. Specifications & Cost Estimator</span>
            {activeQuote && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20">
                ${activeQuote.totalUsd.toFixed(2)}
              </span>
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Origin Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Origin (Sender Address)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Sender Name / Rep</label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Company (Optional)</label>
                    <input
                      type="text"
                      value={senderCompany}
                      onChange={(e) => setSenderCompany(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Street Address</label>
                    <input
                      type="text"
                      required
                      value={senderStreet}
                      onChange={(e) => setSenderStreet(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">City & State</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={senderCity}
                        onChange={(e) => setSenderCity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        value={senderState}
                        onChange={(e) => setSenderState(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={senderPostal}
                      onChange={(e) => setSenderPostal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Section */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Destination (Recipient Address)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Gregory House"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Recipient Organization</label>
                    <input
                      type="text"
                      placeholder="e.g. Bayview Medical"
                      value={recipientCompany}
                      onChange={(e) => setRecipientCompany(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Street Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 505 Parnassus Ave, Clinical Block C"
                      value={recipientStreet}
                      onChange={(e) => setRecipientStreet(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">City & State</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={recipientCity}
                        onChange={(e) => setRecipientCity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        value={recipientState}
                        onChange={(e) => setRecipientState(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={recipientPostal}
                      onChange={(e) => setRecipientPostal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Recipient Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (415) 555-8834"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      placeholder="ghouse@bayviewmed.org"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Package Specs */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Package Specifications & Handling
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Package Type</label>
                    <select
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value as PackageType)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    >
                      <option value="STANDARD_BOX">Standard Box (Carton)</option>
                      <option value="DOCUMENT">Document / Legal Envelope</option>
                      <option value="FRAGILE_ELECTRONICS">Fragile Electronics / Instruments</option>
                      <option value="EXPRESS_PERISHABLE">Cold-Chain / Perishable Specimen</option>
                      <option value="HEAVY_FREIGHT">Pallet / Heavy Freight</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Service Tier SLA</label>
                    <select
                      value={serviceTier}
                      onChange={(e) => setServiceTier(e.target.value as ServiceTier)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    >
                      <option value="SAME_DAY_PRIORITY">Same Day Priority (Within 4h)</option>
                      <option value="NEXT_DAY_EXPRESS">Next Day Express (Within 24h)</option>
                      <option value="STANDARD_GROUND">Standard Ground Logistics</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Gross Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Declared Value (USD)</label>
                    <input
                      type="number"
                      min="0"
                      value={declaredValueUsd}
                      onChange={(e) => setDeclaredValueUsd(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Dimensions (LxWxH cm)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="L"
                        value={lengthCm}
                        onChange={(e) => setLengthCm(parseInt(e.target.value) || 10)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                      />
                      <input
                        type="number"
                        placeholder="W"
                        value={widthCm}
                        onChange={(e) => setWidthCm(parseInt(e.target.value) || 10)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                      />
                      <input
                        type="number"
                        placeholder="H"
                        value={heightCm}
                        onChange={(e) => setHeightCm(parseInt(e.target.value) || 10)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Handling Remarks / Gate Code</label>
                    <input
                      type="text"
                      placeholder="e.g. Deliver to Security Reception. Call contact upon arrival."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Real-Time Shipping Cost Estimator (Mock Rate Service Engine) */}
              <ShippingCostEstimator
                dimensions={{ lengthCm, widthCm, heightCm }}
                onDimensionsChange={(newDims) => {
                  setLengthCm(newDims.lengthCm);
                  setWidthCm(newDims.widthCm);
                  setHeightCm(newDims.heightCm);
                }}
                weightKg={weightKg}
                onWeightChange={setWeightKg}
                distanceKm={effectiveDistanceKm}
                onDistanceChange={(dist) => setCustomDistanceKm(dist)}
                packageType={packageType}
                serviceTier={serviceTier}
                onServiceTierChange={setServiceTier}
                declaredValueUsd={declaredValueUsd}
                originCity={`${senderCity}, ${senderState}`}
                destinationCity={`${recipientCity}, ${recipientState}`}
                onQuoteCalculated={setActiveQuote}
              />

              {/* Predictive Logistics AI Risk Assessment Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Predictive Route Reliability & Transit Health</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> PostGIS Corridor Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Corridor Span</span>
                    <span className="font-mono text-slate-100 font-bold">{effectiveDistanceKm} km</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Transit SLA Window</span>
                    <span className="font-mono text-slate-100 font-bold">
                      ~{activeQuote?.estimatedTransitHours || serviceability.estimatedTransitHours} hrs
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">AI Delay Forecast</span>
                    <span className={`font-mono font-bold ${
                      predictedDelay.level === 'HIGH' ? 'text-rose-400' : predictedDelay.level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {predictedDelay.level} Risk ({predictedDelay.confidenceScore}% conf)
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-tight">
                  <span className="text-slate-300 font-medium">Mitigation Protocol:</span> {predictedDelay.primaryRiskFactor}. {predictedDelay.recommendedMitigation}
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          {step === 1 ? (
            <>
              <span className="text-xs text-slate-400">Step 1 of 2: Destination</span>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!recipientName.trim() || !recipientStreet.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
              >
                <span>Continue to Specifications</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
              >
                Back to Route
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 shadow-md shadow-emerald-950/40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Confirm Booking (${(activeQuote?.totalUsd ?? serviceability.baseShippingCostUsd).toFixed(2)}) & Generate QR Identity
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
