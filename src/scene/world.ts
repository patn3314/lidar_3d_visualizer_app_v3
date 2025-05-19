import * as THREE from "three";

export interface WorldDimensions {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

export class WorldManager {
  private scene: THREE.Scene;
  private floorPlane: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private dimensions: WorldDimensions | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public initWorld(dimensions: WorldDimensions): void {
    this.dimensions = dimensions;

    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
    }
    if (this.floorPlane) {
      this.scene.remove(this.floorPlane);
      this.floorPlane.geometry.dispose();
      if (Array.isArray(this.floorPlane.material)) {
        this.floorPlane.material.forEach((m: THREE.Material) => m.dispose());
      } else {
        (this.floorPlane.material as THREE.Material).dispose();
      }
    }

    const sizeX = dimensions.xMax - dimensions.xMin;
    const sizeZ = dimensions.zMax - dimensions.zMin;
    const centerX = (dimensions.xMin + dimensions.xMax) / 2;
    const centerZ = (dimensions.zMin + dimensions.zMax) / 2;

    this.gridHelper = new THREE.GridHelper(Math.max(sizeX, sizeZ), Math.max(sizeX, sizeZ) / 2, 0x888888, 0x444444);
    this.gridHelper.position.set(centerX, dimensions.yMin, centerZ);
    this.scene.add(this.gridHelper);

    const floorGeometry = new THREE.PlaneGeometry(sizeX, sizeZ);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
    });
    this.floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.floorPlane.position.set(centerX, dimensions.yMin, centerZ);
    this.floorPlane.receiveShadow = true;
    this.scene.add(this.floorPlane);
  }

  public addFloorTexture(imageUrl: string, _corners?: {x1:number, z1:number, x2:number, z2:number, x3:number, z3:number, x4:number, z4:number}): void {
    if (!this.floorPlane || !this.dimensions) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      imageUrl,
      (texture: THREE.Texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        if (this.floorPlane && this.floorPlane.material instanceof THREE.MeshStandardMaterial) {
            this.floorPlane.material.map = texture;
            this.floorPlane.material.needsUpdate = true;
        }
      },
      undefined, 
      (error: unknown) => { // Changed ErrorEvent to unknown
        console.error("An error happened during texture loading:", error);
      }
    );
  }

  public getFloorPlane(): THREE.Mesh | null {
    return this.floorPlane;
  }

  public getWorldDimensions(): WorldDimensions | null {
    return this.dimensions;
  }
}

