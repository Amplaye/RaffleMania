/**
 * Firebase Realtime Extraction Service
 *
 * Usa Firestore per distribuire i risultati delle estrazioni in tempo reale.
 * Invece di 100k client che pollano il server, UN solo client ottiene il risultato
 * e lo pubblica su Firestore → tutti gli altri lo ricevono istantaneamente.
 *
 * Struttura Firestore:
 *   draws_live/{prizeId} → { winningNumber, status, timerStartedAt, extractedAt, ... }
 */

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from '@react-native-firebase/firestore';

const db = getFirestore();
const COLLECTION = 'draws_live';

export interface LiveDrawResult {
  prizeId: string;
  winningNumber: number;
  status: 'extracting' | 'completed';
  timerStartedAt: string; // Identifica il round specifico
  extractedAt: string;
  publishedAt: any; // serverTimestamp
}

/**
 * Pubblica il risultato di un'estrazione su Firestore.
 * Viene chiamata dal PRIMO client che ottiene il risultato dal server.
 * Usa timerStartedAt come versione per evitare sovrascritture di round diversi.
 */
export const publishDrawResult = async (
  prizeId: string,
  winningNumber: number,
  timerStartedAt: string,
): Promise<void> => {
  try {
    const drawRef = doc(db, COLLECTION, prizeId);
    await setDoc(drawRef, {
      prizeId,
      winningNumber,
      status: 'completed',
      timerStartedAt,
      extractedAt: new Date().toISOString(),
      publishedAt: serverTimestamp(),
    });
    console.log(`[FirebaseExtraction] Published result for prize ${prizeId}: #${winningNumber}`);
  } catch (error) {
    console.log('[FirebaseExtraction] Publish error:', error);
  }
};

/**
 * Ascolta il risultato di un'estrazione in tempo reale.
 * Ritorna una Promise che si risolve quando arriva il risultato per il round corrente,
 * oppure un unsubscribe callback per annullare l'ascolto.
 *
 * @param prizeId - ID del premio
 * @param timerStartedAt - Identifica il round corrente
 * @param timeoutMs - Timeout massimo in ms (default 5000)
 * @returns { promise, unsubscribe }
 */
export const listenForDrawResult = (
  prizeId: string,
  timerStartedAt: string,
  timeoutMs: number = 5000,
): {promise: Promise<LiveDrawResult | null>; unsubscribe: () => void} => {
  let unsub: (() => void) | null = null;
  let resolved = false;

  const promise = new Promise<LiveDrawResult | null>((resolve) => {
    const drawRef = doc(db, COLLECTION, prizeId);

    // Timeout: se non arriva nulla entro timeoutMs, risolvi null
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsub?.();
        console.log(`[FirebaseExtraction] Timeout waiting for prize ${prizeId}`);
        resolve(null);
      }
    }, timeoutMs);

    unsub = onSnapshot(
      drawRef,
      (snapshot) => {
        if (resolved) return;

        const data = snapshot.data();
        if (
          data &&
          data.status === 'completed' &&
          data.timerStartedAt === timerStartedAt &&
          data.winningNumber !== undefined
        ) {
          resolved = true;
          clearTimeout(timeout);
          unsub?.();
          console.log(`[FirebaseExtraction] Received result for prize ${prizeId}: #${data.winningNumber}`);
          resolve({
            prizeId: data.prizeId,
            winningNumber: data.winningNumber,
            status: data.status,
            timerStartedAt: data.timerStartedAt,
            extractedAt: data.extractedAt,
            publishedAt: data.publishedAt,
          });
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log('[FirebaseExtraction] Listener error:', error);
          resolve(null);
        }
      },
    );
  });

  return {
    promise,
    unsubscribe: () => {
      resolved = true;
      unsub?.();
    },
  };
};
