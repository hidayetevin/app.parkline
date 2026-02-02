import { Injectable } from '@angular/core';
import { LevelBlueprint, ParkingZone } from '../models/level.model';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

@Injectable({
    providedIn: 'root'
})
export class LevelManager {
    // Handcrafted level indices (tutorial + milestone levels)
    private readonly HANDCRAFTED_LEVELS = [1, 2, 3, 4, 5, 10, 15, 20, 25];

    /**
     * Get level configuration by index
     * Analysis Section 6.3: Hybrid system
     */
    getLevel(index: number): LevelBlueprint {
        if (this.HANDCRAFTED_LEVELS.includes(index)) {
            return this.loadHandcraftedLevel(index);
        }
        return this.generateLevel(index);
    }

    /**
     * Generate level algorithmically
     * Analysis Section 6.1: Level Generator System
     */
    private generateLevel(index: number): LevelBlueprint {
        const difficulty = this.calculateDifficulty(index);

        return {
            id: `level_${index}`,
            difficulty,
            parkingType: this.selectParkingType(difficulty),
            areaSize: this.calculateAreaSize(difficulty),
            timeLimit: this.calculateTimeLimit(difficulty),
            obstacleCount: this.calculateObstacleCount(difficulty),
            angleTolerance: this.calculateAngleTolerance(difficulty),
            environmentTheme: this.selectEnvironment(index),
            handcrafted: false
        };
    }

    /**
     * Calculate difficulty with oscillation
     * Analysis Section 6.1
     */
    private calculateDifficulty(levelIndex: number): number {
        // Base difficulty increases every 5 levels
        const base = Math.min(10, Math.floor(levelIndex / 5) + 1);

        // Every 5th level is slightly easier
        const oscillation = (levelIndex % 5 === 4) ? -1 : 0;

        return Math.max(1, base + oscillation);
    }

    /**
     * Select parking type based on difficulty
     * Analysis Section 6.1
     */
    private selectParkingType(difficulty: number): 'straight' | 'reverse' | 'angled' | 'parallel' {
        if (difficulty <= 3) return 'straight';
        if (difficulty <= 6) return 'reverse';
        if (difficulty <= 8) return 'angled';
        return 'parallel';
    }

    /**
     * Calculate parking area size
     * Analysis Section 6.2
     */
    private calculateAreaSize(difficulty: number): number {
        // 11m for easy (difficulty 1) to 2m for hard (difficulty 10)
        return 12 - difficulty;
    }

    /**
     * Calculate time limit
     * Analysis Section 6.2
     */
    private calculateTimeLimit(difficulty: number): number {
        // 70s for easy, 30s for hard
        return Math.max(30, 70 - difficulty * 4);
    }

    /**
     * Calculate obstacle count
     * Analysis Section 6.2
     */
    private calculateObstacleCount(difficulty: number): number {
        return Math.floor(difficulty / 2);
    }

    /**
     * Calculate angle tolerance
     * Analysis Section 6.2
     */
    private calculateAngleTolerance(difficulty: number): number {
        // ±25° for easy, ±5° for hard
        return Math.max(5, 25 - difficulty * 2);
    }

    /**
     * Select environment theme (cycles through themes)
     */
    private selectEnvironment(index: number): 'parking_lot' | 'street' | 'garage' | 'mall' {
        const themes: Array<'parking_lot' | 'street' | 'garage' | 'mall'> =
            ['parking_lot', 'street', 'garage', 'mall'];
        return themes[index % themes.length];
    }

    /**
     * Load handcrafted level
     */
    private loadHandcraftedLevel(index: number): LevelBlueprint {
        // TODO: Load from JSON file in assets/levels/
        // For now, return generated with fixed properties
        const generated = this.generateLevel(index);

        // Override for tutorial level
        if (index === 1) {
            return {
                ...generated,
                areaSize: 20, // Very large
                timeLimit: 999, // No time pressure
                obstacleCount: 0,
                angleTolerance: 30,
                handcrafted: true
            };
        }

        return { ...generated, handcrafted: true };
    }

    /**
     * Build level geometry in the scene
     */
    buildLevel(
        blueprint: LevelBlueprint,
        scene: THREE.Scene,
        physicsWorld: CANNON.World
    ): { parkingZone: ParkingZone; obstacles: THREE.Mesh[] } {
        // Create ground (already exists in SceneManager, skip for now)

        // Create parking zone
        const parkingZone = this.createParkingZone(blueprint, scene, physicsWorld);

        // Create obstacles
        const obstacles = this.createObstacles(blueprint, scene, physicsWorld);

        return { parkingZone, obstacles };
    }

    /**
     * Create parking zone (visual + physics)
     */
    private createParkingZone(
        blueprint: LevelBlueprint,
        scene: THREE.Scene,
        physicsWorld: CANNON.World
    ): ParkingZone {
        const zoneSize = {
            width: blueprint.areaSize,
            length: blueprint.areaSize * 1.5 // Parking spots are rectangular
        };

        // Position in front of the car
        const position = { x: 0, y: 0.01, z: 15 };
        const rotation = 0;

        // Visual representation (yellow lines)
        const geometry = new THREE.PlaneGeometry(zoneSize.width, zoneSize.length);
        const material = new THREE.MeshLambertMaterial({
            color: 0xffff00,
            opacity: 0.3,
            transparent: true
        });

        const zoneMesh = new THREE.Mesh(geometry, material);
        zoneMesh.rotation.x = -Math.PI / 2;
        zoneMesh.position.set(position.x, position.y, position.z);
        zoneMesh.name = 'parking_zone';

        scene.add(zoneMesh);

        // Add parking lines (visual)
        this.addParkingLines(position, zoneSize, scene);

        return {
            position,
            rotation,
            size: zoneSize
        };
    }

    /**
     * Add parking boundary lines
     */
    private addParkingLines(
        position: { x: number; y: number; z: number },
        size: { width: number; length: number },
        scene: THREE.Scene
    ): void {
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

        const points = [
            new THREE.Vector3(-size.width / 2, 0, -size.length / 2),
            new THREE.Vector3(size.width / 2, -size.length / 2),
            new THREE.Vector3(size.width / 2, 0, size.length / 2),
            new THREE.Vector3(-size.width / 2, 0, size.length / 2),
            new THREE.Vector3(-size.width / 2, 0, -size.length / 2)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial);
        line.position.set(position.x, position.y + 0.02, position.z);

        scene.add(line);
    }

    /**
     * Create obstacles (cones, barriers)
     */
    private createObstacles(
        blueprint: LevelBlueprint,
        scene: THREE.Scene,
        physicsWorld: CANNON.World
    ): THREE.Mesh[] {
        const obstacles: THREE.Mesh[] = [];

        for (let i = 0; i < blueprint.obstacleCount; i++) {
            const obstacle = this.createCone(scene, physicsWorld, i);
            obstacles.push(obstacle);
        }

        return obstacles;
    }

    /**
     * Create a single traffic cone
     */
    private createCone(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        index: number
    ): THREE.Mesh {
        // Visual cone
        const geometry = new THREE.ConeGeometry(0.3, 0.8, 8);
        const material = new THREE.MeshLambertMaterial({ color: 0xff6600 });
        const cone = new THREE.Mesh(geometry, material);

        // Random position around the parking area
        const angle = (index / 3) * Math.PI * 2;
        const radius = 5 + Math.random() * 3;
        cone.position.set(
            Math.cos(angle) * radius,
            0.4,
            15 + Math.sin(angle) * radius
        );

        scene.add(cone);

        // Physics body (cylinder approximation)
        const shape = new CANNON.Cylinder(0.3, 0.3, 0.8, 8);
        const body = new CANNON.Body({
            mass: 1,
            shape: shape,
            material: new CANNON.Material({ friction: 0.5 })
        });
        body.position.copy(cone.position as any);
        physicsWorld.addBody(body);

        return cone;
    }
}
