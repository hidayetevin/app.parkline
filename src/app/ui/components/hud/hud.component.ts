import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-hud',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="hud-layer">
      <!-- Top Info Bar -->
      <div class="top-bar">
        <div class="level-info">Level {{ level }}</div>
        <div class="timer" [class.danger]="timeLeft < 10">{{ formatTime(timeLeft) }}</div>
        <ion-button fill="clear" color="light" (click)="pause.emit()">
          <ion-icon slot="icon-only" name="pause"></ion-icon>
        </ion-button>
      </div>

      <!-- Center Overlay (e.g. Tutorials) -->
      <div class="center-overlay">
        <ng-content></ng-content>
      </div>

      <!-- Controls -->
      <div class="controls-layer">
        <!-- Steering Wheel (Left) -->
        <div class="steering-area" 
             (touchstart)="startSteer($event)" 
             (touchmove)="moveSteer($event)" 
             (touchend)="endSteer()">
          <div class="steering-wheel" [style.transform]="'rotate(' + steeringAngle + 'deg)'">
             <!-- SVG Wheel -->
             <svg viewBox="0 0 100 100" class="wheel-svg">
               <circle cx="50" cy="50" r="45" stroke="white" stroke-width="4" fill="rgba(0,0,0,0.5)" />
               <rect x="45" y="5" width="10" height="20" fill="white" />
               <rect x="5" y="45" width="20" height="10" fill="white" />
               <rect x="75" y="45" width="20" height="10" fill="white" />
               <circle cx="50" cy="50" r="10" fill="#FF6B35" />
             </svg>
          </div>
        </div>

        <!-- Pedals (Right) -->
        <div class="pedals-area">
          <!-- Brake -->
          <button class="pedal brake-pedal" 
                  (touchstart)="emitBrake(1)" 
                  (touchend)="emitBrake(0)"
                  (mousedown)="emitBrake(1)" 
                  (mouseup)="emitBrake(0)">
            <div class="pedal-inner"></div>
          </button>

          <!-- Gas -->
          <button class="pedal gas-pedal" 
                  (touchstart)="emitGas(1)" 
                  (touchend)="emitGas(0)"
                  (mousedown)="emitGas(1)" 
                  (mouseup)="emitGas(0)">
            <div class="pedal-inner"></div>
          </button>
        </div>

        <!-- Gear Shift (Center Bottom) -->
        <div class="gear-shift" (click)="toggleGear.emit()">
          <div class="gear-box">
            <div [class.active]="gear === 'D'" class="gear-indicator">D</div>
            <div class="divider"></div>
            <div [class.active]="gear === 'R'" class="gear-indicator">R</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hud-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none; /* Let clicks pass through empty areas */
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 100;
    }

    .top-bar {
      pointer-events: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      padding-top: max(10px, env(safe-area-inset-top));
      background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%);
      color: white;
      font-weight: bold;
      font-size: 1.2rem;
    }

    .timer {
      font-family: monospace;
      font-size: 1.5rem;
      &.danger { color: var(--park-danger); animation: pulse 1s infinite; }
    }

    .controls-layer {
      pointer-events: auto;
      height: 180px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 20px;
      padding-bottom: max(20px, env(safe-area-inset-bottom));
    }

    /* Steering */
    .steering-area {
      width: 150px;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .steering-wheel {
      width: 120px;
      height: 120px;
      transition: transform 0.1s linear;
    }

    /* Pedals */
    .pedals-area {
      display: flex;
      gap: 20px;
    }

    .pedal {
      background: rgba(0,0,0,0.5);
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 10px;
      touch-action: none;
      
      &:active .pedal-inner { transform: scale(0.95); opacity: 1; }
    }

    .brake-pedal {
      width: 60px;
      height: 80px;
      .pedal-inner { background-color: #E74C3C; }
    }

    .gas-pedal {
      width: 50px;
      height: 120px;
      .pedal-inner { background-color: #2ECC71; }
    }

    .pedal-inner {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      opacity: 0.6;
      transition: all 0.1s;
    }

    /* Gear */
    .gear-shift {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
    }

    .gear-box {
      background: rgba(0,0,0,0.8);
      border-radius: 20px;
      padding: 5px;
      display: flex;
      border: 1px solid rgba(255,255,255,0.2);
    }

    .gear-indicator {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: bold;
      color: #666;
      
      &.active {
        background: var(--park-primary);
        color: white;
      }
    }

    .divider { width: 1px; background: #444; margin: 0 5px; }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `]
})
export class HudComponent {
  @Input() level: number = 1;
  @Input() timeLeft: number = 60;
  @Input() gear: string = 'D';

  @Output() steering = new EventEmitter<number>(); // -1 to 1
  @Output() gas = new EventEmitter<number>();
  @Output() brake = new EventEmitter<number>();
  @Output() toggleGear = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();

  steeringAngle = 0;
  private startX = 0;
  private currentRawRating = 0;

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  startSteer(event: TouchEvent) {
    this.startX = event.touches[0].clientX;
  }

  moveSteer(event: TouchEvent) {
    const deltaX = event.touches[0].clientX - this.startX;
    // Map delta (pixels) to steering range (-1 to 1)
    // Assume 150px drag is full lock
    const sensitivity = 0.01;
    let newVal = this.currentRawRating + (deltaX * sensitivity);

    // Clamp
    newVal = Math.max(-1, Math.min(1, newVal));

    // Reset start for continuous delta
    this.startX = event.touches[0].clientX;
    this.currentRawRating = newVal;

    // Visual rotation (-90 to 90 degrees)
    this.steeringAngle = newVal * 90;

    this.steering.emit(newVal);
  }

  endSteer() {
    // Auto center
    const interval = setInterval(() => {
      this.currentRawRating *= 0.8;
      this.steeringAngle = this.currentRawRating * 90;
      this.steering.emit(this.currentRawRating);

      if (Math.abs(this.currentRawRating) < 0.05) {
        this.currentRawRating = 0;
        this.steeringAngle = 0;
        this.steering.emit(0);
        clearInterval(interval);
      }
    }, 16);
  }

  emitGas(val: number) {
    this.gas.emit(val);
  }

  emitBrake(val: number) {
    this.brake.emit(val);
  }
}
