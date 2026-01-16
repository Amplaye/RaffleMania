import {Prize} from '../../types';

export const mockPrizes: Prize[] = [
  {
    id: 'prize_001',
    name: 'Pikachu VMAX',
    description: 'Carta Pokemon TCG Pikachu VMAX - Edizione Vivid Voltage',
    imageUrl: 'https://images.pokemontcg.io/swsh4/44_hires.png',
    value: 150,
    stock: 5,
    isActive: true,
    currentAds: 347,
    goalAds: 1000,
  },
  {
    id: 'prize_002',
    name: 'Charizard VMAX',
    description: 'Carta Pokemon TCG Charizard VMAX - Edizione Darkness Ablaze',
    imageUrl: 'https://images.pokemontcg.io/swsh3/20_hires.png',
    value: 500,
    stock: 3,
    isActive: true,
    currentAds: 892,
    goalAds: 2000,
  },
  {
    id: 'prize_003',
    name: 'Umbreon VMAX',
    description: 'Carta Pokemon TCG Umbreon VMAX - Edizione Evolving Skies',
    imageUrl: 'https://images.pokemontcg.io/swsh7/95_hires.png',
    value: 200,
    stock: 4,
    isActive: true,
    currentAds: 156,
    goalAds: 800,
  },
  {
    id: 'prize_004',
    name: 'Gengar VMAX',
    description: 'Carta Pokemon TCG Gengar VMAX - Edizione Fusion Strike',
    imageUrl: 'https://images.pokemontcg.io/swsh8/157_hires.png',
    value: 120,
    stock: 6,
    isActive: true,
    currentAds: 423,
    goalAds: 600,
  },
  {
    id: 'prize_005',
    name: 'Rayquaza VMAX',
    description: 'Carta Pokemon TCG Rayquaza VMAX - Edizione Evolving Skies',
    imageUrl: 'https://images.pokemontcg.io/swsh7/111_hires.png',
    value: 180,
    stock: 4,
    isActive: true,
    currentAds: 78,
    goalAds: 500,
  },
];

export const getCurrentPrize = (): Prize => {
  return mockPrizes[0];
};
