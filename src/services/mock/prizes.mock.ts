import {Prize} from '../../types';

export const mockPrizes: Prize[] = [
  {
    id: 'prize_001',
    name: 'Pokemon TCG Booster Box',
    description:
      'Box completo di 36 bustine Pokemon Trading Card Game - Edizione Scarlatto e Violetto. Contiene carte rare, olografiche e la possibilit\u00e0 di trovare carte ultra rare!',
    imageUrl: 'https://via.placeholder.com/400x300/6C5CE7/FFFFFF?text=Pokemon+Box',
    value: 150,
    stock: 5,
    isActive: true,
  },
  {
    id: 'prize_002',
    name: 'Pokemon Elite Trainer Box',
    description:
      'Elite Trainer Box Pokemon con 9 bustine, dadi, segnalini danno, carta promo esclusiva e molto altro per i veri collezionisti!',
    imageUrl: 'https://via.placeholder.com/400x300/00CEC9/FFFFFF?text=Elite+Box',
    value: 60,
    stock: 10,
    isActive: true,
  },
  {
    id: 'prize_003',
    name: 'Pack 10 Bustine Pokemon',
    description:
      'Set di 10 bustine Pokemon TCG assortite. Mix di espansioni recenti per ampliare la tua collezione!',
    imageUrl: 'https://via.placeholder.com/400x300/FDCB6E/000000?text=10+Bustine',
    value: 45,
    stock: 20,
    isActive: true,
  },
  {
    id: 'prize_004',
    name: 'Pokemon Special Collection',
    description:
      'Collezione speciale Pokemon con carta promo jumbo, 4 bustine e un esclusivo pin da collezione.',
    imageUrl: 'https://via.placeholder.com/400x300/FF7675/FFFFFF?text=Special+Box',
    value: 35,
    stock: 15,
    isActive: true,
  },
  {
    id: 'prize_005',
    name: 'Pokemon Tin Box',
    description:
      'Tin metallico da collezione con 4 bustine Pokemon e carta promo esclusiva in versione olografica.',
    imageUrl: 'https://via.placeholder.com/400x300/00B894/FFFFFF?text=Tin+Box',
    value: 25,
    stock: 25,
    isActive: true,
  },
];

export const getCurrentPrize = (): Prize => {
  return mockPrizes[0];
};
