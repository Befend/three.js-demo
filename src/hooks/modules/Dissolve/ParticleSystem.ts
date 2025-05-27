import * as THREE from 'three';

/**
 * ParticleSystem类：用于管理3D粒子系统的属性和数据.
 */
export default class ParticleSystem {
  count: number;
  maxOffsetArr: Float32Array;
  geometry: THREE.BufferGeometry;
  scaleArr: Float32Array;
  rotationArr: Float32Array;
  distArr: Float32Array;
  currentPositionArr: Float32Array;
  initPositionArr: Float32Array;
  velocityArr: Float32Array;

  constructor(geometry: THREE.BufferGeometry) {
    this.geometry = geometry;
    this.count = geometry.getAttribute('position').array.length / 3;
    // scalar quantities
    this.maxOffsetArr = new Float32Array(this.count);
    this.scaleArr = new Float32Array(this.count);
    this.distArr = new Float32Array(this.count);
    this.rotationArr = new Float32Array(this.count);
    // vector quantities 
    this.currentPositionArr = new Float32Array(this.geometry.getAttribute('position').array);
    this.initPositionArr = new Float32Array(this.geometry.getAttribute('position').array);
    this.velocityArr = new Float32Array(this.count * 3);
    this.setAttributesValues();
  }
  // 设置粒子系统的初始属性值
  setAttributesValues() {
    for (let i = 0; i < this.count; i++) {
      let x = i * 3 + 0;
      let y = i * 3 + 1;
      let z = i * 3 + 2;
      this.maxOffsetArr[i] = Math.random() * 2.5 + 0.5;
      this.scaleArr[i] = Math.random();
      this.rotationArr[i] = Math.random() * 2 * Math.PI;
      this.velocityArr[x] = Math.random() * 0.02;
      this.velocityArr[y] = Math.random() * 0.05;
      this.velocityArr[z] = Math.random() * 0.00;
      this.distArr[i] = 0.01;
    }
    // 设置几何值到几何体中
    this.setAttributes();
  }
  // 更新粒子系统的属性值
  updateAttributesValues() {
    for (let i = 0; i < this.count; i++) {
      this.rotationArr[i] += 0.1;
      let x = i * 3 + 0;
      let y = i * 3 + 1;
      let z = i * 3 + 2;
      const speed = 0.2;
      let waveOffset1 = (Math.sin(this.currentPositionArr[y] * 5.0) * 0.28);
      let waveOffset2 = (Math.sin(this.currentPositionArr[x] * 6.0) * 0.23);
      this.currentPositionArr[x] += Math.abs(this.velocityArr[x] + waveOffset1) * speed;
      this.currentPositionArr[y] += Math.abs(this.velocityArr[y] + (waveOffset2)) * speed;
      this.currentPositionArr[z] += this.velocityArr[z] * speed;
      const initpos = new THREE.Vector3(this.initPositionArr[x], this.initPositionArr[y], this.initPositionArr[z]);
      const newpos = new THREE.Vector3(this.currentPositionArr[x], this.currentPositionArr[y], this.currentPositionArr[z]);
      const dist = initpos.distanceTo(newpos);
      this.distArr[i] = dist;

      if (dist > this.maxOffsetArr[i]) {
        this.currentPositionArr[x] = this.initPositionArr[x];
        this.currentPositionArr[y] = this.initPositionArr[y];
        this.currentPositionArr[z] = this.initPositionArr[z];
        this.distArr[i] = 0.01;
      }
    }
    // 设置几何值到几何体中
    this.setAttributes();
  }

  // 设置几何值到几何体中
  private setAttributes() {
    this.geometry.setAttribute('aOffset', new THREE.BufferAttribute(this.maxOffsetArr, 1));
    this.geometry.setAttribute('aDist', new THREE.BufferAttribute(this.distArr, 1));
    this.geometry.setAttribute('aRotation', new THREE.BufferAttribute(this.rotationArr, 1));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(this.scaleArr, 1));
    this.geometry.setAttribute('aPosition', new THREE.BufferAttribute(this.currentPositionArr, 3));
    this.geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocityArr, 3));
  }
}
