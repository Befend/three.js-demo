import * as THREE from 'three';
import randomColor from 'randomcolor'; // 修复导入方式
import { TweenMax, Power2, Linear } from 'gsap'; // 使用现代导入方式

/**
 * @description: 泡泡
 */
export default class Pawpaw {
  material: THREE.SpriteMaterial | null = null; // 明确类型
  sprite: THREE.Sprite | null = null; // 明确类型
  spriteMap: THREE.Texture; // 明确类型
  scale1: number = 0.1; // 明确类型
  scale2: number = 2 + this.randomMax(3); // 明确类型
  tt: number = 0; // 明确类型
  t1: number = 0; // 明确类型
  config: any; // 可进一步细化类型

  constructor(options: { spriteMap: THREE.Texture; conf: any; }) {
    this.spriteMap = options.spriteMap;
    this.config = options.conf;
    this.init();
    this.shuffle();
  }

  init(): void {
    this.material = new THREE.SpriteMaterial({
      color: randomColor({ luminosity: 'light' }),
      map: this.spriteMap,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.sprite = new THREE.Sprite(this.material);
  }

  shuffle(): void {
    if (!this.sprite || !this.material) return;

    this.sprite.scale.set(this.scale1, this.scale1, 1);

    const rndv = this.getRandomVec3();
    this.sprite.position.set(rndv.x, rndv.y, rndv.z).multiplyScalar(50);
    this.sprite.position.y -= 25;

    this.material.opacity = this.config.opacity;

    this.tt = this.scale2;
    TweenMax.to(this.sprite.scale, 1, { x: this.scale2, y: this.scale2, ease: Power2.easeIn });
    TweenMax.to(this.sprite.position, this.scale2, {
      y: this.sprite.position.y + 100,
      ease: Power2.easeIn
    });

    this.t1 = 1;
    TweenMax.to(this.sprite.position, this.t1, {
      x: this.sprite.position.x + this.randomMax(10, true),
      z: this.sprite.position.z + this.randomMax(10, true),
      ease: (Linear as any).ease,
      repeat: Math.floor(this.tt / this.t1 / 2),
      yoyo: true
    });

    TweenMax.to(this.material, 1, {
      opacity: 0,
      delay: this.tt - 1,
      ease: Power2.easeIn,
      onCompleteParams: [this],
      onComplete: function (o: Pawpaw) {
        o.shuffle();
      }
    });
  }
  // 生成随机向量
  getRandomVec3(): { x: number; y: number; z: number; } {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(Math.random());
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const x = r * sinPhi * cosTheta;
    const y = r * sinPhi * sinTheta;
    const z = r * cosPhi;
    return { x, y, z };
  }

  randomMax(max: number, negative?: boolean): number {
    return negative ? Math.random() * 2 * max - max : Math.random() * max;
  }
}