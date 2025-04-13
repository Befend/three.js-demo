import * as THREE from "three";
import Stats from 'three/addons/libs/stats.module.js';

let currentDom: any;
let camera: any, renderer: any, scene: any, stats: any;
// 存储所有活跃的烟花实例
const fireworks: any = [];

/**
 * 烟花粒子类
 * 负责创建和管理单个烟花的所有粒子
 */
class Firework {
  particles: THREE.Points[];
  geometry: THREE.BufferGeometry;
  points: any;
  count: number;
  positions: Float32Array;
  velocities: number[];
  colors: Float32Array;
  sizes: Float32Array;
  life: Float32Array;
  constructor(x: number, y: number, z: number) {
    // 初始化属性
    this.particles = []; // 粒子数组
    this.geometry = new THREE.BufferGeometry(); // 粒子几何体
    this.count = 10000; // 粒子数量
    this.positions = new Float32Array(this.count * 3); // 粒子位置数组
    this.velocities = []; // 粒子速度数组
    this.colors = new Float32Array(this.count * 3); // 粒子颜色数组
    this.sizes = new Float32Array(this.count); // 粒子大小数组
    this.life = new Float32Array(this.count); // 粒子生命周期数组

    // 初始化每个粒子
    for (let i = 0; i < this.count; i++) {
      // 使用球面坐标系计算粒子初始方向
      const phi = Math.random() * Math.PI * 2; // 水平角度
      const theta = Math.random() * Math.PI; // 垂直角度
      const velocity = 2 + Math.random() * 2; // 随机速度

      // 计算粒子速度向量
      this.velocities.push(
        velocity * Math.sin(theta) * Math.cos(phi), // x方向速度
        velocity * Math.sin(theta) * Math.sin(phi), // y方向速度
        velocity * Math.cos(theta) // z方向速度
      );

      // 设置粒子初始位置
      this.positions[i * 3] = x; // x坐标
      this.positions[i * 3 + 1] = y; // y坐标
      this.positions[i * 3 + 2] = z; // z坐标

      // 设置粒子颜色（红色为主，带随机变化）
      this.colors[i * 3] = 1.0; // 红色通道
      this.colors[i * 3 + 1] = Math.random() * 0.2; // 绿色通道
      this.colors[i * 3 + 2] = Math.random() * 0.2; // 蓝色通道

      // 初始化粒子大小和生命值
      this.sizes[i] = 0.3; // 初始大小
      this.life[i] = 1.0; // 初始生命值
    }

    // 设置几何体属性
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3)
    );
    this.geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(this.sizes, 1)
    );

    // 创建粒子材质
    const material = new THREE.PointsMaterial({
      size: 0.3, // 粒子大小
      vertexColors: true, // 启用顶点颜色
      blending: THREE.AdditiveBlending, // 使用加法混合
      transparent: true, // 启用透明
      opacity: 0.8, // 设置透明度
    });

    // 创建粒子系统并添加到场景
    this.points = new THREE.Points(this.geometry, material);
    scene.add(this.points);
  }

  // 更新烟花状态
  update() {
    let alive = false;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] > 0) {
        alive = true;
        // 根据速度更新位置
        this.positions[i * 3] += this.velocities[i * 3] * 0.1;
        this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * 0.1;
        this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * 0.1;

        // 添加重力效果
        this.velocities[i * 3 + 1] -= 0.05;

        // 更新生命值和大小
        this.life[i] -= 0.015;
        this.sizes[i] = this.life[i] * 0.3;
      }
    }

    // 标记属性需要更新
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    return alive; // 返回是否还有活着的粒子
  }

  // 清理烟花资源
  dispose() {
    scene.remove(this.points); // 从场景中移除
    this.geometry.dispose(); // 释放几何体
    this.points.material.dispose(); // 释放材质
  }
}

export function useFireworks() {
  const initFireworks = (dom: any) => {
    currentDom = dom;
    // 场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const width = dom.clientWidth;
    const height = dom.clientHeight;

    // 相机：视角设置为 75 度，近裁剪面 0.1，远裁剪面 1000
    camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    // 设置相机位置，距离z轴50个单位
    camera.position.z = 50;

    // 渲染器
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.shadowMap.enabled = true; // 启用阴影
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 使用柔和阴影
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // 添加电影级别的色调映射
    renderer.toneMappingExposure = 0.5;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    dom.appendChild(renderer.domElement);

    // 添加性能监控
    const $fps = document.getElementById('fps');
    if ($fps) {
      stats = new Stats();
      $fps.appendChild(stats.dom);
    }

    // 启动动画
    animate();

    // 窗口大小调整事件
    dom.addEventListener("resize", onWindowResize);
  };

  /**
   * 创建随机位置的烟花
   * 在场景的合理范围内随机选择位置
   */
  const createRandomFirework = () => {
    const x = (Math.random() * 2 - 1) * 30; // x范围：-30到30
    const y = (Math.random() * 2 - 1) * 25; // y范围：-25到25
    fireworks.push(new Firework(x, y, 0));
  };

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);

    // 有5%的概率生成新烟花
    if (Math.random() < 0.05) {
      createRandomFirework();
    }

    // 更新所有烟花，移除已经消失的烟花
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const alive = fireworks[i].update();
      if (!alive) {
        fireworks[i].dispose();
        fireworks.splice(i, 1);
      }
    }

    // 更新性能监控
    stats?.update();

    // 渲染场景
    renderer?.render(scene, camera);
  };
  // 窗口大小调整事件
  const onWindowResize = () => {
    const width = currentDom.clientWidth;
    const height = currentDom.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const destroy = () => {
    try {
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer.content = null;
      const gl: any = renderer?.domElement?.getContext("webgl");
      if (gl && gl.getExtension("WEBGL_lose_context")) {
        gl.getExtension("WEBGL_lose_context").loseContext();
      }
      currentDom?.removeEventListener('resize', onWindowResize, false);
      scene.traverse((child: any) => {
        if (child.material) {
          child.material.dispose();
        }
        if (child.geometry) {
          child.geometry.dispose();
        }
        child = null;
      });
      renderer = null;
      camera = null;
      scene = null;
      currentDom = null;
    } catch (e) {
      console.error("Failed to destroy threejs", e);
    }
  };
  return { initFireworks, destroy };
}