import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export interface CarControllerConfig {
    mass: number;
    chassisSize: { width: number; height: number; length: number };
    wheelRadius: number;
    wheelOffset: { x: number; y: number; z: number };
    maxSpeed: number;
    maxSteerAngle: number;
    engineForce: number;
    brakeForce: number;
}

export class CarController {
    private vehicle!: CANNON.RaycastVehicle;
    private chassisBody!: CANNON.Body;
    private world: CANNON.World;

    // Three.js visual representation
    public chassisMesh!: THREE.Group;
    private wheelMeshes: THREE.Mesh[] = [];

    // Control inputs
    private throttleInput = 0;
    private brakeInput = 0;
    private steerInput = 0;
    private currentGear: 'forward' | 'reverse' = 'forward';

    // Dynamic steering sensitivity
    private readonly maxSteerAngle: number;
    private readonly maxSpeed: number;

    constructor(
        world: CANNON.World,
        config: CarControllerConfig,
        startPosition: CANNON.Vec3
    ) {
        this.world = world;
        this.maxSteerAngle = config.maxSteerAngle;
        this.maxSpeed = config.maxSpeed;

        this.setupPhysics(config, startPosition);
    }

    /**
     * Setup Cannon.js physics body and RaycastVehicle
     */
    private setupPhysics(config: CarControllerConfig, position: CANNON.Vec3): void {
        // Create chassis body
        const chassisShape = new CANNON.Box(
            new CANNON.Vec3(
                config.chassisSize.width / 2,
                config.chassisSize.height / 2,
                config.chassisSize.length / 2
            )
        );

        this.chassisBody = new CANNON.Body({
            mass: config.mass,
            position: position,
            shape: chassisShape,
            material: new CANNON.Material({ friction: 0.3, restitution: 0.1 })
        });

        this.world.addBody(this.chassisBody);

        // Create RaycastVehicle
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.chassisBody
        });

        // Add wheels
        const wheelPositions = [
            { x: config.wheelOffset.x, y: config.wheelOffset.y, z: config.wheelOffset.z },   // Front left
            { x: -config.wheelOffset.x, y: config.wheelOffset.y, z: config.wheelOffset.z },  // Front right
            { x: config.wheelOffset.x, y: config.wheelOffset.y, z: -config.wheelOffset.z },  // Rear left
            { x: -config.wheelOffset.x, y: config.wheelOffset.y, z: -config.wheelOffset.z }  // Rear right
        ];

        const wheelOptions = {
            radius: config.wheelRadius,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 1.5,
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            maxSuspensionForce: 100000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(0, 0, 0),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: -30
        };

        wheelPositions.forEach((pos) => {
            wheelOptions.chassisConnectionPointLocal.set(pos.x, pos.y, pos.z);
            this.vehicle.addWheel(wheelOptions);
        });

        this.vehicle.addToWorld(this.world);
    }

    /**
     * Update control inputs
     */
    setControls(throttle: number, brake: number, steer: number): void {
        this.throttleInput = THREE.MathUtils.clamp(throttle, 0, 1);
        this.brakeInput = THREE.MathUtils.clamp(brake, 0, 1);
        this.steerInput = THREE.MathUtils.clamp(steer, -1, 1);
    }

    /**
     * Toggle gear
     */
    toggleGear(): void {
        this.currentGear = this.currentGear === 'forward' ? 'reverse' : 'forward';
    }

    /**
     * Update physics (call every frame)
     * Implements dynamic steering and auto-brake from Analysis Section 7.2 & 7.3
     */
    update(deltaTime: number): void {
        const currentSpeed = this.getCurrentSpeed();

        // Apply dynamic steering sensitivity (Analysis Section 7.2)
        const steeringValue = this.calculateDynamicSteering(currentSpeed);

        // Apply to front wheels (indices 0 and 1)
        this.vehicle.setSteeringValue(steeringValue, 0);
        this.vehicle.setSteeringValue(steeringValue, 1);

        // Apply engine force
        const engineForce = this.throttleInput * 1000;
        const gearMultiplier = this.currentGear === 'reverse' ? -1 : 1;

        this.vehicle.applyEngineForce(engineForce * gearMultiplier, 2);
        this.vehicle.applyEngineForce(engineForce * gearMultiplier, 3);

        // Apply brake
        const brakeForce = this.brakeInput * 50;
        this.vehicle.setBrake(brakeForce, 0);
        this.vehicle.setBrake(brakeForce, 1);
        this.vehicle.setBrake(brakeForce, 2);
        this.vehicle.setBrake(brakeForce, 3);

        // Auto-brake when no input (Analysis Section 7.3)
        if (this.throttleInput === 0 && this.brakeInput === 0) {
            const velocity = this.chassisBody.velocity.length();
            if (velocity < 0.5) {
                // Stop completely
                this.chassisBody.velocity.set(0, 0, 0);
                this.chassisBody.angularVelocity.set(0, 0, 0);

                // Apply full brake
                this.vehicle.setBrake(100, 0);
                this.vehicle.setBrake(100, 1);
                this.vehicle.setBrake(100, 2);
                this.vehicle.setBrake(100, 3);
            }
        }
    }

    /**
     * Calculate dynamic steering with speed-based sensitivity
     * From Analysis Section 7.2
     */
    private calculateDynamicSteering(currentSpeed: number): number {
        const absSpeed = Math.abs(currentSpeed);

        // Map speed to sensitivity factor (1.0 at rest, 0.3 at max speed)
        const speedFactor = THREE.MathUtils.mapLinear(
            absSpeed,
            0,
            this.maxSpeed,
            1.0,
            0.3
        );

        // Apply to steering input
        const adjustedSteer = this.steerInput * speedFactor;

        // Convert to angle in radians
        return adjustedSteer * this.maxSteerAngle;
    }

    /**
     * Get current speed in m/s
     */
    getCurrentSpeed(): number {
        const velocity = this.chassisBody.velocity;
        const forward = new CANNON.Vec3();
        this.chassisBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1), forward);

        return velocity.dot(forward);
    }

    /**
     * Sync Three.js mesh with physics body
     */
    syncVisuals(): void {
        if (this.chassisMesh) {
            this.chassisMesh.position.copy(this.chassisBody.position as any);
            this.chassisMesh.quaternion.copy(this.chassisBody.quaternion as any);
        }

        // Update wheel meshes (if they exist)
        this.vehicle.wheelInfos.forEach((wheel, index) => {
            if (this.wheelMeshes[index]) {
                this.vehicle.updateWheelTransform(index);
                const transform = wheel.worldTransform;
                this.wheelMeshes[index].position.copy(transform.position as any);
                this.wheelMeshes[index].quaternion.copy(transform.quaternion as any);
            }
        });
    }

    /**
     * Attach Three.js visual representation
     */
    attachVisuals(chassisMesh: THREE.Group, wheelMeshes: THREE.Mesh[]): void {
        this.chassisMesh = chassisMesh;
        this.wheelMeshes = wheelMeshes;
    }

    /**
     * Get position for camera following
     */
    getPosition(): THREE.Vector3 {
        return new THREE.Vector3(
            this.chassisBody.position.x,
            this.chassisBody.position.y,
            this.chassisBody.position.z
        );
    }

    /**
     * Get rotation for camera
     */
    getRotation(): THREE.Quaternion {
        return new THREE.Quaternion(
            this.chassisBody.quaternion.x,
            this.chassisBody.quaternion.y,
            this.chassisBody.quaternion.z,
            this.chassisBody.quaternion.w
        );
    }

    /**
     * Reset car to position
     */
    reset(position: CANNON.Vec3, rotation: CANNON.Quaternion = new CANNON.Quaternion()): void {
        this.chassisBody.position.copy(position);
        this.chassisBody.quaternion.copy(rotation);
        this.chassisBody.velocity.set(0, 0, 0);
        this.chassisBody.angularVelocity.set(0, 0, 0);

        // Reset inputs
        this.throttleInput = 0;
        this.brakeInput = 0;
        this.steerInput = 0;
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.vehicle.removeFromWorld(this.world);
        this.world.removeBody(this.chassisBody);
    }
}
