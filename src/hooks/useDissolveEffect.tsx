import * as THREE from 'three';
import Dissolve from './modules/Dissolve/index';
import GenColor from './modules/Dissolve/GenColor';
import ParticleSystem from './modules/Dissolve/ParticleSystem';
import { teapotGeo } from './modules/Dissolve/geometries';
import { meshArr } from './modules/Dissolve/tweaks';
import { meshBlade } from './modules/Dissolve/tweaks';
import { setupBloomComposer, resizeBloomComposer } from './modules/Dissolve/BloomComposer';
import { setupShaderSnippets, setupUniforms } from './modules/Dissolve/shaderHelper';
import { dissolveUniformData } from './modules/Dissolve/Uniforms';
import { handleMeshChange, progressBinding, setupTweaks, TWEAKS } from './modules/Dissolve/tweaks';
import { fragmentGlobal, fragmentMain, vertexGlobal, vertexMain } from './modules/Dissolve/shaders/index';
import perlinNoise from './modules/Dissolve/shaders/noise.glsl?raw';
import particleVertex from './modules/Dissolve/shaders/vertex.glsl?raw';
import particleFragment from './modules/Dissolve/shaders/fragment.glsl?raw';
import Stats from 'three/addons/libs/stats.module.js';

let currentDom: any;
export let dissolve: any;
let currentMesh = 1;
let lock = false;
let direction = 1;
const scale = 0.7;
let autoProgress = false;
const planeColor = new THREE.Color(0x1b1b1b); // 平面颜色
export const particleColor = new GenColor('#4d9bff'); // 粒子颜色
const blackColor = new THREE.Color(0x000000); // 黑色
export const meshColor = new GenColor('#636363'); // 默认网格颜色
let pointsMat: any; // 点云材质
let composers: any; // 混合器
let planeMesh: any; // 平面网格
export let mesh: THREE.Object3D;
export let particleMesh: THREE.Points; // 粒子网格
export let particleSystem: ParticleSystem; // 粒子系统
export let physicalMaterial: any; // 物理材质
export let particleUniforms: any; // 粒子贴图材质
let stats: any;
export function useDissolveEffect() {
  // 初始化溶解效果
  const initDissolveEffect = (dom: any) => {
    currentDom = dom;

    const textureLoader = new THREE.TextureLoader();
    const particleTexture = textureLoader.load('/textures/particle.png');
    dissolve = new Dissolve(dom, (currentDom) => { resizeBloomComposer(currentDom); });
    particleUniforms = {
      uPixelDensity: {
        value: dissolve.renderer.getPixelRatio(),
      },
      uBaseSize: {
        value: dissolve?.isMobileDevice() ? 25.0 : 40.0,
      },
      uFreq: dissolveUniformData.uFreq,
      uAmp: dissolveUniformData.uAmp,
      uEdge: dissolveUniformData.uEdge,
      uColor: { value: particleColor.vec3 },
      uProgress: dissolveUniformData.uProgress,
      uParticleTexture: { value: particleTexture }
    };
    if (dissolve?.isMobileDevice()) {
      dissolve.camera.position.set(4, 5, 20);
      dissolve.setEnvMap("/textures/night1k.hdr");
    } else {
      dissolve.camera.position.set(5, 7, 12);
      dissolve.setEnvMap("/textures/night2k.hdr");
    }

    composers = setupBloomComposer(dissolve, currentDom);

    physicalMaterial = new THREE.MeshPhysicalMaterial();
    physicalMaterial.color = meshColor.rgb;
    physicalMaterial.iridescence = 0.2;
    physicalMaterial.roughness = 0.0;
    physicalMaterial.metalness = 2.0;
    physicalMaterial.side = THREE.DoubleSide;
    physicalMaterial.sheen = 1.0;
    physicalMaterial.onBeforeCompile = (shader: any) => { // handle dissolve effect with edges
      setupUniforms(shader, dissolveUniformData); // just import and pass the uniform data here , will set all the uniforms 
      setupShaderSnippets(shader, vertexGlobal, vertexMain, perlinNoise + fragmentGlobal, fragmentMain);
    };

    mesh = new THREE.Mesh(teapotGeo, physicalMaterial);

    setupTweaks();
    pointsMat = new THREE.ShaderMaterial();
    pointsMat.transparent = true;
    pointsMat.blending = THREE.AdditiveBlending;
    pointsMat.uniforms = particleUniforms;
    pointsMat.vertexShader = particleVertex;
    pointsMat.fragmentShader = particleFragment;
    particleMesh = new THREE.Points(teapotGeo, pointsMat);
    particleSystem = new ParticleSystem(teapotGeo);
    dissolve.scene.add(particleMesh);
    dissolve.scene.add(mesh);

    // 添加性能监控
    const $fps = document.getElementById('fps');
    if ($fps) {
      stats = new Stats();
      $fps.appendChild(stats.dom);
    }

    const planeGeo = new THREE.PlaneGeometry(20, 20);
    planeGeo.rotateX(Math.PI * -0.5);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });
    planeMat.side = THREE.DoubleSide;
    planeMat.roughness = 1.0;
    planeMat.metalness = 0.6;
    planeMat.emissiveIntensity = 1.0;
    planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.position.set(0, -5, 0);
    dissolve.scene.add(planeMesh);
    animate();
    dissolve?.dom?.addEventListener('resize', onWindowResize, false);
  };

  // 更新网格几何体
  const updateGenMeshGeo = (geo: THREE.BufferGeometry) => {
    mesh = new THREE.Mesh(geo, physicalMaterial);
    return mesh;
  };

  // 更新粒子系统几何体
  const updateParticleSystem = (geo: THREE.BufferGeometry) => {
    particleMesh = new THREE.Points(geo, pointsMat);
    particleSystem = new ParticleSystem(geo);
    particleSystem.updateAttributesValues();
  };

  // 设置自动进度
  const setAutoProgress = (value: boolean) => {
    autoProgress = value;
  };

  // 窗口大小变化处理
  const onWindowResize = () => {
    let width = 0;
    let height = 0;
    if (dissolve?.isMobileDevice()) {
      width = currentDom.clientWidth * scale;
      height = currentDom.clientHeight * scale;
    } else {
      width = currentDom.clientWidth;
      height = currentDom.clientHeight;

    }

    let needResize = false;
    if (dissolve?.isMobileDevice()) {
      needResize = currentDom.width !== width * scale || currentDom.height !== height * scale;
    } else {
      needResize = currentDom.width !== width || currentDom.height !== height;
    }
    if (needResize) {
      dissolve.renderer.setSize(width, height, false);
    }
    return needResize;
  };

  // 动画循环
  const animate = () => {
    requestAnimationFrame(animate);
    stats?.update();
    dissolve?.orbitCtrls?.update();

    if (onWindowResize()) {
      const canvas = dissolve.renderer.domElement;
      dissolve.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      dissolve.camera.updateProjectionMatrix();
    }

    particleSystem.updateAttributesValues();
    const time = dissolve.clock.getElapsedTime();

    if (autoProgress) {
      if (direction == 1) {
        dissolveUniformData.uProgress.value += 0.1 * TWEAKS.speed;// Math.sin(time * TWEAKS.speed) * 15.0;
      } else {
        dissolveUniformData.uProgress.value -= 0.1 * TWEAKS.speed;// Math.sin(time * TWEAKS.speed) * 15.0;
      }
      if (dissolveUniformData.uProgress.value >= 14.00 || dissolveUniformData.uProgress.value <= -14.0) direction *= -1;
      if (dissolveUniformData.uProgress.value >= 14 && direction == 1) direction = -1;
      if (dissolveUniformData.uProgress.value <= -14 && direction == -1) direction = 1;

      TWEAKS.progress = dissolveUniformData.uProgress.value;
      if (TWEAKS.progress >= 14.0 && lock == false) {
        const index = currentMesh % (meshArr.length);
        const geo = meshArr[index];
        handleMeshChange(geo);
        currentMesh++;
        lock = true;
        //@ts-ignore
        meshBlade.value = meshArr[index];
      }
      if (TWEAKS.progress < 0) {
        lock = false;
      }
      progressBinding.refresh();

    }

    mesh.position.y += Math.sin(time * 1.0) * 0.01;
    particleMesh.position.y += Math.sin(time * 1.0) * 0.01;
    dissolve.scene.background = blackColor;
    planeMesh.material.color = blackColor;
    composers.composer1.render();
    planeMesh.material.color = planeColor;
    dissolve.scene.background = dissolve.texture;
    composers.composer2.render();
  };
  const destroy = () => {
    try {
      dissolve?.renderer?.dispose();
      dissolve?.renderer?.forceContextLoss();
      dissolve.renderer.content = null;
      dissolve?.pane?.dispose();
      const gl: any = dissolve?.renderer?.domElement?.getContext("webgl");
      if (gl && gl.getExtension("WEBGL_lose_context")) {
        gl.getExtension("WEBGL_lose_context").loseContext();
      }
      dissolve?.dom?.removeEventListener('resize', onWindowResize, false);
      dissolve?.scene.traverse((child: any) => {
        if (child.material) {
          child.material.dispose();
        }
        if (child.geometry) {
          child.geometry.dispose();
        }
        child = null;
      });
      dissolve.renderer = null;
      dissolve.camera = null;
      dissolve.scene = null;
      dissolve.pane = null;
      dissolve = null;
      currentDom = null;
    } catch (e) {
      console.error("Failed to destroy threejs", e);
    }
  };
  return {
    updateGenMeshGeo,
    updateParticleSystem,
    setAutoProgress,
    initDissolveEffect,
    destroy
  };
}