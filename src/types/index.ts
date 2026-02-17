// User Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarColor?: string;
  avatarUrl?: string;
  credits: number;
  xp: number;
  level: number;
  totalTickets: number;
  watchedAdsCount: number;
  winsCount: number;
  currentStreak: number;
  lastStreakDate?: string;
  referralCode: string;
  referredBy?: string;
  shippingAddress?: ShippingAddress;
  createdAt: string;
  // Email verification
  emailVerified?: boolean;
}

// Leveling Types
export interface LevelInfo {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  icon: string;
  color: string;
  creditReward: number; // Crediti premio al raggiungimento del livello
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
export type PrizeTimerStatus = 'waiting' | 'countdown' | 'extracting' | 'completed';

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
  // Timer per premio individuale
  timerStatus: PrizeTimerStatus;
  timerDuration?: number; // Duration in seconds
  scheduledAt?: string; // Data/ora dell'estrazione (impostata quando raggiunge goalAds)
  timerStartedAt?: string; // Quando il timer è partito
  extractedAt?: string; // Quando l'estrazione è avvenuta
  publishAt?: string; // Data/ora di pubblicazione programmata
}

// Ticket Types
export type TicketSource = 'ad' | 'credits' | 'referral' | 'bonus';

export interface Ticket {
  id: string;
  ticketNumber: number; // Numero progressivo globale per premio (1, 2, 3...)
  userId: string;
  drawId: string;
  prizeId: string;
  source: TicketSource;
  isWinner: boolean;
  createdAt: string;
  // Prize info stored for winning tickets display
  prizeName?: string;
  prizeImage?: string;
  wonAt?: string;
  // Delivery status for winning tickets
  deliveryStatus?: 'processing' | 'delivered';
  deliveredAt?: string;
}

// Draw Types
export type DrawStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Draw {
  id: string;
  drawId?: string;
  prizeId: string;
  prize?: Prize;
  scheduledAt?: string;
  executedAt?: string;
  extractedAt?: string;
  status: DrawStatus;
  winningTicketId?: string;
  winnerTicketId?: string;
  winnerId?: string;
  winnerUserId?: string;
  winningNumber?: number;
  totalTickets: number;
}

// Winner Types
export type ShippingStatus = 'pending' | 'shipped' | 'delivered';
export type DeliveryStatus = 'processing' | 'delivered';

export interface Winner {
  id: string;
  drawId: string;
  ticketId: string;
  prizeId: string;
  userId: string;
  prize?: Prize;
  user?: User;
  shippingStatus: ShippingStatus;
  deliveryStatus: DeliveryStatus;
  deliveredAt?: string;
  shippingAddress?: ShippingAddress;
  shippingDate?: string;
  trackingNumber?: string;
  claimedAt?: string;
  createdAt: string;
}

// Transaction Types
export type TransactionType = 'purchase' | 'spend' | 'bonus';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  credits: number;
  amount?: number;
  description?: string;
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

// Payment Types
export type PaymentMethod = 'apple_iap' | 'google_iap' | 'stripe';
export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';

export interface PaymentRecord {
  id: string;
  packageId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  creditsAwarded: number;
  status: PaymentStatus;
  createdAt: string;
  verifiedAt?: string;
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

// Leaderboard Types
export type LeaderboardType = 'ads' | 'wins';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  value: number; // adsWatched or winsCount depending on type
  isCurrentUser?: boolean;
}
