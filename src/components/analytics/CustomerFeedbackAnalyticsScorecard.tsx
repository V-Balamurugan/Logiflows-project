import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import {
  Star,
  ThumbsUp,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ShieldAlert,
  User,
  Clock,
  Sparkles,
  Search,
  Filter,
  Check,
  Building2,
  ChevronRight
} from 'lucide-react';
import { customerFeedbackService, ISSUE_LABELS } from '../../services/customerFeedbackService';
import { CustomerParcelFeedback, DeliveryIssueType } from '../../types';
import { storage } from '../../services/storage';

interface Props {
  tenantName?: string;
}

export const CustomerFeedbackAnalyticsScorecard: React.FC<Props> = ({ tenantName }) => {
  const currentTenantId = storage.getActiveTenantId();
  const [filterRating, setFilterRating] = useState<string>('ALL');
  const [filterIssue, setFilterIssue] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch live aggregate metrics
  const analytics = useMemo(() => {
    return customerFeedbackService.getAnalyticsSummary(currentTenantId);
  }, [currentTenantId]);

  const allReviews = useMemo(() => {
    return customerFeedbackService.getAllFeedback(currentTenantId);
  }, [currentTenantId]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return allReviews.filter((r) => {
      if (filterRating !== 'ALL' && r.overallRating !== Number(filterRating)) return false;
      if (filterIssue !== 'ALL' && !r.reportedIssues.includes(filterIssue as DeliveryIssueType)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTracking = r.trackingNumber.toLowerCase().includes(q);
        const matchCustomer = r.customerName.toLowerCase().includes(q) || (r.customerCompany && r.customerCompany.toLowerCase().includes(q));
        const matchComments = r.comments.toLowerCase().includes(q);
        const matchCourier = r.courierName?.toLowerCase().includes(q);
        if (!matchTracking && !matchCustomer && !matchComments && !matchCourier) return false;
      }
      return true;
    });
  }, [allReviews, filterRating, filterIssue, searchQuery]);

  // Rating distribution bar chart data
  const distributionChartData = useMemo(() => {
    return [
      { name: '5 Stars', count: analytics.ratingDistribution[5] || 0, fill: '#10b981' },
      { name: '4 Stars', count: analytics.ratingDistribution[4] || 0, fill: '#3b82f6' },
      { name: '3 Stars', count: analytics.ratingDistribution[3] || 0, fill: '#f59e0b' },
      { name: '2 Stars', count: analytics.ratingDistribution[2] || 0, fill: '#f97316' },
      { name: '1 Star', count: analytics.ratingDistribution[1] || 0, fill: '#ef4444' },
    ];
  }, [analytics.ratingDistribution]);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl relative overflow-hidden animate-fade-in">
      {/* Decorative ambient background blur */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              VOICE OF THE CUSTOMER · CSAT & NET PROMOTER SCORE (NPS)
            </span>
            <span className="text-xs font-mono text-slate-400">
              • {analytics.totalReviewsCount} Verified Consignment Ratings
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              CSAT: {analytics.averageCsatScore} / 5.0 ★
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-100 mt-1.5 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            Customer Feedback & Delivery Quality Intelligence
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            Correlates parcel delivery satisfaction, courier courtesy, and reported logistics deviations from the Customer Portal directly into carrier performance management.
          </p>
        </div>

        {/* NPS Badge */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-mono font-bold text-lg">
            +{analytics.netPromoterScore}
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Net Promoter Score</span>
            <span className="text-xs font-bold text-slate-200">
              {analytics.netPromoterScore >= 60 ? 'World-Class Loyalty' : analytics.netPromoterScore >= 30 ? 'Strong Performance' : 'Action Required'}
            </span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average CSAT */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Average CSAT Rating</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
              {analytics.averageCsatScore}
            </div>
            <span className="text-[11px] font-mono text-slate-400">/ 5.0 Scale</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {analytics.totalReviewsCount} submitted reviews
          </div>
        </div>

        {/* Metric 2: Speed & ETA Satisfaction */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Speed & Transit Reliability</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {analytics.aspectAverages.speed} ★
            </div>
            <span className="text-[11px] font-mono text-emerald-400">On-Time Index</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Customer perceived delivery speed
          </div>
        </div>

        {/* Metric 3: Package Handling & Condition */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Package Condition Quality</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
              {analytics.aspectAverages.condition} ★
            </div>
            <span className="text-[11px] font-mono text-emerald-400">Carton Integrity</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Zero shock/impact damage score
          </div>
        </div>

        {/* Metric 4: Courier Courtesy & POD */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Courier Professionalism</span>
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-indigo-300 tabular-nums">
              {analytics.aspectAverages.courtesy} ★
            </div>
            <span className="text-[11px] font-mono text-indigo-400">Doorstep Interaction</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tracking Accuracy: {analytics.aspectAverages.tracking} ★
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Rating Distribution & Issue Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Star Rating Distribution (BarChart) */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Customer Star Rating Distribution
              </h4>
              <p className="text-xs text-slate-400">
                Frequency histogram of customer satisfaction ratings across 1-5 stars
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              5 Tiers
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${val} reviews`, 'Count']}
                />
                <Bar dataKey="count" name="Reviews" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {distributionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Reported Delivery Issues Pareto Analysis */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Reported Delivery Issues Pareto Breakdown
              </h4>
              <p className="text-xs text-slate-400">
                Identifies recurring points of friction reported by customers for targeted root-cause remediation
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Operations Feedback
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {analytics.issueFrequency.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No active delivery defects or packaging damage issues logged!
              </div>
            ) : (
              analytics.issueFrequency.map((item) => (
                <div key={item.issue} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <span className="font-mono text-slate-400">
                      {item.count} reports ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.issue === 'DAMAGED_PACKAGE'
                          ? 'bg-rose-500'
                          : item.issue === 'LATE_DELIVERY'
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, item.pct * 2.5)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filterable Review Ledger & Operational Feed */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Customer Review & Incident Investigation Ledger
          </h4>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracking, client..."
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Rating Filter */}
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            {/* Issue Filter */}
            <select
              value={filterIssue}
              onChange={(e) => setFilterIssue(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Issue Types</option>
              {(Object.keys(ISSUE_LABELS) as DeliveryIssueType[]).map((k) => (
                <option key={k} value={k}>
                  {ISSUE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">Consignment & Date</th>
                <th className="py-3 px-3">Customer / Consignee</th>
                <th className="py-3 px-3">Courier</th>
                <th className="py-3 px-3">Reported Issues</th>
                <th className="py-3 px-3">Customer Feedback Comments</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No customer feedback records matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-900/50 transition-colors">
                    {/* 1. Rating */}
                    <td className="py-3 px-3 align-top whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {rev.overallRating}
                        </span>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.overallRating ? 'fill-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {rev.wouldRecommend ? '✓ NPS Promoter' : '✗ Detractor'}
                      </div>
                    </td>

                    {/* 2. Consignment */}
                    <td className="py-3 px-3 align-top font-mono">
                      <span className="text-indigo-300 font-semibold block">{rev.trackingNumber}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(rev.submittedAt).toLocaleDateString()}
                      </span>
                    </td>

                    {/* 3. Customer */}
                    <td className="py-3 px-3 align-top">
                      <div className="text-slate-200 font-semibold">{rev.customerName}</div>
                      <div className="text-slate-500 text-[10px]">{rev.customerCompany || 'Direct Client'}</div>
                    </td>

                    {/* 4. Courier */}
                    <td className="py-3 px-3 align-top font-mono text-slate-400">
                      {rev.courierName || 'Assigned Courier'}
                    </td>

                    {/* 5. Reported Issues */}
                    <td className="py-3 px-3 align-top">
                      {rev.reportedIssues.length === 0 ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Zero Defects
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {rev.reportedIssues.map((issue) => (
                            <span
                              key={issue}
                              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800"
                            >
                              {ISSUE_LABELS[issue]}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* 6. Comments */}
                    <td className="py-3 px-3 align-top max-w-xs">
                      <p className="text-slate-300 text-[11px] italic leading-relaxed">
                        "{rev.comments || 'No comments provided.'}"
                      </p>
                    </td>

                    {/* 7. Status */}
                    <td className="py-3 px-3 align-top text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        rev.status === 'REMEDIED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : rev.status === 'REVIEWED'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {rev.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
