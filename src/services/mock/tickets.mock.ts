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
// Only primary tickets with unique codes are stored here
// Each ticket represents entry to a specific prize draw
export const mockUserTickets: Ticket[] = [
  {
    id: 'ticket_001',
    uniqueCode: 'ABC123XYZ',
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(0, -6),
    isPrimaryTicket: true,
  },
  {
    id: 'ticket_004',
    uniqueCode: 'JKL012OPQ',
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_002',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(-1, -1),
    isPrimaryTicket: true,
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
    isPrimaryTicket: true,
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
    isPrimaryTicket: true,
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
    isPrimaryTicket: true,
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

// Check if user already has a primary ticket for a specific prize
export const hasPrimaryTicketForPrize = (prizeId: string): boolean => {
  return mockUserTickets.some(
    ticket => ticket.prizeId === prizeId && ticket.isPrimaryTicket,
  );
};

// Get the primary ticket for a specific prize (if exists)
export const getPrimaryTicketForPrize = (prizeId: string): Ticket | undefined => {
  return mockUserTickets.find(
    ticket => ticket.prizeId === prizeId && ticket.isPrimaryTicket,
  );
};

// Simulate creating a new ticket
// First ticket per prize gets a unique code (isPrimaryTicket: true)
// Subsequent tickets are probability boosts only (isPrimaryTicket: false)
export const createMockTicket = (
  source: 'ad' | 'credits',
  drawId: string,
  prizeId: string,
): Ticket => {
  const isFirstTicket = !hasPrimaryTicketForPrize(prizeId);

  const newTicket: Ticket = {
    id: `ticket_${Date.now()}`,
    uniqueCode: isFirstTicket ? generateTicketCode() : '',
    userId: 'user_001',
    drawId,
    prizeId,
    source,
    isWinner: false,
    createdAt: new Date().toISOString(),
    isPrimaryTicket: isFirstTicket,
  };

  // Add to mock tickets array for persistence in session
  mockUserTickets.push(newTicket);

  return newTicket;
};
