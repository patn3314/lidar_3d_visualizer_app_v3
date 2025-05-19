import { WorldManager, WorldDimensions } from "../scene/world";
import { SensorManager, PlacedSensorData, SensorDefinition } from "../scene/sensor";
import { ObstacleManager, ObstacleData } from "../scene/obstacle";
import { LoadSaveManager } from "./loaders";
import { BeamManager } from "../scene/beams";

export class PanelUI {
    private worldManager: WorldManager;
    private sensorManager: SensorManager;
    private obstacleManager: ObstacleManager;
    private loadSaveManager: LoadSaveManager | null = null; // Initialized later
    private beamManager: BeamManager;

    private sidebarElement: HTMLElement;
    private sidebarToggleElement: HTMLElement;

    constructor(worldManager: WorldManager, sensorManager: SensorManager, obstacleManager: ObstacleManager, loadSaveManager: LoadSaveManager | null, beamManager: BeamManager) {
        this.worldManager = worldManager;
        this.sensorManager = sensorManager;
        this.obstacleManager = obstacleManager;
        this.loadSaveManager = loadSaveManager; // Can be null initially
        this.beamManager = beamManager;

        this.sidebarElement = document.createElement('div');
        this.sidebarElement.className = 'sidebar';
        document.getElementById('app')?.appendChild(this.sidebarElement);

        this.sidebarToggleElement = document.createElement('button');
        this.sidebarToggleElement.className = 'sidebar-toggle';
        this.sidebarToggleElement.innerHTML = '☰'; // Or some icon
        document.getElementById('app')?.appendChild(this.sidebarToggleElement);

        this.sidebarToggleElement.addEventListener('click', () => this.toggleSidebar());

        this.createWorldSettingsPanel();
        this.createObstaclePanel();
        this.createSensorPanel();
        this.createLoadSavePanel();
    }

    // Call this from main.ts after LoadSaveManager is fully initialized
    public setLoadSaveManager(manager: LoadSaveManager) {
        this.loadSaveManager = manager;
        // Re-create or update the load/save panel if it depends on the manager being set
        const loadSavePanel = this.sidebarElement.querySelector('#load-save-panel');
        if (loadSavePanel) {
            loadSavePanel.innerHTML = ''; // Clear previous content
            this.buildLoadSaveControls(loadSavePanel as HTMLElement);
        }
    }

    private toggleSidebar(): void {
        this.sidebarElement.classList.toggle('collapsed');
        this.sidebarToggleElement.classList.toggle('collapsed');
        if (this.sidebarElement.classList.contains('collapsed')) {
            this.sidebarToggleElement.innerHTML = '☰';
        } else {
            this.sidebarToggleElement.innerHTML = '✕';
        }
    }

    private createSection(title: string, parent: HTMLElement, id?: string): HTMLElement {
        const section = document.createElement('div');
        if (id) section.id = id;
        section.innerHTML = `<h2>${title}</h2>`;
        parent.appendChild(section);
        return section;
    }

    private createWorldSettingsPanel(): void {
        const section = this.createSection('ワールド設定', this.sidebarElement);

        const dims: WorldDimensions = this.worldManager.getWorldDimensions() || { xMin: 0, xMax: 30, yMin: 0, yMax: 5, zMin: 0, zMax: 30 }; // Default or current

        const inputs: { label: string, id: keyof WorldDimensions, value: number, placeholder: string }[] = [
            { label: 'X最小 (m)', id: 'xMin', value: dims.xMin, placeholder: 'X軸最小値 (メートル)' },
            { label: 'X最大 (m)', id: 'xMax', value: dims.xMax, placeholder: 'X軸最大値 (メートル)' },
            { label: 'Y最小 (m)', id: 'yMin', value: dims.yMin, placeholder: 'Y軸最小値 (メートル)' },
            { label: 'Y最大 (m)', id: 'yMax', value: dims.yMax, placeholder: 'Y軸最大値 (メートル)' },
            { label: 'Z最小 (m)', id: 'zMin', value: dims.zMin, placeholder: 'Z軸最小値 (メートル)' },
            { label: 'Z最大 (m)', id: 'zMax', value: dims.zMax, placeholder: 'Z軸最大値 (メートル)' },
        ];

        inputs.forEach(inputInfo => {
            section.appendChild(this.createNumberInput(inputInfo.label, inputInfo.id, inputInfo.value, (val) => {
                (dims as any)[inputInfo.id] = val;
            }, 1, inputInfo.placeholder));
        });

        const updateButton = document.createElement('button');
        updateButton.textContent = 'ワールド更新';
        updateButton.onclick = () => {
            this.worldManager.initWorld(dims);
        };
        section.appendChild(updateButton);

        section.appendChild(document.createElement('hr'));

        const textureUrlInput = this.createTextInput('床テクスチャURL', 'floorTextureUrl', '', undefined, '画像URLを入力 (例: https://example.com/texture.png)');
        section.appendChild(textureUrlInput);
        // TODO: Add inputs for corner coordinates if that complex feature is pursued.
        // For now, it stretches over the whole floor.
        const applyTextureButton = document.createElement('button');
        applyTextureButton.textContent = '床テクスチャ適用';
        applyTextureButton.onclick = () => {
            const url = (section.querySelector('#floorTextureUrl') as HTMLInputElement).value;
            if (url) {
                this.worldManager.addFloorTexture(url);
            }
        };
        section.appendChild(applyTextureButton);
    }

    private createObstaclePanel(): void {
        const section = this.createSection('障害物管理', this.sidebarElement, 'obstacle-panel');
        this.buildObstacleControls(section);
    }

    private buildObstacleControls(section: HTMLElement): void {
        section.innerHTML = '<h2>障害物管理</h2>'; // Clear previous content except title

        const idInput = this.createTextInput('ID (ユニーク)', 'obstacleId', `obs-${Date.now() % 10000}`, undefined, '障害物の一意識別子 (例: obs-1)');
        const posXInput = this.createNumberInput('位置X', 'obsPosX', 5, undefined, 0.1, 'X座標 (メートル)');
        const posYInput = this.createNumberInput('位置Y', 'obsPosY', 0.5, undefined, 0.1, 'Y座標 (メートル)');
        const posZInput = this.createNumberInput('位置Z', 'obsPosZ', 5, undefined, 0.1, 'Z座標 (メートル)');
        const dimWInput = this.createNumberInput('幅 (X)', 'obsDimW', 1, undefined, 0.1, 'X方向の幅 (メートル)');
        const dimHInput = this.createNumberInput('高さ (Y)', 'obsDimH', 1, undefined, 0.1, 'Y方向の高さ (メートル)');
        const dimDInput = this.createNumberInput('奥行 (Z)', 'obsDimD', 1, undefined, 0.1, 'Z方向の奥行 (メートル)');

        section.appendChild(idInput);
        section.appendChild(this.createVector3InputGroup([posXInput, posYInput, posZInput], "位置"));
        section.appendChild(this.createVector3InputGroup([dimWInput, dimHInput, dimDInput], "寸法"));

        const addButton = document.createElement('button');
        addButton.textContent = '障害物追加';
        addButton.onclick = () => {
            const data: ObstacleData = {
                id: (section.querySelector('#obstacleId') as HTMLInputElement).value,
                position: {
                    x: parseFloat((section.querySelector('#obsPosX') as HTMLInputElement).value),
                    y: parseFloat((section.querySelector('#obsPosY') as HTMLInputElement).value),
                    z: parseFloat((section.querySelector('#obsPosZ') as HTMLInputElement).value),
                },
                dimensions: {
                    width: parseFloat((section.querySelector('#obsDimW') as HTMLInputElement).value),
                    height: parseFloat((section.querySelector('#obsDimH') as HTMLInputElement).value),
                    depth: parseFloat((section.querySelector('#obsDimD') as HTMLInputElement).value),
                },
            };
            if (!data.id || this.obstacleManager.getObstacleById(data.id)) {
                alert('障害物IDが空か、既に使用されています。');
                return;
            }
            this.obstacleManager.addObstacle(data);
            this.updateObstacleList(section);
        };
        section.appendChild(addButton);
        section.appendChild(document.createElement('hr'));
        this.updateObstacleList(section);
    }

    public updateObstacleList(section: HTMLElement): void {
        let listDiv = section.querySelector('.obstacle-list-div') as HTMLElement;
        if (listDiv) {
            listDiv.innerHTML = ''; // Clear existing list items
        } else {
            listDiv = document.createElement('div');
            listDiv.className = 'obstacle-list-div';
            section.appendChild(listDiv);
        }

        const obstacles = this.obstacleManager.getAllObstacles();
        if (obstacles.length === 0) {
            listDiv.textContent = '障害物はありません。';
            return;
        }

        obstacles.forEach(obstacle => {
            const obsData = this.obstacleManager.serializeObstacles().find(o => o.id === obstacle.name);
            if (!obsData) return;

            const item = document.createElement('div');
            item.className = 'sensor-item'; // Re-use sensor-item style for now
            item.innerHTML = `<h3>${obsData.id}</h3>
                            Pos: (${obsData.position.x.toFixed(1)}, ${obsData.position.y.toFixed(1)}, ${obsData.position.z.toFixed(1)}) メートル<br>
                            Dim: (${obsData.dimensions.width.toFixed(1)}x${obsData.dimensions.height.toFixed(1)}x${obsData.dimensions.depth.toFixed(1)}) メートル`;

            const editButton = document.createElement('button');
            editButton.textContent = '編集';
            editButton.onclick = () => {
                // For now, editing is done via TransformControls if attached.
                // This button could populate the form above or open a modal.
                // Simple selection for TransformControls:
                const obsMesh = this.obstacleManager.getObstacleById(obsData.id);
                if (obsMesh) this.obstacleManager.attachTransformControls(obsMesh);
            };

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.className = 'delete-button';
            deleteButton.onclick = () => {
                if (confirm(`障害物「${obsData.id}」を削除しますか？`)) {
                    this.obstacleManager.removeObstacle(obsData.id);
                    this.updateObstacleList(section);
                }
            };
            item.appendChild(editButton);
            item.appendChild(deleteButton);
            listDiv.appendChild(item);
        });
    }

    private createSensorPanel(): void {
        const section = this.createSection('センサ管理', this.sidebarElement, 'sensor-panel');
        this.buildSensorControls(section);
    }

    public populateSensorSelection(definitions: SensorDefinition[]): void {
        const section = this.sidebarElement.querySelector('#sensor-panel') as HTMLElement;
        if (!section) return;
        const selectElement = section.querySelector<HTMLSelectElement>('#sensorTypeSelect');
        if (selectElement) {
            selectElement.innerHTML = ''; // Clear existing options
            definitions.forEach(def => {
                const option = document.createElement('option');
                option.value = def.id;
                option.textContent = def.displayName;
                selectElement.appendChild(option);
            });
        }
        this.updateSensorList(section); // Also refresh list in case definitions changed
    }

    private buildSensorControls(section: HTMLElement): void {
        section.innerHTML = '<h2>センサ管理</h2>'; // Clear previous content except title

        const sensorTypeSelect = this.createSelect('センサタイプ', 'sensorTypeSelect', []);
        const idInput = this.createTextInput('ID (ユニーク)', 'sensorId', `sen-${Date.now() % 10000}`, undefined, 'センサの一意識別子 (例: sen-1)');
        const posXInput = this.createNumberInput('位置X', 'sensorPosX', 5, undefined, 0.1, 'X座標 (メートル)');
        const posYInput = this.createNumberInput('位置Y', 'sensorPosY', 1, undefined, 0.1, 'Y座標 (メートル)');
        const posZInput = this.createNumberInput('位置Z', 'sensorPosZ', 5, undefined, 0.1, 'Z座標 (メートル)');
        const rollInput = this.createNumberInput('Roll (°)', 'sensorRoll', 0, undefined, 1, 'X軸周りの回転角度 (度)');
        const pitchInput = this.createNumberInput('Pitch (°)', 'sensorPitch', 0, undefined, 1, 'Y軸周りの回転角度 (度)');
        const yawInput = this.createNumberInput('Yaw (°)', 'sensorYaw', 0, undefined, 1, 'Z軸周りの回転角度 (度)');

        section.appendChild(sensorTypeSelect);
        section.appendChild(idInput);
        section.appendChild(this.createVector3InputGroup([posXInput, posYInput, posZInput], "位置"));
        section.appendChild(this.createVector3InputGroup([rollInput, pitchInput, yawInput], "回転"));

        const addButton = document.createElement('button');
        addButton.textContent = 'センサ追加';
        addButton.onclick = () => {
            const selectedType = (section.querySelector('#sensorTypeSelect') as HTMLSelectElement).value;
            const definition = this.sensorManager.getSensorDefinitionById(selectedType);
            if (!definition) {
                alert('有効なセンサタイプを選択してください。');
                return;
            }
            const data: PlacedSensorData = {
                id: (section.querySelector('#sensorId') as HTMLInputElement).value,
                definitionId: selectedType,
                position: {
                    x: parseFloat((section.querySelector('#sensorPosX') as HTMLInputElement).value),
                    y: parseFloat((section.querySelector('#sensorPosY') as HTMLInputElement).value),
                    z: parseFloat((section.querySelector('#sensorPosZ') as HTMLInputElement).value),
                },
                rotation: {
                    roll: parseFloat((section.querySelector('#sensorRoll') as HTMLInputElement).value),
                    pitch: parseFloat((section.querySelector('#sensorPitch') as HTMLInputElement).value),
                    yaw: parseFloat((section.querySelector('#sensorYaw') as HTMLInputElement).value),
                },
                visible: true,
            };
            if (!data.id || this.sensorManager.getPlacedSensorById(data.id)) {
                alert('センサIDが空か、既に使用されています。');
                return;
            }
            this.sensorManager.addSensor(data);
            this.beamManager.updateBeams(); // Ensure beams are created for the new sensor
            this.updateSensorList(section);
        };
        section.appendChild(addButton);
        section.appendChild(document.createElement('hr'));
        this.updateSensorList(section);
    }

    public updateSensorList(section?: HTMLElement): void {
        if (!section) {
            section = this.sidebarElement.querySelector('#sensor-panel') as HTMLElement;
            if (!section) return;
        }

        let listDiv = section.querySelector('.sensor-list-div') as HTMLElement;
        if (listDiv) {
            listDiv.innerHTML = ''; // Clear existing list items
        } else {
            listDiv = document.createElement('div');
            listDiv.className = 'sensor-list-div';
            section.appendChild(listDiv);
        }

        const sensors = this.sensorManager.getAllPlacedSensorData();
        if (sensors.length === 0) {
            listDiv.textContent = 'センサはありません。';
            return;
        }

        sensors.forEach(sensorData => {
            const definition = this.sensorManager.getSensorDefinitionById(sensorData.definitionId);
            const item = document.createElement('div');
            item.className = 'sensor-item';
            item.innerHTML = `<h3>${sensorData.id} (${definition?.displayName || 'N/A'})</h3>
                            Pos: (${sensorData.position.x.toFixed(1)}, ${sensorData.position.y.toFixed(1)}, ${sensorData.position.z.toFixed(1)}) メートル<br>
                            Rot: (${sensorData.rotation.roll.toFixed(0)}°, ${sensorData.rotation.pitch.toFixed(0)}°, ${sensorData.rotation.yaw.toFixed(0)}°)`;

            const toggleButton = document.createElement('button');
            toggleButton.textContent = sensorData.visible ? '非表示' : '表示';
            toggleButton.className = sensorData.visible ? 'toggle-button active' : 'toggle-button';
            toggleButton.onclick = () => {
                this.sensorManager.setSensorVisibility(sensorData.id, !sensorData.visible);
                this.beamManager.setBeamVisibility(sensorData.id, !sensorData.visible);
                if (!sensorData.visible) { // if it became invisible, clear beams
                    this.beamManager.updateBeams(); // This will clear if not visible
                } else { // if it became visible, regenerate beams
                    this.beamManager.updateBeams();
                }
                this.updateSensorList(section);
            };

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.className = 'delete-button';
            deleteButton.onclick = () => {
                if (confirm(`センサ「${sensorData.id}」を削除しますか？`)) {
                    this.sensorManager.removeSensor(sensorData.id);
                    this.beamManager.updateBeams(); // This will clear beams for the removed sensor
                    this.updateSensorList(section);
                }
            };
            item.appendChild(toggleButton);
            item.appendChild(deleteButton);
            listDiv.appendChild(item);
        });
    }

    private createLoadSavePanel(): void {
        const section = this.createSection('シーン保存/読込', this.sidebarElement, 'load-save-panel');
        this.buildLoadSaveControls(section);
    }

    private buildLoadSaveControls(section: HTMLElement): void {
        section.innerHTML = '<h2>シーン保存/読込</h2>'; // Clear previous content except title

        if (!this.loadSaveManager) {
            section.innerHTML += '<p>ローダーが初期化されていません。</p>';
            return;
        }

        const saveJsonButton = document.createElement('button');
        saveJsonButton.textContent = 'JSON形式で保存';
        saveJsonButton.onclick = () => this.loadSaveManager?.saveSceneToJson();
        section.appendChild(saveJsonButton);

        const loadJsonLabel = document.createElement('label');
        loadJsonLabel.setAttribute('for', 'loadJsonInput');
        loadJsonLabel.textContent = 'JSONファイル読込:';
        const loadJsonInput = document.createElement('input');
        loadJsonInput.type = 'file';
        loadJsonInput.id = 'loadJsonInput';
        loadJsonInput.accept = '.json';
        loadJsonInput.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                this.loadSaveManager?.loadSceneFromJson(file);
            }
        };
        section.appendChild(loadJsonLabel);
        section.appendChild(loadJsonInput);
    }

    private createNumberInput(label: string, id: string, value: number, onChange?: (value: number) => void, step: number = 1, placeholder?: string): HTMLElement {
        const container = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label + ':';
        const inputEl = document.createElement('input');
        inputEl.type = 'number';
        inputEl.id = id;
        inputEl.value = value.toString();
        inputEl.step = step.toString();
        if (placeholder) {
            inputEl.placeholder = placeholder;
        }
        if (onChange) {
            inputEl.onchange = () => onChange(parseFloat(inputEl.value));
        }
        container.appendChild(labelEl);
        container.appendChild(inputEl);
        return container;
    }

    private createTextInput(label: string, id: string, value: string, onChange?: (value: string) => void, placeholder?: string): HTMLElement {
        const container = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label + ':';
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.id = id;
        inputEl.value = value;
        if (placeholder) {
            inputEl.placeholder = placeholder;
        }
        if (onChange) {
            inputEl.onchange = () => onChange(inputEl.value);
        }
        container.appendChild(labelEl);
        container.appendChild(inputEl);
        return container;
    }

    private createSelect(label: string, id: string, options: { value: string, text: string }[], onChange?: (value: string) => void): HTMLElement {
        const container = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.textContent = label + ':';
        const selectEl = document.createElement('select');
        selectEl.id = id;
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.text;
            selectEl.appendChild(optionEl);
        });
        if (onChange) {
            selectEl.onchange = () => onChange(selectEl.value);
        }
        container.appendChild(labelEl);
        container.appendChild(selectEl);
        return container;
    }

    private createVector3InputGroup(inputs: HTMLElement[], groupLabel?: string): HTMLElement {
        const group = document.createElement('div');
        group.className = 'vector3-input';
        if (groupLabel) {
            const label = document.createElement('label');
            label.textContent = groupLabel;
            label.style.display = 'block';
            label.style.fontWeight = 'bold';
            group.appendChild(label);
        }
        inputs.forEach(input => group.appendChild(input.children[1])); // Append only the input element itself
        return group;
    }
}
