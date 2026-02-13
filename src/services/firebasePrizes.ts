/**
 * Firebase Realtime Prizes Service
 *
 * Usa Firestore per sincronizzare lo stato dei premi in tempo reale.
 * Sostituisce il polling ogni 15s con un listener che riceve aggiornamenti istantaneamente.
 *
 * Struttura Firestore:
 *   prizes_live/{prizeId} → { currentAds, timerStatus, scheduledAt, timerStartedAt, ... }
 *
 * I client pubblicano aggiornamenti quando:
 * - Un biglietto viene acquistato (currentAds++)
 * - Il timer parte (timerStatus cambia a 'countdown')
 * - L'estrazione è completata
 */

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from '@react-native-firebase/firestore';

const db = getFirestore();
const COLLECTION = 'prizes_live';

export interface LivePrizeState {
  prizeId: string;
  currentAds: number;
  timerStatus: string;
  scheduledAt?: string;
  timerStartedAt?: string;
  updatedAt: any;
}

/**
 * Pubblica lo stato aggiornato di un premio su Firestore.
 * Chiamata quando cambia currentAds, timerStatus, ecc.
 */
export const publishPrizeState = async (
  prizeId: string,
  state: {
    currentAds: number;
    timerStatus: string;
    scheduledAt?: string;
    timerStartedAt?: string;
  },
): Promise<void> => {
  try {
    const prizeRef = doc(db, COLLECTION, prizeId);
    await setDoc(prizeRef, {
      prizeId,
      ...state,
      updatedAt: serverTimestamp(),
    }, {merge: true});
  } catch (error) {
    // Non bloccare il flusso se Firebase non è disponibile
    console.log('[FirebasePrizes] Publish error:', error);
  }
};

/**
 * Ascolta gli aggiornamenti in tempo reale per tutti i premi attivi.
 * Ritorna una funzione unsubscribe per fermare l'ascolto.
 *
 * @param prizeIds - Array di ID premi da monitorare
 * @param onUpdate - Callback chiamata quando un premio viene aggiornato
 * @returns unsubscribe function
 */
export const listenToPrizeUpdates = (
  prizeIds: string[],
  onUpdate: (prizeId: string, state: LivePrizeState) => void,
): (() => void) => {
  const unsubscribes: (() => void)[] = [];

  for (const prizeId of prizeIds) {
    const prizeRef = doc(db, COLLECTION, prizeId);
    const unsub = onSnapshot(
      prizeRef,
      (snapshot) => {
        const data = snapshot.data();
        if (data) {
          onUpdate(prizeId, {
            prizeId: data.prizeId,
            currentAds: data.currentAds,
            timerStatus: data.timerStatus,
            scheduledAt: data.scheduledAt,
            timerStartedAt: data.timerStartedAt,
            updatedAt: data.updatedAt,
          });
        }
      },
      (error) => {
        console.log(`[FirebasePrizes] Listener error for ${prizeId}:`, error);
      },
    );
    unsubscribes.push(unsub);
  }

  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
};
