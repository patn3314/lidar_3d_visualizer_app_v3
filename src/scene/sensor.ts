import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ObstacleManager } from "./obstacle";
import { WorldManager } from "./world";

export interface SensorDefinition {
  id: string;
  displayName: string;
  hFov: number; // degrees
  vFov: number; // degrees
  maxRange: number; // meters
  channels: number;
  beamLayout: "verticalEven" | "singlePlane";
  modelFile: string;
}

export interface PlacedSensorData {
  id: string;
  definitionId: string;
  position: { x: number; y: number; z: number };
  rotation: { roll: number; pitch: number; yaw: number };
  visible: boolean;
}

export class SensorManager {
  private scene: THREE.Scene;
  // private obstacleManager: ObstacleManager; // Marked as unused, will be removed or prefixed if truly unused
  // private worldManager: WorldManager; // Marked as unused
  private sensorDefinitions: Map<string, SensorDefinition> = new Map();
  private placedSensors: Map<string, THREE.Group> = new Map();
  private placedSensorData: Map<string, PlacedSensorData> = new Map();
  private gltfLoader: GLTFLoader;

  constructor(scene: THREE.Scene, _obstacleManager: ObstacleManager, _worldManager: WorldManager) {
    this.scene = scene;
    // this.obstacleManager = _obstacleManager; // If needed later, uncomment and use
    // this.worldManager = _worldManager; // If needed later, uncomment and use
    this.gltfLoader = new GLTFLoader();
  }

  public async loadSensorDefinitions(filePath: string): Promise<void> {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load sensor definitions: ${response.statusText}`);
      }
      const definitions: SensorDefinition[] = await response.json();
      definitions.forEach(def => {
        this.sensorDefinitions.set(def.id, def);
      });
      console.log("Sensor definitions loaded:", this.sensorDefinitions);
    } catch (error) {
      console.error("Error loading sensor definitions:", error);
    }
  }

  public getSensorDefinitions(): SensorDefinition[] {
    return Array.from(this.sensorDefinitions.values());
  }

  public getSensorDefinitionById(id: string): SensorDefinition | undefined {
    return this.sensorDefinitions.get(id);
  }

  public addSensor(data: PlacedSensorData): void {
    const definition = this.sensorDefinitions.get(data.definitionId);
    if (!definition) {
      console.error(`Sensor definition ${data.definitionId} not found.`);
      return;
    }

    const sensorGroup = new THREE.Group();
    sensorGroup.position.set(data.position.x, data.position.y, data.position.z);
    sensorGroup.rotation.set(
        THREE.MathUtils.degToRad(data.rotation.pitch),
        THREE.MathUtils.degToRad(data.rotation.yaw),
        THREE.MathUtils.degToRad(data.rotation.roll),
        "YXZ"
    );
    sensorGroup.name = data.id;
    sensorGroup.visible = data.visible;

    this.gltfLoader.load(
      definition.modelFile,
      (gltf: GLTF) => {
        const model = gltf.scene;
        sensorGroup.add(model);
        console.log(`Loaded model for ${definition.displayName}`);
      },
      undefined,
      (error: unknown) => { // Changed ErrorEvent to unknown
        console.error(`Error loading model for ${definition.displayName}:`, error);
        const placeholderGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
        placeholder.name = "model_placeholder";
        sensorGroup.add(placeholder);
      }
    );

    this.scene.add(sensorGroup);
    this.placedSensors.set(data.id, sensorGroup);
    this.placedSensorData.set(data.id, data);
  }

  public getPlacedSensorById(id: string): THREE.Group | undefined {
    return this.placedSensors.get(id);
  }

  public getPlacedSensorDataById(id: string): PlacedSensorData | undefined {
    return this.placedSensorData.get(id);
  }

  public getAllPlacedSensorData(): PlacedSensorData[] {
    return Array.from(this.placedSensorData.values());
  }

  public updateSensor(id: string, newPosition?: { x: number; y: number; z: number }, newRotation?: { roll: number; pitch: number; yaw: number }): void {
    const sensorGroup = this.placedSensors.get(id);
    const sensorData = this.placedSensorData.get(id);

    if (!sensorGroup || !sensorData) {
      console.warn(`Sensor with ID ${id} not found for update.`);
      return;
    }

    if (newPosition) {
      sensorGroup.position.set(newPosition.x, newPosition.y, newPosition.z);
      sensorData.position = { ...newPosition };
    }

    if (newRotation) {
      sensorGroup.rotation.set(
        THREE.MathUtils.degToRad(newRotation.pitch),
        THREE.MathUtils.degToRad(newRotation.yaw),
        THREE.MathUtils.degToRad(newRotation.roll),
        "YXZ"
      );
      sensorData.rotation = { ...newRotation };
    }
  }

  public removeSensor(id: string): void {
    const sensorGroup = this.placedSensors.get(id);
    if (sensorGroup) {
      this.scene.remove(sensorGroup);
      sensorGroup.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            (object.material as THREE.Material).dispose();
          }
        }
      });
      this.placedSensors.delete(id);
      this.placedSensorData.delete(id);
    } else {
      console.warn(`Sensor with ID ${id} not found for removal.`);
    }
  }

  public setSensorVisibility(id: string, visible: boolean): void {
    const sensorGroup = this.placedSensors.get(id);
    const sensorData = this.placedSensorData.get(id);
    if (sensorGroup && sensorData) {
      sensorGroup.visible = visible;
      sensorData.visible = visible;
    } else {
      console.warn(`Sensor with ID ${id} not found for visibility toggle.`);
    }
  }

  public serializeSensors(): PlacedSensorData[] {
    return Array.from(this.placedSensorData.values());
  }

  public deserializeSensors(data: PlacedSensorData[]): void {
    this.getAllPlacedSensorData().forEach(s => this.removeSensor(s.id));
    data.forEach(sensorData => {
        this.addSensor(sensorData);
    });
  }
}

