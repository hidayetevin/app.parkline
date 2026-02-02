import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState, GameState } from '../../../store/app.state';

@Component({
  selector: 'app-level-select',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-content>
      <div class="level-select-layout">
        <div class="header">
          <ion-button fill="clear" (click)="back()">
            <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
          </ion-button>
          <h2>BÖLÜMLER</h2>
          <div style="width: 48px"></div> <!-- Spacer -->
        </div>

        <div class="levels-grid">
          <div class="level-card" 
               *ngFor="let i of levels"
               [class.locked]="isLocked(i)"
               (click)="playLevel(i)">
            
            <span class="level-number">{{ i }}</span>
            
            <div class="stars" *ngIf="!isLocked(i)">
              <ion-icon [name]="getStar(i, 1)"></ion-icon>
              <ion-icon [name]="getStar(i, 2)"></ion-icon>
              <ion-icon [name]="getStar(i, 3)"></ion-icon>
            </div>

            <div class="lock-icon" *ngIf="isLocked(i)">
              <ion-icon name="lock-closed"></ion-icon>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .level-select-layout {
      padding: 16px;
      padding-top: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
      margin-bottom: 20px;
    }

    .levels-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .level-card {
      aspect-ratio: 1;
      background: var(--park-surface);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      position: relative;
      border: 1px solid rgba(255,255,255,0.1);

      &.locked {
        opacity: 0.5;
        background: #111;
      }

      &:active {
        transform: scale(0.95);
        background: var(--park-primary);
      }
    }

    .level-number {
      font-size: 1.5rem;
      font-weight: bold;
    }

    .stars {
      display: flex;
      margin-top: 4px;
      ion-icon { 
        color: #F1C40F; 
        font-size: 0.8rem;
      }
    }

    .lock-icon {
      position: absolute;
      font-size: 1.5rem;
      color: #666;
    }
  `]
})
export class LevelSelectComponent implements OnInit {
  levels = Array.from({ length: 50 }, (_, i) => i + 1); // 50 Levels
  game$: Observable<GameState>;

  // Mock progress (should come from store)
  progress: any = {};

  constructor(
    private router: Router,
    private store: Store<AppState>
  ) {
    this.game$ = this.store.select(state => state.game);
  }

  ngOnInit() {
    this.game$.subscribe(state => {
      this.progress = state.levelProgress;
    });
  }

  back() {
    this.router.navigate(['/menu']);
  }

  isLocked(level: number): boolean {
    if (level === 1) return false;
    // Check if previous level is completed
    const prevLevelId = `level_${level - 1}`;
    return !this.progress[prevLevelId]?.completed;
  }

  playLevel(level: number) {
    if (this.isLocked(level)) return;
    this.router.navigate(['/game'], { queryParams: { level } });
  }

  getStar(level: number, starIndex: number): string {
    const levelId = `level_${level}`;
    const stars = this.progress[levelId]?.bestStars || 0;
    return starIndex <= stars ? 'star' : 'star-outline';
  }
}
