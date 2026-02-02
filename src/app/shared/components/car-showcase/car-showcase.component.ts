import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { AssetManager } from '../../../game/managers/asset.manager';

@Component({
  selector: 'app-car-showcase',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="showcase-container">
      <canvas #canvas></canvas>
      <div *ngIf="loading" class="loading-spinner">Loading...</div>
    </div>
  `,
  styles: [`
    .showcase-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    canvas {
      width: 100%;
      height: 100%;
      outline: none;
    }
    .loading-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-family: var(--ion-font-family);
    }
  `]
})
export class CarShowcaseComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() carId: string = 'sedan_basic';

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private carMesh!: THREE.Group;
  private animationId: number | null = null;

  public loading = true;

  constructor(private assetManager: AssetManager) { }

  ngOnInit() {
    this.initScene();
    this.loadCar();
  }

  ngOnDestroy() {
    this.stop();
    this.renderer.dispose();
  }

  ngOnChanges() {
    if (this.scene) {
      this.loadCar();
    }
  }

  private initScene() {
    const canvas = this.canvasRef.nativeElement;

    // Scene
    this.scene = new THREE.Scene();

    // Transparent background
    this.scene.background = null;

    // Camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(3, 2, 4);
    this.camera.lookAt(0, 0.5, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 5, 5);
    this.scene.add(dir);

    this.animate();
  }

  private async loadCar() {
    this.loading = true;

    // Remove old car
    if (this.carMesh) {
      this.scene.remove(this.carMesh);
    }

    try {
      this.carMesh = await this.assetManager.loadCar(this.carId);
      this.scene.add(this.carMesh);

      // Center and scale if needed
      this.carMesh.position.set(0, 0, 0);

    } catch (error) {
      console.error('Failed to load car for showcase', error);
    } finally {
      this.loading = false;
    }
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.carMesh) {
      this.carMesh.rotation.y += 0.005; // Slow rotation
    }

    this.renderer.render(this.scene, this.camera);
  };

  private stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
