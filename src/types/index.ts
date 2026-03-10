// User & Auth Types
export type UserRole = "OWNER" | "ADMIN" | "SALES_REP";

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string; // Derived from name for backwards compatibility
  lastName?: string; // Derived from name for backwards compatibility
  avatarUrl?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  token: string;
}

// Organization Types
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "CANCELLED";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELED";
export type PromotionDiscountType = "PERCENTAGE" | "FIXED";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus?: SubscriptionStatus;
  messageLimit?: number;
  messagesUsed?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationStats {
  totalContacts: number;
  totalCampaigns: number;
  totalMessages: number;
  messagesThisMonth: number;
  activeWhatsAppNumbers: number;
  activeTemplates: number;
}

export interface OrganizationSubscription {
  id?: string;
  status: SubscriptionStatus;
  plan: string;
  messageLimit: number;
  messagesUsed: number;
  remaining?: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  provider?: string;
  providerRef?: string | null;
}

export interface BillingPlan {
  code: string;
  name: string;
  description: string;
  messageLimit: number;
  amount: number;
  currency: string;
  periodDays: number;
}

export interface BillingPayment {
  id: string;
  provider: string;
  status: PaymentStatus;
  planCode: string;
  messageLimit: number;
  periodDays: number;
  originalAmount?: number | null;
  discountAmount?: number;
  amount: number;
  currency: string;
  promotionCode?: string | null;
  promotion?: PromotionPreview | null;
  merchantReference: string;
  orderTrackingId?: string | null;
  providerReference?: string | null;
  paymentMethod?: string | null;
  paymentAccount?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingOverview {
  subscription: OrganizationSubscription | null;
  remainingMessages: number;
  canSend: boolean;
  plans: BillingPlan[];
  payments: BillingPayment[];
}

export interface PromotionPreview {
  id: string;
  code: string;
  description?: string | null;
  discountType: PromotionDiscountType;
  discountValue: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
}

export interface PromotionValidationPricing {
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
}

export interface PromotionValidationResult {
  valid: boolean;
  code?: string | null;
  reason?: string | null;
  pricing: PromotionValidationPricing;
  promotion?: PromotionPreview | null;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
}

// Team Types
export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  joinedAt: string;
}

export interface InvitePayload {
  email: string;
  role: UserRole;
}

// WhatsApp Number Types
export interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  isActive: boolean;
  isPrimary: boolean;
  messagesSent: number;
  messagesReceived: number;
  lastActiveAt?: string;
  wabaConnected: boolean;
  webhookConfigured: boolean;
  createdAt: string;
}

// WhatsApp Template Types
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type TemplateLanguage = "en" | "es" | "pt" | "fr" | "de";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  bodyParamsCount?: number;
  bodyParamKeys?: string[];
  isActive: boolean;
  usageCount: number;
  metaTemplateId?: string | null;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  status:
    | "DRAFT"
    | "QUEUED"
    | "SENDING"
    | "PAUSED"
    | "CANCELED"
    | "COMPLETED"
    | "FAILED";
  totalContacts: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  messagesFailed: number;
  createdAt: string;
  completedAt?: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMessagesSent: number;
  deliveryRate: number;
  readRate: number;
}

export interface SendCampaignPayload {
  templateId: string;
  contactLimit?: number;
  delayMs?: number;
}

// Contact Types
export interface Contact {
  id: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  consent?: boolean;
  lastContactedAt?: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
