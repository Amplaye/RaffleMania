import {create} from 'zustand';

// Avatar definitions - unlocked by level
export interface Avatar {
  id: string;
  name: string;
  icon: string; // Ionicons name
  unlockLevel: number;
  color: string;
}

// Frame definitions - unlocked by level
export interface Frame {
  id: string;
  name: string;
  unlockLevel: number;
  colors: string[]; // Gradient colors
  borderWidth: number;
}

// Available avatars
export const AVATARS: Avatar[] = [
  {id: 'avatar_1', name: 'Principiante', icon: 'person', unlockLevel: 1, color: '#FF6B00'},
  {id: 'avatar_2', name: 'Gatto', icon: 'paw', unlockLevel: 2, color: '#9B59B6'},
  {id: 'avatar_3', name: 'Fulmine', icon: 'flash', unlockLevel: 3, color: '#F1C40F'},
  {id: 'avatar_4', name: 'Guerriero', icon: 'shield', unlockLevel: 4, color: '#3498DB'},
  {id: 'avatar_5', name: 'Fiamma', icon: 'flame', unlockLevel: 5, color: '#E74C3C'},
  {id: 'avatar_6', name: 'Diamante', icon: 'diamond', unlockLevel: 6, color: '#1ABC9C'},
  {id: 'avatar_7', name: 'Razzo', icon: 'rocket', unlockLevel: 7, color: '#E91E63'},
  {id: 'avatar_8', name: 'Corona', icon: 'medal', unlockLevel: 8, color: '#FFD700'},
  {id: 'avatar_9', name: 'Stella', icon: 'star', unlockLevel: 9, color: '#FF9500'},
  {id: 'avatar_10', name: 'Leggenda', icon: 'trophy', unlockLevel: 10, color: '#FF6B00'},
];

// Available frames
export const FRAMES: Frame[] = [
  {id: 'frame_1', name: 'Semplice', unlockLevel: 1, colors: ['#666666', '#444444'], borderWidth: 2},
  {id: 'frame_2', name: 'Bronzo', unlockLevel: 2, colors: ['#CD7F32', '#8B4513'], borderWidth: 3},
  {id: 'frame_3', name: 'Argento', unlockLevel: 3, colors: ['#C0C0C0', '#A9A9A9'], borderWidth: 3},
  {id: 'frame_4', name: 'Oro', unlockLevel: 4, colors: ['#FFD700', '#FFA500'], borderWidth: 3},
  {id: 'frame_5', name: 'Platino', unlockLevel: 5, colors: ['#E5E4E2', '#BCC6CC'], borderWidth: 4},
  {id: 'frame_6', name: 'Smeraldo', unlockLevel: 6, colors: ['#50C878', '#228B22'], borderWidth: 4},
  {id: 'frame_7', name: 'Rubino', unlockLevel: 7, colors: ['#E0115F', '#9B111E'], borderWidth: 4},
  {id: 'frame_8', name: 'Zaffiro', unlockLevel: 8, colors: ['#0F52BA', '#082567'], borderWidth: 4},
  {id: 'frame_9', name: 'Arcobaleno', unlockLevel: 9, colors: ['#FF6B6B', '#4ECDC4', '#FFE66D'], borderWidth: 5},
  {id: 'frame_10', name: 'Divino', unlockLevel: 10, colors: ['#FF6B00', '#FF8C00', '#FFD700'], borderWidth: 5},
];

interface AvatarState {
  selectedAvatarId: string;
  selectedFrameId: string;
  customPhotoUri: string | null;

  // Actions
  setAvatar: (avatarId: string) => void;
  setFrame: (frameId: string) => void;
  setCustomPhoto: (uri: string | null) => void;
  clearCustomPhoto: () => void;
  getSelectedAvatar: () => Avatar;
  getSelectedFrame: () => Frame;
  getUnlockedAvatars: (userLevel: number) => Avatar[];
  getUnlockedFrames: (userLevel: number) => Frame[];
  isAvatarUnlocked: (avatarId: string, userLevel: number) => boolean;
  isFrameUnlocked: (frameId: string, userLevel: number) => boolean;
  isUsingCustomPhoto: () => boolean;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  selectedAvatarId: 'avatar_1',
  selectedFrameId: 'frame_1',
  customPhotoUri: null,

  setAvatar: (avatarId: string) => {
    set({selectedAvatarId: avatarId, customPhotoUri: null});
  },

  setFrame: (frameId: string) => {
    set({selectedFrameId: frameId});
  },

  setCustomPhoto: (uri: string | null) => {
    set({customPhotoUri: uri});
  },

  clearCustomPhoto: () => {
    set({customPhotoUri: null});
  },

  getSelectedAvatar: () => {
    const {selectedAvatarId} = get();
    return AVATARS.find(a => a.id === selectedAvatarId) || AVATARS[0];
  },

  getSelectedFrame: () => {
    const {selectedFrameId} = get();
    return FRAMES.find(f => f.id === selectedFrameId) || FRAMES[0];
  },

  getUnlockedAvatars: (userLevel: number) => {
    return AVATARS.filter(avatar => avatar.unlockLevel <= userLevel);
  },

  getUnlockedFrames: (userLevel: number) => {
    return FRAMES.filter(frame => frame.unlockLevel <= userLevel);
  },

  isAvatarUnlocked: (avatarId: string, userLevel: number) => {
    const avatar = AVATARS.find(a => a.id === avatarId);
    return avatar ? avatar.unlockLevel <= userLevel : false;
  },

  isFrameUnlocked: (frameId: string, userLevel: number) => {
    const frame = FRAMES.find(f => f.id === frameId);
    return frame ? frame.unlockLevel <= userLevel : false;
  },

  isUsingCustomPhoto: () => {
    const {customPhotoUri} = get();
    return customPhotoUri !== null;
  },
}));
