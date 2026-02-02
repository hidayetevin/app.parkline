export interface AppState {
  game: GameState;
  economy: EconomyState;
  player: PlayerState;
  ui: UIState;
}

export interface GameState {
  currentLevel: string | null;
  gameStatus: 'menu' | 'playing' | 'paused' | 'complete';
  levelProgress: { [levelId: string]: LevelProgress };
}

export interface LevelProgress {
  completed: boolean;
  bestStars: number;
  bestTime: number;
  attempts: number;
}

export interface EconomyState {
  coins: number;
  gems: number;
  unlockedCars: string[];
  selectedCar: string;
  dailyReward: {
    lastClaimedDate: string;
    streakCount: number;
  };
  achievements: { [id: string]: AchievementProgress };
}

export interface AchievementProgress {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface PlayerState {
  settings: {
    masterVolume: number;
    sfxVolume: number;
    controlType: 'steering' | 'buttons';
    graphicsQuality: 'low' | 'medium' | 'high';
    language: string;
  };
}

export interface UIState {
  modals: {
    [key: string]: boolean;
  };
  toasts: ToastMessage[];
}

export interface ToastMessage {
  id: string;
  message: string;
  duration: number;
}
