import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Howl, Howler } from 'howler';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/app.state';

@Injectable({
    providedIn: 'root'
})
export class AudioService {
    // Sound effects
    private sounds: Map<string, Howl> = new Map();

    // Engine sound layers
    private engineIdle: Howl | null = null;
    private engineLow: Howl | null = null;
    private engineHigh: Howl | null = null;

    // Volume settings (from store)
    private masterVolume = 0.7;
    private sfxVolume = 0.8;

    // Engine sound state
    private currentSpeed = 0;
    private readonly MAX_SPEED = 20; // m/s

    constructor(private store: Store<AppState>) {
        this.initializeVolume();
    }

    /**
     * Initialize volume from store
     */
    private initializeVolume(): void {
        this.store.select(state => state.player.settings).subscribe(settings => {
            this.masterVolume = settings.masterVolume;
            this.sfxVolume = settings.sfxVolume;
            Howler.volume(this.masterVolume);
        });
    }

    /**
     * Preload all audio assets
     * Call during loading screen
     */
    async preloadAudio(): Promise<void> {
        const audioFiles = {
            // Engine sounds
            engine_idle: '/assets/audio/engine_idle.mp3',
            engine_low: '/assets/audio/engine_low.mp3',
            engine_high: '/assets/audio/engine_high.mp3',

            // SFX
            collision: '/assets/audio/collision.mp3',
            button_click: '/assets/audio/ui_click.mp3',
            level_complete: '/assets/audio/level_complete.mp3',
            level_fail: '/assets/audio/level_fail.mp3',
            coin: '/assets/audio/coin.mp3',
            achievement: '/assets/audio/achievement.mp3'
        };

        const promises = Object.entries(audioFiles).map(([key, src]) => {
            return new Promise<void>((resolve, reject) => {
                const sound = new Howl({
                    src: [src],
                    volume: this.sfxVolume,
                    onload: () => resolve(),
                    onloaderror: (id, error) => {
                        console.warn(`Failed to load audio: ${key}`, error);
                        resolve(); // Don't block on audio errors
                    }
                });

                this.sounds.set(key, sound);

                // Store engine layers separately for mixing
                if (key === 'engine_idle') this.engineIdle = sound;
                if (key === 'engine_low') this.engineLow = sound;
                if (key === 'engine_high') this.engineHigh = sound;
            });
        });

        await Promise.all(promises);
        console.log('Audio preloaded');
    }

    /**
     * Start engine sound (looping)
     */
    startEngine(): void {
        if (this.engineIdle) {
            this.engineIdle.loop(true);
            this.engineIdle.play();
        }

        if (this.engineLow) {
            this.engineLow.loop(true);
            this.engineLow.volume(0);
            this.engineLow.play();
        }

        if (this.engineHigh) {
            this.engineHigh.loop(true);
            this.engineHigh.volume(0);
            this.engineHigh.play();
        }
    }

    /**
     * Stop engine sound
     */
    stopEngine(): void {
        this.engineIdle?.stop();
        this.engineLow?.stop();
        this.engineHigh?.stop();
    }

    /**
     * Update engine sound based on car speed
     * Analysis Section 8.2: Cross-fade between layers
     */
    updateEngineSound(speed: number): void {
        this.currentSpeed = Math.abs(speed);

        if (!this.engineIdle || !this.engineLow || !this.engineHigh) return;

        const normalizedSpeed = Math.min(this.currentSpeed / this.MAX_SPEED, 1);

        if (normalizedSpeed < 0.3) {
            // Idle dominant
            this.engineIdle.volume(this.sfxVolume);
            this.engineLow.volume(normalizedSpeed * this.sfxVolume);
            this.engineHigh.volume(0);
        } else if (normalizedSpeed < 0.7) {
            // Low RPM dominant
            const fade = (normalizedSpeed - 0.3) / 0.4;
            this.engineIdle.volume((1 - fade) * this.sfxVolume);
            this.engineLow.volume(this.sfxVolume);
            this.engineHigh.volume(fade * this.sfxVolume);
        } else {
            // High RPM dominant
            const fade = (normalizedSpeed - 0.7) / 0.3;
            this.engineIdle.volume(0);
            this.engineLow.volume((1 - fade) * this.sfxVolume);
            this.engineHigh.volume(this.sfxVolume);
        }
    }

    /**
     * Play a sound effect once
     */
    playSFX(soundKey: string): void {
        const sound = this.sounds.get(soundKey);
        if (sound) {
            sound.volume(this.sfxVolume * this.masterVolume);
            sound.play();
        }
    }

    /**
     * Play collision sound with intensity-based volume
     * Analysis Section 8.3
     */
    playCollision(impactVelocity: number): void {
        const sound = this.sounds.get('collision');
        if (sound) {
            // Map impact (0-10 m/s) to volume (0.3-1.0)
            const volume = Math.min(1, 0.3 + (impactVelocity / 10) * 0.7);
            sound.volume(volume * this.sfxVolume * this.masterVolume);
            sound.play();
        }
    }

    /**
     * Trigger haptic feedback on collision
     * Analysis Section 8.4
     */
    async vibrateOnCollision(impactVelocity: number): Promise<void> {
        try {
            // Map impact to vibration intensity
            if (impactVelocity < 3) {
                await Haptics.impact({ style: ImpactStyle.Light });
            } else if (impactVelocity < 6) {
                await Haptics.impact({ style: ImpactStyle.Medium });
            } else {
                await Haptics.impact({ style: ImpactStyle.Heavy });
            }
        } catch (error) {
            // Haptics might not be available on all devices
            console.warn('Haptics not available', error);
        }
    }

    /**
     * Play UI button click
     */
    playButtonClick(): void {
        this.playSFX('button_click');
    }

    /**
     * Play level complete sound
     */
    playLevelComplete(): void {
        this.playSFX('level_complete');
    }

    /**
     * Play level fail sound
     */
    playLevelFail(): void {
        this.playSFX('level_fail');
    }

    /**
     * Play coin collect sound
     */
    playCoinCollect(): void {
        this.playSFX('coin');
    }

    /**
     * Play achievement unlock sound
     */
    playAchievement(): void {
        this.playSFX('achievement');
    }

    /**
     * Mute all audio
     */
    mute(): void {
        Howler.mute(true);
    }

    /**
     * Unmute all audio
     */
    unmute(): void {
        Howler.mute(false);
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        Howler.volume(this.masterVolume);
    }

    /**
     * Set SFX volume
     */
    setSFXVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
}
