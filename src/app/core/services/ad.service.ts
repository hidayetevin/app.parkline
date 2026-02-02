import { Injectable } from '@angular/core';
import {
    AdMob,
    AdMobRewardItem,
    AdOptions,
    BannerAdPosition,
    BannerAdSize,
    RewardAdOptions,
    AdLoadInfo,
    InterstitialAdPluginEvents,
    RewardAdPluginEvents
} from '@capacitor-community/admob';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdService {
    private readonly interstitialId = 'ca-app-pub-3940256099942544/1033173712'; // Test ID
    private readonly rewardedId = 'ca-app-pub-3940256099942544/5224354917'; // Test ID
    private readonly bannerId = 'ca-app-pub-3940256099942544/6300978111'; // Test ID

    private isInterstitialReady = false;
    private isRewardedReady = false;
    private lastInterstitialTime = 0;
    private readonly INTERSTITIAL_COOLDOWN = 30000; // 30 seconds (Analysis Section 13.1)

    // Ad status subject
    public adStatus$ = new BehaviorSubject<string>('idle');

    constructor(private platform: Platform) { }

    /**
     * Initialize AdMob
     */
    async initialize(): Promise<void> {
        if (!this.platform.is('capacitor')) {
            console.log('AdMob skipped (web platform)');
            return;
        }

        try {
            await AdMob.initialize({
                requestTrackingAuthorization: true,
                testingDevices: ['EMULATOR'],
                initializeForTesting: true
            });

            this.setupListeners();

            // Preload ads
            await this.preloadInterstitial();
            await this.preloadRewarded();

            console.log('AdMob initialized');
        } catch (error) {
            console.error('AdMob initialization failed', error);
        }
    }

    /**
     * Setup ad event listeners
     */
    private setupListeners(): void {
        AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
            this.isInterstitialReady = true;
            this.adStatus$.next('interstitial_loaded');
        });

        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
            this.isInterstitialReady = false;
            this.preloadInterstitial(); // Load next one
            this.adStatus$.next('interstitial_dismissed');
        });

        AdMob.addListener(RewardAdPluginEvents.Loaded, (info: AdLoadInfo) => {
            this.isRewardedReady = true;
            this.adStatus$.next('rewarded_loaded');
        });

        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
            this.isRewardedReady = false;
            this.preloadRewarded(); // Load next one
            this.adStatus$.next('rewarded_dismissed');
        });
    }

    /**
     * Preload Interstitial Ad
     */
    private async preloadInterstitial(): Promise<void> {
        try {
            const options: AdOptions = {
                adId: this.interstitialId,
                isTesting: true
            };
            await AdMob.prepareInterstitial(options);
        } catch (error) {
            console.error('Failed to prepare interstitial', error);
        }
    }

    /**
     * Preload Rewarded Ad
     */
    private async preloadRewarded(): Promise<void> {
        try {
            const options: RewardAdOptions = {
                adId: this.rewardedId,
                isTesting: true
            };
            await AdMob.prepareRewardVideoAd(options);
        } catch (error) {
            console.error('Failed to prepare rewarded video', error);
        }
    }

    /**
     * Show Interstitial Ad (with cooldown check)
     * Analysis Section 13.1: Cooldown logic
     */
    async showInterstitial(): Promise<void> {
        if (!this.platform.is('capacitor')) {
            console.log('Mock Interstitial Shown');
            return;
        }

        const now = Date.now();
        if (now - this.lastInterstitialTime < this.INTERSTITIAL_COOLDOWN) {
            console.log('Interstitial cooldown active');
            return;
        }

        if (this.isInterstitialReady) {
            await AdMob.showInterstitial();
            this.lastInterstitialTime = now;
        } else {
            console.log('Interstitial not ready trying to load...');
            await this.preloadInterstitial();
        }
    }

    /**
     * Show Rewarded Video Ad
     * returns user earned reward or null if failed/cancelled
     */
    async showRewarded(): Promise<AdMobRewardItem | null> {
        if (!this.platform.is('capacitor')) {
            console.log('Mock Rewarded Video Shown');
            return { type: 'coin', amount: 100 }; // Mock reward
        }

        if (!this.isRewardedReady) {
            await this.preloadRewarded();
            return null;
        }

        return new Promise((resolve) => {
            const onReward = AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
                resolve(reward);
                onReward.remove(); // Cleanup listener
            });

            const onDismiss = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                // If dismissed without reward, this might race with onReward
                // Better logic handled by state but simple implementation for now
                setTimeout(() => resolve(null), 500);
                onDismiss.remove();
            });

            AdMob.showRewardVideoAd().catch(() => {
                onReward.remove();
                onDismiss.remove();
                resolve(null);
            });
        });
    }

    /**
     * Show Banner Ad
     */
    async showBanner(): Promise<void> {
        if (!this.platform.is('capacitor')) return;

        try {
            await AdMob.showBanner({
                adId: this.bannerId,
                adSize: BannerAdSize.BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: true
            });
        } catch (error) {
            console.error('Failed to show banner', error);
        }
    }

    /**
     * Hide Banner Ad
     */
    async hideBanner(): Promise<void> {
        if (!this.platform.is('capacitor')) return;
        await AdMob.hideBanner();
    }
}
