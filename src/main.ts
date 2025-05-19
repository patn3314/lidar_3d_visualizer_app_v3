import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Removed unused import
import { WorldManager } from './scene/world';
import { SensorManager } from './scene/sensor';
import { ObstacleManager } from './scene/obstacle';
import { BeamManager } from './scene/beams';
import { PanelUI } from './ui/panel';
import { LoadSaveManager } from './ui/loaders';

class LiDAR3DVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private worldManager: WorldManager;
  private sensorManager: SensorManager;
  private obstacleManager: ObstacleManager;
  private beamManager: BeamManager;
  private panelUI: PanelUI;
  private loadSaveManager: LoadSaveManager;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.scene.userData.orbitControls = this.controls; // Make controls accessible for ObstacleManager

    this.worldManager = new WorldManager(this.scene);
    this.obstacleManager = new ObstacleManager(this.scene);
    // Initialize ObstacleManager controls here, as it might need camera, renderer, and orbitControls
    this.obstacleManager.initControls(this.camera, this.renderer.domElement, this.controls);

    this.sensorManager = new SensorManager(this.scene, this.obstacleManager, this.worldManager);
    this.beamManager = new BeamManager(this.scene, this.sensorManager, this.obstacleManager, this.worldManager);
    
    // Initialize loadSaveManager before panelUI if panelUI depends on it directly in constructor
    // Or ensure panelUI can handle a null loadSaveManager initially and set it later.
    // Based on previous PanelUI structure, it seems it can be set later.
    // However, the error TS2565 indicates loadSaveManager was used in PanelUI constructor before assignment.
    // Let's initialize loadSaveManager first.
    // The PanelUI constructor was: constructor(..., loadSaveManager: LoadSaveManager | null, ...)
    // The main.ts was: this.panelUI = new PanelUI(..., this.loadSaveManager, ...)
    // this.loadSaveManager = new LoadSaveManager(..., this.panelUI)
    // This is a circular dependency in initialization. Let's break it.
    // PanelUI needs LoadSaveManager for its buttons. LoadSaveManager needs PanelUI to refresh lists.

    // Option 1: Initialize PanelUI without LoadSaveManager, then set it.
    // this.panelUI = new PanelUI(this.worldManager, this.sensorManager, this.obstacleManager, null, this.beamManager);
    // this.loadSaveManager = new LoadSaveManager(this.scene, this.worldManager, this.sensorManager, this.obstacleManager, this.panelUI);
    // this.panelUI.setLoadSaveManager(this.loadSaveManager);

    // Option 2: Initialize LoadSaveManager without PanelUI, then set it.
    // This seems more logical as LoadSaveManager doesn't strictly need PanelUI in its constructor for its core logic, only for callbacks.
    // Let's assume LoadSaveManager constructor doesn't take PanelUI, but PanelUI takes LoadSaveManager.
    // The error was in PanelUI's constructor using an uninitialized loadSaveManager passed from main.ts.
    // So, loadSaveManager must be initialized before being passed to PanelUI constructor.

    // Corrected order:
    this.loadSaveManager = new LoadSaveManager(this.scene, this.worldManager, this.sensorManager, this.obstacleManager);
    this.panelUI = new PanelUI(this.worldManager, this.sensorManager, this.obstacleManager, this.loadSaveManager, this.beamManager);
    // If LoadSaveManager needs panelUI for callbacks, add a setter in LoadSaveManager
    this.loadSaveManager.setPanelUI(this.panelUI); 

    this.init();
    this.animate();
  }

  private init(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    this.camera.position.set(15, 15, 15);
    this.controls.target.set(15, 0, 15);
    this.controls.update();

    this.worldManager.initWorld({ xMin: 0, xMax: 30, yMin: 0, yMax: 5, zMin: 0, zMax: 30 });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);

    window.addEventListener('resize', this.onWindowResize.bind(this), false);

    this.sensorManager.loadSensorDefinitions('/sensors.json').then(() => {
        this.panelUI.populateSensorSelection(this.sensorManager.getSensorDefinitions());
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.beamManager.updateBeams();
    this.renderer.render(this.scene, this.camera);
  }
}

new LiDAR3DVisualizer();

