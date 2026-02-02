
# Mobile Car Parking Game – Full Technical & Design Analysis
**Platform:** Android & iOS  
**Tech Stack:** Angular + Capacitor + Three.js  
**Mode:** Single-player  
**Monetization:** AdMob (Interstitial + Rewarded)  

---

## 1. Project Overview
This document provides a full end-to-end analysis of a mobile car parking game built using web technologies (Three.js) and wrapped with Capacitor for native deployment. The focus is on performance, retention, scalability, and store readiness.

---

## 2. Core Technology Stack

### 2.1 Framework & Runtime
- **Angular**: UI, state management, screens
- **Capacitor**: Native bridge, storage, ads, builds
- **Three.js**: 3D rendering
- **Cannon-es / Ammo.js**: Physics
- **TypeScript**: Core language

### 2.2 Why This Stack Works
- Single codebase for Android & iOS
- Full control vs Unity
- Lightweight builds
- Web-based iteration speed

---

## 3. Game Design Summary

### 3.1 Player Perspective
- Third-person camera
- Realistic but forgiving controls
- No multiplayer

### 3.2 Failure & Penalty Logic
- No hard fail unless extreme
- Visual car damage
- Score & reward reduction
- Encourages retry without frustration

---

## 4. Player Retention & Psychology

### 4.1 Retention Layers
- Instant feedback (controls, camera)
- Short-term goals (next level, stars)
- Medium-term goals (unlock cars)
- Long-term mastery (perfect parking)

### 4.2 Star System
- ⭐ Pass
- ⭐⭐ Clean driving
- ⭐⭐⭐ Perfect parking

Stars drive replayability.

---

## 5. Level Difficulty & Pacing

### 5.1 Difficulty Parameters
- Parking area size
- Time limit
- Angle tolerance
- Obstacles
- Required maneuvers

### 5.2 5-Level Block Structure
- Levels 1–5: Very easy
- Levels 6–10: Introduce pressure
- Levels 11–15: Reverse & angled parking
- Levels 16–20: Mastery

Difficulty oscillates to reduce churn.

---

## 6. Level Generator System (OPTION 2)

### 6.1 Why a Level Generator?
- Reduce manual level design cost
- Infinite scalability
- Easy difficulty tuning
- Faster content production

---

## 6.2 Level Blueprint Model

```ts
interface LevelBlueprint {
  id: string;
  difficulty: number; // 1–10
  parkingType: 'straight' | 'reverse' | 'angled';
  areaSize: number;
  timeLimit: number;
  obstacleCount: number;
  angleTolerance: number;
}
```

---

## 6.3 Difficulty Curve Function

```ts
function generateDifficulty(levelIndex: number): number {
  return Math.min(10, Math.floor(levelIndex / 5) + 1);
}
```

---

## 6.4 Procedural Parameter Mapping

| Difficulty | Area Size | Time | Obstacles | Angle Tol |
|----------|----------|------|-----------|-----------|
| 1–2 | Large | 60s | 0 | ±20° |
| 3–4 | Medium | 50s | 1 | ±15° |
| 5–6 | Medium | 40s | 2 | ±10° |
| 7–8 | Small | 35s | 3 | ±7° |
| 9–10 | Very Small | 30s | 4 | ±5° |

---

## 6.5 Generator Flow

```ts
function generateLevel(index: number): LevelBlueprint {
  const difficulty = generateDifficulty(index);

  return {
    id: `level_${index}`,
    difficulty,
    parkingType: difficulty < 5 ? 'straight' : 'reverse',
    areaSize: 12 - difficulty,
    timeLimit: 70 - difficulty * 4,
    obstacleCount: Math.floor(difficulty / 2),
    angleTolerance: Math.max(5, 25 - difficulty * 2)
  };
}
```

---

## 6.6 Handcrafted + Generated Hybrid
- Early levels: handcrafted
- Later levels: generator-based
- Special levels override generator rules

---

## 7. Controls

### 7.1 Control Types
- Steering wheel (default)
- Button-based steering

### 7.2 Dynamic Sensitivity
- Low speed: soft steering
- High speed: stiff steering

---

## 8. Screens & UX Flow

1. Splash Screen
2. Main Menu
3. Vehicle Selection
4. Level Selection
5. Gameplay
6. Result Screen
7. Rewarded Ad Prompt

---

## 9. Monetization Strategy

### 9.1 Ad Types
- Interstitial: after level completion
- Rewarded: retry, bonus cash

### 9.2 AdMob
- Test IDs during development
- Real IDs added later

---

## 10. Save System

### 10.1 Save Data

```ts
interface SaveData {
  money: number;
  unlockedVehicles: string[];
  completedLevels: string[];
  settings: object;
}
```

Stored via Capacitor Storage.

---

## 11. Performance Guidelines
- Max 20k tris per vehicle
- LOD system mandatory
- Texture size ≤ 1024px
- Draco compression enabled

---

## 12. Release Readiness

### Android
- Target SDK up-to-date
- 64-bit build
- Privacy policy

### iOS
- ATT prompt
- TestFlight testing
- App Store review compliance

---

## 13. Final Notes
This architecture supports:
- Fast iteration
- Scalable content
- Store-grade performance
- Monetization without churn

---
**Status:** MVP-ready  
