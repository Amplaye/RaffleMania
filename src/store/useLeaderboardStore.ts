import {create} from 'zustand';
import {LeaderboardEntry, LeaderboardType} from '../types';
import {
  getAdsLeaderboard,
  getWinsLeaderboard,
  injectCurrentUser,
} from '../services/mock';

// Costante per la data dell'ultimo aggiornamento della classifica
const LEADERBOARD_UPDATE_HOUR = 0; // Mezzanotte (00:00)

// Calcola il timestamp della prossima mezzanotte
const getNextMidnight = (): number => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // Prossima mezzanotte
  return nextMidnight.getTime();
};

// Calcola il timestamp dell'ultima mezzanotte
const getLastMidnight = (): number => {
  const now = new Date();
  const lastMidnight = new Date(now);
  lastMidnight.setHours(0, 0, 0, 0); // Ultima mezzanotte
  return lastMidnight.getTime();
};

// Formatta la data dell'ultimo aggiornamento
const formatLastUpdate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Formatta il tempo rimanente al prossimo aggiornamento
const formatTimeToNextUpdate = (): string => {
  const now = Date.now();
  const nextMidnight = getNextMidnight();
  const diff = nextMidnight - now;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

interface LeaderboardState {
  adsLeaderboard: LeaderboardEntry[];
  winsLeaderboard: LeaderboardEntry[];
  isLoading: boolean;
  lastUpdated: number | null;
  nextUpdateAt: number | null;
  activeTab: LeaderboardType;
  midnightCheckInterval: number | null;
  currentUserAdsRank: number | null;
  currentUserWinsRank: number | null;

  // Actions
  fetchLeaderboards: (currentUserId?: string, userAdsCount?: number, userWinsCount?: number, userLevel?: number, userDisplayName?: string, userAvatarUrl?: string) => Promise<void>;
  setActiveTab: (tab: LeaderboardType) => void;
  startMidnightCheck: (currentUserId?: string, userAdsCount?: number, userWinsCount?: number, userLevel?: number, userDisplayName?: string, userAvatarUrl?: string) => void;
  stopMidnightCheck: () => void;
  getLastUpdateDate: () => string;
  getTimeToNextUpdate: () => string;
  shouldRefresh: () => boolean;
  // Debug
  debugSetUserRank: (rank: number, displayName: string, avatarUrl?: string) => void;
  debugResetUserRank: () => void;
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  adsLeaderboard: [],
  winsLeaderboard: [],
  isLoading: false,
  lastUpdated: null,
  nextUpdateAt: getNextMidnight(),
  activeTab: 'ads',
  midnightCheckInterval: null,
  currentUserAdsRank: null,
  currentUserWinsRank: null,

  fetchLeaderboards: async (
    currentUserId?: string,
    userAdsCount?: number,
    userWinsCount?: number,
    userLevel?: number,
    userDisplayName?: string,
    userAvatarUrl?: string,
  ) => {
    set({isLoading: true});

    // Simula chiamata API
    await new Promise<void>(resolve => setTimeout(() => resolve(), 500));

    let adsData = getAdsLeaderboard(currentUserId);
    let winsData = getWinsLeaderboard(currentUserId);

    // Inietta l'utente corrente se ha dati validi
    if (currentUserId && userDisplayName && userLevel !== undefined) {
      if (userAdsCount !== undefined && userAdsCount > 0) {
        adsData = injectCurrentUser(adsData, {
          id: currentUserId,
          displayName: userDisplayName,
          level: userLevel,
          value: userAdsCount,
          avatarUrl: userAvatarUrl,
        });
      }

      if (userWinsCount !== undefined && userWinsCount > 0) {
        winsData = injectCurrentUser(winsData, {
          id: currentUserId,
          displayName: userDisplayName,
          level: userLevel,
          value: userWinsCount,
          avatarUrl: userAvatarUrl,
        });
      }
    }

    // Calcola la posizione dell'utente
    const userAdsEntry = adsData.find(e => e.isCurrentUser);
    const userWinsEntry = winsData.find(e => e.isCurrentUser);

    set({
      adsLeaderboard: adsData,
      winsLeaderboard: winsData,
      isLoading: false,
      lastUpdated: getLastMidnight(), // L'aggiornamento è sempre riferito all'ultima mezzanotte
      nextUpdateAt: getNextMidnight(),
      currentUserAdsRank: userAdsEntry?.rank || null,
      currentUserWinsRank: userWinsEntry?.rank || null,
    });
  },

  setActiveTab: (tab: LeaderboardType) => {
    set({activeTab: tab});
  },

  // Verifica se è necessario aggiornare (se è passata la mezzanotte dall'ultimo fetch)
  shouldRefresh: () => {
    const {lastUpdated} = get();
    if (!lastUpdated) return true;

    const lastMidnight = getLastMidnight();
    return lastUpdated < lastMidnight;
  },

  // Avvia il controllo periodico per la mezzanotte
  startMidnightCheck: (
    currentUserId?: string,
    userAdsCount?: number,
    userWinsCount?: number,
    userLevel?: number,
    userDisplayName?: string,
    userAvatarUrl?: string,
  ) => {
    const {midnightCheckInterval, shouldRefresh, fetchLeaderboards} = get();

    // Non creare un nuovo intervallo se ne esiste già uno
    if (midnightCheckInterval) {
      return;
    }

    // Controlla ogni minuto se è passata la mezzanotte
    const intervalId = setInterval(() => {
      if (shouldRefresh()) {
        fetchLeaderboards(
          currentUserId,
          userAdsCount,
          userWinsCount,
          userLevel,
          userDisplayName,
          userAvatarUrl,
        );
      }
      // Aggiorna sempre il tempo rimanente
      set({nextUpdateAt: getNextMidnight()});
    }, 60000) as unknown as number; // Controlla ogni minuto

    set({midnightCheckInterval: intervalId});
  },

  stopMidnightCheck: () => {
    const {midnightCheckInterval} = get();
    if (midnightCheckInterval) {
      clearInterval(midnightCheckInterval);
      set({midnightCheckInterval: null});
    }
  },

  getLastUpdateDate: () => {
    const {lastUpdated} = get();
    if (!lastUpdated) return 'Mai';
    return formatLastUpdate(lastUpdated);
  },

  getTimeToNextUpdate: () => {
    return formatTimeToNextUpdate();
  },

  // Debug: inserisce l'utente a una posizione specifica (solo nella classifica attiva)
  debugSetUserRank: (rank: number, displayName: string, avatarUrl?: string) => {
    const {adsLeaderboard, winsLeaderboard, activeTab} = get();

    const createUserEntry = (position: number, leaderboard: LeaderboardEntry[]): LeaderboardEntry[] => {
      // Rimuovi eventuali entry precedenti dell'utente
      const filtered = leaderboard.filter(e => !e.isCurrentUser);

      // Crea la nuova entry per l'utente
      const userEntry: LeaderboardEntry = {
        id: 'debug-user',
        rank: position,
        userId: 'debug-user-id',
        displayName: displayName,
        avatarUrl: avatarUrl,
        level: 10,
        value: position === 1 ? 9999 : Math.max(1000 - position * 10, 100),
        isCurrentUser: true,
      };

      // Inserisci l'utente nella posizione corretta e riordina
      const result = [...filtered];

      // Aggiorna i rank di tutti
      result.forEach((entry, idx) => {
        if (idx + 1 >= position) {
          entry.rank = idx + 2; // Shifta di 1 per fare spazio
        }
      });

      // Inserisci l'utente
      result.splice(position - 1, 0, userEntry);

      // Limita a 100 entries
      return result.slice(0, 100);
    };

    // Aggiorna SOLO la classifica attiva, non entrambe
    if (activeTab === 'ads') {
      set({
        adsLeaderboard: createUserEntry(rank, adsLeaderboard),
        currentUserAdsRank: rank,
      });
    } else {
      set({
        winsLeaderboard: createUserEntry(rank, winsLeaderboard),
        currentUserWinsRank: rank,
      });
    }
  },

  // Debug: rimuove l'utente dalla classifica attiva
  debugResetUserRank: () => {
    const {adsLeaderboard, winsLeaderboard, activeTab} = get();

    const removeUser = (leaderboard: LeaderboardEntry[]): LeaderboardEntry[] => {
      const filtered = leaderboard.filter(e => !e.isCurrentUser);
      // Riassegna i rank
      filtered.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });
      return filtered;
    };

    // Rimuovi SOLO dalla classifica attiva
    if (activeTab === 'ads') {
      set({
        adsLeaderboard: removeUser(adsLeaderboard),
        currentUserAdsRank: null,
      });
    } else {
      set({
        winsLeaderboard: removeUser(winsLeaderboard),
        currentUserWinsRank: null,
      });
    }
  },
}));
