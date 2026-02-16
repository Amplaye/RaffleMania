import {create} from 'zustand';
import {LeaderboardEntry, LeaderboardType} from '../types';
import apiClient from '../services/apiClient';
import {API_CONFIG} from '../utils/constants';
import {
  getAdsLeaderboard,
  getWinsLeaderboard,
} from '../services/mock';

// Calcola il timestamp della prossima mezzanotte
const getNextMidnight = (): number => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime();
};

// Calcola il timestamp dell'ultima mezzanotte
const getLastMidnight = (): number => {
  const now = new Date();
  const lastMidnight = new Date(now);
  lastMidnight.setHours(0, 0, 0, 0);
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

// Map API leaderboard entry to app type
const mapApiEntry = (entry: any, type: string, currentUserId?: string): LeaderboardEntry => ({
  id: String(entry.userId),
  rank: entry.rank,
  userId: String(entry.userId),
  displayName: entry.username || 'Utente',
  avatarUrl: entry.avatarUrl || undefined,
  level: entry.level || 1,
  value: type === 'wins' ? (entry.winsCount || 0) : (entry.xp || 0),
  isCurrentUser: currentUserId ? String(entry.userId) === String(currentUserId) : false,
});

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
  fetchLeaderboards: (currentUserId?: string) => Promise<void>;
  setActiveTab: (tab: LeaderboardType) => void;
  startMidnightCheck: (currentUserId?: string) => void;
  stopMidnightCheck: () => void;
  getLastUpdateDate: () => string;
  getTimeToNextUpdate: () => string;
  shouldRefresh: () => boolean;
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

  fetchLeaderboards: async (currentUserId?: string) => {
    set({isLoading: true});

    try {
      if (API_CONFIG.USE_MOCK_DATA) {
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        const adsData = getAdsLeaderboard(currentUserId);
        const winsData = getWinsLeaderboard(currentUserId);
        const userAdsEntry = adsData.find(e => e.isCurrentUser);
        const userWinsEntry = winsData.find(e => e.isCurrentUser);
        set({
          adsLeaderboard: adsData,
          winsLeaderboard: winsData,
          isLoading: false,
          lastUpdated: getLastMidnight(),
          nextUpdateAt: getNextMidnight(),
          currentUserAdsRank: userAdsEntry?.rank || null,
          currentUserWinsRank: userWinsEntry?.rank || null,
        });
        return;
      }

      // Fetch both leaderboards from API in parallel
      const [xpResponse, winsResponse] = await Promise.all([
        apiClient.get('/users/leaderboard', {params: {type: 'xp', limit: 100}}),
        apiClient.get('/users/leaderboard', {params: {type: 'wins', limit: 100}}),
      ]);

      const xpData = xpResponse.data?.data?.leaderboard || [];
      const winsData = winsResponse.data?.data?.leaderboard || [];

      const adsLeaderboard = xpData.map((entry: any) => mapApiEntry(entry, 'xp', currentUserId));
      const winsLeaderboard = winsData.map((entry: any) => mapApiEntry(entry, 'wins', currentUserId));

      const userAdsEntry = adsLeaderboard.find((e: LeaderboardEntry) => e.isCurrentUser);
      const userWinsEntry = winsLeaderboard.find((e: LeaderboardEntry) => e.isCurrentUser);

      set({
        adsLeaderboard,
        winsLeaderboard,
        isLoading: false,
        lastUpdated: getLastMidnight(),
        nextUpdateAt: getNextMidnight(),
        currentUserAdsRank: userAdsEntry?.rank || null,
        currentUserWinsRank: userWinsEntry?.rank || null,
      });
    } catch (error) {
      console.log('[Leaderboard] API fetch failed, using mock data:', error);
      // Fallback to mock data
      const adsData = getAdsLeaderboard(currentUserId);
      const winsData = getWinsLeaderboard(currentUserId);
      set({
        adsLeaderboard: adsData,
        winsLeaderboard: winsData,
        isLoading: false,
        lastUpdated: getLastMidnight(),
        nextUpdateAt: getNextMidnight(),
      });
    }
  },

  setActiveTab: (tab: LeaderboardType) => {
    set({activeTab: tab});
  },

  shouldRefresh: () => {
    const {lastUpdated} = get();
    if (!lastUpdated) return true;
    const lastMidnight = getLastMidnight();
    return lastUpdated < lastMidnight;
  },

  startMidnightCheck: (currentUserId?: string) => {
    const {midnightCheckInterval, shouldRefresh, fetchLeaderboards} = get();

    if (midnightCheckInterval) return;

    const intervalId = setInterval(() => {
      if (shouldRefresh()) {
        fetchLeaderboards(currentUserId);
      }
      set({nextUpdateAt: getNextMidnight()});
    }, 60000) as unknown as number;

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
}));
