import * as THREE from "three";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from 'three/addons/libs/stats.module.js';
import SimplexNoise from './modules/SimplexNoise';

let scene: any, renderer: any, camera: any, stats: any, gui: any;
let shapes: any = [];
let params = {
  simplexVariation: 0.05,
  simplexAmp: 2.5,
  opacity: 0.3
};
let population = { x: 35, z: 35 };
let iteration = 0;
let currentDom: any;
let simplex = new SimplexNoise();
let WIDTH = 0, HEIGHT = 0;

/**
 * 动态立方体网格类
 */
class CubeMesh {
  speed: number; // 速度
  geometry: any; // 几何体
  material: any; // 材质
  mesh: any; // 网格
  constructor(x: any, z: any) {
    this.speed = Math.floor(Math.random() * 100) / 100;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshPhongMaterial({
      color: 0x2bc1ff,
      reflectivity: 0,
      transparent: true,
      opacity: params.opacity,
      shininess: 100,
      specular: 0x00ffff,
      flatShading: true
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.x = x;
    this.mesh.position.y = 0;
    this.mesh.position.z = z;
  }
  move() {
    this.material.opacity = params.opacity;
    this.mesh.position.y =
      simplex.noise4d(
        this.mesh.position.x * params.simplexVariation,
        this.mesh.position.y * params.simplexVariation,
        this.mesh.position.z * params.simplexVariation,
        iteration / 100
      ) * params.simplexAmp;
  }
}
export function useDynamicCube() {
  const initDynamicCube = (dom: any) => {
    currentDom = dom;
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // 创建渲染
    renderer = new THREE.WebGLRenderer({ antialias: true });
    WIDTH = dom.clientWidth;
    HEIGHT = dom.clientHeight;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    dom.appendChild(renderer.domElement);

    // 添加性能监控
    const $fps = document.getElementById('fps');
    if ($fps) {
      stats = new Stats();
      $fps.appendChild(stats.dom);
    }

    // 添加布局
    gui = new GUI();
    gui.add(params, 'simplexVariation').min(0).max(0.2).step(0.0001).name('Frequency');
    gui.add(params, 'simplexAmp').min(0).max(10).step(0.1).name('Amplitude');
    gui.add(params, 'opacity').min(0.01).max(0.5).name('Alpha');
    gui.open();

    // 创建相机
    camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 100);
    // 设置相机位置
    camera.position.x = 0;
    camera.position.y = 8;
    camera.position.z = population.z;
    scene.add(camera);

    // 添加光源
    const ambiantlight = new THREE.AmbientLight(0x555555);
    scene.add(ambiantlight);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 30, 0);
    scene.add(light);

    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(30, 30, 0);
    scene.add(light2);

    // 创建网格
    for (let i = population.x * -0.5; i <= population.x / 2; i++) {
      for (let u = population.z * -0.5; u <= population.z / 2; u++) {
        shapes[shapes.length] = new CubeMesh(i, u);
        scene.add(shapes[shapes.length - 1].mesh);
      }
    }

    // 相机固定
    camera.lookAt(scene);
    renderer?.render(scene, camera);
    // 添加控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    animate();
    dom.addEventListener('resize', onWindowResize, false);
  };

  // 窗口大小调整事件
  const onWindowResize = () => {
    const width = currentDom.clientWidth;
    const height = currentDom.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const animate = () => {
    iteration++;
    requestAnimationFrame(animate);
    for (var i in shapes) {
      shapes[i].move();
    }
    stats?.update();
    renderer?.render(scene, camera);
  };
  const destroy = () => {
    try {
      gui?.destroy();
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
      gui = null;
      renderer = null;
      camera = null;
      scene = null;
      currentDom = null;
    } catch (e) {
      console.error("Failed to destroy threejs", e);
    }
  };
  return { initDynamicCube, destroy };
}