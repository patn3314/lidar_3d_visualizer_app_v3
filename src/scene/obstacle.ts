import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface ObstacleData {
  id: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
}

export class ObstacleManager {
  private scene: THREE.Scene;
  private obstacles: Map<string, THREE.Mesh> = new Map();
  private selectableObjects: THREE.Object3D[] = [];
  public transformControls: TransformControls | null = null;
  private camera: THREE.Camera | null = null;
  private rendererDomElement: HTMLElement | null = null;
  private orbitControls: OrbitControls | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public initControls(camera: THREE.Camera, rendererDomElement: HTMLElement, orbitControls?: OrbitControls) {
    this.camera = camera;
    this.rendererDomElement = rendererDomElement;
    if (orbitControls) this.orbitControls = orbitControls;
  }

  public addObstacle(data: ObstacleData): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(data.dimensions.width, data.dimensions.height, data.dimensions.depth);
    const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const obstacle = new THREE.Mesh(geometry, material);

    obstacle.position.set(data.position.x, data.position.y, data.position.z);
    obstacle.name = data.id;
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;

    this.scene.add(obstacle);
    this.obstacles.set(data.id, obstacle);
    this.selectableObjects.push(obstacle);

    return obstacle;
  }

  public getObstacleById(id: string): THREE.Mesh | undefined {
    return this.obstacles.get(id);
  }

  public updateObstacle(id: string, newPosition?: { x: number; y: number; z: number }, newDimensions?: { width: number; height: number; depth: number }): void {
    const obstacle = this.obstacles.get(id);
    if (!obstacle) {
      console.warn(`Obstacle with ID ${id} not found for update.`);
      return;
    }

    if (newPosition) {
      obstacle.position.set(newPosition.x, newPosition.y, newPosition.z);
    }

    if (newDimensions) {
      obstacle.geometry.dispose();
      obstacle.geometry = new THREE.BoxGeometry(newDimensions.width, newDimensions.height, newDimensions.depth);
    }
  }

  public removeObstacle(id: string): void {
    const obstacle = this.obstacles.get(id);
    if (obstacle) {
      if (this.transformControls && this.transformControls.object === obstacle) {
        this.detachTransformControls();
      }
      this.scene.remove(obstacle);
      obstacle.geometry.dispose();
      if (Array.isArray(obstacle.material)) {
        obstacle.material.forEach((m: THREE.Material) => m.dispose());
      } else {
        (obstacle.material as THREE.Material).dispose();
      }
      this.obstacles.delete(id);
      this.selectableObjects = this.selectableObjects.filter(obj => obj !== obstacle);
    } else {
      console.warn(`Obstacle with ID ${id} not found for removal.`);
    }
  }

  public getAllObstacles(): THREE.Mesh[] {
    return Array.from(this.obstacles.values());
  }

  public attachTransformControls(obstacle: THREE.Mesh): void {
    if (!this.camera || !this.rendererDomElement) {
        console.error("Camera or renderer DOM element not initialized for TransformControls");
        return;
    }
    if (!this.transformControls) {
        this.transformControls = new TransformControls(this.camera, this.rendererDomElement);
        this.transformControls.addEventListener("dragging-changed", (event: any) => { // Use any for event type as a workaround for TS2345
            if (this.orbitControls) {
                this.orbitControls.enabled = !event.value;
            }
        });
        this.transformControls.addEventListener("objectChange", () => {
            // TODO: Update UI or obstacle data if needed from panel
        });
        this.scene.add(this.transformControls as unknown as THREE.Object3D); // Type assertion for TS2345
    }
    this.transformControls.attach(obstacle);
  }

  public detachTransformControls(): void {
    if (this.transformControls) {
        this.transformControls.detach();
    }
  }

  public getSelectableObjects(): THREE.Object3D[] {
    return this.selectableObjects;
  }

  public serializeObstacles(): ObstacleData[] {
    const serialized: ObstacleData[] = [];
    this.obstacles.forEach((obstacle, id) => {
        const boxGeometry = obstacle.geometry as THREE.BoxGeometry;
        serialized.push({
            id: id,
            position: { x: obstacle.position.x, y: obstacle.position.y, z: obstacle.position.z },
            dimensions: {
                width: boxGeometry.parameters.width,
                height: boxGeometry.parameters.height,
                depth: boxGeometry.parameters.depth
            }
        });
    });
    return serialized;
  }

  public deserializeObstacles(data: ObstacleData[]): void {
    this.getAllObstacles().forEach(obs => this.removeObstacle(obs.name));
    data.forEach(obstacleData => {
        this.addObstacle(obstacleData);
    });
  }
}

