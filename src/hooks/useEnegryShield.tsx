import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';

let currentDom: any;
let camera: any, renderer: any, scene: any, stats: any;
const Vertex = `
  varying float vIntensity;
  varying vec2 vUv;
  void main(){
      vec4 worldPosition=modelMatrix*vec4(position,1.);
      vec3 normal=normalize(vec3(modelMatrix*vec4(normal,0.)));
      vec3 dirToCamera=normalize(cameraPosition-worldPosition.xyz);
      // vIntensity=10.-dot(normal,dirToCamera);
      vIntensity=1.8;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      vUv=uv;
  }
`;
const Fragment = `
  varying float vIntensity;
  varying vec2 vUv;
  uniform sampler2D uNoiseTexture;
  uniform vec3 uColor;
  uniform float uTime;

  void main(){
      vec4 noiseColor=texture2D(uNoiseTexture,vUv);
      gl_FragColor=vec4(noiseColor.rgb*vIntensity*uColor,1.); // Set the fragment color to red
  }
`;

export function useEnegryShield() {
  const initEnegryShield = (dom: any) => {
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
    // 设置相机位置，距离z轴5个单位
    camera.position.z = 5;

    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    dom.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = false;
    controls.enablePan = false;

    // 增加底部网格
    const gridHelper = new THREE.GridHelper(10, 10);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    // 加载nosie纹理
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("/textures/noise1.png", (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      material.uniforms.uNoiseTexture.value = texture;
    });

    // 创建球体
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.ShaderMaterial({
      vertexShader: Vertex,
      fragmentShader: Fragment,
      uniforms: {
        uTickness: { value: 0.5 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xff0000) }, // 红色
        uNoiseTexture: {
          value: null,
        },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
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

    // 窗口大小调整事件
    dom.addEventListener("resize", onWindowResize);
  };

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);
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
  return { initEnegryShield, destroy };
}