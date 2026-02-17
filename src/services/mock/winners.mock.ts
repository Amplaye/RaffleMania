import {Winner} from '../../types';
import {mockPrizes} from './prizes.mock';
import {mockUsers} from './users.mock';

// Helper to get a date relative to now
const getRelativeDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const mockWinners: Winner[] = [
  // Current user's win (from 3 days ago draw)
  {
    id: 'winner_001',
    drawId: 'draw_past_003',
    ticketId: 'ticket_past_001',
    prizeId: 'prize_002',
    userId: 'user_001',
    prize: mockPrizes[1],
    user: mockUsers[0],
    shippingStatus: 'shipped',
    deliveryStatus: 'processing',
    shippingDate: getRelativeDate(-1),
    trackingNumber: 'IT1234567890',
    createdAt: getRelativeDate(-3),
  },
  // Other users' wins
  {
    id: 'winner_002',
    drawId: 'draw_past_001',
    ticketId: 'ticket_other_001',
    prizeId: 'prize_004',
    userId: 'user_002',
    prize: mockPrizes[3],
    user: mockUsers[1],
    shippingStatus: 'pending',
    deliveryStatus: 'processing',
    createdAt: getRelativeDate(-1),
  },
  {
    id: 'winner_003',
    drawId: 'draw_past_002',
    ticketId: 'ticket_other_002',
    prizeId: 'prize_005',
    userId: 'user_003',
    prize: mockPrizes[4],
    user: mockUsers[2],
    shippingStatus: 'delivered',
    deliveryStatus: 'delivered',
    shippingDate: getRelativeDate(-4),
    trackingNumber: 'IT0987654321',
    createdAt: getRelativeDate(-2),
  },
];

export const getRecentWinners = (limit: number = 10): Winner[] => {
  return mockWinners
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
};

export const getMyWins = (userId: string): Winner[] => {
  return mockWinners.filter(winner => winner.userId === userId);
};

export const getWinnerById = (id: string): Winner | undefined => {
  return mockWinners.find(winner => winner.id === id);
};
