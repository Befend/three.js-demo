import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import Pawpaw from './modules/Pawpaw';

export function useBubble() {
  let conf: any, scene: any, camera: any, cameraCtrl: OrbitControls, renderer: any, stats: any;
  // let whw: number, whh: number;
  let objects: Array<any>;
  let spriteMap: THREE.Texture;
  let currentDom: any;
  const bubbleTotal = 800;

  const initScene = () => {
    scene.background = new THREE.Color(0x000000);

    camera.position.z = 30;
    camera.position.y = 20;
    // 使相机始终朝向场景的中心
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    spriteMap = new THREE.TextureLoader().load(
      'data:image/png;base64,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'
    );

    objects = [];
    for (let i = 0; i < bubbleTotal; i++) {
      // 初始化泡泡
      const object: any = new Pawpaw({
        spriteMap,
        conf,
      });
      objects.push(object);
      scene.add(object.sprite);
    }
  };

  const animate = () => {
    requestAnimationFrame(animate);
    cameraCtrl.update();
    stats?.update();
    renderer?.render(scene, camera);
  };
  // 窗口大小调整事件
  const onWindowResize = () => {
    if (!currentDom) return;
    // whw = currentDom.clientWidth / 2;
    // whh = currentDom.clientHeight / 2;
    camera.aspect = currentDom.clientWidth / currentDom.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
  };

  const initBubble = (dom: HTMLElement) => {
    currentDom = dom;
    conf = {
      opacity: 0.8,
    };
    const $fps = document.getElementById('fps');
    // 创建场景
    scene = new THREE.Scene();
    // 创建相机，参数为视角100度、纵横比、近裁剪面0.1、远裁剪面1000
    camera = new THREE.PerspectiveCamera(
      100,
      dom.clientWidth / dom.clientHeight,
      0.1,
      1000
    );
    cameraCtrl = new OrbitControls(camera);
    cameraCtrl.autoRotate = true;
    cameraCtrl.autoRotateSpeed = 5;

    // 创建渲染器
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(dom.clientWidth, dom.clientHeight);
    dom.appendChild(renderer.domElement);
    if ($fps) {
      stats = new Stats();
      $fps.appendChild(stats.dom);
    }

    // 初始化场景
    initScene();
    onWindowResize();
    dom.addEventListener('resize', onWindowResize, false);
    animate();
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

  return { initBubble, destroy };
}