import {User} from '../../types';

export const mockCurrentUser: User = {
  id: 'user_001',
  email: 'mario.rossi@example.com',
  displayName: 'Mario Rossi',
  credits: 25,
  totalTickets: 47,
  watchedAdsCount: 42,
  referralCode: 'RAFUSER01',
  createdAt: '2024-01-15T10:30:00Z',
  shippingAddress: {
    fullName: 'Mario Rossi',
    street: 'Via Roma 123',
    city: 'Milano',
    province: 'MI',
    postalCode: '20100',
    phone: '+39 333 1234567',
  },
};

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: 'user_002',
    email: 'luigi.verdi@example.com',
    displayName: 'Luigi Verdi',
    credits: 10,
    totalTickets: 23,
    watchedAdsCount: 20,
    referralCode: 'RAFUSER02',
    createdAt: '2024-02-20T14:15:00Z',
  },
  {
    id: 'user_003',
    email: 'anna.bianchi@example.com',
    displayName: 'Anna Bianchi',
    credits: 50,
    totalTickets: 89,
    watchedAdsCount: 75,
    referralCode: 'RAFUSER03',
    referredBy: 'user_001',
    createdAt: '2024-03-05T09:00:00Z',
  },
];
