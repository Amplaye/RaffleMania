import {LeaderboardEntry} from '../../types';

// Nomi italiani per i mock
const italianNames = [
  'Marco Rossi', 'Giulia Bianchi', 'Alessandro Ferrari', 'Francesca Romano',
  'Luca Colombo', 'Sara Ricci', 'Andrea Marino', 'Valentina Greco',
  'Matteo Fontana', 'Chiara Conti', 'Davide Gallo', 'Elena Mazza',
  'Simone De Luca', 'Martina Costa', 'Federico Giordano', 'Giorgia Rizzo',
  'Lorenzo Lombardi', 'Alessia Moretti', 'Riccardo Barbieri', 'Silvia Santoro',
  'Giovanni Bruno', 'Anna Pellegrino', 'Michele Caruso', 'Laura Ferrara',
  'Stefano Esposito', 'Roberta Marini', 'Paolo Gentile', 'Monica Leone',
  'Fabio Longo', 'Claudia Serra', 'Antonio Fabbri', 'Elisa Martinelli',
  'Daniele Orlando', 'Federica Vitale', 'Roberto Coppola', 'Serena Giuliani',
  'Alberto Gatti', 'Ilaria Grasso', 'Nicola Parisi', 'Veronica Benedetti',
  'Emanuele Sala', 'Arianna Mariani', 'Giacomo Bernardi', 'Beatrice Riva',
  'Tommaso Ferraro', 'Camilla Monti', 'Pietro Amato', 'Marta Bianco',
  'Filippo Cattaneo', 'Rebecca Farina', 'Cristian Palmieri', 'Greta Battaglia',
  'Enrico Donati', 'Noemi Santini', 'Mirko De Santis', 'Aurora Negri',
  'Salvatore Messina', 'Giada Villa', 'Vincenzo Palumbo', 'Alice Marchetti',
  'Claudio D\'Angelo', 'Irene Testa', 'Massimo Guerra', 'Sofia Fiore',
  'Maurizio Basile', 'Emma Caputo', 'Oscar Ruggiero', 'Ludovica Sorrentino',
  'Carlo Silvestri', 'Margherita Galli', 'Piero Mancini', 'Vanessa Rossetti',
  'Franco De Rosa', 'Erika Valentini', 'Bruno Pagano', 'Jessica Ferretti',
  'Sergio Sartori', 'Sabrina Neri', 'Valerio Rizzi', 'Caterina Piras',
  'Diego Morelli', 'Paola Carbone', 'Mario Monti', 'Lisa Bellini',
  'Aldo Landi', 'Teresa Montanari', 'Guido Franco', 'Pamela Grassi',
  'Umberto Vitali', 'Simona De Angelis', 'Renato Marchese', 'Cinzia Pellegrini',
  'Alfredo Martino', 'Barbara Romagnoli', 'Enzo Costantini', 'Patrizia Barone',
  'Luciano Olivieri', 'Debora Rossini', 'Sandro Genovese', 'Antonella Mele',
];

// Genera avatar URL placeholder
const getAvatarUrl = (index: number): string => {
  const gender = index % 2 === 0 ? 'men' : 'women';
  return `https://randomuser.me/api/portraits/${gender}/${index % 100}.jpg`;
};

// Genera un livello casuale basato sulla posizione (migliori = livelli più alti)
const getLevelForRank = (rank: number): number => {
  if (rank <= 5) return Math.floor(Math.random() * 3) + 18; // 18-20
  if (rank <= 10) return Math.floor(Math.random() * 3) + 15; // 15-17
  if (rank <= 25) return Math.floor(Math.random() * 4) + 11; // 11-14
  if (rank <= 50) return Math.floor(Math.random() * 4) + 7; // 7-10
  return Math.floor(Math.random() * 6) + 1; // 1-6
};

// Genera mock data per la leaderboard ads
const generateAdsLeaderboard = (): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];
  let previousValue = 5000 + Math.floor(Math.random() * 1000);

  for (let i = 0; i < 100; i++) {
    // Genera valori decrescenti con variazione
    const decrease = Math.floor(Math.random() * 50) + 10;
    previousValue = Math.max(100, previousValue - decrease);

    entries.push({
      id: `ads_entry_${i}`,
      rank: i + 1,
      userId: `user_${String(i + 100).padStart(3, '0')}`,
      displayName: italianNames[i] || `Utente ${i + 1}`,
      avatarUrl: getAvatarUrl(i),
      level: getLevelForRank(i + 1),
      value: previousValue,
    });
  }

  return entries;
};

// Genera mock data per la leaderboard vincite
const generateWinsLeaderboard = (): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];
  let previousValue = 50 + Math.floor(Math.random() * 20);

  for (let i = 0; i < 100; i++) {
    // Genera valori decrescenti
    if (i > 0 && Math.random() > 0.7) {
      previousValue = Math.max(1, previousValue - 1);
    }

    entries.push({
      id: `wins_entry_${i}`,
      rank: i + 1,
      userId: `user_${String(i + 200).padStart(3, '0')}`,
      displayName: italianNames[(i + 50) % 100] || `Utente ${i + 1}`,
      avatarUrl: getAvatarUrl((i + 50) % 100),
      level: getLevelForRank(i + 1),
      value: previousValue,
    });
  }

  return entries;
};

// Cache delle leaderboard (simulate server data)
let cachedAdsLeaderboard: LeaderboardEntry[] | null = null;
let cachedWinsLeaderboard: LeaderboardEntry[] | null = null;
let lastAdsUpdateTime = 0;
let lastWinsUpdateTime = 0;

// Simula piccole variazioni nei dati per dare l'effetto di aggiornamento real-time
const applyRandomVariations = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
  return entries.map(entry => ({
    ...entry,
    // Piccola variazione casuale nel valore (simula attività utenti)
    value: entry.value + (Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0),
  })).sort((a, b) => b.value - a.value).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};

// Ottieni leaderboard ads con simulazione di aggiornamento
export const getAdsLeaderboard = (currentUserId?: string): LeaderboardEntry[] => {
  const now = Date.now();

  // Rigenera o applica variazioni ogni 30 secondi
  if (!cachedAdsLeaderboard || now - lastAdsUpdateTime > 30000) {
    if (!cachedAdsLeaderboard) {
      cachedAdsLeaderboard = generateAdsLeaderboard();
    } else {
      cachedAdsLeaderboard = applyRandomVariations(cachedAdsLeaderboard);
    }
    lastAdsUpdateTime = now;
  }

  // Marca l'utente corrente se presente
  return cachedAdsLeaderboard.map(entry => ({
    ...entry,
    isCurrentUser: entry.userId === currentUserId,
  }));
};

// Ottieni leaderboard vincite con simulazione di aggiornamento
export const getWinsLeaderboard = (currentUserId?: string): LeaderboardEntry[] => {
  const now = Date.now();

  if (!cachedWinsLeaderboard || now - lastWinsUpdateTime > 30000) {
    if (!cachedWinsLeaderboard) {
      cachedWinsLeaderboard = generateWinsLeaderboard();
    } else {
      cachedWinsLeaderboard = applyRandomVariations(cachedWinsLeaderboard);
    }
    lastWinsUpdateTime = now;
  }

  return cachedWinsLeaderboard.map(entry => ({
    ...entry,
    isCurrentUser: entry.userId === currentUserId,
  }));
};

// Ottieni la posizione dell'utente corrente nella leaderboard
export const getCurrentUserRank = (
  type: 'ads' | 'wins',
  userId: string,
  userValue: number,
): number | null => {
  const leaderboard = type === 'ads' ? getAdsLeaderboard() : getWinsLeaderboard();

  // Cerca se l'utente è già in classifica
  const existingEntry = leaderboard.find(e => e.userId === userId);
  if (existingEntry) {
    return existingEntry.rank;
  }

  // Calcola la posizione teorica basata sul valore
  const rank = leaderboard.filter(e => e.value > userValue).length + 1;
  return rank <= 100 ? rank : null; // null se fuori dalla top 100
};

// Inserisce l'utente corrente nella leaderboard se non presente
export const injectCurrentUser = (
  entries: LeaderboardEntry[],
  currentUser: {
    id: string;
    displayName: string;
    level: number;
    value: number;
    avatarUrl?: string;
  },
): LeaderboardEntry[] => {
  // Verifica se l'utente è già presente
  const existingIndex = entries.findIndex(e => e.userId === currentUser.id);
  if (existingIndex !== -1) {
    return entries.map((e, i) => i === existingIndex ? {...e, isCurrentUser: true, avatarUrl: currentUser.avatarUrl || e.avatarUrl} : e);
  }

  // Calcola la posizione dell'utente
  const userRank = entries.filter(e => e.value > currentUser.value).length + 1;

  if (userRank > 100) {
    // Utente fuori dalla top 100, non lo aggiungiamo
    return entries;
  }

  // Crea entry per l'utente
  const userEntry: LeaderboardEntry = {
    id: `current_user_entry`,
    rank: userRank,
    userId: currentUser.id,
    displayName: currentUser.displayName,
    level: currentUser.level,
    value: currentUser.value,
    avatarUrl: currentUser.avatarUrl,
    isCurrentUser: true,
  };

  // Inserisci e riordina
  const newEntries = [...entries];
  newEntries.splice(userRank - 1, 0, userEntry);

  // Aggiorna i rank e limita a 100
  return newEntries.slice(0, 100).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};
