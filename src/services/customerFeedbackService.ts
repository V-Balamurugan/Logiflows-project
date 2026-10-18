/**
 * Customer Feedback & Delivery Experience Rating Service
 * 
 * Manages per-parcel customer ratings, issue reporting, CSAT, Net Promoter Score (NPS),
 * and feeds real-time customer satisfaction metrics directly into performance analytics.
 */

import {
  CustomerParcelFeedback,
  CustomerFeedbackAnalyticsSummary,
  DeliveryIssueType
} from '../types';
import { storage } from './storage';

const FEEDBACK_STORAGE_KEY = 'logiflows_customer_feedback_ledger';

export const ISSUE_LABELS: Record<DeliveryIssueType, string> = {
  DAMAGED_PACKAGE: 'Package Box/Contents Damaged',
  LATE_DELIVERY: 'Delayed / Missed ETA Window',
  INSECURE_LOCATION: 'Left in Insecure or Rain-Exposed Area',
  MISSING_SIGNATURE: 'Signature / Photo POD Skipped',
  INCORRECT_ADDRESS: 'Delivered to Neighbor / Wrong Unit',
  POOR_COMMUNICATION: 'Tracking Telemetry Unclear',
  RUDE_COURIER: 'Unprofessional Courier Conduct',
  WEATHER_MISHANDLING: 'Inadequate Storm Weather Wrap',
};

// Seed historical customer reviews for rich analytics out of the box
const SEED_FEEDBACK: CustomerParcelFeedback[] = [
  {
    id: 'FB-2026-001',
    parcelId: 'pcl-001',
    trackingNumber: 'LF-2026-89410-APX',
    tenantId: 'tenant-apex',
    customerId: 'usr-customer-1',
    customerName: 'Marcus Vance',
    customerCompany: 'Apex Biomedical Tech',
    overallRating: 5,
    aspectRatings: {
      deliverySpeed: 5,
      packageCondition: 5,
      courierCourtesy: 5,
      trackingTransparency: 5,
    },
    reportedIssues: [],
    comments: 'Flawless express delivery! Thermal insulated box was in pristine condition and arrived 20 minutes before deadline.',
    wouldRecommend: true,
    submittedAt: '2026-10-17T14:22:00Z',
    courierName: 'Michael Torres',
    status: 'REVIEWED',
  },
  {
    id: 'FB-2026-002',
    parcelId: 'pcl-002',
    trackingNumber: 'LF-2026-89411-APX',
    tenantId: 'tenant-apex',
    customerId: 'usr-customer-2',
    customerName: 'Sarah Jenkins',
    customerCompany: 'Bay Area Semiconductor',
    overallRating: 4,
    aspectRatings: {
      deliverySpeed: 4,
      packageCondition: 5,
      courierCourtesy: 5,
      trackingTransparency: 4,
    },
    reportedIssues: [],
    comments: 'Fast delivery, very polite courier. Live map ETA bounced slightly during rush hour but driver arrived safely.',
    wouldRecommend: true,
    submittedAt: '2026-10-17T16:45:00Z',
    courierName: 'Sarah Lin',
    status: 'REVIEWED',
  },
  {
    id: 'FB-2026-003',
    parcelId: 'pcl-003',
    trackingNumber: 'LF-2026-89412-APX',
    tenantId: 'tenant-apex',
    customerId: 'usr-customer-1',
    customerName: 'Marcus Vance',
    customerCompany: 'Apex Biomedical Tech',
    overallRating: 2,
    aspectRatings: {
      deliverySpeed: 2,
      packageCondition: 3,
      courierCourtesy: 4,
      trackingTransparency: 2,
    },
    reportedIssues: ['LATE_DELIVERY', 'INSECURE_LOCATION'],
    comments: 'Package was delayed over 2 hours due to arterial congestion and was dropped by front gate in light rain without direct bell chime.',
    wouldRecommend: false,
    submittedAt: '2026-10-18T09:15:00Z',
    courierName: 'David Chen',
    status: 'SUBMITTED',
  },
  {
    id: 'FB-2026-004',
    parcelId: 'pcl-004',
    trackingNumber: 'LF-2026-89413-APX',
    tenantId: 'tenant-apex',
    customerId: 'usr-customer-3',
    customerName: 'Elena Rostova',
    customerCompany: 'Silicon Valley Robotics',
    overallRating: 5,
    aspectRatings: {
      deliverySpeed: 5,
      packageCondition: 5,
      courierCourtesy: 5,
      trackingTransparency: 5,
    },
    reportedIssues: [],
    comments: 'Electric delivery van arrived silently and on time. Digital signature and photo POD immediately logged in my dashboard.',
    wouldRecommend: true,
    submittedAt: '2026-10-18T11:30:00Z',
    courierName: 'Michael Torres',
    status: 'REVIEWED',
  },
  {
    id: 'FB-2026-005',
    parcelId: 'pcl-005',
    trackingNumber: 'LF-2026-89414-APX',
    tenantId: 'tenant-apex',
    customerId: 'usr-customer-2',
    customerName: 'Sarah Jenkins',
    customerCompany: 'Bay Area Semiconductor',
    overallRating: 3,
    aspectRatings: {
      deliverySpeed: 3,
      packageCondition: 3,
      courierCourtesy: 4,
      trackingTransparency: 3,
    },
    reportedIssues: ['DAMAGED_PACKAGE'],
    comments: 'Outer cardboard carton had corner impact crush. Fortunately inner ESD anti-static packaging prevented component damage.',
    wouldRecommend: true,
    submittedAt: '2026-10-18T12:05:00Z',
    courierName: 'Sarah Lin',
    status: 'SUBMITTED',
  },
];

class CustomerFeedbackService {
  private getStoredFeedback(): CustomerParcelFeedback[] {
    try {
      const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(SEED_FEEDBACK));
        return SEED_FEEDBACK;
      }
      return JSON.parse(raw);
    } catch {
      return SEED_FEEDBACK;
    }
  }

  private saveFeedback(list: CustomerParcelFeedback[]): void {
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save customer feedback:', e);
    }
  }

  /**
   * Retrieves all customer feedback records (optionally filtered by tenant)
   */
  public getAllFeedback(tenantId?: string): CustomerParcelFeedback[] {
    const list = this.getStoredFeedback();
    if (!tenantId) return list;
    return list.filter((f) => f.tenantId === tenantId);
  }

  /**
   * Checks if a specific parcel already has feedback submitted
   */
  public getFeedbackByParcelId(parcelId: string): CustomerParcelFeedback | undefined {
    const list = this.getStoredFeedback();
    return list.find((f) => f.parcelId === parcelId);
  }

  /**
   * Submits or updates feedback for a parcel
   */
  public submitParcelFeedback(
    data: Omit<CustomerParcelFeedback, 'id' | 'submittedAt' | 'status'>
  ): CustomerParcelFeedback {
    const list = this.getStoredFeedback();
    const existingIdx = list.findIndex((f) => f.parcelId === data.parcelId);

    const record: CustomerParcelFeedback = {
      ...data,
      id: existingIdx >= 0 ? list[existingIdx].id : `FB-${Date.now().toString().slice(-6)}`,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
    };

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }

    this.saveFeedback(list);
    storage.notify(); // trigger reactive rerenders across dashboards
    return record;
  }

  /**
   * Computes aggregate analytics for PerformanceMetricsView and CustomerDashboard
   */
  public getAnalyticsSummary(tenantId?: string): CustomerFeedbackAnalyticsSummary {
    const list = this.getAllFeedback(tenantId);
    const total = list.length;

    if (total === 0) {
      return {
        totalReviewsCount: 0,
        averageCsatScore: 5.0,
        netPromoterScore: 100,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        issueFrequency: [],
        aspectAverages: { speed: 5.0, condition: 5.0, courtesy: 5.0, tracking: 5.0 },
        recentFeedback: [],
      };
    }

    // 1. Average CSAT Rating
    const totalRatingSum = list.reduce((s, f) => s + f.overallRating, 0);
    const averageCsatScore = +(totalRatingSum / total).toFixed(2);

    // 2. Rating Distribution (1 to 5 stars)
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    list.forEach((f) => {
      ratingDistribution[f.overallRating] = (ratingDistribution[f.overallRating] || 0) + 1;
    });

    // 3. Net Promoter Score (NPS)
    // Promoters (5-star & wouldRecommend), Detractors (1-2 star or !wouldRecommend), Passives (3-4)
    let promoters = 0;
    let detractors = 0;
    list.forEach((f) => {
      if (f.overallRating >= 5 && f.wouldRecommend) promoters++;
      else if (f.overallRating <= 2 || !f.wouldRecommend) detractors++;
    });
    const netPromoterScore = Math.round(((promoters - detractors) / total) * 100);

    // 4. Issue Frequency Analysis
    const issueCounts: Record<DeliveryIssueType, number> = {
      DAMAGED_PACKAGE: 0,
      LATE_DELIVERY: 0,
      INSECURE_LOCATION: 0,
      MISSING_SIGNATURE: 0,
      INCORRECT_ADDRESS: 0,
      POOR_COMMUNICATION: 0,
      RUDE_COURIER: 0,
      WEATHER_MISHANDLING: 0,
    };

    list.forEach((f) => {
      (f.reportedIssues || []).forEach((issue) => {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      });
    });

    const issueFrequency = (Object.keys(issueCounts) as DeliveryIssueType[])
      .map((issue) => ({
        issue,
        label: ISSUE_LABELS[issue],
        count: issueCounts[issue],
        pct: Math.round((issueCounts[issue] / total) * 100),
      }))
      .filter((i) => i.count > 0)
      .sort((a, b) => b.count - a.count);

    // 5. Aspect Averages
    const aspectAverages = {
      speed: +(list.reduce((s, f) => s + (f.aspectRatings?.deliverySpeed || f.overallRating), 0) / total).toFixed(1),
      condition: +(list.reduce((s, f) => s + (f.aspectRatings?.packageCondition || f.overallRating), 0) / total).toFixed(1),
      courtesy: +(list.reduce((s, f) => s + (f.aspectRatings?.courierCourtesy || f.overallRating), 0) / total).toFixed(1),
      tracking: +(list.reduce((s, f) => s + (f.aspectRatings?.trackingTransparency || f.overallRating), 0) / total).toFixed(1),
    };

    return {
      totalReviewsCount: total,
      averageCsatScore,
      netPromoterScore,
      ratingDistribution: ratingDistribution as CustomerFeedbackAnalyticsSummary['ratingDistribution'],
      issueFrequency,
      aspectAverages,
      recentFeedback: list.slice(0, 10),
    };
  }
}

export const customerFeedbackService = new CustomerFeedbackService();
