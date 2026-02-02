import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-game-result',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="modal-content" [class.success]="isSuccess" [class.fail]="!isSuccess">
      <div class="result-header">
        <h1>{{ isSuccess ? 'BÖLÜM TAMAMLANDI!' : 'BAŞARISIZ' }}</h1>
      </div>

      <div class="stars-container" *ngIf="isSuccess">
        <ion-icon [name]="stars >= 1 ? 'star' : 'star-outline'" class="star star-1"></ion-icon>
        <ion-icon [name]="stars >= 2 ? 'star' : 'star-outline'" class="star star-2"></ion-icon>
        <ion-icon [name]="stars >= 3 ? 'star' : 'star-outline'" class="star star-3"></ion-icon>
      </div>

      <div class="rewards" *ngIf="isSuccess">
        <div class="reward-item">
          <ion-icon name="cash"></ion-icon>
          <span>+{{ coins }}</span>
        </div>
      </div>

      <div class="fail-reason" *ngIf="!isSuccess">
        <p>{{ failReason }}</p>
      </div>

      <div class="buttons">
        <button class="park-btn secondary" (click)="home()">ANA MENÜ</button>
        <button class="park-btn secondary" (click)="retry()">TEKRAR</button>
        <button class="park-btn" *ngIf="isSuccess" (click)="next()">SONRAKİ</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: rgba(0,0,0,0.8);
    }

    .modal-content {
      width: 90%;
      max-width: 400px;
      padding: 30px;
      border-radius: 20px;
      background: var(--park-surface);
      text-align: center;
      border: 2px solid #333;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);

      &.success { border-color: var(--park-success); }
      &.fail { border-color: var(--park-danger); }
    }

    h1 {
      font-size: 2rem;
      font-weight: 900;
      margin: 0 0 20px 0;
      color: white;
      text-transform: uppercase;
    }

    .stars-container {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 20px;

      ion-icon {
        font-size: 3rem;
        color: #F1C40F;
        filter: drop-shadow(0 0 10px rgba(241, 196, 15, 0.5));
      }
    }

    .rewards {
      margin-bottom: 30px;
      .reward-item {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 2rem;
        font-weight: bold;
        color: var(--park-warning);
        background: rgba(0,0,0,0.3);
        padding: 10px 20px;
        border-radius: 50px;
      }
    }

    .fail-reason {
      color: var(--park-danger);
      font-size: 1.2rem;
      margin-bottom: 20px;
    }

    .buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .park-btn.secondary {
      background: #555;
      box-shadow: none;
    }
  `]
})
export class GameResultModalComponent implements OnInit {
  @Input() isSuccess: boolean = false;
  @Input() stars: number = 0;
  @Input() coins: number = 0;
  @Input() failReason: string = '';

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() { }

  home() {
    this.modalCtrl.dismiss({ action: 'home' });
  }

  retry() {
    this.modalCtrl.dismiss({ action: 'retry' });
  }

  next() {
    this.modalCtrl.dismiss({ action: 'next' });
  }
}
