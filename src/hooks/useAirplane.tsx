import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Stats from 'three/addons/libs/stats.module.js';

export function useAirplane() {
  let currentDom: any;
  let camera: any, renderer: any, scene: any, controls: any, stats: any, airplane: any, curve: any;
  // 动画参数
  let progress = 0;
  const speed = 0.001;
  const initAirplane = (dom: any) => {
    currentDom = dom;
    // 场景
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xdfe9f3, 0.02); // 添加雾效果

    const width = dom.clientWidth;
    const height = dom.clientHeight;

    // 相机：视角设置为 75 度，近裁剪面 0.1，远裁剪面 1000
    camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10); // 将相机位置设置在中心点

    // 渲染器
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.shadowMap.enabled = true; // 启用阴影
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 使用柔和阴影
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // 添加电影级别的色调映射
    renderer.toneMappingExposure = 0.5;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    dom.appendChild(renderer.domElement);

    // 添加天空
    const sky = new Sky();
    sky.scale.setScalar(1000);
    scene.add(sky);

    const sun = new THREE.Vector3();
    const uniforms = sky.material.uniforms;
    uniforms["turbidity"].value = 10;
    uniforms["rayleigh"].value = 2;
    uniforms["mieCoefficient"].value = 0.005;
    uniforms["mieDirectionalG"].value = 0.8;

    const phi = THREE.MathUtils.degToRad(90 - 2);
    const theta = THREE.MathUtils.degToRad(180);
    sun.setFromSphericalCoords(1, phi, theta);
    uniforms["sunPosition"].value.copy(sun);

    // 添加轨道控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 50;
    controls.minDistance = 3;

    // 创建一个组来存放飞机模型
    airplane = new THREE.Group();
    scene.add(airplane);

    // 加载飞机模型
    const loader = new GLTFLoader();
    loader.load(
      "/textures/airplane/scene.gltf",
      (gltf) => {
        // 调整模型大小和方向
        gltf.scene.scale.set(0.01, 0.01, 0.01);
        gltf.scene.rotation.set(0, Math.PI, 0);
        // 为模型添加阴影
        gltf.scene.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            // 增强材质效果
            if (child.material) {
              child.material.envMapIntensity = 1;
              child.material.needsUpdate = true;
            }
          }
        });
        airplane.add(gltf.scene);
      },
      (progress) => {
        console.log("加载进度:", (progress.loaded / progress.total) * 100 + "%");
      },
      (error) => {
        console.error("模型加载出错:", error);
      }
    );
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 主光源
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    scene.add(mainLight);

    // 添加补光
    const fillLight = new THREE.DirectionalLight(0x8088ff, 0.4);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // 创建飞行路径
    curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-10, 0, 0),
      new THREE.Vector3(-5, 4, 5),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 4, -5),
      new THREE.Vector3(10, 0, 0),
    ]);

    // 可视化路径（使用渐变材质）
    const points = curve.getPoints(50);
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const pathMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.5,
      gapSize: 0.3,
      opacity: 0.5,
      transparent: true,
    });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    pathLine.computeLineDistances(); // 计算虚线
    scene.add(pathLine);

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

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);

    // 更新飞机位置
    progress += speed;
    if (progress > 1) progress = 0;

    const point = curve.getPoint(progress);
    airplane.position.copy(point);

    // 计算飞机朝向
    const tangent = curve.getTangent(progress);
    const up = new THREE.Vector3(0, 1, 0);
    const matrix = new THREE.Matrix4();
    matrix.lookAt(new THREE.Vector3(0, 0, 0), tangent, up);
    airplane.quaternion.setFromRotationMatrix(matrix);

    // 更新控制器
    controls.update();

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
  return { initAirplane, destroy };
}