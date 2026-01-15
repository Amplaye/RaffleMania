import {Ticket} from '../../types';
import {generateTicketCode} from '../../utils/formatters';

// Helper to get a date relative to now
const getRelativeDate = (days: number, hours: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
};

// Current user's tickets for the active draw
export const mockUserTickets: Ticket[] = [
  {
    id: 'ticket_001',
    uniqueCode: 'ABC123XYZ',
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(0, -2),
  },
  {
    id: 'ticket_002',
    uniqueCode: 'DEF456UVW',
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(0, -4),
  },
  {
    id: 'ticket_003',
    uniqueCode: 'GHI789RST',
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'credits',
    isWinner: false,
    createdAt: getRelativeDate(0, -6),
  },
  {
    id: 'ticket_004',
    uniqueCode: 'JKL012OPQ',
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'referral',
    isWinner: false,
    createdAt: getRelativeDate(-1, -1),
  },
  {
    id: 'ticket_005',
    uniqueCode: 'MNO345LMN',
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(-1, -3),
  },
];

// Past tickets (for history)
export const mockPastTickets: Ticket[] = [
  {
    id: 'ticket_past_001',
    uniqueCode: 'WIN111AAA',
    userId: 'user_001',
    drawId: 'draw_past_003',
    prizeId: 'prize_002',
    source: 'ad',
    isWinner: true, // This user won!
    createdAt: getRelativeDate(-3, -5),
  },
  {
    id: 'ticket_past_002',
    uniqueCode: 'OLD222BBB',
    userId: 'user_001',
    drawId: 'draw_past_001',
    prizeId: 'prize_004',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(-1, -2),
  },
  {
    id: 'ticket_past_003',
    uniqueCode: 'OLD333CCC',
    userId: 'user_001',
    drawId: 'draw_past_002',
    prizeId: 'prize_005',
    source: 'credits',
    isWinner: false,
    createdAt: getRelativeDate(-2, -4),
  },
];

export const getAllUserTickets = (): Ticket[] => {
  return [...mockUserTickets, ...mockPastTickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const getActiveTickets = (): Ticket[] => {
  return mockUserTickets;
};

export const getTicketById = (id: string): Ticket | undefined => {
  return getAllUserTickets().find(ticket => ticket.id === id);
};

// Simulate creating a new ticket
export const createMockTicket = (
  source: 'ad' | 'credits',
  drawId: string,
  prizeId: string,
): Ticket => {
  return {
    id: `ticket_${Date.now()}`,
    uniqueCode: generateTicketCode(),
    userId: 'user_001',
    drawId,
    prizeId,
    source,
    isWinner: false,
    createdAt: new Date().toISOString(),
  };
};
