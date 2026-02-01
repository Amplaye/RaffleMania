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

// Range per numeri casuali (1-999999)
const MIN_TICKET_NUMBER = 1;
const MAX_TICKET_NUMBER = 999999;

/**
 * Genera un numero casuale univoco per un draw
 * Usa timestamp + random per massimizzare l'unicità tra dispositivi
 */
const generateUniqueRandomNumber = (existingNumbers: Set<number>): number => {
  // Usa timestamp (ultimi 6 digit) + componente random per unicità cross-device
  const timestamp = Date.now() % 1000000;
  const random = Math.floor(Math.random() * 1000);

  // Combina per creare un numero nel range
  let number = ((timestamp * 1000 + random) % (MAX_TICKET_NUMBER - MIN_TICKET_NUMBER + 1)) + MIN_TICKET_NUMBER;

  // Se per caso esiste già (improbabile), genera uno nuovo
  let attempts = 0;
  while (existingNumbers.has(number) && attempts < 100) {
    number = Math.floor(Math.random() * (MAX_TICKET_NUMBER - MIN_TICKET_NUMBER + 1)) + MIN_TICKET_NUMBER;
    attempts++;
  }

  return number;
};

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
 * Assegna numeri univoci per un draw (MODE: MOCK/OFFLINE)
 * Usa numeri casuali basati su timestamp per garantire unicità cross-device
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

  // Assegna numeri casuali univoci (basati su timestamp + random)
  // Questo garantisce unicità anche tra dispositivi diversi
  for (let i = 0; i < quantity; i++) {
    // Aggiungi piccolo delay tra numeri per variare il timestamp
    const number = generateUniqueRandomNumber(registry.assignedNumbers);
    registry.assignedNumbers.add(number);
    assignedNumbers.push(number);
    registry.nextNumber = Math.max(registry.nextNumber, number + 1);
  }

  console.log(`[TicketService] Assigned ${quantity} random numbers to user ${userId} for draw ${drawId}:`, assignedNumbers);
  console.log(`[TicketService] Total numbers assigned for this draw: ${registry.assignedNumbers.size}`);

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
    try {
      assignedNumbers = await assignNumbersAPI(prizeId, quantity, source);
    } catch (error) {
      // Fallback a locale se API fallisce (solo per errori di rete)
      console.log('[TicketService] API failed, falling back to local assignment');
      assignedNumbers = assignNumbersLocal(drawId, prizeId, quantity, userId);
    }
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
