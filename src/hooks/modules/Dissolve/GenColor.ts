import * as THREE from 'three';

export default class GenColor {
    hexString!: string;
    vec3!: THREE.Vector3;
    rgb!: THREE.Color;

    constructor(value: string) {
        this.setColor(value);
    }

    setColor(value: string) {
        this.hexString = value;
        this.rgb = new THREE.Color(this.hexString);
        this.vec3 = new THREE.Vector3(this.rgb.r, this.rgb.g, this.rgb.b);
    }
}
