import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Store } from '@ngrx/store';
import * as EconomyActions from '../../store/economy/economy.actions';
import * as PlayerActions from '../../store/player/player.actions';

// Mock interface for IAP product
export interface IAPProduct {
    id: string;
    title: string;
    description: string;
    price: string;
    currency: string;
    owned: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class IAPService {
    // Available products
    private readonly PRODUCT_GEMS_SMALL = 'gems_small_100';
    private readonly PRODUCT_GEMS_MEDIUM = 'gems_medium_500';
    private readonly PRODUCT_NO_ADS = 'remove_ads';

    // Products state
    private products = new BehaviorSubject<IAPProduct[]>([
        { id: 'gems_small_100', title: '100 Gems', description: 'Small pile of gems', price: '$0.99', currency: 'USD', owned: false },
        { id: 'gems_medium_500', title: '500 Gems', description: 'Bag of gems', price: '$3.99', currency: 'USD', owned: false },
        { id: 'remove_ads', title: 'Remove Ads', description: 'Stop all ads permanently', price: '$2.99', currency: 'USD', owned: false }
    ]);

    public products$ = this.products.asObservable();

    constructor(
        private platform: Platform,
        private store: Store
    ) {
        this.initialize();
    }

    /**
     * Initialize IAP plugin
     */
    private initialize(): void {
        if (!this.platform.is('capacitor')) {
            console.log('IAP skipped (web platform)');
            return;
        }

        // TODO: Initialize specific IAP plugin (e.g., cordova-plugin-purchase)
        // For now, we simulate initialization
        console.log('IAP Service initialized');
    }

    /**
     * Restore purchases (e.g. on new device)
     */
    restorePurchases(): void {
        console.log('Restoring purchases...');
        // TODO: Implement restore logic
        // If 'remove_ads' is restored:
        // this.store.dispatch(PlayerActions.updateSettings({ key: 'noAds', value: true }));
    }

    /**
     * Buy a product
     */
    async buy(productId: string): Promise<boolean> {
        console.log(`Buying product: ${productId}`);

        // Simulate purchase delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock success logic
        const success = Math.random() > 0.1; // 90% success rate mock

        if (success) {
            this.handlePurchaseSuccess(productId);
            return true;
        } else {
            console.warn('Purchase failed');
            return false;
        }
    }

    /**
     * Handle successful purchase
     */
    private handlePurchaseSuccess(productId: string): void {
        console.log(`Processing purchase for: ${productId}`);

        switch (productId) {
            case this.PRODUCT_GEMS_SMALL:
                this.store.dispatch(EconomyActions.addGems({ amount: 100 }));
                break;

            case this.PRODUCT_GEMS_MEDIUM:
                this.store.dispatch(EconomyActions.addGems({ amount: 500 }));
                break;

            case this.PRODUCT_NO_ADS:
                // Assuming we add a 'noAds' setting to PlayerState later or handle via AdService
                console.log('Ads removed!');
                // this.adService.disableAds();
                break;
        }
    }
}
