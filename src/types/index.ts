// User Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  credits: number;
  totalTickets: number;
  watchedAdsCount: number;
  referralCode: string;
  referredBy?: string;
  shippingAddress?: ShippingAddress;
  createdAt: string;
  // Leveling system
  level: number;
  currentXP: number;
  totalXP: number;
}

// Leveling Types
export interface LevelInfo {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  icon: string;
  color: string;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
}

// Prize Types
export interface Prize {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  value: number;
  stock: number;
  isActive: boolean;
  currentAds: number;
  goalAds: number;
}

// Ticket Types
export type TicketSource = 'ad' | 'credits' | 'referral' | 'bonus';

export interface Ticket {
  id: string;
  uniqueCode: string;
  userId: string;
  drawId: string;
  prizeId: string;
  source: TicketSource;
  isWinner: boolean;
  createdAt: string;
}

// Draw Types
export type DrawStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Draw {
  id: string;
  prizeId: string;
  prize?: Prize;
  scheduledAt: string;
  executedAt?: string;
  status: DrawStatus;
  winningTicketId?: string;
  winnerId?: string;
  totalTickets: number;
}

// Winner Types
export type ShippingStatus = 'pending' | 'shipped' | 'delivered';

export interface Winner {
  id: string;
  drawId: string;
  ticketId: string;
  prizeId: string;
  userId: string;
  prize?: Prize;
  user?: User;
  shippingStatus: ShippingStatus;
  shippingDate?: string;
  trackingNumber?: string;
  createdAt: string;
}

// Transaction Types
export type TransactionType = 'purchase' | 'spend';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  credits: number;
  amount?: number;
  createdAt: string;
}

// Credit Package for IAP
export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  productId: string; // IAP product ID
  isPopular?: boolean;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  referralCode?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Referral Stats
export interface ReferralStats {
  totalReferrals: number;
  totalBonusEarned: number;
  referredUsers: {
    id: string;
    displayName: string;
    joinedAt: string;
  }[];
}
