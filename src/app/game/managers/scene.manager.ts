import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CarController, CarControllerConfig } from '../controllers/car.controller';

@Injectable({
    providedIn: 'root'
})
export class SceneManager {
    // Three.js core
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;

    // Physics world
    private physicsWorld!: CANNON.World;

    // Game loop
    private animationFrameId: number | null = null;
    private lastTime = 0;
    private readonly fixedTimeStep = 1 / 60; // 60Hz physics

    // Game entities
    private carController: CarController | null = null;

    // Camera follow settings
    private readonly cameraOffset = new THREE.Vector3(0, 3, -8);
    private readonly cameraLookAhead = 2;

    constructor(private ngZone: NgZone) { }

    /**
     * Initialize the scene, camera, renderer, and physics world
     * Based on Analysis Section 15.2 (Performance)
     */
    initialize(canvas: HTMLCanvasElement): void {
        // Create Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

        // Create Camera
        const aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 5, 10);

        // Create Renderer (Performance optimized - Analysis Section 15.2)
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: false, // Disabled for mobile performance
            powerPreference: 'high-performance',
            alpha: false
        });

        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = false; // Shadows disabled for performance

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Initialize Physics World
        this.setupPhysics();

        // Add ground plane for testing
        this.createTestGround();

        console.log('SceneManager initialized');
    }

    /**
     * Setup Cannon-es physics world
     * Based on Analysis Section 15.6
     */
    private setupPhysics(): void {
        this.physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });

        // Enable sleeping for performance
        this.physicsWorld.allowSleep = true;

        // Ground material
        const groundMaterial = new CANNON.Material('ground');
        groundMaterial.friction = 0.5;
        groundMaterial.restitution = 0.3;
    }

    /**
     * Create test ground
     */
    private createTestGround(): void {
        // Visual ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        this.scene.add(groundMesh);

        // Physics ground
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0, // Static
            shape: groundShape,
            material: new CANNON.Material({ friction: 0.5 })
        });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.physicsWorld.addBody(groundBody);

        // Add grid helper for debugging
        const gridHelper = new THREE.GridHelper(100, 100);
        this.scene.add(gridHelper);
    }

    /**
     * Create and add a car to the scene
     */
    createCar(carMesh: THREE.Group): void {
        const config: CarControllerConfig = {
            mass: 150,
            chassisSize: { width: 1.8, height: 1.2, length: 4.5 },
            wheelRadius: 0.4,
            wheelOffset: { x: 0.9, y: 0, z: 1.5 },
            maxSpeed: 20,
            maxSteerAngle: Math.PI / 6, // 30 degrees
            engineForce: 1000,
            brakeForce: 50
        };

        const startPosition = new CANNON.Vec3(0, 2, 0);
        this.carController = new CarController(this.physicsWorld, config, startPosition);

        // Attach visuals
        this.carController.attachVisuals(carMesh, []);
        this.scene.add(carMesh);

        console.log('Car created and added to scene');
    }

    /**
     * Start the game loop
     * Fixed timestep physics from Analysis Section 15.6
     */
    start(): void {
        if (this.animationFrameId !== null) return;

        this.lastTime = performance.now();

        // Run outside Angular zone for performance
        this.ngZone.runOutsideAngular(() => {
            this.animate(this.lastTime);
        });

        console.log('Game loop started');
    }

    /**
     * Game loop with fixed timestep physics
     */
    private animate = (currentTime: number): void => {
        this.animationFrameId = requestAnimationFrame(this.animate);

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update physics with fixed timestep
        this.physicsWorld.step(this.fixedTimeStep, deltaTime, 3);

        // Update car controller
        if (this.carController) {
            this.carController.update(deltaTime);
            this.carController.syncVisuals();

            // Update camera to follow car
            this.updateCamera();
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    };

    /**
     * Update camera to follow car
     * Smooth lerp-based following
     */
    private updateCamera(): void {
        if (!this.carController) return;

        const carPosition = this.carController.getPosition();
        const carRotation = this.carController.getRotation();

        // Calculate desired camera position (behind the car)
        const offset = this.cameraOffset.clone();
        offset.applyQuaternion(carRotation);

        const desiredPosition = carPosition.clone().add(offset);

        // Smooth camera movement (lerp)
        this.camera.position.lerp(desiredPosition, 0.1);

        // Look at point slightly ahead of the car
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(carRotation);
        const lookAtPoint = carPosition.clone().add(forward.multiplyScalar(this.cameraLookAhead));

        this.camera.lookAt(lookAtPoint);
    }

    /**
     * Stop the game loop
     */
    stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Set car controls
     */
    setCarControls(throttle: number, brake: number, steer: number): void {
        this.carController?.setControls(throttle, brake, steer);
    }

    /**
     * Toggle car gear
     */
    toggleCarGear(): void {
        this.carController?.toggleGear();
    }

    /**
     * Dispose current level
     * Based on Analysis Section 3.3 (Memory Management)
     */
    disposeCurrentLevel(): void {
        // Traverse scene and dispose
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();

                if (Array.isArray(object.material)) {
                    object.material.forEach((m) => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Clear scene
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        // Remove car controller
        if (this.carController) {
            this.carController.dispose();
            this.carController = null;
        }

        // Clear physics bodies (except ground)
        this.physicsWorld.bodies.forEach((body) => {
            if (body.mass > 0) {
                // Remove dynamic bodies only
                this.physicsWorld.removeBody(body);
            }
        });

        console.log('Level disposed');
    }

    /**
   * Get Physics World
   */
    getPhysicsWorld(): CANNON.World {
        return this.physicsWorld;
    }

    /**
     * Get Car Controller
     */
    getCarController(): CarController | null {
        return this.carController;
    }

    /**
     * Resize handler
     */
    onResize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Get current scene (for debugging)
     */
    getScene(): THREE.Scene {
        return this.scene;
    }

    /**
     * Get renderer info for performance monitoring
     */
    getRendererInfo(): any {
        return this.renderer.info;
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.stop();
        this.disposeCurrentLevel();
        this.renderer.dispose();
    }
}
