declare module 'three/examples/jsm/exporters/FBXExporter.js' {
    import { Object3D } from 'three';
    export class FBXExporter {
        constructor();
        parse(object: Object3D, options?: any): ArrayBuffer | string;
    }
}

