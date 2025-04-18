import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import Stats from 'three/addons/libs/stats.module.js';

export function useVR() {
  // 初始角度
  let lon = 0,
    lat = 0;
  let isUserInteracting = false;
  let onPointerDownPointerX = 0,
    onPointerDownPointerY = 0, // 新增Y轴坐标记录
    onPointerDownLon = 0,
    onPointerDownLat = 0;
  let camera: any;
  let renderer: any;
  let scene: any;
  let currentDom: any;
  let stats: any;
  const initVR = (dom: any) => {
    currentDom = dom;
    // 场景
    scene = new THREE.Scene();

    const width = dom.clientWidth;
    const height = dom.clientHeight;

    // 相机：视角设置为 75 度，近裁剪面 0.1，远裁剪面 1000
    camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0); // 将相机位置设置在中心点

    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    dom.appendChild(renderer.domElement);

    // 创建球体并设置纹理
    // 球体半径 500，60 段宽度，40 段高度
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    // 将球体反向，使得相机在球体内部
    geometry.scale(-1, 1, 1);

    // 加载全景图纹理
    const texture = new EXRLoader().load("/textures/hotel_room_4k.exr");

    // 创建材质并将纹理应用到球体
    const material = new THREE.MeshBasicMaterial({ map: texture });

    // 创建球体并加入场景
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // 添加性能监控
    const $fps = document.getElementById('fps');
    if ($fps) {
      stats = new Stats();
      $fps.appendChild(stats.dom);
    }

    // 启动动画
    animate();

    // 鼠标按下事件
    dom.addEventListener("pointerdown", (event: any) => {
      isUserInteracting = true;
      onPointerDownPointerX = event.clientX;
      onPointerDownPointerY = event.clientY; // 记录初始Y轴位置
      onPointerDownLon = lon;
      onPointerDownLat = lat;
    });

    // 鼠标移动事件
    dom.addEventListener("pointermove", (event: any) => {
      if (isUserInteracting) {
        lon = (onPointerDownPointerX - event.clientX) * 0.1 + onPointerDownLon;
        // 修正lat的计算方式
        lat = (onPointerDownPointerY - event.clientY) * 0.1 + onPointerDownLat;
      }
    });

    // 鼠标松开事件
    dom.addEventListener("pointerup", () => {
      isUserInteracting = false;
    });

    // 窗口大小调整事件
    dom.addEventListener("resize", onWindowResize);
  };

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);

    // 限制角度范围，防止旋转过度
    lat = Math.max(-85, Math.min(85, lat)); // 只限制lat的范围

    const phi = THREE.MathUtils.degToRad(90 - lat); // 使用 Three.js 的角度转弧度方法
    const theta = THREE.MathUtils.degToRad(lon);

    // 计算相机的朝向
    const lookAtX = 500 * Math.sin(phi) * Math.cos(theta);
    const lookAtY = 500 * Math.cos(phi);
    const lookAtZ = 500 * Math.sin(phi) * Math.sin(theta);

    camera?.lookAt(lookAtX, lookAtY, lookAtZ);
    stats?.update();

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
  return { initVR, destroy };
}