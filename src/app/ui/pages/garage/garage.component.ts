import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState, EconomyState } from '../../../store/app.state';
import * as EconomyActions from '../../../store/economy/economy.actions';

@Component({
  selector: 'app-garage',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-content>
      <div class="garage-layout">
        <div class="header">
          <ion-button fill="clear" (click)="back()">
            <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
          </ion-button>
          <h2>GARAJ</h2>
          <div class="coin-display">
            <ion-icon name="cash"></ion-icon>
            {{ (economy$ | async)?.coins }}
          </div>
        </div>

        <div class="cars-grid">
          <div class="car-card" 
               *ngFor="let car of cars"
               [class.selected]="(economy$ | async)?.selectedCar === car.id"
               [class.locked]="!isUnlocked(car.id, (economy$ | async)?.unlockedCars)"
               (click)="selectOrBuy(car)">
            
            <div class="car-image-placeholder">
              <!-- In real app, render 3D thumb or img -->
              <img src="assets/ui/car_placeholder.png" alt="car">
            </div>

            <div class="car-info">
              <h3>{{ car.name }}</h3>
              
              <div *ngIf="isUnlocked(car.id, (economy$ | async)?.unlockedCars); else buyButton">
                <span class="status-text" *ngIf="(economy$ | async)?.selectedCar === car.id">SEÇİLDİ</span>
                <span class="status-text" *ngIf="(economy$ | async)?.selectedCar !== car.id">SAHİPSİN</span>
              </div>

              <ng-template #buyButton>
                <div class="price-tag">
                  <ion-icon name="cash"></ion-icon>
                  {{ car.price }}
                </div>
              </ng-template>
            </div>
            
            <div class="lock-overlay" *ngIf="!isUnlocked(car.id, (economy$ | async)?.unlockedCars)">
              <ion-icon name="lock-closed"></ion-icon>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .garage-layout {
      padding: 16px;
      padding-top: 40px; /* Safe area */
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      color: white;
    }

    .coin-display {
      background: rgba(0,0,0,0.5);
      padding: 5px 12px;
      border-radius: 15px;
      color: var(--park-warning);
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .cars-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .car-card {
      background: var(--park-surface);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      border: 2px solid transparent;
      transition: all 0.2s;

      &.selected {
        border-color: var(--park-success);
        box-shadow: 0 0 15px rgba(46, 204, 113, 0.3);
      }

      &.locked {
        opacity: 0.8;
      }
    }

    .car-image-placeholder {
      height: 100px;
      background: #2c3e50;
      display: flex;
      align-items: center;
      justify-content: center;
      
      img { width: 80%; opacity: 0.8; }
    }

    .car-info {
      padding: 10px;
      text-align: center;
      color: white;

      h3 { margin: 0 0 5px 0; font-size: 1rem; }
    }

    .price-tag {
      color: var(--park-warning);
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .status-text {
      font-size: 0.8rem;
      color: var(--park-text-secondary);
      
      &.selected { color: var(--park-success); }
    }

    .lock-overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      color: white;
      font-size: 1.2rem;
    }
  `]
})
export class GarageComponent implements OnInit {
  economy$: Observable<EconomyState>;

  // Mock car config (Prompt 10'da tanımlanmalıydı, burada yapıyorum)
  cars = [
    { id: 'sedan_basic', name: 'Sedan', price: 0 },
    { id: 'hatchback', name: 'Hatchback', price: 500 },
    { id: 'suv', name: 'SUV 4x4', price: 1200 },
    { id: 'sport', name: 'Sport GT', price: 2500 },
    { id: 'truck', name: 'Monster', price: 5000 }
  ];

  constructor(
    private router: Router,
    private store: Store<AppState>,
    private toastCtrl: ToastController
  ) {
    this.economy$ = this.store.select(state => state.economy);
  }

  ngOnInit() { }

  back() {
    this.router.navigate(['/menu']);
  }

  isUnlocked(carId: string, unlockedList: string[] | undefined): boolean {
    return unlockedList ? unlockedList.includes(carId) : false;
  }

  async selectOrBuy(car: any) {
    let state: EconomyState | undefined;
    this.economy$.subscribe(s => state = s).unsubscribe();

    if (!state) return;

    if (this.isUnlocked(car.id, state.unlockedCars)) {
      // Select
      this.store.dispatch(EconomyActions.selectCar({ carId: car.id }));
    } else {
      // Buy check
      if (state.coins >= car.price) {
        this.store.dispatch(EconomyActions.unlockCar({
          carId: car.id,
          cost: car.price,
          currency: 'coins'
        }));

        const toast = await this.toastCtrl.create({
          message: `${car.name} satın alındı!`,
          duration: 1500,
          color: 'success',
          position: 'top'
        });
        toast.present();
      } else {
        const toast = await this.toastCtrl.create({
          message: 'Yetersiz Para!',
          duration: 1500,
          color: 'danger',
          position: 'top'
        });
        toast.present();
      }
    }
  }
}
