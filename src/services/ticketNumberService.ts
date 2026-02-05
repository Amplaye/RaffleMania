/**
 * Ticket Number Service
 *
 * Gestisce l'assegnazione univoca dei numeri dei biglietti per ogni estrazione.
 * CRITICO: Ogni numero deve essere assegnato UNA SOLA VOLTA per draw.
 *
 * In produzione, questo servizio comunica con il backend che usa transazioni
 * atomiche per garantire l'unicità. In modalità mock, simula questo comportamento.
 */

import {API_CONFIG} from '../utils/constants';
import apiClient, {getErrorMessage} from './apiClient';

// Struttura per tracciare i numeri assegnati per ogni draw
interface DrawTicketRegistry {
  drawId: string;
  prizeId: string;
  assignedNumbers: Set<number>;
  nextNumber: number;
  createdAt: string;
}

// Registry globale per i numeri assegnati (mock mode)
// In produzione questo è gestito dal database con lock
const drawRegistries: Map<string, DrawTicketRegistry> = new Map();

// I numeri partono da 1 e sono sequenziali per ogni draw

/**
 * Genera un drawId unico basato su prizeId e timerStartedAt
 */
export const generateDrawId = (prizeId: string, timerStartedAt?: string): string => {
  const timestamp = timerStartedAt || new Date().toISOString();
  return `draw_${prizeId}_${timestamp.replace(/[^0-9]/g, '').slice(0, 14)}`;
};

/**
 * Ottiene o crea il registry per un draw
 */
const getOrCreateRegistry = (drawId: string, prizeId: string): DrawTicketRegistry => {
  let registry = drawRegistries.get(drawId);

  if (!registry) {
    registry = {
      drawId,
      prizeId,
      assignedNumbers: new Set<number>(),
      nextNumber: 1,
      createdAt: new Date().toISOString(),
    };
    drawRegistries.set(drawId, registry);
    console.log(`[TicketService] Created new registry for draw ${drawId}`);
  }

  return registry;
};

/**
 * Assegna numeri univoci SEQUENZIALI per un draw (MODE: MOCK/OFFLINE)
 * I numeri partono da 1 e incrementano: 1, 2, 3, 4, ...
 *
 * @param drawId - ID del draw/estrazione
 * @param prizeId - ID del premio
 * @param quantity - Numero di biglietti da assegnare
 * @param userId - ID dell'utente
 * @returns Array di numeri univoci assegnati
 */
const assignNumbersLocal = (
  drawId: string,
  prizeId: string,
  quantity: number,
  userId: string
): number[] => {
  const registry = getOrCreateRegistry(drawId, prizeId);
  const assignedNumbers: number[] = [];

  // Assegna numeri SEQUENZIALI partendo dal prossimo disponibile
  for (let i = 0; i < quantity; i++) {
    const number = registry.nextNumber;
    registry.assignedNumbers.add(number);
    assignedNumbers.push(number);
    registry.nextNumber++;
  }

  console.log(`[TicketService] Assigned ${quantity} sequential numbers to user ${userId} for draw ${drawId}:`, assignedNumbers);
  console.log(`[TicketService] Next available number for this draw: ${registry.nextNumber}`);

  return assignedNumbers;
};

/**
 * Assegna numeri univoci tramite API backend
 * Il backend gestisce la concorrenza con transazioni atomiche
 *
 * @param prizeId - ID del premio (numerico)
 * @param quantity - Numero di biglietti da assegnare
 * @param source - Fonte dell'acquisto ('ad' | 'credits')
 * @returns Array di numeri univoci assegnati
 */
const assignNumbersAPI = async (
  prizeId: string,
  quantity: number,
  source: 'ad' | 'credits'
): Promise<number[]> => {
  try {
    // Estrai l'ID numerico del premio (rimuovi prefisso se presente)
    const numericPrizeId = parseInt(prizeId.replace(/\D/g, ''), 10) || parseInt(prizeId, 10);

    const response = await apiClient.post('/tickets/batch', {
      prize_id: numericPrizeId,
      quantity,
      source,
    });

    // Il backend restituisce assignedNumbers direttamente
    const numbers = response.data.data.assignedNumbers ||
                   response.data.data.tickets?.map((t: any) => t.ticketNumber || t.ticket_number) ||
                   [];

    console.log(`[TicketService] API assigned ${quantity} numbers:`, numbers);
    return numbers;
  } catch (error) {
    console.log('[TicketService] API error:', getErrorMessage(error));
    throw error;
  }
};

/**
 * Interfaccia per il risultato dell'assegnazione biglietti
 */
export interface TicketAssignment {
  ticketId: string;
  ticketNumber: number;
  drawId: string;
  prizeId: string;
  source: 'ad' | 'credits';
  createdAt: string;
}

/**
 * Richiede l'assegnazione di biglietti univoci
 *
 * IMPORTANTE: Questa funzione garantisce che ogni numero sia assegnato
 * una sola volta per draw, anche con chiamate concorrenti.
 *
 * @param prizeId - ID del premio
 * @param timerStartedAt - Timestamp di inizio del timer (identifica il draw)
 * @param quantity - Numero di biglietti da richiedere
 * @param source - Fonte dell'acquisto
 * @param userId - ID dell'utente
 * @returns Array di assegnazioni biglietto
 */
export const requestTickets = async (
  prizeId: string,
  timerStartedAt: string | undefined,
  quantity: number,
  source: 'ad' | 'credits',
  userId: string
): Promise<TicketAssignment[]> => {
  const drawId = generateDrawId(prizeId, timerStartedAt);

  console.log(`[TicketService] Requesting ${quantity} tickets for draw ${drawId}, user ${userId}`);

  let assignedNumbers: number[];

  // Determina se usare mock o API
  const {useAuthStore} = await import('../store/useAuthStore');
  const token = useAuthStore.getState().token;
  const isGuestUser = token?.startsWith('guest_token_');
  const useMockMode = API_CONFIG.USE_MOCK_DATA || isGuestUser;

  if (useMockMode) {
    // Modalità mock: assegnazione locale (per utenti guest)
    assignedNumbers = assignNumbersLocal(drawId, prizeId, quantity, userId);
  } else {
    // Modalità API: il backend gestisce l'atomicità con transazioni
    // IMPORTANTE: NON fare fallback a locale per utenti autenticati!
    // Il fallback causerebbe numeri duplicati tra dispositivi diversi.
    assignedNumbers = await assignNumbersAPI(prizeId, quantity, source);
  }

  // Crea le assegnazioni
  const now = new Date().toISOString();
  const assignments: TicketAssignment[] = assignedNumbers.map((number, index) => ({
    ticketId: `ticket_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    ticketNumber: number,
    drawId,
    prizeId,
    source,
    createdAt: now,
  }));

  return assignments;
};

/**
 * Verifica se un numero è già stato assegnato per un draw
 */
export const isNumberAssigned = (drawId: string, number: number): boolean => {
  const registry = drawRegistries.get(drawId);
  return registry ? registry.assignedNumbers.has(number) : false;
};

/**
 * Ottiene il totale dei numeri assegnati per un draw
 */
export const getTotalAssignedForDraw = (drawId: string): number => {
  const registry = drawRegistries.get(drawId);
  return registry ? registry.assignedNumbers.size : 0;
};

/**
 * Ottiene il prossimo numero disponibile per un draw (senza assegnarlo)
 */
export const getNextAvailableNumber = (drawId: string, prizeId: string): number => {
  const registry = getOrCreateRegistry(drawId, prizeId);
  return registry.nextNumber;
};

/**
 * Resetta il registry per un draw (utile per debug/test)
 */
export const resetDrawRegistry = (drawId: string): void => {
  drawRegistries.delete(drawId);
  console.log(`[TicketService] Reset registry for draw ${drawId}`);
};

/**
 * Resetta tutti i registri (utile per debug/test)
 */
export const resetAllRegistries = (): void => {
  drawRegistries.clear();
  console.log('[TicketService] All registries reset');
};

/**
 * Ottiene statistiche per un draw
 */
export const getDrawStats = (drawId: string): {
  totalAssigned: number;
  nextNumber: number;
  exists: boolean;
} => {
  const registry = drawRegistries.get(drawId);
  if (!registry) {
    return {totalAssigned: 0, nextNumber: 1, exists: false};
  }
  return {
    totalAssigned: registry.assignedNumbers.size,
    nextNumber: registry.nextNumber,
    exists: true,
  };
};

export default {
  requestTickets,
  generateDrawId,
  isNumberAssigned,
  getTotalAssignedForDraw,
  getNextAvailableNumber,
  resetDrawRegistry,
  resetAllRegistries,
  getDrawStats,
};
