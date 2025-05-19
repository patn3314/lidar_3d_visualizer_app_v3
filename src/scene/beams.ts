import * as THREE from 'three';
import { SensorManager, PlacedSensorData, SensorDefinition } from './sensor';
import { ObstacleManager } from './obstacle';
import { WorldManager } from './world';

export class BeamManager {
  private scene: THREE.Scene;
  private sensorManager: SensorManager;
  private obstacleManager: ObstacleManager;
  private worldManager: WorldManager;
  private beamMaterial: THREE.MeshBasicMaterial; 
  private beamMeshes: Map<string, THREE.Group> = new Map();
  private raycaster: THREE.Raycaster;

  constructor(scene: THREE.Scene, sensorManager: SensorManager, obstacleManager: ObstacleManager, worldManager: WorldManager) {
    this.scene = scene;
    this.sensorManager = sensorManager;
    this.obstacleManager = obstacleManager;
    this.worldManager = worldManager;
    this.beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.05, // 透明度
      side: THREE.DoubleSide,
    });
    this.raycaster = new THREE.Raycaster();
  }

  public updateBeams(): void {
    const placedSensorsData = this.sensorManager.getAllPlacedSensorData();
    placedSensorsData.forEach(sensorData => {
      if (!sensorData.visible) {
        this.clearBeamsForSensor(sensorData.id);
        return;
      }
      const definition = this.sensorManager.getSensorDefinitionById(sensorData.definitionId);
      const sensorGroup = this.sensorManager.getPlacedSensorById(sensorData.id);
      if (definition && sensorGroup) {
        this.generateBeamsForSensor(sensorData, definition, sensorGroup);
      }
    });

    const currentSensorIds = new Set(placedSensorsData.map(s => s.id));
    this.beamMeshes.forEach((_beamGroup: THREE.Group, sensorId: string) => {
        if (!currentSensorIds.has(sensorId)) {
            this.clearBeamsForSensor(sensorId);
        }
    });
  }

  private clearBeamsForSensor(sensorId: string): void {
    const existingBeamGroup = this.beamMeshes.get(sensorId);
    if (existingBeamGroup) {
      existingBeamGroup.children.forEach((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
      this.scene.remove(existingBeamGroup);
      this.beamMeshes.delete(sensorId);
    }
  }

  private generateBeamsForSensor(sensorData: PlacedSensorData, definition: SensorDefinition, sensorGroup: THREE.Group): void {
    this.clearBeamsForSensor(sensorData.id);

    const beamGroup = new THREE.Group();
    beamGroup.name = `beams_${sensorData.id}`;
    this.scene.add(beamGroup);
    this.beamMeshes.set(sensorData.id, beamGroup);

    const obstacles = this.obstacleManager.getAllObstacles();
    const floorPlane = this.worldManager.getFloorPlane();
    const collidableObjects: THREE.Object3D[] = [...obstacles];
    if (floorPlane) {
        collidableObjects.push(floorPlane);
    }

    const vAngleStep = definition.vFov / Math.max(1, definition.channels -1);

    for (let i = 0; i < definition.channels; i++) {
        let vAngleRad: number;
        if (definition.channels === 1) {
            vAngleRad = 0;
        } else if (definition.beamLayout === 'verticalEven') {
            vAngleRad = THREE.MathUtils.degToRad(-(definition.vFov / 2) + i * vAngleStep);
        } else {
            vAngleRad = 0;
        }

        const numHorizontalSteps = (definition.hFov === 360) ? 72 : Math.ceil(definition.hFov / 5);

        for (let j = 0; j < numHorizontalSteps; j++) {
            const hAngleRad = THREE.MathUtils.degToRad(-(definition.hFov / 2) + j * (definition.hFov / numHorizontalSteps));

            const direction = new THREE.Vector3();
            direction.set(Math.sin(hAngleRad) * Math.cos(vAngleRad), Math.sin(vAngleRad), Math.cos(hAngleRad) * Math.cos(vAngleRad));
            direction.applyQuaternion(sensorGroup.quaternion);
            direction.normalize();

            this.raycaster.set(sensorGroup.position, direction);
            this.raycaster.far = definition.maxRange;

            const intersects: THREE.Intersection[] = this.raycaster.intersectObjects(collidableObjects, false);

            let distance = definition.maxRange;
            if (intersects.length > 0) {
                distance = intersects[0].distance;
            }

            const beamSpreadAngle = THREE.MathUtils.degToRad(definition.beamLayout === 'singlePlane' ? 1.0 : 0.5);
            // const radiusTop = 0.005; // Removed unused variable
            const radiusBottom = distance * Math.tan(beamSpreadAngle);
            const height = distance;

            if (height < 0.01) continue;

            const beamGeometry = new THREE.ConeGeometry(Math.max(0.01, radiusBottom), height, 8, 1, true);
            const beamMesh = new THREE.Mesh(beamGeometry, this.beamMaterial);

            beamMesh.position.copy(sensorGroup.position).addScaledVector(direction, height / 2);
            beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

            beamGroup.add(beamMesh);
        }
    }
  }

  public setBeamVisibility(sensorId: string, visible: boolean): void {
    const beamGroup = this.beamMeshes.get(sensorId);
    if (beamGroup) {
        beamGroup.visible = visible;
    }
  }
}
