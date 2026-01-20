import {Ticket} from '../../types';

// Helper to get a date relative to now
const getRelativeDate = (days: number, hours: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
};

// Contatori globali per premio (simulano il database)
// In produzione questi saranno gestiti dal backend
export const globalPrizeCounters: Map<string, number> = new Map([
  ['prize_001', 1247], // Pikachu VMAX - 1247 biglietti emessi globalmente
  ['prize_002', 892],  // Charizard VMAX - 892 biglietti emessi globalmente
  ['prize_003', 523],  // Umbreon VMAX
  ['prize_004', 678],  // Gengar VMAX
  ['prize_005', 345],  // Rayquaza VMAX
]);

// Current user's tickets for the active draw
// L'utente ha più numeri per lo stesso premio
export const mockUserTickets: Ticket[] = [
  // Premio 1: Pikachu VMAX - utente ha 3 numeri
  {
    id: 'ticket_001',
    ticketNumber: 42,
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(0, -6),
  },
  {
    id: 'ticket_002',
    ticketNumber: 156,
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(0, -4),
  },
  {
    id: 'ticket_003',
    ticketNumber: 287,
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_001',
    source: 'credits',
    isWinner: false,
    createdAt: getRelativeDate(0, -2),
  },
  // Premio 2: Charizard VMAX - utente ha 1 numero
  {
    id: 'ticket_004',
    ticketNumber: 15,
    userId: 'user_001',
    drawId: 'draw_001',
    prizeId: 'prize_002',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(-1, -1),
  },
];

// Past tickets (for history)
export const mockPastTickets: Ticket[] = [
  {
    id: 'ticket_past_001',
    ticketNumber: 777,
    userId: 'user_001',
    drawId: 'draw_past_003',
    prizeId: 'prize_002',
    source: 'ad',
    isWinner: true,
    createdAt: getRelativeDate(-3, -5),
    prizeName: 'Charizard VMAX',
    prizeImage: 'https://images.pokemontcg.io/swsh3/20_hires.png',
    wonAt: getRelativeDate(-3, -5),
  },
  {
    id: 'ticket_past_002',
    ticketNumber: 234,
    userId: 'user_001',
    drawId: 'draw_past_001',
    prizeId: 'prize_004',
    source: 'ad',
    isWinner: false,
    createdAt: getRelativeDate(-1, -2),
  },
  {
    id: 'ticket_past_003',
    ticketNumber: 89,
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

// Ottieni il prossimo numero disponibile per un premio
export const getNextTicketNumber = (prizeId: string): number => {
  const current = globalPrizeCounters.get(prizeId) || 0;
  const next = current + 1;
  globalPrizeCounters.set(prizeId, next);
  return next;
};

// Ottieni il totale dei biglietti emessi per un premio (per calcolo probabilità)
export const getTotalPoolTickets = (prizeId: string): number => {
  return globalPrizeCounters.get(prizeId) || 1000;
};

// Ottieni tutti i biglietti dell'utente per un premio
export const getTicketsForPrize = (prizeId: string): Ticket[] => {
  return mockUserTickets.filter(ticket => ticket.prizeId === prizeId);
};

// Ottieni i numeri dell'utente per un premio
export const getTicketNumbersForPrize = (prizeId: string): number[] => {
  return getTicketsForPrize(prizeId)
    .map(t => t.ticketNumber)
    .sort((a, b) => a - b);
};

// Simulate creating a new ticket with progressive number
export const createMockTicket = (
  source: 'ad' | 'credits',
  drawId: string,
  prizeId: string,
): Ticket => {
  const ticketNumber = getNextTicketNumber(prizeId);

  const newTicket: Ticket = {
    id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ticketNumber,
    userId: 'user_001',
    drawId,
    prizeId,
    source,
    isWinner: false,
    createdAt: new Date().toISOString(),
  };

  // Add to mock tickets array for persistence in session
  mockUserTickets.push(newTicket);

  return newTicket;
};
