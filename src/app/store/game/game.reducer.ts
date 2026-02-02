import { createReducer, on } from '@ngrx/store';
import { GameState } from '../app.state';
import * as GameActions from './game.actions';

export const initialState: GameState = {
    currentLevel: null,
    gameStatus: 'menu',
    levelProgress: {}
};

export const gameReducer = createReducer(
    initialState,
    on(GameActions.startLevel, (state, { levelId }) => ({
        ...state,
        currentLevel: levelId,
        gameStatus: 'playing' as const
    })),
    on(GameActions.completeLevel, (state, { stars, coins, timeUsed }) => {
        const levelId = state.currentLevel;
        if (!levelId) return state;

        const currentProgress = state.levelProgress[levelId];
        const bestStars = currentProgress ? Math.max(currentProgress.bestStars, stars) : stars;
        const bestTime = currentProgress ? Math.min(currentProgress.bestTime, timeUsed) : timeUsed;

        return {
            ...state,
            gameStatus: 'complete' as const,
            levelProgress: {
                ...state.levelProgress,
                [levelId]: {
                    completed: true,
                    bestStars,
                    bestTime,
                    attempts: (currentProgress?.attempts || 0) + 1
                }
            }
        };
    }),
    on(GameActions.failLevel, (state) => {
        const levelId = state.currentLevel;
        if (!levelId) return state;

        const currentProgress = state.levelProgress[levelId];
        return {
            ...state,
            levelProgress: {
                ...state.levelProgress,
                [levelId]: {
                    ...(currentProgress || { completed: false, bestStars: 0, bestTime: 0 }),
                    attempts: (currentProgress?.attempts || 0) + 1
                }
            }
        };
    }),
    on(GameActions.pauseGame, (state) => ({
        ...state,
        gameStatus: 'paused' as const
    })),
    on(GameActions.resumeGame, (state) => ({
        ...state,
        gameStatus: 'playing' as const
    })),
    on(GameActions.exitToMenu, (state) => ({
        ...state,
        currentLevel: null,
        gameStatus: 'menu' as const
    }))
);
