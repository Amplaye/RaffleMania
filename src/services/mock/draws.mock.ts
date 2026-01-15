import {Draw} from '../../types';
import {mockPrizes} from './prizes.mock';

// Helper to get a date relative to now
const getRelativeDate = (
  days: number,
  hours: number = 20,
  minutes: number = 0,
): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const mockDraws: Draw[] = [
  // Next scheduled draw (today or tomorrow at 8 PM)
  {
    id: 'draw_001',
    prizeId: 'prize_001',
    prize: mockPrizes[0],
    scheduledAt: getRelativeDate(0, 20, 0), // Today at 8 PM
    status: 'scheduled',
    totalTickets: 1247,
  },
  // Upcoming draws
  {
    id: 'draw_002',
    prizeId: 'prize_002',
    prize: mockPrizes[1],
    scheduledAt: getRelativeDate(1, 20, 0),
    status: 'scheduled',
    totalTickets: 0,
  },
  {
    id: 'draw_003',
    prizeId: 'prize_003',
    prize: mockPrizes[2],
    scheduledAt: getRelativeDate(2, 20, 0),
    status: 'scheduled',
    totalTickets: 0,
  },
  // Past completed draws
  {
    id: 'draw_past_001',
    prizeId: 'prize_004',
    prize: mockPrizes[3],
    scheduledAt: getRelativeDate(-1, 20, 0),
    executedAt: getRelativeDate(-1, 20, 1),
    status: 'completed',
    winningTicketId: 'ticket_past_001',
    winnerId: 'user_002',
    totalTickets: 892,
  },
  {
    id: 'draw_past_002',
    prizeId: 'prize_005',
    prize: mockPrizes[4],
    scheduledAt: getRelativeDate(-2, 20, 0),
    executedAt: getRelativeDate(-2, 20, 1),
    status: 'completed',
    winningTicketId: 'ticket_past_002',
    winnerId: 'user_003',
    totalTickets: 756,
  },
  {
    id: 'draw_past_003',
    prizeId: 'prize_002',
    prize: mockPrizes[1],
    scheduledAt: getRelativeDate(-3, 20, 0),
    executedAt: getRelativeDate(-3, 20, 1),
    status: 'completed',
    winningTicketId: 'ticket_past_003',
    winnerId: 'user_001',
    totalTickets: 1102,
  },
];

export const getNextDraw = (): Draw | undefined => {
  return mockDraws.find(draw => draw.status === 'scheduled');
};

export const getCompletedDraws = (): Draw[] => {
  return mockDraws.filter(draw => draw.status === 'completed');
};

export const getUpcomingDraws = (): Draw[] => {
  return mockDraws.filter(draw => draw.status === 'scheduled');
};
