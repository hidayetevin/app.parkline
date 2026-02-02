import { createReducer, on } from '@ngrx/store';
import { EconomyState } from '../app.state';
import * as EconomyActions from './economy.actions';

export const initialState: EconomyState = {
    coins: 0,
    gems: 0,
    unlockedCars: ['sedan_basic'], // Starter car
    selectedCar: 'sedan_basic',
    dailyReward: {
        lastClaimedDate: '',
        streakCount: 0
    },
    achievements: {}
};

export const economyReducer = createReducer(
    initialState,
    on(EconomyActions.addCoins, (state, { amount }) => ({
        ...state,
        coins: state.coins + amount
    })),
    on(EconomyActions.spendCoins, (state, { amount }) => ({
        ...state,
        coins: Math.max(0, state.coins - amount)
    })),
    on(EconomyActions.addGems, (state, { amount }) => ({
        ...state,
        gems: state.gems + amount
    })),
    on(EconomyActions.spendGems, (state, { amount }) => ({
        ...state,
        gems: Math.max(0, state.gems - amount)
    })),
    on(EconomyActions.unlockCar, (state, { carId, cost, currency }) => {
        if (state.unlockedCars.includes(carId)) return state;

        const newCoins = currency === 'coins' ? state.coins - cost : state.coins;
        const newGems = currency === 'gems' ? state.gems - cost : state.gems;

        return {
            ...state,
            coins: Math.max(0, newCoins),
            gems: Math.max(0, newGems),
            unlockedCars: [...state.unlockedCars, carId]
        };
    }),
    on(EconomyActions.selectCar, (state, { carId }) => ({
        ...state,
        selectedCar: carId
    })),
    on(EconomyActions.claimDailyReward, (state, { coins, gems }) => {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = new Date(state.dailyReward.lastClaimedDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const newStreak = state.dailyReward.lastClaimedDate === yesterdayStr
            ? state.dailyReward.streakCount + 1
            : 1;

        return {
            ...state,
            coins: state.coins + coins,
            gems: state.gems + gems,
            dailyReward: {
                lastClaimedDate: today,
                streakCount: newStreak
            }
        };
    }),
    on(EconomyActions.claimAchievement, (state, { achievementId, reward }) => ({
        ...state,
        coins: state.coins + reward.coins,
        gems: state.gems + reward.gems,
        achievements: {
            ...state.achievements,
            [achievementId]: {
                ...state.achievements[achievementId],
                claimed: true
            }
        }
    }))
);
