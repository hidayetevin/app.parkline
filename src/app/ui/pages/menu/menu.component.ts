import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState, EconomyState } from '../../../store/app.state';
import { CarShowcaseComponent } from '../../../shared/components/car-showcase/car-showcase.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, IonicModule, CarShowcaseComponent],
  template: `
    <ion-content>
      <div class="menu-layout">
        <!-- Header -->
        <div class="menu-header">
          <div class="currency-badge">
            <ion-icon name="cash-outline"></ion-icon>
            <span>{{ (economy$ | async)?.coins }}</span>
          </div>
          <div class="currency-badge gems">
            <ion-icon name="diamond-outline"></ion-icon>
            <span>{{ (economy$ | async)?.gems }}</span>
          </div>
        </div>

        <!-- Title -->
        <div class="game-title animate-slide-up">
          <h1>PARK<br>MASTER</h1>
        </div>

        <!-- Car Showcase (Center) -->
        <div class="showcase-wrapper animate-slide-up" style="animation-delay: 0.1s;">
          <app-car-showcase [carId]="(economy$ | async)?.selectedCar || 'sedan_basic'"></app-car-showcase>
        </div>

        <!-- Buttons -->
        <div class="menu-buttons animate-slide-up" style="animation-delay: 0.2s;">
          <button class="park-btn play-btn" (click)="play()">
            OYNA
          </button>
          
          <div class="secondary-buttons">
            <button class="park-btn icon-btn" (click)="garage()">
              <ion-icon name="car-sport-outline"></ion-icon>
              GARAJ
            </button>
            <button class="park-btn icon-btn">
              <ion-icon name="settings-outline"></ion-icon>
              AYARLAR
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .menu-layout {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      background: linear-gradient(180deg, var(--park-bg) 0%, var(--park-surface) 100%);
    }

    .menu-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 10px;
    }

    .currency-badge {
      background: rgba(0,0,0,0.5);
      border-radius: 20px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--park-warning);
      font-weight: bold;
      
      &.gems {
        color: #9B59B6;
      }

      ion-icon { font-size: 1.2rem; }
    }

    .game-title {
      text-align: center;
      h1 {
        font-size: 3.5rem;
        font-weight: 900;
        margin: 0;
        line-height: 0.9;
        font-style: italic;
        background: -webkit-linear-gradient(45deg, var(--park-primary), #FFD700);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 4px 0 rgba(0,0,0,0.3));
      }
    }

    .showcase-wrapper {
      width: 100%;
      height: 40%;
      position: relative;
    }

    .menu-buttons {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .play-btn {
      width: 100%;
      height: 70px;
      font-size: 1.8rem;
      background: linear-gradient(45deg, var(--park-primary), #FF4500);
      border: none;
      color: white;
    }

    .secondary-buttons {
      display: flex;
      gap: 12px;
      
      button {
        flex: 1;
        height: 50px;
        background: var(--park-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 0 rgba(0,0,0,0.2);
      }
    }
  `]
})
export class MenuComponent implements OnInit {
  economy$: Observable<EconomyState>;

  constructor(
    private router: Router,
    private store: Store<AppState>
  ) {
    this.economy$ = this.store.select(state => state.economy);
  }

  ngOnInit() {
    // Add ions icons (need to register if not using full build, usually ionic-module handles it)
  }

  play() {
    this.router.navigate(['/levels']);
  }

  garage() {
    this.router.navigate(['/garage']);
  }
}
