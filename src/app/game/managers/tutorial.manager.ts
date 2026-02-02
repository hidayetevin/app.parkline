import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

export type TutorialStep = 'none' | 'steer' | 'gas' | 'brake' | 'gear' | 'completed';

@Injectable({
    providedIn: 'root'
})
export class TutorialManager {
    private readonly TUTORIAL_KEY = 'park_master_tutorial_v1';

    // Current tutorial step subject
    public currentStep$ = new BehaviorSubject<TutorialStep>('none');

    // Hint system state
    private failCount = 0;
    private timeSpentWithoutSuccess = 0; // seconds

    constructor() {
        this.checkTutorialStatus();
    }

    /**
     * Check if tutorial has been completed before
     */
    private async checkTutorialStatus() {
        const { value } = await Preferences.get({ key: this.TUTORIAL_KEY });
        if (!value) {
            // First time user
            console.log('Tutorial not completed. Starting tutorial flow.');
            // We don't start immediately, GameComponent will trigger it
        } else {
            this.currentStep$.next('completed');
        }
    }

    /**
     * Start the interactive tutorial
     */
    startTutorial() {
        if (this.currentStep$.value === 'completed') return;

        this.currentStep$.next('steer');
    }

    /**
     * Advance to next step
     */
    nextStep() {
        const current = this.currentStep$.value;

        switch (current) {
            case 'steer':
                this.currentStep$.next('gas');
                break;
            case 'gas':
                this.currentStep$.next('brake');
                break;
            case 'brake':
                this.currentStep$.next('gear');
                break;
            case 'gear':
                this.completeTutorial();
                break;
        }
    }

    /**
     * Mark tutorial as completed
     */
    async completeTutorial() {
        this.currentStep$.next('completed');
        await Preferences.set({ key: this.TUTORIAL_KEY, value: 'true' });
    }

    /**
     * Reset tutorial (for testing)
     */
    async resetTutorial() {
        await Preferences.remove({ key: this.TUTORIAL_KEY });
        this.currentStep$.next('none');
    }

    // --- ADAPTIVE HINTS SYSTEM ---

    /**
     * Record a level failure
     */
    recordFailure() {
        this.failCount++;
        this.checkHints();
    }

    /**
     * Record successful level
     */
    recordSuccess() {
        this.failCount = 0;
        this.timeSpentWithoutSuccess = 0;
    }

    /**
     * Check if user needs a hint
     */
    private checkHints() {
        if (this.failCount >= 3) {
            this.showHint('Çok hızlı gidiyorsun! Fren kullanmayı dene.');
            this.failCount = 0; // Reset after showing hint
        }
    }

    /**
     * Analysis Section 9.4: Adaptive Hints
     */
    showHint(message: string) {
        // Ideally use a ToastService or dispatch UI action
        console.log(`HINT: ${message}`);
        // This will be caught by GameComponent to show UI toast
    }
}
