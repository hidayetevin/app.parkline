import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import { AppState } from '../../store/app.state';
import * as GameActions from '../../store/game/game.actions';
import * as EconomyActions from '../../store/economy/economy.actions';
import * as PlayerActions from '../../store/player/player.actions';

interface SaveData {
    version: number;
    lastSaved: string;

    // Player data
    player: {
        settings: {
            masterVolume: number;
            sfxVolume: number;
            controlType: 'steering' | 'buttons';
            graphicsQuality: 'low' | 'medium' | 'high';
            language: string;
        };
    };

    // Economy data
    economy: {
        coins: number;
        gems: number;
        unlockedCars: string[];
        selectedCar: string;
        dailyReward: {
            lastClaimedDate: string;
            streakCount: number;
        };
        achievements: { [id: string]: { progress: number; completed: boolean; claimed: boolean } };
    };

    // Game progress
    game: {
        levelProgress: {
            [levelId: string]: {
                completed: boolean;
                bestStars: number;
                bestTime: number;
                attempts: number;
            };
        };
    };
}

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly SAVE_KEY = 'park_master_save_v1';
    private readonly CURRENT_VERSION = 1;

    constructor(private store: Store<AppState>) { }

    /**
     * Load saved data on app startup
     */
    async loadSaveData(): Promise<void> {
        try {
            const { value } = await Preferences.get({ key: this.SAVE_KEY });

            if (!value) {
                console.log('No save data found, starting fresh');
                return;
            }

            const saveData: SaveData = JSON.parse(value);

            // Check version compatibility
            if (saveData.version !== this.CURRENT_VERSION) {
                console.warn('Save data version mismatch, migrating...');
                // TODO: Implement migration logic
            }

            // Restore player settings
            Object.entries(saveData.player.settings).forEach(([key, val]) => {
                this.store.dispatch(PlayerActions.updateSettings({ key, value: val }));
            });

            // Restore economy
            this.store.dispatch(EconomyActions.addCoins({ amount: saveData.economy.coins }));
            this.store.dispatch(EconomyActions.addGems({ amount: saveData.economy.gems }));
            saveData.economy.unlockedCars.forEach(carId => {
                // Unlock without spending (already owned)
                this.store.dispatch(EconomyActions.unlockCar({ carId, cost: 0, currency: 'coins' }));
            });
            this.store.dispatch(EconomyActions.selectCar({ carId: saveData.economy.selectedCar }));

            // Restore game progress
            // (This would be done by loading levelProgress into state)

            console.log('Save data loaded successfully', saveData);
        } catch (error) {
            console.error('Failed to load save data:', error);
        }
    }

    /**
     * Save current game state
     * Call this after significant events (level complete, purchase, etc.)
     */
    async saveData(): Promise<void> {
        try {
            // Get current state from store
            let currentState: AppState | undefined;

            this.store.pipe(take(1)).subscribe(state => {
                currentState = state;
            });

            if (!currentState) {
                console.error('Failed to get current state');
                return;
            }

            const saveData: SaveData = {
                version: this.CURRENT_VERSION,
                lastSaved: new Date().toISOString(),

                player: {
                    settings: currentState.player.settings
                },

                economy: {
                    coins: currentState.economy.coins,
                    gems: currentState.economy.gems,
                    unlockedCars: currentState.economy.unlockedCars,
                    selectedCar: currentState.economy.selectedCar,
                    dailyReward: currentState.economy.dailyReward,
                    achievements: currentState.economy.achievements
                },

                game: {
                    levelProgress: currentState.game.levelProgress
                }
            };

            await Preferences.set({
                key: this.SAVE_KEY,
                value: JSON.stringify(saveData)
            });

            console.log('Game saved successfully');
        } catch (error) {
            console.error('Failed to save game:', error);
        }
    }

    /**
     * Clear all save data (for testing or account reset)
     */
    async clearSaveData(): Promise<void> {
        try {
            await Preferences.remove({ key: this.SAVE_KEY });
            console.log('Save data cleared');
        } catch (error) {
            console.error('Failed to clear save data:', error);
        }
    }

    /**
     * Check if save data exists
     */
    async hasSaveData(): Promise<boolean> {
        const { value } = await Preferences.get({ key: this.SAVE_KEY });
        return value !== null;
    }
}
