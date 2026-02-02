import { createAction, props } from '@ngrx/store';

export const addCoins = createAction(
    '[Economy] Add Coins',
    props<{ amount: number }>()
);

export const spendCoins = createAction(
    '[Economy] Spend Coins',
    props<{ amount: number }>()
);

export const addGems = createAction(
    '[Economy] Add Gems',
    props<{ amount: number }>()
);

export const spendGems = createAction(
    '[Economy] Spend Gems',
    props<{ amount: number }>()
);

export const unlockCar = createAction(
    '[Economy] Unlock Car',
    props<{ carId: string; cost: number; currency: 'coins' | 'gems' }>()
);

export const selectCar = createAction(
    '[Economy] Select Car',
    props<{ carId: string }>()
);

export const claimDailyReward = createAction(
    '[Economy] Claim Daily Reward',
    props<{ coins: number; gems: number }>()
);

export const claimAchievement = createAction(
    '[Economy] Claim Achievement',
    props<{ achievementId: string; reward: { coins: number; gems: number } }>()
);
