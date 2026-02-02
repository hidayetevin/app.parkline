# Mobile Car Parking Game — Complete Technical & Design Analysis v2.0
**Platform:** Android & iOS  
**Tech Stack:** Angular + Capacitor + Three.js  
**Mode:** Single-player  
**Monetization:** AdMob (Interstitial + Rewarded) + IAP  
**Status:** Production-Ready Blueprint

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Technology Stack](#2-core-technology-stack)
3. [Technical Architecture](#3-technical-architecture)
4. [Game Design Summary](#4-game-design-summary)
5. [Player Retention & Psychology](#5-player-retention--psychology)
6. [Level System & Difficulty](#6-level-system--difficulty)
7. [Controls & Input](#7-controls--input)
8. [Audio System](#8-audio-system)
9. [Tutorial & Onboarding](#9-tutorial--onboarding)
10. [Economy & Progression](#10-economy--progression)
11. [Screens & UX Flow](#11-screens--ux-flow)
12. [UI/UX Design System](#12-uiux-design-system)
13. [Monetization Strategy](#13-monetization-strategy)
14. [Analytics & Metrics](#14-analytics--metrics)
15. [Performance Optimization](#15-performance-optimization)
16. [Asset Management](#16-asset-management)
17. [Save System](#17-save-system)
18. [Release Readiness](#18-release-readiness)
19. [Post-Launch Strategy](#19-post-launch-strategy)
20. [Final Notes](#20-final-notes)

---

## 1. Project Overview

This document provides a comprehensive end-to-end analysis of a mobile car parking game built using web technologies (Three.js) and wrapped with Capacitor for native deployment. The focus is on performance, retention, scalability, and store readiness.

**Core Value Proposition:**
- Realistic 3D parking simulation
- Progressive difficulty curve
- Extensive vehicle collection (15 cars)
- Daily engagement mechanics
- Balanced monetization (ads + IAP)

---

## 2. Core Technology Stack

### 2.1 Framework & Runtime
- **Angular 17+**: UI, state management, screens
- **Capacitor 6**: Native bridge, storage, ads, builds
- **Three.js r158+**: 3D rendering engine
- **Cannon-es**: Physics engine (lightweight)
- **TypeScript**: Core language
- **Ionic Framework**: UI components

### 2.2 Why This Stack Works
- ✅ Single codebase for Android & iOS
- ✅ Full control vs Unity (smaller bundle size)
- ✅ Lightweight builds (<80MB)
- ✅ Web-based iteration speed
- ✅ Easy debugging (Chrome DevTools)
- ✅ No licensing fees

### 2.3 Stack Limitations & Mitigations
**Limitations:**
- Lower raw performance vs native engines
- Manual optimization required
- Limited asset pipeline tools

**Mitigations:**
- Aggressive polygon budgets (50-80k tris)
- Device-tier profiling
- Texture atlasing
- Memory management discipline

---

## 3. Technical Architecture

### 3.1 State Management: NgRx

**Decision:** Full NgRx implementation for scalable state management.

```typescript
// Root State Structure
interface AppState {
  game: GameState;
  economy: EconomyState;
  player: PlayerState;
  settings: SettingsState;
  ui: UIState;
}

// Game State
interface GameState {
  currentLevel: string | null;
  levelProgress: { [levelId: string]: LevelProgress };
  activeScene: THREE.Scene | null;
  gameStatus: 'menu' | 'playing' | 'paused' | 'complete';
}

// Economy State
interface EconomyState {
  currency: {
    coins: number;
    gems: number;
  };
  cars: {
    unlocked: string[];
    selected: string;
  };
  dailyReward: {
    lastClaimedDate: string;
    streakCount: number;
  };
  achievements: { [id: string]: Achievement };
  dailyChallenge: DailyChallenge;
  iap: {
    adFree: boolean;
    vipActive: boolean;
    purchasedProducts: string[];
  };
}

// Actions (Examples)
export const startLevel = createAction('[Game] Start Level', props<{levelId: string}>());
export const completeLevel = createAction('[Game] Complete Level', props<{stars: number, coins: number}>());
export const addCoins = createAction('[Economy] Add Coins', props<{amount: number}>());
export const unlockCar = createAction('[Cars] Unlock', props<{carId: string, currency: 'coins' | 'gems'}>());

// Effects (Auto-save example)
@Injectable()
export class EconomyEffects {
  addCoins$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addCoins),
      withLatestFrom(this.store.select(selectCoins)),
      tap(([action, currentCoins]) => {
        const newTotal = currentCoins + action.amount;
        Storage.set({ key: 'coins', value: String(newTotal) });
      })
    ),
    { dispatch: false }
  );
}
```

**Benefits:**
- Predictable state updates
- Time-travel debugging (Redux DevTools)
- Easy testing
- Scales to 100+ levels

---

### 3.2 Asset Management

**Strategy:** Hybrid caching with lazy loading

```typescript
@Injectable({ providedIn: 'root' })
export class AssetManager {
  private carCache = new LRUCache<string, CarModel>(3); // Max 3 cars
  private levelCache = new LRUCache<string, LevelData>(2); // Max 2 levels
  
  async loadCar(carId: string): Promise<CarModel> {
    // Check cache
    if (this.carCache.has(carId)) {
      return this.carCache.get(carId);
    }
    
    // Load from file
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/assets/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    
    const gltf = await gltfLoader.loadAsync(`/assets/cars/${carId}.glb`);
    const carModel = this.processCar(gltf);
    
    // Cache it
    this.carCache.set(carId, carModel);
    
    return carModel;
  }
  
  private processCar(gltf: GLTF): CarModel {
    // Optimize materials
    gltf.scene.traverse(child => {
      if (child instanceof THREE.Mesh) {
        // Use lightweight materials
        child.material = new THREE.MeshLambertMaterial({
          map: child.material.map,
          color: child.material.color
        });
        
        // Optimize textures
        if (child.material.map) {
          child.material.map.minFilter = THREE.LinearFilter;
          child.material.map.generateMipmaps = false;
        }
      }
    });
    
    return {
      scene: gltf.scene,
      animations: gltf.animations,
      metadata: this.extractMetadata(gltf)
    };
  }
  
  disposeLevel(levelData: LevelData): void {
    // Dispose geometries
    levelData.meshes.forEach(mesh => {
      mesh.geometry.dispose();
      
      // Dispose materials and textures
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => this.disposeMaterial(mat));
      } else {
        this.disposeMaterial(mesh.material);
      }
    });
    
    // Clear physics bodies
    levelData.physicsBodies.forEach(body => {
      this.physicsWorld.removeBody(body);
    });
    
    // Null references
    levelData.meshes = null;
    levelData.physicsBodies = null;
  }
  
  private disposeMaterial(material: THREE.Material): void {
    if (material.map) material.map.dispose();
    material.dispose();
  }
}
```

**Asset Specifications:**
- **Car models:** 10-15k triangles, GLB format with Draco compression
- **Textures:** 512-1024px, no mipmaps
- **File size:** 2-3MB per car (compressed), 1-2MB per level
- **Total initial download:** 50-80MB APK/IPA

---

### 3.3 Memory Management

**Critical for mobile stability:**

```typescript
class SceneManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  
  switchLevel(newLevelId: string): void {
    // 1. Dispose current level
    this.disposeCurrentLevel();
    
    // 2. Force garbage collection hint
    if (window.gc) window.gc();
    
    // 3. Load new level
    this.loadLevel(newLevelId);
  }
  
  private disposeCurrentLevel(): void {
    // Traverse and dispose
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    // Clear scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }
  
  // Monitor memory (dev mode)
  logMemoryUsage(): void {
    const info = this.renderer.info;
    console.log('Memory:', {
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs.length
    });
    
    if (info.memory.geometries > 100) {
      console.error('⚠️ Memory leak detected!');
    }
  }
}
```

---

## 4. Game Design Summary

### 4.1 Player Perspective
- **Camera:** Third-person, following car
- **View angles:** 
  - Default: Behind car (elevated)
  - Reverse parking: Auto-switch to rear view
- **Controls:** Touch-based, intuitive
- **Realism level:** Balanced (realistic physics, forgiving controls)

### 4.2 Core Mechanics

**Parking Success Criteria:**
1. Car within designated zone (yellow lines)
2. Angle tolerance: ±5° to ±20° (difficulty-based)
3. Time limit: 30s to unlimited (difficulty-based)
4. Damage tolerance: Visual damage OK, extreme crashes fail

**Failure Conditions:**
- Time runs out
- Extreme collision (massive damage)
- Car falls off platform (if applicable)

**Penalty Logic:**
- Minor collisions: -1 star, visual damage
- Time over 50%: -1 star
- Multiple hits: Cumulative star reduction
- NO instant game over (encourages completion)

---

### 4.3 Star Rating System

```typescript
calculateStars(result: LevelResult): number {
  let stars = 3; // Start with perfect
  
  // Collision penalty
  if (result.collisionCount > 0) {
    stars -= 1;
  }
  
  // Time penalty
  if (result.timeUsed > result.timeLimit * 0.7) {
    stars -= 1;
  }
  
  // Angle penalty
  if (result.finalAngleError > 10) {
    stars -= 1;
  }
  
  return Math.max(0, stars);
}
```

**Star Meanings:**
- ⭐ **1 Star:** Level completed (any condition)
- ⭐⭐ **2 Stars:** Clean parking (few collisions OR good time)
- ⭐⭐⭐ **3 Stars:** Perfect parking (no collisions AND fast AND precise angle)

---

## 5. Player Retention & Psychology

### 5.1 Retention Layers

**Immediate (Session-based):**
- Instant feedback on controls
- Satisfying physics responses
- Clear visual progress indicators
- Short level completion times (1-3 minutes)

**Short-term (Daily):**
- Daily reward streak system
- Daily challenge (single task)
- Achievement progress notifications
- New level unlocks

**Medium-term (Weekly):**
- Car unlocking progression
- Achievement hunting
- Skill mastery (3-star chasing)
- Currency accumulation for desired cars

**Long-term (Monthly):**
- Complete vehicle collection
- Master all levels perfectly
- Rare achievement unlocks
- Skill-based satisfaction

### 5.2 Psychological Hooks

**Variable Rewards:**
- Loot-box style daily rewards (7-day cycle)
- Random daily challenges
- Surprising achievement unlocks

**Loss Aversion:**
- Streak systems (don't break the chain!)
- Almost-unlocked cars (just 200 more coins!)
- Incomplete achievements (9/10 perfect parks)

**Mastery Progression:**
- Clear skill improvement over time
- Difficulty curve matches skill growth
- 3-star system shows room for improvement

**Social Proof (Future):**
- Best times leaderboard (optional)
- Share 3-star achievements

---

## 6. Level System & Difficulty

### 6.1 Level Generator System

**Why Generator?**
- Reduce manual design cost
- Infinite scalability
- Easy difficulty tuning
- A/B testing capability

```typescript
interface LevelBlueprint {
  id: string;
  difficulty: number; // 1-10
  parkingType: 'straight' | 'reverse' | 'angled' | 'parallel';
  areaSize: number; // meters (width)
  timeLimit: number; // seconds
  obstacleCount: number;
  angleTolerance: number; // degrees ±
  environmentTheme: 'parking_lot' | 'street' | 'garage' | 'mall';
}

function generateDifficulty(levelIndex: number): number {
  // Gradual increase with oscillation
  const base = Math.min(10, Math.floor(levelIndex / 5) + 1);
  const oscillation = levelIndex % 5 === 4 ? -1 : 0; // Every 5th level easier
  return Math.max(1, base + oscillation);
}

function generateLevel(index: number): LevelBlueprint {
  const difficulty = generateDifficulty(index);
  
  return {
    id: `level_${index}`,
    difficulty,
    parkingType: selectParkingType(difficulty),
    areaSize: 12 - difficulty, // 11m (easy) to 2m (hard)
    timeLimit: Math.max(30, 70 - difficulty * 4),
    obstacleCount: Math.floor(difficulty / 2),
    angleTolerance: Math.max(5, 25 - difficulty * 2),
    environmentTheme: selectTheme(index)
  };
}

function selectParkingType(difficulty: number): string {
  if (difficulty <= 3) return 'straight';
  if (difficulty <= 6) return 'reverse';
  if (difficulty <= 8) return 'angled';
  return 'parallel';
}
```

### 6.2 Difficulty Progression Table

| Level Range | Difficulty | Area Size | Time Limit | Obstacles | Angle Tol | Type |
|-------------|-----------|-----------|------------|-----------|-----------|------|
| 1-5 | 1-2 | 10-11m | 60-70s | 0-1 | ±20° | Straight |
| 6-10 | 3-4 | 8-9m | 50-55s | 1-2 | ±15° | Straight/Reverse |
| 11-15 | 5-6 | 6-7m | 40-45s | 2-3 | ±10° | Reverse/Angled |
| 16-20 | 7-8 | 4-5m | 35-40s | 3-4 | ±8° | Angled |
| 21-30 | 9-10 | 2-3m | 30-35s | 4-5 | ±5° | Parallel |

### 6.3 Hybrid System: Handcrafted + Generated

```typescript
const LEVEL_CONFIG = {
  handcrafted: [1, 2, 3, 4, 5, 10, 15, 20, 25], // Tutorial + milestones
  generated: 'rest' // All others
};

function getLevel(index: number): LevelBlueprint {
  if (LEVEL_CONFIG.handcrafted.includes(index)) {
    return loadHandcraftedLevel(index);
  }
  return generateLevel(index);
}
```

---

## 7. Controls & Input

### 7.1 Control Schemes

**Primary: Steering Wheel (Default)**
```typescript
class SteeringWheelControl {
  private wheelCenter: THREE.Vector2;
  private currentAngle = 0;
  private maxAngle = 45; // degrees
  
  onTouchMove(touch: Touch): void {
    const touchPos = new THREE.Vector2(touch.clientX, touch.clientY);
    const delta = touchPos.sub(this.wheelCenter);
    
    // Calculate angle
    const angle = Math.atan2(delta.y, delta.x) * 180 / Math.PI;
    this.currentAngle = THREE.MathUtils.clamp(angle, -this.maxAngle, this.maxAngle);
    
    // Apply steering
    this.car.steeringAngle = this.currentAngle / this.maxAngle; // -1 to 1
  }
}
```

**Alternative: Button Controls**
```typescript
// Simple button-based
<button (touchstart)="steerLeft()" (touchend)="steerStop()">←</button>
<button (touchstart)="steerRight()" (touchend)="steerStop()">→</button>

steerLeft(): void {
  this.car.steeringInput = -1;
}

steerRight(): void {
  this.car.steeringInput = 1;
}
```

### 7.2 Dynamic Sensitivity

```typescript
class CarController {
  updateSteering(input: number, speed: number): void {
    // Lower sensitivity at high speeds
    const speedFactor = THREE.MathUtils.mapLinear(
      Math.abs(speed),
      0, this.maxSpeed,
      1.0, 0.3 // Full sensitivity at 0, 30% at max speed
    );
    
    const adjustedInput = input * speedFactor;
    this.applySteeringForce(adjustedInput);
  }
}
```

### 7.3 Auto-Brake Feature

```typescript
// Prevent rolling when no input
class CarPhysics {
  update(deltaTime: number): void {
    if (!this.gasPressed && !this.brakePressed) {
      // Auto-brake when idle
      const velocity = this.body.velocity.length();
      if (velocity < 0.5) {
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
      }
    }
  }
}
```

---

## 8. Audio System

### 8.1 Audio Architecture

**Library:** Howler.js (mobile-optimized)

```typescript
@Injectable({ providedIn: 'root' })
export class AudioService {
  private sounds = new Map<string, Howl>();
  private engineSounds: {
    idle: Howl;
    lowRpm: Howl;
    highRpm: Howl;
  };
  
  constructor(private store: Store) {
    this.initAudio();
    
    // Listen to volume settings
    this.store.select(selectMasterVolume).subscribe(vol => {
      Howler.volume(vol);
    });
  }
  
  private initAudio(): void {
    // Engine sounds (layered)
    this.engineSounds = {
      idle: new Howl({
        src: ['/assets/audio/engine_idle.mp3'],
        loop: true,
        volume: 0.3
      }),
      lowRpm: new Howl({
        src: ['/assets/audio/engine_low.mp3'],
        loop: true,
        volume: 0
      }),
      highRpm: new Howl({
        src: ['/assets/audio/engine_high.mp3'],
        loop: true,
        volume: 0
      })
    };
    
    // Start all engine loops (volume controlled dynamically)
    Object.values(this.engineSounds).forEach(sound => sound.play());
    
    // Load other sounds
    this.loadSound('bump_soft', '/assets/audio/bump_soft.mp3');
    this.loadSound('bump_medium', '/assets/audio/bump_medium.mp3');
    this.loadSound('crash_heavy', '/assets/audio/crash_heavy.mp3');
    this.loadSound('button_click', '/assets/audio/button_click.mp3');
    this.loadSound('level_complete', '/assets/audio/level_complete.mp3');
    this.loadSound('star_earned', '/assets/audio/star_earned.mp3');
    this.loadSound('car_unlock', '/assets/audio/car_unlock.mp3');
    this.loadSound('parking_ambient', '/assets/audio/parking_ambient.mp3', true);
  }
  
  private loadSound(id: string, src: string, loop = false): void {
    const sound = new Howl({
      src: [src],
      loop,
      html5: true // Stream large files
    });
    this.sounds.set(id, sound);
  }
  
  updateEngineSound(speed: number, maxSpeed: number): void {
    const normalizedSpeed = speed / maxSpeed; // 0 to 1
    
    if (normalizedSpeed < 0.3) {
      // Idle dominant
      this.engineSounds.idle.volume(1);
      this.engineSounds.lowRpm.volume(normalizedSpeed * 2);
      this.engineSounds.highRpm.volume(0);
    } else if (normalizedSpeed < 0.7) {
      // Low RPM dominant
      this.engineSounds.idle.volume(0.3);
      this.engineSounds.lowRpm.volume(1);
      this.engineSounds.highRpm.volume((normalizedSpeed - 0.3) * 2);
    } else {
      // High RPM dominant
      this.engineSounds.idle.volume(0);
      this.engineSounds.lowRpm.volume(0.5);
      this.engineSounds.highRpm.volume(1);
    }
  }
  
  playCollision(impact: number): void {
    let soundId: string;
    
    if (impact < 5) {
      soundId = 'bump_soft';
    } else if (impact < 15) {
      soundId = 'bump_medium';
    } else {
      soundId = 'crash_heavy';
    }
    
    const sound = this.sounds.get(soundId);
    sound?.play();
    
    // Haptic feedback
    if (this.hapticEnabled) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  }
  
  play(id: string, volume = 1.0): void {
    const sound = this.sounds.get(id);
    sound?.volume(volume);
    sound?.play();
  }
  
  stopAll(): void {
    this.sounds.forEach(sound => sound.stop());
    Object.values(this.engineSounds).forEach(sound => sound.stop());
  }
}
```

### 8.2 Audio File Specifications

| Sound Type | Files | Format | Size (Each) | Total |
|-----------|-------|--------|-------------|-------|
| Engine | 3 loops | MP3 128kbps | ~100KB | 300KB |
| Collisions | 3 files | MP3 128kbps | ~50KB | 150KB |
| UI | 7 files | MP3 128kbps | ~20-30KB | 200KB |
| Ambient | 1 loop | MP3 128kbps | ~500KB | 500KB |
| **Total** | | | | **~1.15MB** |

### 8.3 Haptic Feedback

**Trigger Points:**
- Collision (vibration duration = impact * 50ms)
- Star earned (short pulse)
- Level complete (success pattern)

```typescript
async vibrateOnCollision(impact: number): Promise<void> {
  const duration = Math.min(500, impact * 50);
  await Haptics.vibrate({ duration });
}
```

---

## 9. Tutorial & Onboarding

### 9.1 Strategy: Progressive Disclosure

**Philosophy:** Introduce features when user needs them, not all at once.

### 9.2 First Launch Flow

```typescript
// Step 1: Welcome Screen (5 seconds)
<div class="welcome-screen">
  <h1>Park Master'a Hoş Geldin! 🚗</h1>
  <p>Park etmeyi öğrenmeye hazır mısın?</p>
  <button class="btn-primary" (click)="startTutorial()">Başla</button>
  <button class="btn-text" (click)="skipTutorial()">Tutorial'ı Atla</button>
</div>

// Step 2: Interactive Overlay Tutorial (30 seconds)
showControlTutorial(): void {
  const steps = [
    {
      highlight: 'steering-wheel',
      text: 'Direksiyonu sürükleyerek dön',
      waitForAction: 'steering_used'
    },
    {
      highlight: 'gas-button',
      text: 'Gaz pedalına bas',
      waitForAction: 'gas_pressed'
    },
    {
      highlight: 'brake-button',
      text: 'Fren pedalına bas',
      waitForAction: 'brake_pressed'
    },
    {
      highlight: 'gear-button',
      text: 'Vitesi değiştir (İleri/Geri)',
      waitForAction: 'gear_changed'
    }
  ];
  
  this.tutorialService.runInteractiveTutorial(steps);
}

// Step 3: First Level (Integrated Tutorial)
LEVEL_1_CONFIG = {
  areaSize: 20, // Very large
  timeLimit: Infinity, // No time pressure
  obstacles: 0,
  hint: "Sarı alana park et! 🅿️",
  autoCompleteOnApproach: true // Success when close enough
};
```

### 9.3 Progressive Feature Introduction

```typescript
// After first level complete
onFirstLevelComplete(): void {
  this.showModal({
    title: 'Tebrikler! 🎉',
    message: 'İlk parkını tamamladın! Her gün giriş yaparak bonus kazan!',
    actions: [
      { label: 'Günlük Ödül', action: () => this.openDailyReward() },
      { label: 'Anladım', action: () => this.dismissModal() }
    ]
  });
}

// After 3-4 levels
onLevel4Complete(): void {
  this.showToast({
    message: '💡 İpucu: Başarımlar kazanarak ekstra ödüller kazan!',
    duration: 5000,
    actions: [
      { label: 'Başarımları Gör', action: () => this.openAchievements() },
      { label: 'X', action: () => this.dismissToast() }
    ]
  });
}

// Day 2 login
onSecondDayLogin(): void {
  // Daily challenge card auto-expands once
  this.dailyChallengeCard.expand();
  this.showToast({
    message: '🎯 Her gün yeni görev!',
    duration: 3000
  });
}
```

### 9.4 Adaptive Hints

```typescript
class AdaptiveHintSystem {
  private attemptCount = 0;
  private timeInLevel = 0;
  private collisionCount = 0;
  
  update(deltaTime: number): void {
    this.timeInLevel += deltaTime;
    
    // Hint triggers
    if (this.attemptCount >= 3 && !this.hintShown('slow_down')) {
      this.showHint('Daha yavaş yaklaş 🐢', 'slow_down');
    }
    
    if (this.timeInLevel > 30 && this.distanceFromTarget > 10 && !this.hintShown('follow_lines')) {
      this.showHint('Sarı çizgileri takip et ➡️', 'follow_lines');
    }
    
    if (this.collisionCount > 3 && !this.hintShown('avoid_cones')) {
      this.showHint('Konilere dikkat! ⚠️', 'avoid_cones');
    }
  }
  
  onNewMechanic(mechanic: string): void {
    const hints = {
      'reverse_park': 'Ters vites ile park et 🔄',
      'angled_park': 'Çapraz park! Açıyı ayarla 📐',
      'parallel_park': 'Paralel park - önce yanına git'
    };
    
    if (hints[mechanic]) {
      this.showHint(hints[mechanic], mechanic);
    }
  }
}
```

---

## 10. Economy & Progression

### 10.1 Dual Currency System

```typescript
interface Currency {
  coins: number;  // Free-to-earn (gameplay)
  gems: number;   // Premium (IAP + rare rewards)
}

// Coin Sources
COIN_SOURCES = {
  levelComplete: {
    base: 100-300,        // Scales with difficulty
    starBonus: 50,        // Per star
    timeBonus: 50,        // Fast completion
    noDamageBonus: 100    // No collisions
  },
  dailyReward: 100-500,   // 7-day cycle
  dailyChallenge: 150-300,
  achievements: 300-2000,
  rewardedAd: '2x level reward'
};

// Gem Sources
GEM_SOURCES = {
  iap: {
    small: { price: 0.99, gems: 100 },
    medium: { price: 4.99, gems: 600 },  // +20% bonus
    large: { price: 9.99, gems: 1500 }   // +50% bonus
  },
  achievements: 10-50,    // Rare achievements only
  weeklyStreak: 20,       // 7 consecutive days
  levelMilestone: 10      // Every 10th level
};
```

### 10.2 Vehicle Pricing & Tiers

```typescript
enum CarTier {
  STARTER,
  COMMON,
  UNCOMMON,
  RARE,
  EPIC,
  LEGENDARY
}

interface Car {
  id: string;
  name: string;
  tier: CarTier;
  coinPrice: number;
  gemPrice: number;
  stats: {
    speed: number;      // 1-10 (cosmetic)
    handling: number;   // 1-10 (cosmetic)
  };
}

// Car Roster (15 cars)
const CARS: Car[] = [
  // STARTER (1)
  { id: 'sedan_basic', name: 'Basic Sedan', tier: CarTier.STARTER, coinPrice: 0, gemPrice: 0 },
  
  // COMMON (3) - ~3-4 levels to unlock
  { id: 'sedan_blue', name: 'Blue Sedan', tier: CarTier.COMMON, coinPrice: 500, gemPrice: 50 },
  { id: 'sedan_red', name: 'Red Sedan', tier: CarTier.COMMON, coinPrice: 500, gemPrice: 50 },
  { id: 'hatchback_green', name: 'Green Hatchback', tier: CarTier.COMMON, coinPrice: 500, gemPrice: 50 },
  
  // UNCOMMON (3) - ~8 levels
  { id: 'suv_black', name: 'Black SUV', tier: CarTier.UNCOMMON, coinPrice: 1200, gemPrice: 100 },
  { id: 'suv_white', name: 'White SUV', tier: CarTier.UNCOMMON, coinPrice: 1200, gemPrice: 100 },
  { id: 'pickup_grey', name: 'Grey Pickup', tier: CarTier.UNCOMMON, coinPrice: 1200, gemPrice: 100 },
  
  // RARE (3) - ~16 levels
  { id: 'sport_yellow', name: 'Yellow Sports Car', tier: CarTier.RARE, coinPrice: 2500, gemPrice: 200 },
  { id: 'sport_blue', name: 'Blue Sports Car', tier: CarTier.RARE, coinPrice: 2500, gemPrice: 200 },
  { id: 'muscle_black', name: 'Black Muscle Car', tier: CarTier.RARE, coinPrice: 2500, gemPrice: 200 },
  
  // EPIC (3) - ~33 levels
  { id: 'luxury_silver', name: 'Silver Luxury', tier: CarTier.EPIC, coinPrice: 5000, gemPrice: 400 },
  { id: 'luxury_gold', name: 'Gold Luxury', tier: CarTier.EPIC, coinPrice: 5000, gemPrice: 400 },
  { id: 'supercar_red', name: 'Red Supercar', tier: CarTier.EPIC, coinPrice: 5000, gemPrice: 400 },
  
  // LEGENDARY (2) - ~66 levels
  { id: 'hypercar_orange', name: 'Orange Hypercar', tier: CarTier.LEGENDARY, coinPrice: 10000, gemPrice: 800 },
  { id: 'hypercar_purple', name: 'Purple Hypercar', tier: CarTier.LEGENDARY, coinPrice: 10000, gemPrice: 800 }
];
```

### 10.3 Daily Reward System

```typescript
interface DailyRewardConfig {
  day: number;
  coins: number;
  gems: number;
}

const DAILY_REWARDS: DailyRewardConfig[] = [
  { day: 1, coins: 100, gems: 0 },
  { day: 2, coins: 150, gems: 0 },
  { day: 3, coins: 200, gems: 5 },
  { day: 4, coins: 250, gems: 0 },
  { day: 5, coins: 300, gems: 0 },
  { day: 6, coins: 400, gems: 10 },
  { day: 7, coins: 500, gems: 20 }  // Week bonus!
];

// Streak calculation
function calculateStreak(lastLogin: Date, today: Date): number {
  const diffDays = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return currentStreak + 1; // Continue
  } else if (diffDays === 0) {
    return currentStreak; // Already claimed today
  } else {
    return 1; // Reset
  }
}

// Rewarded ad bonus
function offerRewardedBonus(): void {
  showModal({
    title: 'İzle ve 2x Kazan! 🎬',
    message: `${todayReward.coins} coin + ${todayReward.gems} gem`,
    actions: [
      { label: 'Reklam İzle', action: () => watchAdFor2x() },
      { label: 'Hayır', action: () => claimNormal() }
    ]
  });
}
```

### 10.4 Achievement System

```typescript
interface Achievement {
  id: string;
  title: string;
  description: string;
  requirement: number;
  coinReward: number;
  gemReward: number;
  icon: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_star',
    title: 'İlk Yıldız',
    description: 'İlk 3 yıldızlı parkını yap',
    requirement: 1,
    coinReward: 100,
    gemReward: 5,
    icon: '⭐'
  },
  {
    id: 'perfectionist',
    title: 'Mükemmeliyetçi',
    description: '10 level 3 yıldız tamamla',
    requirement: 10,
    coinReward: 500,
    gemReward: 20,
    icon: '💯'
  },
  {
    id: 'speed_demon',
    title: 'Hız Canavarı',
    description: '5 level süre bonusu kazan',
    requirement: 5,
    coinReward: 300,
    gemReward: 10,
    icon: '⚡'
  },
  {
    id: 'no_scratch',
    title: 'Hasarsız',
    description: '20 level çarpışmadan bitir',
    requirement: 20,
    coinReward: 1000,
    gemReward: 30,
    icon: '🛡️'
  },
  {
    id: 'collector',
    title: 'Koleksiyoncu',
    description: '5 araç kilidi aç',
    requirement: 5,
    coinReward: 500,
    gemReward: 15,
    icon: '🚗'
  },
  {
    id: 'garage_master',
    title: 'Garaj Ustası',
    description: 'Tüm araçları topla (15 araç)',
    requirement: 15,
    coinReward: 2000,
    gemReward: 100,
    icon: '🏆'
  },
  {
    id: 'veteran',
    title: 'Veteran',
    description: 'Level 50\'ye ulaş',
    requirement: 50,
    coinReward: 1500,
    gemReward: 50,
    icon: '👑'
  },
  {
    id: 'reverse_master',
    title: 'Ters Park Ustası',
    description: '15 ters park 3 yıldız',
    requirement: 15,
    coinReward: 600,
    gemReward: 20,
    icon: '🔄'
  },
  {
    id: 'daily_warrior',
    title: 'Sadık Oyuncu',
    description: '7 gün streak yap',
    requirement: 7,
    coinReward: 400,
    gemReward: 25,
    icon: '🔥'
  },
  {
    id: 'master_parker',
    title: 'Park Ustası',
    description: '100 level tamamla',
    requirement: 100,
    coinReward: 3000,
    gemReward: 100,
    icon: '🎖️'
  }
];
```

### 10.5 Daily Challenge System

```typescript
interface DailyChallenge {
  id: string;
  description: string;
  requirement: number;
  currentProgress: number;
  coinReward: number;
  gemReward: number;
  expiresAt: Date;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Challenge pool
const CHALLENGE_TEMPLATES = [
  // Easy (60% spawn rate)
  { task: 'complete_3_levels', desc: '3 level tamamla', req: 3, coins: 200, gems: 5 },
  { task: 'earn_500_coins', desc: '500 coin kazan', req: 500, coins: 200, gems: 5 },
  { task: 'get_5_stars', desc: '5 yıldız topla (toplam)', req: 5, coins: 200, gems: 5 },
  
  // Medium (30% spawn rate)
  { task: 'perfect_3_levels', desc: '3 level 3 yıldız', req: 3, coins: 300, gems: 10 },
  { task: 'no_damage_3_levels', desc: '3 level hasarsız', req: 3, coins: 300, gems: 10 },
  { task: 'reverse_park_5', desc: '5 ters park yap', req: 5, coins: 300, gems: 10 },
  
  // Hard (10% spawn rate)
  { task: 'perfect_5_levels', desc: '5 level 3 yıldız', req: 5, coins: 500, gems: 20 },
  { task: 'time_bonus_5', desc: '5 level süre bonusu', req: 5, coins: 500, gems: 20 }
];

// Daily generation (midnight refresh)
function generateDailyChallenge(): DailyChallenge {
  const random = Math.random();
  let pool: any[];
  
  if (random < 0.6) {
    pool = CHALLENGE_TEMPLATES.filter(t => t.coins === 200);
  } else if (random < 0.9) {
    pool = CHALLENGE_TEMPLATES.filter(t => t.coins === 300);
  } else {
    pool = CHALLENGE_TEMPLATES.filter(t => t.coins === 500);
  }
  
  const template = pool[Math.floor(Math.random() * pool.length)];
  
  return {
    ...template,
    id: `daily_${Date.now()}`,
    currentProgress: 0,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}
```

### 10.6 Economy Balance Summary

**Target Progression (Balanced):**
- Level reward average: 150 coins (with 2 stars)
- Common car unlock: 3-4 levels
- Rare car unlock: 16-17 levels
- Legendary car unlock: 66 levels
- With daily rewards: -20% levels needed
- With rewarded ads: -50% levels needed

**Monetization Goal:**
- ARPU (Average Revenue Per User): $0.15-0.25
- IAP Conversion Rate: 3-5%
- Ad impressions per DAU: 3-4

---

## 11. Screens & UX Flow

### 11.1 Navigation Flow

```
Launch → Splash (2s) → Main Menu
                          ├─ Play → Level Select → Gameplay → Result → (Ad?) → Next Level
                          ├─ Garage → Car Selection → Unlock (if needed) → Select
                          ├─ Daily Reward → Claim → (Ad 2x?)
                          ├─ Achievements → List → Claim
                          ├─ Daily Challenge → View Progress
                          └─ Settings → Adjust → Save
```

### 11.2 Main Menu Screen

**Layout:**
```
┌─────────────────────────────────────┐
│  PARK MASTER         🪙 2,450 💎 35 │ (Header)
├─────────────────────────────────────┤
│                                     │
│        [3D Car Showcase]            │ (Rotating selected car)
│       (Touch to rotate)             │
│                                     │
├─────────────────────────────────────┤
│          [ OYNA ]                   │ (Primary CTA)
├─────────────────────────────────────┤
│  [🚗 Garaj]  [🎁 Günlük]            │
│  [🏆 Başarım] [⚙️ Ayarlar]          │ (Grid buttons)
├─────────────────────────────────────┤
│  📅 Günlük Görev           ⏰ 8:24  │
│  "3 level 3 yıldız tamamla"        │ (Daily challenge card)
│  Progress: ██████░░░░  2/3          │
│  Ödül: 🪙 300  💎 10                │
└─────────────────────────────────────┘
│  [Reklamları Kaldır - $2.99]       │ (Footer)
└─────────────────────────────────────┘
```

### 11.3 Level Select Screen

**Layout:**
```
┌─────────────────────────────────────┐
│ ← Seviyeler              🪙 2,450   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │  1  │ │  2  │ │  3  │ │  4  │  │
│  │ ⭐⭐⭐ │ │ ⭐⭐⭐ │ │ ⭐⭐  │ │ ⭐   │  │
│  │ 45s │ │ 38s │ │ 52s │ │ 1:05│  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │  5  │ │  6  │ │  7  │ │ 🔒8 │  │
│  │ ⭐⭐⭐ │ │ ⭐⭐  │ │ ⭐   │ │     │  │
│  │ 42s │ │ 58s │ │ 1:12│ │     │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│                                     │
│  (Scroll for more levels)          │
└─────────────────────────────────────┘
```

### 11.4 Gameplay HUD

**Minimal, non-intrusive:**
```
┌─────────────────────────────────────┐
│ ⏸️  Level 12              ⏱️ 0:45   │ (Top bar)
│         ⭐ ⭐ ⭐                      │ (Stars center-top)
│                                     │
│                                     │
│       [3D GAME VIEW]                │
│       (Parking gameplay)            │
│                                     │
│                                     │
│  ┌──────────┐          ┌──────────┐│
│  │   🎡    │          │ ⬆️ GAZ   ││ (Controls bottom)
│  │ Steering│          │ ⬇️ FREN  ││
│  │   Wheel │          │ İLERİ/   ││
│  └──────────┘          │  GERİ    ││
│                        └──────────┘│
└─────────────────────────────────────┘
```

### 11.5 Result Screen

```
┌─────────────────────────────────────┐
│                                     │
│          Harika! 🎉                 │
│                                     │
│        ⭐ ⭐ ⭐                       │ (Animated)
│                                     │
│  Temel Ödül:           🪙 150       │
│  Yıldız Bonusu:        🪙 +150      │
│  Süre Bonusu:          🪙 +50       │
│  ─────────────────────────────      │
│  Toplam:               🪙 350       │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🎬 İzle ve kazancını 2x yap!  │ │ (Ad offer)
│  │    🪙 350 → 700               │ │
│  │  [Reklam İzle]  [Atla]        │ │
│  └───────────────────────────────┘ │
│                                     │
│  [🔄 Tekrar Dene]  [Sonraki →]     │
└─────────────────────────────────────┘
```

### 11.6 Garage Screen

```
┌─────────────────────────────────────┐
│ ← Garaj                🪙 2,450 💎35│
├─────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 🚗   │ │ 🚗   │ │ 🚙   │        │
│  │Basic │ │Blue  │ │Black │        │
│  │Sedan │ │Sedan │ │ SUV  │        │
│  │ ✓    │ │ ✓    │ │ 🔒   │        │
│  │      │ │      │ │🪙1200│        │
│  └──────┘ └──────┘ └──────┘        │
│  STARTER  COMMON   UNCOMMON        │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 🏎️   │ │ 🏎️   │ │ 🏁   │        │
│  │Sport │ │Luxury│ │Hyper │        │
│  │ 🔒   │ │ 🔒   │ │ 🔒   │        │
│  │🪙2500│ │🪙5000│ │🪙10000│       │
│  │💎200 │ │💎400 │ │💎800  │       │
│  └──────┘ └──────┘ └──────┘        │
│    RARE     EPIC   LEGENDARY       │
├─────────────────────────────────────┤
│  Selected: Blue Sedan               │
│  [Seç ve Oyna]                      │
└─────────────────────────────────────┘
```

---

## 12. UI/UX Design System

### 12.1 Design Style

**Philosophy:** Modern/Minimal
- Clean lines, card-based layouts
- Subtle shadows and gradients
- High contrast for readability
- Dark theme (battery-friendly, eye-friendly)
- Smooth 60fps animations

### 12.2 Color Palette

```css
:root {
  /* Primary (Brand) */
  --color-primary: #FF6B35;        /* Orange - energy, action */
  --color-primary-dark: #E85A2A;
  --color-primary-light: #FF8659;
  
  /* Secondary */
  --color-secondary: #4ECDC4;      /* Teal - modern, fresh */
  --color-secondary-dark: #3DB8AF;
  
  /* Backgrounds */
  --color-bg: #1A1A2E;             /* Dark blue-grey */
  --color-surface: #252540;        /* Lighter surface */
  --color-border: #3A3A5C;
  
  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #B8B8D1;
  --color-text-disabled: #6E6E8F;
  
  /* Rarity Colors */
  --color-common: #9E9E9E;         /* Grey */
  --color-uncommon: #4CAF50;       /* Green */
  --color-rare: #2196F3;           /* Blue */
  --color-epic: #9C27B0;           /* Purple */
  --color-legendary: #FF9800;      /* Gold */
  
  /* Status */
  --color-success: #4CAF50;
  --color-warning: #FFC107;
  --color-error: #F44336;
  --color-info: #2196F3;
}
```

### 12.3 Typography

```css
/* Font Family */
font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;

/* Type Scale */
.h1 { font-size: 32px; font-weight: 700; line-height: 1.2; }
.h2 { font-size: 24px; font-weight: 600; line-height: 1.3; }
.h3 { font-size: 18px; font-weight: 500; line-height: 1.4; }
.body { font-size: 16px; font-weight: 400; line-height: 1.5; }
.small { font-size: 14px; font-weight: 400; line-height: 1.5; }
.caption { font-size: 12px; font-weight: 400; line-height: 1.4; }
```

### 12.4 Button Styles

```css
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: white;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
}

.btn-secondary {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
}

.btn-text {
  background: transparent;
  color: var(--color-text-secondary);
  padding: 8px 16px;
  font-size: 14px;
  text-decoration: underline;
}
```

### 12.5 Component Library

**Cards:**
```css
.card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.card-elevated {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
```

**Badges:**
```css
.badge {
  background: var(--color-error);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
```

### 12.6 Animation Guidelines

**Performance-focused:**
```css
/* Use transform and opacity only (GPU-accelerated) */
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Avoid animating: width, height, top, left, margin, padding */
```

### 12.7 3D Preview Integration

**Main Menu Car Showcase:**
```typescript
class CarShowcaseComponent implements OnInit {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private carModel: THREE.Object3D;
  
  ngOnInit(): void {
    this.setupScene();
    this.loadCurrentCar();
    this.animate();
  }
  
  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(3, 1.5, 3);
    this.camera.lookAt(0, 0.5, 0);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(ambientLight, directionalLight);
    
    // Renderer (small, efficient)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas.nativeElement,
      antialias: false, // Performance
      alpha: true
    });
    this.renderer.setSize(400, 300);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  
  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    // Slow rotation
    if (this.carModel) {
      this.carModel.rotation.y += 0.005;
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  onTouchMove(event: TouchEvent): void {
    // User can rotate manually
    const deltaX = event.touches[0].clientX - this.lastTouchX;
    if (this.carModel) {
      this.carModel.rotation.y += deltaX * 0.01;
    }
    this.lastTouchX = event.touches[0].clientX;
  }
}
```

### 12.8 Localization

**Language Support:** Turkish + English (initial release)

```typescript
// i18n/tr.json
{
  "main_menu": {
    "play": "OYNA",
    "garage": "Garaj",
    "daily_reward": "Günlük Ödül",
    "achievements": "Başarımlar",
    "settings": "Ayarlar"
  },
  "gameplay": {
    "level": "Seviye",
    "time": "Süre",
    "pause": "Duraklat",
    "resume": "Devam Et"
  },
  "result": {
    "excellent": "Harika!",
    "good": "İyi!",
    "completed": "Tamamlandı!",
    "failed": "Başarısız",
    "base_reward": "Temel Ödül",
    "star_bonus": "Yıldız Bonusu",
    "time_bonus": "Süre Bonusu",
    "retry": "Tekrar Dene",
    "next_level": "Sonraki Seviye"
  }
}

// i18n/en.json
{
  "main_menu": {
    "play": "PLAY",
    "garage": "Garage",
    "daily_reward": "Daily Reward",
    "achievements": "Achievements",
    "settings": "Settings"
  },
  // ... etc
}

// Auto-detect language
const deviceLanguage = navigator.language.substring(0, 2); // 'tr', 'en', etc.
const supportedLanguages = ['tr', 'en'];
const defaultLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
```

---

## 13. Monetization Strategy

### 13.1 Ad Implementation (AdMob)

**Ad Types & Placement:**

```typescript
@Injectable({ providedIn: 'root' })
export class AdService {
  private adIds: any;
  
  constructor() {
    const isProduction = environment.production;
    this.adIds = isProduction ? PROD_AD_IDS : TEST_AD_IDS;
  }
  
  // Interstitial Ads
  async showInterstitial(): Promise<void> {
    // Show after level complete (NOT after fail)
    // Minimum 30s between ads
    
    if (!this.canShowInterstitial()) return;
    
    await AdMob.prepareInterstitial({
      adId: this.adIds.interstitial
    });
    
    await AdMob.showInterstitial();
    this.lastInterstitialTime = Date.now();
  }
  
  private canShowInterstitial(): boolean {
    const timeSinceLastAd = Date.now() - this.lastInterstitialTime;
    const minInterval = 30000; // 30 seconds
    
    return timeSinceLastAd >= minInterval;
  }
  
  // Rewarded Ads
  async showRewarded(rewardType: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      await AdMob.prepareRewardVideoAd({
        adId: this.adIds.rewarded
      });
      
      // Listen for reward
      AdMob.addListener('onRewardedVideoAdRewarded', () => {
        resolve(true);
      });
      
      AdMob.addListener('onRewardedVideoAdFailedToShow', () => {
        resolve(false);
      });
      
      await AdMob.showRewardVideoAd();
    });
  }
}
```

**Ad Frequency Strategy:**
```typescript
// Interstitial frequency
AD_STRATEGY = {
  interstitial: {
    triggerOn: 'level_complete', // NOT on fail
    frequency: 'every_1_levels',  // Every level
    minInterval: 30000,           // 30s between ads
    skipIfRewardedRecent: true    // Skip if user watched rewarded in last 2 min
  },
  
  rewarded: {
    offers: [
      'level_complete_2x',  // Double coins
      'retry_level',        // Retry after 5+ fails
      'daily_reward_2x',    // Double daily reward
      'daily_challenge_boost' // Extra progress
    ],
    alwaysOptional: true
  }
};
```

### 13.2 In-App Purchases (IAP)

```typescript
// Product catalog
const IAP_PRODUCTS = [
  // Gem Packages
  {
    id: 'gems_small',
    type: 'consumable',
    price: 0.99,
    priceDisplay: '$0.99',
    gems: 100,
    title: 'Small Gem Pack',
    description: '100 Gems'
  },
  {
    id: 'gems_medium',
    type: 'consumable',
    price: 4.99,
    priceDisplay: '$4.99',
    gems: 600, // +20% bonus
    title: 'Medium Gem Pack',
    description: '600 Gems (Best Value!)'
  },
  {
    id: 'gems_large',
    type: 'consumable',
    price: 9.99,
    priceDisplay: '$9.99',
    gems: 1500, // +50% bonus
    title: 'Large Gem Pack',
    description: '1500 Gems (Limited Offer!)'
  },
  
  // Feature Unlocks
  {
    id: 'remove_ads',
    type: 'non-consumable',
    price: 2.99,
    priceDisplay: '$2.99',
    title: 'Remove Ads',
    description: 'Remove all interstitial and banner ads permanently'
  },
  {
    id: 'vip_bundle',
    type: 'non-consumable',
    price: 9.99,
    priceDisplay: '$9.99',
    title: 'VIP Bundle',
    description: 'Remove ads + All cars + 1000 gems + 2x coins forever',
    features: [
      'No ads',
      'All 15 cars unlocked',
      '1000 bonus gems',
      '2x coin earnings (permanent)'
    ]
  }
];

// IAP Service
@Injectable({ providedIn: 'root' })
export class IAPService {
  async purchase(productId: string): Promise<boolean> {
    try {
      const product = await InAppPurchase2.get(productId);
      
      await InAppPurchase2.order(productId);
      
      // Process purchase
      if (productId.startsWith('gems_')) {
        const gems = product.gems;
        this.store.dispatch(addGems({ amount: gems }));
      } else if (productId === 'remove_ads') {
        this.store.dispatch(setAdFree({ value: true }));
      } else if (productId === 'vip_bundle') {
        this.store.dispatch(unlockVIP());
      }
      
      // Analytics
      FirebaseAnalytics.logEvent({
        name: 'purchase',
        params: {
          transaction_id: generateId(),
          value: product.price,
          currency: 'USD',
          items: [{ item_id: productId }]
        }
      });
      
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  }
  
  async restorePurchases(): Promise<void> {
    const purchases = await InAppPurchase2.restorePurchases();
    
    purchases.forEach(purchase => {
      if (purchase.id === 'remove_ads' || purchase.id === 'vip_bundle') {
        this.store.dispatch(setAdFree({ value: true }));
      }
      if (purchase.id === 'vip_bundle') {
        this.store.dispatch(unlockVIP());
      }
    });
  }
}
```

### 13.3 Monetization Balance

**Target Metrics:**
- **ARPU:** $0.15-0.25
- **Ad ARPU:** $0.10-0.15 (60-70% of revenue)
- **IAP ARPU:** $0.05-0.10 (30-40% of revenue)
- **IAP Conversion Rate:** 3-5%
- **Ad Impressions per DAU:** 3-4

**Revenue Optimization:**
```typescript
// A/B Test: Ad frequency
RemoteConfig.getValue('ad_frequency').then(value => {
  // Variant A: Every level (50%)
  // Variant B: Every 2 levels (50%)
  
  this.adFrequency = value; // 1 or 2
});

// Dynamic pricing (future)
RemoteConfig.getValue('gems_medium_price').then(price => {
  // Test $3.99 vs $4.99 vs $5.99
  IAPProducts.gems_medium.price = price;
});
```

---

## 14. Analytics & Metrics

### 14.1 Analytics Platform: Firebase

**Setup:**
```typescript
// Initialize
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

async ngOnInit() {
  await FirebaseAnalytics.setEnabled({ enabled: true });
  await FirebaseAnalytics.setUserId({ userId: this.generateUserId() });
  await FirebaseAnalytics.setUserProperty({
    key: 'device_tier',
    value: this.detectDeviceTier() // 'high', 'mid', 'low'
  });
}
```

### 14.2 Key Performance Indicators (KPIs)

**Retention Metrics:**
```typescript
TARGET_RETENTION = {
  D1: 0.55,  // 55%+ (Day 1)
  D7: 0.25,  // 25%+ (Day 7)
  D30: 0.12  // 12%+ (Day 30)
};

// Tracking
FirebaseAnalytics.logEvent({ name: 'session_start' });
// Firebase automatically calculates retention
```

**Monetization Metrics:**
```typescript
TARGET_MONETIZATION = {
  arpu: 0.20,           // $0.20 per user
  arppu: 3.00,          // $3.00 per paying user
  iapConversion: 0.04,  // 4% conversion rate
  adImpressionsPerDAU: 3.5,
  ecpm: 10.00           // $10 eCPM
};
```

**Engagement Metrics:**
```typescript
TARGET_ENGAGEMENT = {
  sessionsPerDay: 3,
  avgSessionLength: 420, // 7 minutes
  levelsPerSession: 2.5
};
```

### 14.3 Critical Events

**Lifecycle Events:**
```typescript
logEvent('app_install');
logEvent('first_open');
logEvent('tutorial_begin');
logEvent('tutorial_complete');
logEvent('tutorial_skip', { step: 2 });
```

**Gameplay Events:**
```typescript
logEvent('level_start', {
  level_id: 'level_5',
  attempt_number: 1
});

logEvent('level_complete', {
  level_id: 'level_5',
  stars: 3,
  time_spent: 45,
  coins_earned: 350,
  collisions: 0
});

logEvent('level_fail', {
  level_id: 'level_5',
  fail_reason: 'timeout',
  time_spent: 60
});
```

**Economy Events:**
```typescript
logEvent('earn_coins', {
  amount: 350,
  source: 'level_complete'
});

logEvent('spend_coins', {
  amount: 1200,
  item_id: 'suv_black',
  item_type: 'car'
});

logEvent('car_unlock', {
  car_id: 'suv_black',
  tier: 'uncommon',
  currency_used: 'coins'
});
```

**Monetization Events:**
```typescript
logEvent('ad_impression', {
  ad_type: 'interstitial',
  ad_unit_id: AD_UNIT_ID,
  revenue: 0.03 // eCPM-based estimate
});

logEvent('purchase', {
  transaction_id: generateId(),
  value: 4.99,
  currency: 'USD',
  items: [{ item_id: 'gems_medium', quantity: 1 }]
});
```

**Churn Signals:**
```typescript
// Auto-detect churn risk
logEvent('level_stuck', {
  level_id: 'level_8',
  fail_count: 6,
  churn_risk: 'high'
});

logEvent('long_idle', {
  days_since_last_session: 4
});
```

### 14.4 Push Notifications

**Firebase Cloud Messaging (FCM):**

```typescript
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  async initPush(): Promise<void> {
    // Request permission
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }
    
    // Listen for token
    PushNotifications.addListener('registration', token => {
      console.log('Push token:', token.value);
      this.sendTokenToServer(token.value);
    });
    
    // Listen for notifications
    PushNotifications.addListener('pushNotificationReceived', notification => {
      console.log('Notification received:', notification);
    });
  }
}

// Server-side: Send targeted notifications
PUSH_CAMPAIGNS = {
  d3_idle: {
    condition: 'last_session > 3 days',
    title: 'Parkları özledik! 🚗',
    body: 'Yeni seviyeler seni bekliyor. Geri dön ve oyna!',
    data: { screen: 'main_menu' }
  },
  
  d7_idle: {
    condition: 'last_session > 7 days',
    title: 'Günlük ödülün kaybolacak! 🎁',
    body: 'Streak\'ini kaybetme! Hemen giriş yap.',
    data: { screen: 'daily_reward' }
  },
  
  daily_challenge: {
    condition: 'daily_challenge_available AND not_completed',
    title: 'Bugünün görevi hazır! 🎯',
    body: '500 coin kazanma şansını kaçırma!',
    data: { screen: 'daily_challenge' }
  },
  
  achievement_unlocked: {
    condition: 'achievement_completed AND not_claimed',
    title: 'Yeni başarım kazandın! 🏆',
    body: 'Ödülünü topla: 500 coin + 20 gem',
    data: { screen: 'achievements' }
  }
};
```

### 14.5 Churn Prevention

```typescript
class ChurnPreventionSystem {
  detectChurnRisk(user: User): ChurnRisk {
    const signals = {
      consecutiveDaysIdle: this.getDaysIdle(user),
      levelFailStreak: this.getFailStreak(user),
      sessionLengthDecreasing: this.isSessionLengthDecreasing(user),
      adSkipRate: this.getAdSkipRate(user)
    };
    
    if (signals.consecutiveDaysIdle > 3) {
      return { level: 'high', reason: 'idle' };
    }
    
    if (signals.levelFailStreak > 5) {
      return { level: 'high', reason: 'stuck' };
    }
    
    if (signals.adSkipRate > 0.6) {
      return { level: 'medium', reason: 'ad_fatigue' };
    }
    
    return { level: 'low', reason: null };
  }
  
  async intervene(user: User, risk: ChurnRisk): Promise<void> {
    if (risk.reason === 'stuck') {
      // Offer help
      this.showHelpModal("Bu level zor mu? İpucu izle!");
      this.offerSkipLevel(); // With gems or rewarded ad
    }
    
    if (risk.reason === 'idle') {
      // Send push notification
      this.pushService.send({
        userId: user.id,
        title: 'Park etmeyi özledik! 🚗',
        body: 'Yeni günlük ödülün seni bekliyor! 🎁'
      });
    }
    
    if (risk.reason === 'ad_fatigue') {
      // Reduce ad frequency
      this.store.dispatch(setAdFrequency({ value: 2 })); // Every 2 levels
    }
  }
}
```

### 14.6 Analytics Review Cadence

**Daily (5-10 minutes):**
- Crash-free rate (must be >99%)
- DAU trend
- Revenue spike/drop detection
- **Action:** Quick Firebase Console scan

**Weekly (1-2 hours):**
- D1/D7 retention deep dive
- Level funnel analysis (where users drop off)
- Ad performance metrics
- User feedback review
- **Action:** Actionable insights for next update

**Monthly (Strategic):**
- D30 retention
- LTV (Lifetime Value) analysis
- Feature usage statistics
- Roadmap adjustment
- **Action:** Major product decisions

---

## 15. Performance Optimization

### 15.1 Target Performance

| Device Tier | Target FPS | Min FPS | Load Time |
|-------------|-----------|---------|-----------|
| High-end (2020+) | 60 FPS | 55 FPS | <2s |
| Mid-range (2018-2020) | 60 FPS | 45 FPS | <3s |
| Low-end (2018, 3GB RAM) | 30 FPS | 25 FPS | <5s |

### 15.2 Three.js Renderer Configuration

```typescript
const renderer = new THREE.WebGLRenderer({
  canvas: this.canvas,
  antialias: false,           // ❌ Disabled (30% FPS gain on mobile)
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
  depth: true
});

// Pixel ratio (cap at 2x)
const pixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);

// No shadows
renderer.shadowMap.enabled = false; // ⚡ Major FPS gain

// Tone mapping (minimal cost, better colors)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
```

### 15.3 Material Optimization

```typescript
// Use MeshLambertMaterial (not MeshStandardMaterial!)
// Lambert: Fast, acceptable quality
// Standard: Slow, PBR shading (avoid on mobile)

const carMaterial = new THREE.MeshLambertMaterial({
  map: carTexture,
  color: 0xffffff
  // NO normalMap, NO roughnessMap, NO metalnessMap
});

// Reuse materials
const coneMaterial = new THREE.MeshLambertMaterial({ color: 0xff6600 });

cones.forEach(cone => {
  cone.material = coneMaterial; // Same reference
});
```

### 15.4 Texture Optimization

```typescript
// Texture settings
const texture = textureLoader.load('/assets/car.png');

texture.minFilter = THREE.LinearFilter;    // No mipmaps
texture.magFilter = THREE.LinearFilter;
texture.anisotropy = 1;
texture.generateMipmaps = false;           // Save memory

// Max texture size: 1024x1024
// Use texture atlases when possible
```

### 15.5 Geometry Optimization

```typescript
// Merge static geometries (reduce draw calls)
class LevelOptimizer {
  mergeStaticObjects(meshes: THREE.Mesh[]): THREE.Mesh {
    const geometries = [];
    
    meshes.forEach(mesh => {
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrix);
      geometries.push(geo);
    });
    
    const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries);
    const mergedMesh = new THREE.Mesh(mergedGeo, sharedMaterial);
    
    // Dispose originals
    meshes.forEach(m => {
      m.geometry.dispose();
      this.scene.remove(m);
    });
    
    return mergedMesh;
  }
}

// Result: 50 draw calls → 1 draw call
```

### 15.6 Physics Optimization

```typescript
// Cannon-es configuration
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0)
});

// Fixed timestep (critical!)
const timeStep = 1 / 60; // 60Hz
const maxSubSteps = 3;

function animate(time) {
  const deltaTime = (time - lastTime) / 1000;
  world.step(timeStep, deltaTime, maxSubSteps);
  
  // Sync Three.js with Cannon.js
  carMesh.position.copy(carBody.position);
  carMesh.quaternion.copy(carBody.quaternion);
  
  renderer.render(scene, camera);
  lastTime = time;
  requestAnimationFrame(animate);
}

// Sleep inactive bodies
world.allowSleep = true;
```

### 15.7 Polygon Budget

```typescript
// Total scene budget: 50,000 - 80,000 triangles

POLY_BUDGET = {
  car: 10000-15000,           // Main focus
  environment: 20000-30000,   // Parking lot
  obstacles: 5000-10000,      // Cones, barriers
  ui: 1000,                   // Overlays
  other: 5000
};

// Monitor in development
console.log('Triangles:', renderer.info.render.triangles);

// If > 100k → Lag on low-end devices
```

### 15.8 Device-Specific Settings

```typescript
interface DeviceProfile {
  tier: 'high' | 'mid' | 'low';
  pixelRatio: number;
  maxTextureSize: number;
}

function detectDeviceProfile(): DeviceProfile {
  const memory = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  
  if (memory >= 6 && cores >= 6) {
    return { tier: 'high', pixelRatio: 2, maxTextureSize: 1024 };
  }
  
  if (memory >= 4 && cores >= 4) {
    return { tier: 'mid', pixelRatio: 1.5, maxTextureSize: 1024 };
  }
  
  return { tier: 'low', pixelRatio: 1, maxTextureSize: 512 };
}

// Apply profile
const profile = detectDeviceProfile();
renderer.setPixelRatio(profile.pixelRatio);
```

### 15.9 User-Controlled Graphics Settings

```typescript
// Settings menu options
GRAPHICS_PRESETS = {
  low: {
    pixelRatio: 1,
    textureQuality: 512,
    effectsEnabled: false
  },
  medium: {
    pixelRatio: 1.5,
    textureQuality: 1024,
    effectsEnabled: false
  },
  high: {
    pixelRatio: 2,
    textureQuality: 1024,
    effectsEnabled: false // Still no post-processing
  }
};

// User can override auto-detect
applyGraphicsSetting(preset: string): void {
  const config = GRAPHICS_PRESETS[preset];
  this.renderer.setPixelRatio(config.pixelRatio);
  this.reloadTexturesWithQuality(config.textureQuality);
}
```

### 15.10 Performance Checklist

```
✅ Antialias disabled
✅ Pixel ratio capped at 2x
✅ Shadows disabled
✅ Post-processing disabled
✅ Materials: MeshLambertMaterial only
✅ Textures: 512-1024px max, no mipmaps
✅ Geometries merged (static objects)
✅ Physics: 60Hz fixed timestep
✅ Memory: Dispose on level change
✅ Asset loading: Async with progress
✅ Device profiling: High/Mid/Low tiers
✅ User settings: Low/Medium/High graphics
✅ Bundle size: <80MB APK/IPA
✅ Load time: <3s on mid-range
```

---

## 16. Asset Management

*(Covered in Section 3.2, expanded here)*

### 16.1 Asset Pipeline

```
1. Create in Blender → Export GLB (Draco enabled)
2. Resize textures to 1024px (Photoshop/GIMP)
3. Create texture atlas (TexturePacker)
4. Optimize with gltf-transform CLI
5. Place in /assets/cars/ or /assets/levels/
6. Load via AssetManager (lazy + cache)
```

### 16.2 Asset Specifications Summary

| Asset Type | Format | Max Size | Compression | Notes |
|-----------|--------|----------|-------------|-------|
| Car models | GLB | 15k tris | Draco | 2-3MB per car |
| Level geometry | GLB | 30k tris | Draco | 1-2MB per level |
| Car textures | PNG/JPG | 1024x1024 | Yes | Embedded in GLB |
| Environment textures | PNG/JPG | 1024x1024 | Yes | Atlas if possible |
| Audio | MP3 | 128kbps | Yes | Total ~1.15MB |
| UI assets | PNG | Varies | Yes | Use WebP if supported |

---

## 17. Save System

### 17.1 Save Data Structure

```typescript
interface SaveData {
  version: string; // "1.0.0"
  
  // Player progress
  player: {
    userId: string;
    createdAt: string;
    lastPlayedAt: string;
  };
  
  // Currency
  economy: {
    coins: number;
    gems: number;
  };
  
  // Levels
  levels: {
    [levelId: string]: {
      completed: boolean;
      bestStars: number;
      bestTime: number;
      attempts: number;
    };
  };
  
  // Cars
  cars: {
    unlocked: string[];
    selected: string;
  };
  
  // Daily systems
  daily: {
    lastRewardClaim: string;
    streakCount: number;
    currentChallenge: DailyChallenge | null;
  };
  
  // Achievements
  achievements: {
    [achievementId: string]: {
      progress: number;
      completed: boolean;
      claimed: boolean;
    };
  };
  
  // Settings
  settings: {
    masterVolume: number;
    sfxVolume: number;
    controlType: string;
    graphicsQuality: string;
    language: string;
  };
  
  // IAP
  purchases: {
    adFree: boolean;
    vipActive: boolean;
    products: string[];
  };
}
```

### 17.2 Save/Load Implementation

```typescript
@Injectable({ providedIn: 'root' })
export class SaveService {
  private saveKey = 'park_master_save_v1';
  
  async save(data: SaveData): Promise<void> {
    try {
      const json = JSON.stringify(data);
      await Storage.set({ key: this.saveKey, value: json });
      console.log('Game saved successfully');
    } catch (error) {
      console.error('Save failed:', error);
      this.showSaveErrorDialog();
    }
  }
  
  async load(): Promise<SaveData | null> {
    try {
      const result = await Storage.get({ key: this.saveKey });
      
      if (result.value) {
        const data = JSON.parse(result.value) as SaveData;
        
        // Validate and migrate if needed
        return this.validateAndMigrate(data);
      }
      
      return null; // New player
    } catch (error) {
      console.error('Load failed:', error);
      return null;
    }
  }
  
  private validateAndMigrate(data: SaveData): SaveData {
    // Version migration
    if (data.version === '1.0.0') {
      // No migration needed
      return data;
    }
    
    // Future versions: migrate data structure
    
    return data;
  }
  
  async clear(): Promise<void> {
    await Storage.remove({ key: this.saveKey });
  }
}
```

### 17.3 Auto-Save Strategy

```typescript
// Save triggers
AUTOSAVE_TRIGGERS = [
  'level_complete',
  'car_unlock',
  'achievement_claim',
  'daily_reward_claim',
  'iap_purchase',
  'settings_change',
  'app_pause'
];

// Auto-save effect
@Injectable()
export class AutoSaveEffects {
  autoSave$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        levelCompleted,
        carUnlocked,
        achievementClaimed,
        settingsChanged
      ),
      debounceTime(1000), // Wait 1s after last action
      withLatestFrom(this.store.select(selectFullState)),
      tap(([action, state]) => {
        const saveData = this.transformToSaveData(state);
        this.saveService.save(saveData);
      })
    ),
    { dispatch: false }
  );
}
```

---

## 18. Release Readiness

### 18.1 Android Build

**Requirements:**
```gradle
// app/build.gradle
android {
  compileSdkVersion 34
  targetSdkVersion 34      // Must be 33+ (Google requirement)
  minSdkVersion 24         // Android 7.0+ (2016+)
  
  defaultConfig {
    applicationId "com.yourstudio.parkmaster"
    versionCode 1
    versionName "1.0.0"
  }
  
  buildTypes {
    release {
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android.txt')
    }
  }
  
  // 64-bit support (mandatory)
  splits {
    abi {
      enable true
      reset()
      include 'arm64-v8a', 'armeabi-v7a'
      universalApk false
    }
  }
}

// Build command
./gradlew bundleRelease
// Output: app/build/outputs/bundle/release/app-release.aab (~50-70MB)
```

**Signing:**
```bash
# Generate keystore (once)
keytool -genkey -v -keystore park-master.keystore -alias park_master -keyalg RSA -keysize 2048 -validity 10000

# Sign AAB
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore park-master.keystore app-release.aab park_master
```

### 18.2 iOS Build

**Requirements:**
```xml
<!-- Info.plist -->
<key>CFBundleIdentifier</key>
<string>com.yourstudio.parkmaster</string>

<key>CFBundleShortVersionString</key>
<string>1.0.0</string>

<key>CFBundleVersion</key>
<string>1</string>

<!-- ATT (App Tracking Transparency) -->
<key>NSUserTrackingUsageDescription</key>
<string>This app uses data to show you better ads.</string>

<!-- AdMob App ID -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-YOUR_PUBLISHER_ID~YOUR_APP_ID</string>
```

**Build Settings:**
- Deployment Target: iOS 12.0
- Architecture: arm64 only
- Swift Version: 5.x

**Build Steps:**
```
1. Xcode → Product → Archive
2. Distribute App → App Store Connect
3. Upload build
4. Submit for Review in App Store Connect
```

### 18.3 Store Assets

**App Icon:**
- Android: 512x512 PNG (adaptive icon recommended)
- iOS: 1024x1024 PNG

**Screenshots:**
- Android: 1080x1920 (phone), 1200x1920 (tablet optional)
- iOS: 1290x2796 (6.7" iPhone), 2048x2732 (iPad optional)
- Minimum: 2 screenshots, Maximum: 8

**Feature Graphic (Android):**
- Size: 1024x500 PNG
- Used in Google Play featured sections

**Description:**
*(See Section 18.4)*

### 18.4 Store Listings

**Google Play:**
```
Title: Park Master - Parking Game (30 chars max)

Short Description: (80 chars max)
Realistic car parking simulator. Master every level! 🚗

Full Description: (4000 chars max)
🚗 Park Master - The Ultimate Parking Challenge!

Test your driving skills in this realistic 3D parking simulator! 
Navigate through challenging levels, avoid obstacles, and perfect 
your parking technique.

✨ FEATURES:
• 100+ Challenging Levels
• 15 Unique Vehicles to Unlock
• Realistic Physics Engine
• Daily Challenges & Rewards
• Achievement System
• Smooth 3D Graphics

🎯 GAMEPLAY:
Master the art of parking with intuitive controls. Each level 
presents new challenges - tight spaces, obstacles, time limits, 
and reverse parking. Earn stars and coins to unlock amazing cars!

💎 PROGRESSION:
• Unlock cars from sedans to supercars
• Complete daily challenges
• Earn achievements and rewards
• Compete for perfect scores

Perfect for parking game enthusiasts and driving simulation fans!

Download now and become a parking master! 🏆

Category: Racing (or Simulation)
Content Rating: PEGI 3 / ESRB Everyone
```

**App Store (iOS):**
```
Title: Park Master - Parking (30 chars max)

Subtitle: Realistic 3D Parking (30 chars max)

Promotional Text: (170 chars max)
New update: 20 new levels, daily challenges, and achievement system! 
Master your parking skills today!

Description: (Similar to Android, 4000 chars)

Age Rating: 4+
Category: Games > Racing (or Simulation)
```

### 18.5 Privacy Policy (Required!)

**Must Include:**
- Data collection practices (analytics, ad IDs)
- Third-party services (AdMob, Firebase)
- User rights (GDPR, CCPA compliance)
- Contact information

**Host at:** https://yourwebsite.com/privacy-policy

**Template generators:**
- https://www.freeprivacypolicy.com/
- https://app-privacy-policy-generator.nisrulz.com/

### 18.6 Pre-Launch Checklist

**Technical:**
```
✅ Crash-free rate >99% in testing
✅ No memory leaks detected
✅ All levels completable
✅ IAP restoration works
✅ Save/load tested
✅ Ads display correctly (test mode)
✅ Performance targets met on test devices
✅ Languages tested (TR + EN)
✅ Analytics logging verified
```

**Store:**
```
✅ App icon finalized
✅ Screenshots captured (6-8 images)
✅ Feature graphic created (Android)
✅ Description written
✅ Privacy policy published
✅ Contact email set up
✅ Support page created (optional)
```

**Legal:**
```
✅ Privacy policy compliant (GDPR/CCPA)
✅ Age rating appropriate (PEGI 3 / ESRB E)
✅ No copyrighted content used
✅ AdMob app approved
✅ IAP products configured
```

---

## 19. Post-Launch Strategy

### 19.1 Launch Plan: Soft Launch (Recommended)

**Phase 1: Beta Testing (1-2 weeks)**
- Google Play: Internal testing (100 users)
- iOS: TestFlight (up to 10,000 users)
- **Goal:** Find critical bugs, gather feedback

**Phase 2: Soft Launch (2-4 weeks)**
- Launch in 2-3 test markets (e.g., Turkey + Poland)
- **Monitor:** D1/D7 retention, crashes, monetization
- **Iterate:** Fix issues, balance economy, optimize ads

**Phase 3: Global Launch**
- All markets
- Marketing push (optional)
- Press release (optional)

### 19.2 Update Cadence

**Version 1.0.0** (Initial Release)
- 20 levels
- 15 cars
- Core features complete

**Version 1.1.0** (+2 weeks after launch)
- Bug fixes from user feedback
- Performance improvements
- UI polish
- Analytics-driven tweaks

**Version 1.2.0** (+1 month)
- 10 new levels (21-30)
- 2-3 new cars
- New achievement tier
- Balance adjustments

**Version 1.3.0** (+2 months)
- Special event system (optional)
- Leaderboards (optional)
- More levels
- New environment themes

### 19.3 A/B Testing Strategy

**Critical Tests:**
```
Test 1: Ad Frequency
- Variant A: Interstitial every level (50%)
- Variant B: Interstitial every 2 levels (50%)
- Metric: D7 retention + ARPU
- Duration: 2 weeks

Test 2: Economy Generosity
- Variant A: Base reward 100 coins (50%)
- Variant B: Base reward 150 coins (50%)
- Metric: D7 retention + IAP conversion
- Duration: 2 weeks

Test 3: Tutorial Skip Option
- Variant A: Skip button visible (50%)
- Variant B: No skip button (50%)
- Metric: Tutorial completion rate + D1 retention
- Duration: 1 week
```

### 19.4 Community Management

**User Feedback Channels:**
- In-app feedback button (Settings → Support)
- Google Play / App Store reviews (respond within 48h)
- Email support: support@yourstudio.com
- (Optional) Discord / Reddit community

**Review Management:**
```
- Respond to negative reviews promptly
- Thank positive reviewers
- Fix reported bugs in updates
- Implement popular feature requests
```

### 19.5 Content Roadmap (6 months)

**Month 1:** Launch + stabilization
**Month 2:** 10 new levels, bug fixes
**Month 3:** New car tier, UI improvements
**Month 4:** Special events system
**Month 5:** Level pack 2 (20 more levels)
**Month 6:** Multiplayer mode (optional, if successful)

---

## 20. Final Notes

### 20.1 Development Timeline Estimate

**MVP Development:** 8-12 weeks (1 developer)
- Week 1-2: Core gameplay (Three.js, physics, controls)
- Week 3-4: Level generator, first 20 levels
- Week 5-6: UI screens, economy system
- Week 7-8: Audio, polish, animations
- Week 9-10: Analytics, ads, IAP integration
- Week 11-12: Testing, optimization, store submission

**With 2 developers:** 6-8 weeks

### 20.2 Cost Breakdown (Estimate)

**Development:**
- Programmer (solo): $0 (if you) or $5k-10k (freelancer)
- 3D artist (cars + environments): $2k-5k
- Audio assets: $500-1k (or royalty-free)
- **Total:** $2.5k-16k

**Services (Annual):**
- Apple Developer Program: $99/year
- Google Play Developer: $25 one-time
- Firebase: Free tier (sufficient for launch)
- Domain + hosting (privacy policy): $50/year
- **Total:** ~$175/year

**Marketing (Optional):**
- App Store Optimization: DIY or $500-2k
- Paid UA (User Acquisition): $1k-10k+ (if scaling)

### 20.3 Revenue Projections (Conservative)

**Assumptions:**
- 10,000 downloads in first 3 months
- 50% D1 retention → 5,000 DAU (first day)
- 20% D7 retention → 2,000 WAU
- ARPU: $0.20

**First 3 Months Revenue:**
- 10,000 users × $0.20 ARPU = **$2,000**

**If game succeeds (100k downloads in 6 months):**
- 100,000 users × $0.20 ARPU = **$20,000**

### 20.4 Success Metrics

**Minimum Viable Success:**
- D1 Retention: >50%
- D7 Retention: >20%
- Crash-free rate: >99%
- ARPU: >$0.10
- 4.0+ star rating on stores

**Strong Success:**
- D1 Retention: >60%
- D7 Retention: >30%
- ARPU: >$0.25
- 100k+ downloads in 6 months
- 4.5+ star rating

### 20.5 Risk Mitigation

**Technical Risks:**
- Performance issues → Device profiling + user settings
- Memory leaks → Strict dispose discipline + testing
- Physics bugs → Extensive QA on test devices

**Business Risks:**
- Low retention → A/B test onboarding, difficulty
- Low monetization → Test ad frequency, IAP pricing
- High churn → Push notifications, daily systems

**Market Risks:**
- High competition → Focus on polish, unique features
- Store rejection → Follow guidelines strictly
- Ad revenue drop → Diversify (IAP focus)

### 20.6 Conclusion

This architecture supports:
- ✅ Fast iteration (web stack)
- ✅ Scalable content (level generator)
- ✅ Store-grade performance (optimization focus)
- ✅ Sustainable monetization (balanced ads + IAP)
- ✅ Data-driven decisions (Firebase analytics)
- ✅ Long-term engagement (daily systems)

**Next Steps:**
1. Set up development environment (Angular + Capacitor)
2. Implement core gameplay loop (Three.js + Cannon-es)
3. Build first 5 levels (handcrafted tutorial)
4. Integrate NgRx state management
5. Add audio system (Howler.js)
6. Implement economy + progression
7. Polish UI/UX
8. Integrate analytics + ads
9. Test on real devices (3GB RAM minimum)
10. Soft launch → iterate → global launch

**Status:** Production-Ready Blueprint ✅

---

**Document Version:** 2.0  
**Last Updated:** February 2, 2026  
**Author:** AI Assistant + Product Owner  
**License:** Proprietary
