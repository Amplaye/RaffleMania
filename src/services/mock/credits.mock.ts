import {CreditPackage, Transaction} from '../../types';

export const mockCreditPackages: CreditPackage[] = [
  {
    id: 'pack_001',
    credits: 5,
    price: 0.99,
    productId: 'rafflemania_credits_5',
  },
  {
    id: 'pack_002',
    credits: 15,
    price: 2.49,
    productId: 'rafflemania_credits_15',
    isPopular: true,
  },
  {
    id: 'pack_003',
    credits: 30,
    price: 4.49,
    productId: 'rafflemania_credits_30',
  },
  {
    id: 'pack_004',
    credits: 50,
    price: 6.99,
    productId: 'rafflemania_credits_50',
  },
  {
    id: 'pack_005',
    credits: 100,
    price: 12.99,
    productId: 'rafflemania_credits_100',
  },
];

// Helper to get a date relative to now
const getRelativeDate = (days: number, hours: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
};

export const mockTransactions: Transaction[] = [
  {
    id: 'trans_001',
    userId: 'user_001',
    type: 'purchase',
    credits: 15,
    amount: 2.49,
    createdAt: getRelativeDate(-5),
  },
  {
    id: 'trans_002',
    userId: 'user_001',
    type: 'spend',
    credits: -5,
    createdAt: getRelativeDate(-4, -2),
  },
  {
    id: 'trans_003',
    userId: 'user_001',
    type: 'purchase',
    credits: 30,
    amount: 4.49,
    createdAt: getRelativeDate(-2),
  },
  {
    id: 'trans_004',
    userId: 'user_001',
    type: 'spend',
    credits: -5,
    createdAt: getRelativeDate(-1, -5),
  },
  {
    id: 'trans_005',
    userId: 'user_001',
    type: 'spend',
    credits: -5,
    createdAt: getRelativeDate(0, -3),
  },
];

export const getUserTransactions = (userId: string): Transaction[] => {
  return mockTransactions
    .filter(t => t.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
};
