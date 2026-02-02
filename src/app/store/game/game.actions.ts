import { createAction, props } from '@ngrx/store';

export const startLevel = createAction(
    '[Game] Start Level',
    props<{ levelId: string }>()
);

export const completeLevel = createAction(
    '[Game] Complete Level',
    props<{ stars: number; coins: number; timeUsed: number }>()
);

export const failLevel = createAction(
    '[Game] Fail Level',
    props<{ reason: string }>()
);

export const pauseGame = createAction('[Game] Pause');

export const resumeGame = createAction('[Game] Resume');

export const exitToMenu = createAction('[Game] Exit To Menu');
