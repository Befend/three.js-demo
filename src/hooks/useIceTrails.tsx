import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import Stats from 'three/addons/libs/stats.module.js';
import trailFragment from '@/shaders/trailFragment.glsl';
import trailSmokeFragment from '@/shaders/trailFragment.glsl';
import iceVertex from '@/shaders/iceVertex.glsl';
import iceFragment from '@/shaders/iceFragment.glsl';
import smokeVertex from '@/shaders/smokeVertex.glsl';
import smokeFragment from '@/shaders/smokeFragment.glsl';

let currentDom: any;
let camera: any, renderer: any, scene: any, controls: any, stats: any;
let trailMaterial: any, trailScene: any, trailSmokeScene: any, trailSmokeMaterial: any, groundMaterial: any, iceSmokeMaterial: any, ground: any;
const config = {
  example: 5,
};
const clock = new THREE.Clock();
let time = 0;
let rt1: any, rt2: any, rt3: any, rt4: any, inputRT: any, outputRT: any, smokeInputRT: any, smokeOutputRT: any;
let pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const pane = new Pane();

export function useIceTrails() {
  const initIceTrails = (dom: any) => {
    currentDom = dom;
    // 场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0.0, 0.01, 0.02);
    const width = dom.clientWidth;
    const height = dom.clientHeight;

    // 相机：视角设置为 75 度，近裁剪面 0.1，远裁剪面 1000
    camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    );
    // 设置相机位置
    camera.position.set(4, 8, 8);
    camera.lookAt(new THREE.Vector3(0, 2.5, 0));

    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2 });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    dom.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 加载nosie纹理
    const textureLoader = new THREE.TextureLoader();
    const crackMap = textureLoader.load('/textures/ice/cracks-3.png');
    crackMap.wrapS = THREE.RepeatWrapping;
    crackMap.wrapT = THREE.RepeatWrapping;
    const perlinMap = textureLoader.load('/textures/ice/super-perlin-1.png');
    perlinMap.wrapS = THREE.RepeatWrapping;
    perlinMap.wrapT = THREE.RepeatWrapping;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 4.5);
    directionalLight.position.set(3, 10, 7);
    scene.add(ambientLight, directionalLight);

    rt1 = createRenderTarget(width, height);
    rt2 = createRenderTarget(width, height);
    inputRT = rt1;
    outputRT = rt2;

    rt3 = createRenderTarget(width * 0.25, height * 0.25);
    rt4 = createRenderTarget(width * 0.25, height * 0.25);
    smokeInputRT = rt3;
    smokeOutputRT = rt4;

    trailScene = new THREE.Scene();
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
        3
      )
    );
    trailGeometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2)
    );
    trailMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;	
        void main() {
          vUv = uv;
          gl_Position = vec4(position,1.0);
        }
      `,
      fragmentShader: trailFragment,
      uniforms: {
        uResolution: new THREE.Uniform(
          new THREE.Vector2(width, height)
        ),
        uMap: new THREE.Uniform(0.0),
        uUVPointer: new THREE.Uniform(new THREE.Vector2(0, 0)),
        uDt: new THREE.Uniform(0.0),
        uSpeed: new THREE.Uniform(0),
        uTime: new THREE.Uniform(0),
      },
    });

    const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
    trailScene.add(trailMesh);

    trailSmokeMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;	
        void main() {
          vUv = uv;
          gl_Position = vec4(position,1.0);
        }
      `,
      fragmentShader: trailSmokeFragment,
      uniforms: {
        uResolution: {
          value: new THREE.Vector2(width * 0.25, height * 0.25),
        },
        uMap: new THREE.Uniform(0.0),
        uUVPointer: trailMaterial.uniforms.uUVPointer,
        uDt: trailMaterial.uniforms.uDt,
        uSpeed: trailMaterial.uniforms.uSpeed,
        uTime: trailMaterial.uniforms.uTime,
      },
    });
    const trailSmokeMesh = new THREE.Mesh(trailGeometry, trailSmokeMaterial);
    trailSmokeScene = new THREE.Scene();
    trailSmokeScene.add(trailSmokeMesh);

    // 鼠标移动监听
    dom.addEventListener('pointermove', (ev: any) => {
      pointer.x = (ev.clientX / width) * 2 - 1;
      pointer.y = -(ev.clientY / height) * 2 + 1;
    });

    // Plane
    groundMaterial = new THREE.ShaderMaterial({
      vertexShader: iceVertex,
      fragmentShader: iceFragment,
      transparent: true,
      uniforms: {
        uTrailMap: new THREE.Uniform(0.0),
        uCracksMap: new THREE.Uniform(crackMap),
        uPerlin: new THREE.Uniform(perlinMap),
        uParallaxDistance: new THREE.Uniform(1),
      },
    });
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    groundGeometry.rotateX(-Math.PI * 0.5);
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    scene.add(ground);

    const iceSmokeGeometry = new THREE.PlaneGeometry(40, 40, 100, 100);
    iceSmokeMaterial = new THREE.ShaderMaterial({
      vertexShader: smokeVertex,
      fragmentShader: smokeFragment,
      transparent: true,
      // wireframe: true,
      uniforms: {
        uTrailSmokeMap: new THREE.Uniform(0.0),
        uPerlin: new THREE.Uniform(perlinMap),
        uTime: trailMaterial.uniforms.uTime,
      },
    });
    iceSmokeGeometry.rotateX(-Math.PI * 0.5);
    const smokeMesh = new THREE.Mesh(iceSmokeGeometry, iceSmokeMaterial);
    smokeMesh.position.y = 0.5;
    scene.add(smokeMesh);
    animate();
    // 窗口大小调整事件
    dom.addEventListener("resize", onWindowResize);

    // 添加性能监控
    const $fps = document.getElementById('fps');
    if ($fps) {
      stats = new Stats();
      $fps.appendChild(stats.dom);
    }
  };

  const animate = () => {
    const dt = clock.getDelta();
    time += dt;

    camera && raycaster?.setFromCamera(pointer, camera);

    const [firstIntersection] = raycaster?.intersectObject(ground);

    if (firstIntersection) {
      const { uv } = firstIntersection;

      uv && trailMaterial.uniforms.uUVPointer.value.lerp(uv, dt * 10);
    }

    trailMaterial.uniforms.uTime.value = time;
    trailMaterial.uniforms.uDt.value = dt;

    controls?.update(dt);

    renderer?.setRenderTarget(outputRT);
    renderer?.render(trailScene, camera);

    renderer?.setRenderTarget(smokeOutputRT);
    renderer?.render(trailSmokeScene, camera);

    renderer?.setRenderTarget(null);

    trailMaterial.uniforms.uMap.value = outputRT.texture;
    groundMaterial.uniforms.uTrailMap.value = inputRT.texture;

    trailSmokeMaterial.uniforms.uMap.value = smokeOutputRT.texture;
    iceSmokeMaterial.uniforms.uTrailSmokeMap.value = smokeOutputRT.texture;

    renderer?.render(scene, camera);

    let temp = inputRT;
    inputRT = outputRT;
    outputRT = temp;

    temp = smokeInputRT;
    smokeInputRT = smokeOutputRT;
    smokeOutputRT = temp;

    requestAnimationFrame(animate);
  };


  const createRenderTarget = (w: any, h: any) => {
    return new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
  };

  // 窗口大小调整事件
  const onWindowResize = () => {
    const width = currentDom.clientWidth;
    const height = currentDom.clientHeight;

    camera.aspect = width / height;
    trailMaterial.uniforms.uResolution.value.set(width, height);
    trailSmokeMaterial.uniforms.uResolution.value.set(
      width * 0.25,
      height * 0.25
    );

    // camera.aspect = width / height;
    camera?.updateProjectionMatrix();

    renderer?.setSize(width, height);
    rt1.setSize(width, height);
    rt2.setSize(width, height);
    rt3.setSize(width * 0.25, height * 0.25);
    rt4.setSize(width * 0.25, height * 0.25);

    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer?.setPixelRatio(pixelRatio);
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
  return { initIceTrails, destroy };
}