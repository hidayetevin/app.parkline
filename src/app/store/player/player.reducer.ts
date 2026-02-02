import { createReducer, on } from '@ngrx/store';
import { PlayerState } from '../app.state';
import * as PlayerActions from './player.actions';

export const initialState: PlayerState = {
    settings: {
        masterVolume: 0.7,
        sfxVolume: 0.8,
        controlType: 'steering',
        graphicsQuality: 'medium',
        language: 'tr'
    }
};

export const playerReducer = createReducer(
    initialState,
    on(PlayerActions.updateSettings, (state, { key, value }) => ({
        ...state,
        settings: {
            ...state.settings,
            [key]: value
        }
    })),
    on(PlayerActions.setLanguage, (state, { language }) => ({
        ...state,
        settings: {
            ...state.settings,
            language
        }
    })),
    on(PlayerActions.setVolume, (state, { volumeType, volume }) => {
        const key = volumeType === 'master' ? 'masterVolume' : 'sfxVolume';
        return {
            ...state,
            settings: {
                ...state.settings,
                [key]: Math.max(0, Math.min(1, volume))
            }
        };
    }),
    on(PlayerActions.setControlType, (state, { controlType }) => ({
        ...state,
        settings: {
            ...state.settings,
            controlType
        }
    })),
    on(PlayerActions.setGraphicsQuality, (state, { quality }) => ({
        ...state,
        settings: {
            ...state.settings,
            graphicsQuality: quality
        }
    }))
);
