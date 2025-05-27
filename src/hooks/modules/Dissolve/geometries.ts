import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/Addons.js';
import { TeapotGeometry } from 'three/examples/jsm/Addons.js';

export const planeGeo = new THREE.PlaneGeometry(8, 8, 100, 100);
export const boxGeo = new RoundedBoxGeometry(5, 5, 5, 24, 1);
export const sphereGeo = new THREE.SphereGeometry(4, 208, 208);
export const torusGeo = new THREE.TorusGeometry(3.0, 1.7, 150, 150);
export const teapotGeo = new TeapotGeometry(3, 32);
export const torusKnotGeo = new THREE.TorusKnotGeometry(2.5, 0.8, 200, 200);


