import { createAction, props } from '@ngrx/store';

export const updateSettings = createAction(
    '[Player] Update Settings',
    props<{ key: string; value: any }>()
);

export const setLanguage = createAction(
    '[Player] Set Language',
    props<{ language: string }>()
);

export const setVolume = createAction(
    '[Player] Set Volume',
    props<{ volumeType: 'master' | 'sfx'; volume: number }>()
);

export const setControlType = createAction(
    '[Player] Set Control Type',
    props<{ controlType: 'steering' | 'buttons' }>()
);

export const setGraphicsQuality = createAction(
    '[Player] Set Graphics Quality',
    props<{ quality: 'low' | 'medium' | 'high' }>()
);
