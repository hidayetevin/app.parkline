import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface CarModel {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
}

interface LevelData {
    meshes: THREE.Mesh[];
    physicsBodies: any[]; // CANNON.Body array
}

interface CacheEntry<T> {
    data: T;
    lastAccessed: number;
}

@Injectable({
    providedIn: 'root'
})
export class AssetManager {
    private gltfLoader: GLTFLoader;
    private dracoLoader: DRACOLoader;

    // LRU Caches
    private carCache = new Map<string, CacheEntry<CarModel>>();
    private levelCache = new Map<string, CacheEntry<LevelData>>();

    private readonly MAX_CAR_CACHE = 3;
    private readonly MAX_LEVEL_CACHE = 2;

    constructor() {
        // Initialize DRACO Loader
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/assets/draco/');

        // Initialize GLTF Loader with DRACO support
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    /**
     * Load a car model with optimization
     */
    async loadCar(carId: string): Promise<THREE.Group> {
        // Check cache first
        const cached = this.carCache.get(carId);
        if (cached) {
            cached.lastAccessed = Date.now();
            return cached.data.scene.clone();
        }

        // Load from file
        try {
            const gltf = await this.gltfLoader.loadAsync(`/assets/cars/${carId}.glb`);
            const carModel = this.optimizeCarModel(gltf);

            // Add to cache
            this.addToCarCache(carId, carModel);

            return carModel.scene.clone();
        } catch (error) {
            console.warn(`Failed to load car: ${carId}, returning placeholder`, error);
            return this.createFallbackCar() as THREE.Group;
        }
    }

    /**
     * Load a level
     */
    async loadLevel(levelId: string): Promise<LevelData> {
        // Check cache
        const cached = this.levelCache.get(levelId);
        if (cached) {
            cached.lastAccessed = Date.now();
            return cached.data;
        }

        // For now, return placeholder data
        // TODO: Implement actual level loading from JSON/GLB
        const levelData: LevelData = {
            meshes: [],
            physicsBodies: []
        };

        this.addToLevelCache(levelId, levelData);
        return levelData;
    }

    /**
     * Optimize car model for mobile performance
     * Based on Analysis Section 3.2
     */
    private optimizeCarModel(gltf: GLTF): CarModel {
        gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Convert to MeshLambertMaterial (performant)
                const oldMaterial = child.material as THREE.Material;
                const map = (oldMaterial as any).map || null;
                const color = (oldMaterial as any).color || new THREE.Color(0xffffff);

                child.material = new THREE.MeshLambertMaterial({
                    map: map,
                    color: color
                });

                // Optimize textures if they exist
                if (map) {
                    map.minFilter = THREE.LinearFilter;
                    map.magFilter = THREE.LinearFilter;
                    map.generateMipmaps = false;
                }

                // Dispose old material
                oldMaterial.dispose();
            }
        });

        return {
            scene: gltf.scene,
            animations: gltf.animations
        };
    }

    /**
     * Dispose a level's resources
     */
    disposeLevel(levelData: LevelData): void {
        // Dispose geometries and materials
        levelData.meshes.forEach(mesh => {
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }

            // Dispose materials
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => this.disposeMaterial(mat));
            } else {
                this.disposeMaterial(mesh.material);
            }
        });

        // Clear array references
        levelData.meshes = [];
        levelData.physicsBodies = [];
    }

    /**
     * Dispose a single material and its textures
     */
    private disposeMaterial(material: THREE.Material): void {
        const mat = material as any;

        // Dispose all possible texture types
        if (mat.map) mat.map.dispose();
        if (mat.lightMap) mat.lightMap.dispose();
        if (mat.bumpMap) mat.bumpMap.dispose();
        if (mat.normalMap) mat.normalMap.dispose();
        if (mat.specularMap) mat.specularMap.dispose();
        if (mat.envMap) mat.envMap.dispose();

        material.dispose();
    }

    /**
     * LRU Cache management for cars
     */
    private addToCarCache(carId: string, model: CarModel): void {
        // If cache is full, remove least recently used
        if (this.carCache.size >= this.MAX_CAR_CACHE) {
            let oldestKey: string | null = null;
            let oldestTime = Infinity;

            this.carCache.forEach((entry, key) => {
                if (entry.lastAccessed < oldestTime) {
                    oldestTime = entry.lastAccessed;
                    oldestKey = key;
                }
            });

            if (oldestKey) {
                this.carCache.delete(oldestKey);
            }
        }

        this.carCache.set(carId, {
            data: model,
            lastAccessed: Date.now()
        });
    }

    /**
     * LRU Cache management for levels
     */
    private addToLevelCache(levelId: string, data: LevelData): void {
        // If cache is full, remove and dispose oldest
        if (this.levelCache.size >= this.MAX_LEVEL_CACHE) {
            let oldestKey: string | null = null;
            let oldestTime = Infinity;

            this.levelCache.forEach((entry, key) => {
                if (entry.lastAccessed < oldestTime) {
                    oldestTime = entry.lastAccessed;
                    oldestKey = key;
                }
            });

            if (oldestKey) {
                const oldEntry = this.levelCache.get(oldestKey);
                if (oldEntry) {
                    this.disposeLevel(oldEntry.data);
                }
                this.levelCache.delete(oldestKey);
            }
        }

        this.levelCache.set(levelId, {
            data: data,
            lastAccessed: Date.now()
        });
    }

    /**
     * Clear all caches (call on app shutdown)
     */
    clearCaches(): void {
        this.carCache.clear();
        this.levelCache.forEach(entry => this.disposeLevel(entry.data));
        this.levelCache.clear();
    }

    private createFallbackCar(): THREE.Object3D {
        const carGroup = new THREE.Group();

        // 1. Car Chassis (Main Body)
        const chassisGeometry = new THREE.BoxGeometry(2, 0.5, 4.5);
        const chassisMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.7, roughness: 0.2 }); // Red Sport
        const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
        chassis.position.y = 0.5;
        chassis.castShadow = true;
        carGroup.add(chassis);

        // 2. Cabin (Top part)
        const cabinGeometry = new THREE.BoxGeometry(1.8, 0.4, 2.5);
        const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.1 }); // Dark glass/roof
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.y = 1.0;
        cabin.position.z = -0.2;
        cabin.castShadow = true;
        carGroup.add(cabin);

        // 3. Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        wheelGeometry.rotateZ(Math.PI / 2);

        const wheelPositions = [
            { x: 1, y: 0.35, z: 1.5 },   // Front Right
            { x: -1, y: 0.35, z: 1.5 },  // Front Left
            { x: 1, y: 0.35, z: -1.5 },  // Rear Right
            { x: -1, y: 0.35, z: -1.5 }  // Rear Left
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            carGroup.add(wheel);
        });

        // 4. Headlights (Front)
        const lightGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.1);
        const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 2 });

        const leftLight = new THREE.Mesh(lightGeometry, lightMaterial);
        leftLight.position.set(-0.6, 0.6, 2.25);
        carGroup.add(leftLight);

        const rightLight = new THREE.Mesh(lightGeometry, lightMaterial);
        rightLight.position.set(0.6, 0.6, 2.25);
        carGroup.add(rightLight);

        // 5. Taillights (Rear)
        const tailGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.1);
        const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });

        const leftTail = new THREE.Mesh(tailGeometry, tailMaterial);
        leftTail.position.set(-0.6, 0.6, -2.25);
        carGroup.add(leftTail);

        const rightTail = new THREE.Mesh(tailGeometry, tailMaterial);
        rightTail.position.set(0.6, 0.6, -2.25);
        carGroup.add(rightTail);

        return carGroup;
    }
}
