import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { ParkingZone } from '../models/level.model';
import { CarController } from '../controllers/car.controller';
import * as GameActions from '../../store/game/game.actions';
import * as EconomyActions from '../../store/economy/economy.actions';

export interface LevelResult {
    completed: boolean;
    stars: number;
    timeUsed: number;
    collisionCount: number;
    finalAngleError: number;
    coinsEarned: number;
}

@Injectable({
    providedIn: 'root'
})
export class GameRulesManager {
    // State
    private isLevelActive = false;
    private levelStartTime = 0;
    private collisionCount = 0;
    private timeLimit = 60;
    private angleTolerance = 15; // degrees

    // References
    private carController: CarController | null = null;
    private parkingZone: ParkingZone | null = null;
    private physicsWorld: CANNON.World | null = null;

    // Collision tracking
    private readonly COLLISION_THRESHOLD = 2; // Impact velocity threshold
    private lastCollisionTime = 0;
    private readonly COLLISION_COOLDOWN = 500; // ms

    constructor(private store: Store) { }

    /**
     * Initialize level rules
     */
    startLevel(
        carController: CarController,
        parkingZone: ParkingZone,
        physicsWorld: CANNON.World,
        timeLimit: number,
        angleTolerance: number
    ): void {
        this.carController = carController;
        this.parkingZone = parkingZone;
        this.physicsWorld = physicsWorld;
        this.timeLimit = timeLimit;
        this.angleTolerance = angleTolerance;

        this.isLevelActive = true;
        this.levelStartTime = Date.now();
        this.collisionCount = 0;

        // Setup collision detection
        this.setupCollisionDetection();

        console.log('Level started', { timeLimit, angleTolerance });
    }

    /**
     * Setup Cannon.js collision event listeners
     * Analysis Section 4.2
     */
    private setupCollisionDetection(): void {
        if (!this.physicsWorld) return;

        this.physicsWorld.addEventListener('beginContact', (event: any) => {
            const now = Date.now();

            // Cooldown to prevent multiple triggers
            if (now - this.lastCollisionTime < this.COLLISION_COOLDOWN) return;

            // Calculate impact velocity
            const body1 = event.bodyA;
            const body2 = event.bodyB;

            const relativeVelocity = new CANNON.Vec3();
            body2.velocity.vsub(body1.velocity, relativeVelocity);
            const impactSpeed = relativeVelocity.length();

            // Only count significant collisions
            if (impactSpeed > this.COLLISION_THRESHOLD) {
                this.handleCollision(impactSpeed);
                this.lastCollisionTime = now;
            }
        });
    }

    /**
     * Handle collision event
     */
    private handleCollision(impact: number): void {
        this.collisionCount++;
        console.log(`Collision detected! Count: ${this.collisionCount}, Impact: ${impact.toFixed(2)}`);

        // TODO: Trigger audio/haptic feedback
        // TODO: Visual damage feedback
    }

    /**
     * Check every frame for level completion
     * Call from game loop
     * Analysis Section 4.2
     */
    update(): void {
        if (!this.isLevelActive || !this.carController || !this.parkingZone) return;

        // Check time limit
        const elapsed = this.getElapsedTime();
        if (elapsed >= this.timeLimit) {
            this.failLevel('timeout');
            return;
        }

        // Check parking status
        if (this.isCarParked()) {
            this.completeLevel();
        }
    }

    /**
     * Check if car is properly parked
     * Analysis Section 4.2
     */
    private isCarParked(): boolean {
        if (!this.carController || !this.parkingZone) return false;

        const carPosition = this.carController.getPosition();
        const carRotation = this.carController.getRotation();
        const carSpeed = this.carController.getCurrentSpeed();

        // 1. Check if car is within parking zone (2D bounds)
        const zone = this.parkingZone;
        const isInZone =
            Math.abs(carPosition.x - zone.position.x) < zone.size.width / 2 &&
            Math.abs(carPosition.z - zone.position.z) < zone.size.length / 2;

        if (!isInZone) return false;

        // 2. Check if car is stopped
        if (Math.abs(carSpeed) > 0.1) return false;

        // 3. Check angle alignment
        const carAngle = this.getCarYawAngle(carRotation);
        const targetAngle = zone.rotation;
        const angleError = this.getAngleDifference(carAngle, targetAngle);

        const angleOk = Math.abs(angleError) < this.degreesToRadians(this.angleTolerance);

        return angleOk;
    }

    /**
     * Calculate stars based on performance
     * Analysis Section 4.3
     */
    private calculateStars(result: {
        timeUsed: number;
        collisionCount: number;
        finalAngleError: number
    }): number {
        let stars = 3; // Start with perfect

        // Collision penalty
        if (result.collisionCount > 0) {
            stars -= 1;
        }

        // Time penalty (if used > 70% of limit)
        if (result.timeUsed > this.timeLimit * 0.7) {
            stars -= 1;
        }

        // Angle penalty (if error > 10 degrees)
        if (result.finalAngleError > 10) {
            stars -= 1;
        }

        return Math.max(0, stars);
    }

    /**
     * Calculate coins earned
     * Based on Analysis Section 10.1
     */
    private calculateCoins(stars: number, timeUsed: number): number {
        let coins = 100; // Base reward

        // Star bonus
        coins += stars * 50;

        // Time bonus (if completed in less than 50% of time limit)
        if (timeUsed < this.timeLimit * 0.5) {
            coins += 50;
        }

        // No damage bonus
        if (this.collisionCount === 0) {
            coins += 100;
        }

        return coins;
    }

    /**
     * Complete level successfully
     */
    private completeLevel(): void {
        if (!this.carController || !this.parkingZone) return;

        this.isLevelActive = false;

        const timeUsed = this.getElapsedTime();
        const carRotation = this.carController.getRotation();
        const carAngle = this.getCarYawAngle(carRotation);
        const targetAngle = this.parkingZone.rotation;
        const angleError = Math.abs(this.radiansToDegrees(this.getAngleDifference(carAngle, targetAngle)));

        const result: LevelResult = {
            completed: true,
            timeUsed,
            collisionCount: this.collisionCount,
            finalAngleError: angleError,
            stars: 0,
            coinsEarned: 0
        };

        // Calculate stars
        result.stars = this.calculateStars(result);

        // Calculate coins
        result.coinsEarned = this.calculateCoins(result.stars, timeUsed);

        console.log('Level Complete!', result);

        // Dispatch to store
        this.store.dispatch(GameActions.completeLevel({
            stars: result.stars,
            coins: result.coinsEarned,
            timeUsed: result.timeUsed
        }));

        this.store.dispatch(EconomyActions.addCoins({
            amount: result.coinsEarned
        }));
    }

    /**
     * Fail level
     */
    private failLevel(reason: string): void {
        this.isLevelActive = false;

        console.log('Level Failed:', reason);

        this.store.dispatch(GameActions.failLevel({ reason }));
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedTime(): number {
        return (Date.now() - this.levelStartTime) / 1000;
    }

    /**
     * Get remaining time
     */
    getRemainingTime(): number {
        return Math.max(0, this.timeLimit - this.getElapsedTime());
    }

    /**
     * Get collision count
     */
    getCollisionCount(): number {
        return this.collisionCount;
    }

    /**
     * Get car yaw angle (Y-axis rotation)
     */
    private getCarYawAngle(quaternion: THREE.Quaternion): number {
        const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
        return euler.y;
    }

    /**
     * Get smallest angle difference between two angles
     */
    private getAngleDifference(angle1: number, angle2: number): number {
        let diff = angle1 - angle2;

        // Normalize to -PI to PI
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        return diff;
    }

    /**
     * Convert degrees to radians
     */
    private degreesToRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Convert radians to degrees
     */
    private radiansToDegrees(radians: number): number {
        return radians * (180 / Math.PI);
    }

    /**
     * Reset for new level
     */
    reset(): void {
        this.isLevelActive = false;
        this.collisionCount = 0;
        this.carController = null;
        this.parkingZone = null;
        this.physicsWorld = null;
    }

    /**
     * Is level currently active
     */
    isActive(): boolean {
        return this.isLevelActive;
    }
}
