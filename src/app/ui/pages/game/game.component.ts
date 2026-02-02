import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store/app.state';
import { SceneManager } from '../../../game/managers/scene.manager';
import { LevelManager } from '../../../game/managers/level.manager';
import { GameRulesManager } from '../../../game/managers/game-rules.manager';
import { AssetManager } from '../../../game/managers/asset.manager';
import { HudComponent } from '../../components/hud/hud.component';
import * as GameActions from '../../../store/game/game.actions';
import { TutorialManager } from '../../../game/managers/tutorial.manager';
import { Observable } from 'rxjs';
import { GameResultModalComponent } from '../../modals/game-result/game-result.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, IonicModule, HudComponent],
  template: `
    <div class="game-container">
      <canvas #renderCanvas></canvas>
      
      <app-hud 
        [level]="currentLevelIndex"
        [timeLeft]="timeLeft"
        [gear]="currentGear"
        (steering)="onSteer($event)"
        (gas)="onGas($event)"
        (brake)="onBrake($event)"
        (toggleGear)="onToggleGear()"
        (pause)="onPause()">
      </app-hud>
      
      <!-- Tutorial Overlay -->
      <div class="tutorial-overlay" *ngIf="(tutorialStep$ | async) as step">
        <div class="tutorial-card" *ngIf="step !== 'completed' && step !== 'none'">
          <div class="hint-text">
            <span *ngIf="step === 'steer'">Yön vermek için direksiyonu çevir</span>
            <span *ngIf="step === 'gas'">İlerlemek için gaza bas</span>
            <span *ngIf="step === 'brake'">Durmak için frene bas</span>
            <span *ngIf="step === 'gear'">Geri gitmek için vitesi "R"ye al</span>
          </div>
          <ion-button size="small" (click)="skipTutorial()">GEÇ</ion-button>
        </div>

        <!-- Pointers -->
        <div class="pointer steer-pointer" *ngIf="step === 'steer'">👈</div>
        <div class="pointer gas-pointer" *ngIf="step === 'gas'">👉</div>
        <div class="pointer brake-pointer" *ngIf="step === 'brake'">👉</div>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>LEVEL YÜKLENİYOR...</p>
      </div>
    </div>
  `,
  styles: [`
    .game-container {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* Tutorial Styles */
    .tutorial-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 150;
      pointer-events: none; /* Text/cards block clicks, overlay itself doesn't */
    }

    .tutorial-card {
      pointer-events: auto;
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      color: white;
      border: 2px solid var(--park-primary);
      animation: bounce In 0.5s;

      .hint-text { margin-bottom: 10px; font-size: 1.2rem; font-weight: bold; }
    }

    .pointer {
      position: absolute;
      font-size: 3rem;
      animation: pulsePointer 1s infinite;
      text-shadow: 0 0 10px yellow;
    }

    .steer-pointer { bottom: 80px; left: 80px; }
    .gas-pointer { bottom: 80px; right: 40px; }
    .brake-pointer { bottom: 80px; right: 100px; }

    @keyframes pulsePointer {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .loading-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: var(--park-bg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 200;
      color: white;

      .spinner {
        width: 50px; height: 50px;
        border: 5px solid rgba(255,255,255,0.3);
        border-top-color: var(--park-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild('renderCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  currentLevelIndex = 1;
  isLoading = true;
  timeLeft = 60;
  currentGear = 'D';

  tutorialStep$: Observable<any>;

  // Game Loop Interval for UI updates
  private uiInterval: any;

  // Control State
  private controls = { steer: 0, gas: 0, brake: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sceneManager: SceneManager,
    private levelManager: LevelManager,
    private rulesManager: GameRulesManager,
    private assetManager: AssetManager,
    private store: Store<AppState>,
    private modalCtrl: ModalController,
    private tutorialManager: TutorialManager
  ) {
    this.tutorialStep$ = this.tutorialManager.currentStep$;
  }

  async ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.currentLevelIndex = params['level'] ? parseInt(params['level']) : 1;
      this.startGame();
    });
  }

  ngOnDestroy() {
    this.sceneManager.dispose();
    clearInterval(this.uiInterval);
  }

  async startGame() {
    this.isLoading = true;

    // 1. Initialize Scene
    this.sceneManager.initialize(this.canvasRef.nativeElement);

    // 2. Load Level
    const levelBlueprint = this.levelManager.getLevel(this.currentLevelIndex);

    // 3. Load Assets (Car)
    // TODO: Get selected car from store
    const carId = 'sedan_basic';
    const carMesh = await this.assetManager.loadCar(carId);

    // 4. Build Level in Scene
    const levelObjects = this.levelManager.buildLevel(
      levelBlueprint,
      this.sceneManager.getScene(),
      this.sceneManager.getPhysicsWorld()
    );

    // 5. Create Car in Scene
    this.sceneManager.createCar(carMesh);

    // 6. Start Rules
    const carController = this.sceneManager.getCarController();
    if (carController) {
      this.rulesManager.startLevel(
        carController,
        levelObjects.parkingZone,
        this.sceneManager.getPhysicsWorld(),
        levelBlueprint.timeLimit,
        levelBlueprint.angleTolerance
      );
    }

    // 7. Start Loop
    this.sceneManager.start();
    this.startUIUpdate();

    // 8. Check Tutorial
    if (this.currentLevelIndex === 1) {
      this.tutorialManager.startTutorial();
    }

    this.isLoading = false;
    this.store.dispatch(GameActions.startLevel({ levelId: levelBlueprint.id }));
  }

  startUIUpdate() {
    this.uiInterval = setInterval(() => {
      this.rulesManager.update();
      this.timeLeft = Math.floor(this.rulesManager.getRemainingTime());

      // Sync controls to logic
      this.sceneManager.setCarControls(
        this.controls.gas,
        this.controls.brake,
        this.controls.steer
      );

      // Check game over
      if (!this.rulesManager.isActive() && !this.isLoading) {
        this.handleLevelEnd();
      }
    }, 1000 / 30); // 30 FPS UI update
  }

  async handleLevelEnd() {
    clearInterval(this.uiInterval);

    // Determine result status
    // TODO: Get real data from GameRulesManager/Store
    const isSuccess = true; // Placeholder, logic should come from RulesManager

    const modal = await this.modalCtrl.create({
      component: GameResultModalComponent,
      componentProps: {
        isSuccess: isSuccess,
        stars: 3,
        coins: 100,
        failReason: isSuccess ? '' : 'Süre Doldu'
      },
      backdropDismiss: false,
      cssClass: 'game-result-modal'
    });

    await modal.present();

    // Record success for hints
    if (isSuccess) this.tutorialManager.recordSuccess();

    const { data } = await modal.onDidDismiss();

    if (data) {
      if (data.action === 'home') {
        this.router.navigate(['/menu']);
      } else if (data.action === 'retry') {
        this.startGame();
      } else if (data.action === 'next') {
        this.currentLevelIndex++;
        this.startGame();
        this.router.navigate([], { queryParams: { level: this.currentLevelIndex } });
      }
    }
  }

  // Input Handlers
  onSteer(val: number) {
    this.controls.steer = val;
    if (Math.abs(val) > 0.5) this.tutorialManager.nextStep(); // Advance tutorial
  }

  onGas(val: number) {
    this.controls.gas = val;
    if (val > 0.5 && this.tutorialManager.currentStep$.value === 'gas') this.tutorialManager.nextStep();
  }

  onBrake(val: number) {
    this.controls.brake = val;
    if (val > 0.5 && this.tutorialManager.currentStep$.value === 'brake') this.tutorialManager.nextStep();
  }

  onToggleGear() {
    this.sceneManager.toggleCarGear();
    this.currentGear = this.currentGear === 'D' ? 'R' : 'D';
    if (this.tutorialManager.currentStep$.value === 'gear') this.tutorialManager.nextStep();
  }

  onPause() {
    // TODO: Pause logic
    alert('Paused');
  }

  skipTutorial() {
    this.tutorialManager.completeTutorial();
  }
}
