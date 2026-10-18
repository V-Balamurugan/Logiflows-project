import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  AlertTriangle,
  Package,
  Clock,
  ShieldCheck,
  User,
  ThumbsUp,
  ThumbsDown,
  X,
  Sparkles,
  Check
} from 'lucide-react';
import { Parcel, DeliveryIssueType, CustomerParcelFeedback } from '../../types';
import { customerFeedbackService, ISSUE_LABELS } from '../../services/customerFeedbackService';
import { storage } from '../../services/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  parcel: Parcel;
  onFeedbackSubmitted?: (feedback: CustomerParcelFeedback) => void;
}

export const CustomerFeedbackModal: React.FC<Props> = ({
  isOpen,
  onClose,
  parcel,
  onFeedbackSubmitted,
}) => {
  const currentUser = storage.getCurrentUser();
  const existingFeedback = customerFeedbackService.getFeedbackByParcelId(parcel.id);

  const [rating, setRating] = useState<number>(existingFeedback?.overallRating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [deliverySpeed, setDeliverySpeed] = useState<number>(existingFeedback?.aspectRatings?.deliverySpeed || 5);
  const [packageCondition, setPackageCondition] = useState<number>(existingFeedback?.aspectRatings?.packageCondition || 5);
  const [courierCourtesy, setCourierCourtesy] = useState<number>(existingFeedback?.aspectRatings?.courierCourtesy || 5);
  const [trackingTransparency, setTrackingTransparency] = useState<number>(existingFeedback?.aspectRatings?.trackingTransparency || 5);
  const [selectedIssues, setSelectedIssues] = useState<DeliveryIssueType[]>(existingFeedback?.reportedIssues || []);
  const [comments, setComments] = useState<string>(existingFeedback?.comments || '');
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(existingFeedback ? existingFeedback.wouldRecommend : true);
  const [submittedToast, setSubmittedToast] = useState(false);

  useEffect(() => {
    if (parcel) {
      const fb = customerFeedbackService.getFeedbackByParcelId(parcel.id);
      if (fb) {
        setRating(fb.overallRating);
        setDeliverySpeed(fb.aspectRatings.deliverySpeed);
        setPackageCondition(fb.aspectRatings.packageCondition);
        setCourierCourtesy(fb.aspectRatings.courierCourtesy);
        setTrackingTransparency(fb.aspectRatings.trackingTransparency);
        setSelectedIssues(fb.reportedIssues);
        setComments(fb.comments);
        setWouldRecommend(fb.wouldRecommend);
      } else {
        setRating(5);
        setDeliverySpeed(5);
        setPackageCondition(5);
        setCourierCourtesy(5);
        setTrackingTransparency(5);
        setSelectedIssues([]);
        setComments('');
        setWouldRecommend(true);
      }
    }
  }, [parcel]);

  if (!isOpen) return null;

  const toggleIssue = (issue: DeliveryIssueType) => {
    if (selectedIssues.includes(issue)) {
      setSelectedIssues(selectedIssues.filter((i) => i !== issue));
    } else {
      setSelectedIssues([...selectedIssues, issue]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const record = customerFeedbackService.submitParcelFeedback({
      parcelId: parcel.id,
      trackingNumber: parcel.trackingNumber,
      tenantId: parcel.tenantId,
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerCompany: parcel.sender.company || currentUser.email,
      overallRating: rating,
      aspectRatings: {
        deliverySpeed,
        packageCondition,
        courierCourtesy,
        trackingTransparency,
      },
      reportedIssues: selectedIssues,
      comments: comments.trim(),
      wouldRecommend,
      courierId: parcel.assignedCourierId,
      courierName: parcel.assignedCourierId ? `Courier ${parcel.assignedCourierId}` : undefined,
    });

    setSubmittedToast(true);
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted(record);
    }
    setTimeout(() => {
      setSubmittedToast(false);
      onClose();
    }, 1200);
  };

  const ratingLabels: Record<number, string> = {
    1: 'Disappointing (Major Issues)',
    2: 'Below Expectations',
    3: 'Average Service',
    4: 'Good & Dependable',
    5: 'Exceptional (5-Star Delivery)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                CLIENT EXPERIENCE SURVEY
              </span>
              <span className="text-xs font-mono text-slate-400">
                {parcel.trackingNumber}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              Rate Your Delivery Experience
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Your feedback directly impacts carrier SLA performance analytics and driver ratings.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Main Star Rating */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              How would you rate the overall delivery service?
            </span>

            {/* Stars Selector */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        active
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono font-bold text-amber-400">
              {ratingLabels[hoverRating || rating]}
            </div>
          </div>

          {/* Section 2: Aspect Breakdowns */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-200 uppercase font-mono block">
              Detailed Experience Scorecard
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Aspect 1: Speed */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400">Delivery Speed & ETA:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDeliverySpeed(s)}
                      className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all ${
                        deliverySpeed >= s
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect 2: Package Condition */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400">Package Condition:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPackageCondition(s)}
                      className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all ${
                        packageCondition >= s
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect 3: Courier Courtesy */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400">Courier Courtesy:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCourierCourtesy(s)}
                      className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all ${
                        courierCourtesy >= s
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect 4: Tracking Transparency */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400">Live Map Tracking:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTrackingTransparency(s)}
                      className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all ${
                        trackingTransparency >= s
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Issue Reporting Chips */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Did you experience any specific delivery issues? (Optional)
            </span>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(ISSUE_LABELS) as DeliveryIssueType[]).map((issueKey) => {
                const isSelected = selectedIssues.includes(issueKey);
                return (
                  <button
                    key={issueKey}
                    type="button"
                    onClick={() => toggleIssue(issueKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-rose-950 text-rose-300 border-rose-700 font-semibold shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-rose-400" />}
                    <span>{ISSUE_LABELS[issueKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Written Feedback Comments */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Comments or Delivery Notes:
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Tell us what went well or how our courier team can improve..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Section 5: NPS Recommendation Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              Would you recommend LogiFlows to business partners?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  wouldRecommend
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Yes</span>
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  !wouldRecommend
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>No</span>
              </button>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg shadow-md transition-all ${
                submittedToast
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {submittedToast ? <Check className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4" />}
              <span>{submittedToast ? 'Feedback Recorded!' : 'Submit Rating & Feedback'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
