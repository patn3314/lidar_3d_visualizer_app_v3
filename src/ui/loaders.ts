import * as THREE from "three";
import { WorldManager, WorldDimensions } from "../scene/world";
import { SensorManager, PlacedSensorData } from "../scene/sensor";
import { ObstacleManager, ObstacleData } from "../scene/obstacle";
import { PanelUI } from "./panel";

interface SceneData {
    world: WorldDimensions | null;
    obstacles: ObstacleData[];
    sensors: PlacedSensorData[];
}

export class LoadSaveManager {
    private worldManager: WorldManager;
    private sensorManager: SensorManager;
    private obstacleManager: ObstacleManager;
    private panelUI: PanelUI | null = null;

    constructor(
        _scene: THREE.Scene,
        worldManager: WorldManager,
        sensorManager: SensorManager,
        obstacleManager: ObstacleManager
    ) {
        this.worldManager = worldManager;
        this.sensorManager = sensorManager;
        this.obstacleManager = obstacleManager;
    }

    public setPanelUI(panelUI: PanelUI): void {
        this.panelUI = panelUI;
    }

    public saveSceneToJson(): void {
        const sceneData: SceneData = {
            world: this.worldManager.getWorldDimensions(),
            obstacles: this.obstacleManager.serializeObstacles(),
            sensors: this.sensorManager.serializeSensors(),
        };

        const jsonData = JSON.stringify(sceneData, null, 2);
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "scene_configuration.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Scene saved to JSON.");
    }

    public loadSceneFromJson(file: File): void {
        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
            try {
                const sceneData = JSON.parse(event.target?.result as string) as SceneData;

                this.obstacleManager.deserializeObstacles([]);
                this.sensorManager.deserializeSensors([]);

                if (sceneData.world) {
                    this.worldManager.initWorld(sceneData.world);
                }
                this.obstacleManager.deserializeObstacles(sceneData.obstacles || []);
                this.sensorManager.deserializeSensors(sceneData.sensors || []);

                if (this.panelUI) {
                    const obstaclePanel = document.getElementById("obstacle-panel") as HTMLElement | null;
                    if (obstaclePanel) this.panelUI.updateObstacleList(obstaclePanel);
                    
                    const sensorPanel = document.getElementById("sensor-panel") as HTMLElement | null;
                    if (sensorPanel) this.panelUI.updateSensorList(sensorPanel);
                }

                console.log("Scene loaded from JSON.");
            } catch (e) {
                console.error("Error parsing JSON file:", e);
                alert("JSONファイルの読み込みに失敗しました。");
            }
        };
        reader.readAsText(file);
    }
}
