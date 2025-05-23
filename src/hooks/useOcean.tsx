
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import WaterNormals from '@/assets/textures/waternormals.jpg';

export function useOcean() {


  let currentDom: any, stats: any, gui: any;
  let camera: any, scene: any, renderer: any;
  let controls: any, water: any, sunPosition: any, mesh: any;

  const initOcean = (dom: any) => {
    currentDom = dom;

    // 1. 创建一个场景
    scene = new THREE.Scene();
    // 2. 创建相机: 参数为视野FOV(55度)、纵横比/宽高比、近裁剪面(1)、远裁剪面(20000)
    camera = new THREE.PerspectiveCamera(55, dom.clientWidth / dom.clientHeight, 1, 20000);
    // 设置相机位置
    camera.position.set(30, 30, 100);

    // 3. 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(dom.clientWidth, dom.clientHeight);
    // 设置循环动画
    renderer.setAnimationLoop(animate);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    dom.appendChild(renderer.domElement);

    // 4. 添加环境光或太阳光
    // const light = new THREE.DirectionalLight(0xffffff, 1);
    // light.position.set(0, 50, 50);
    // scene.add(light);

    // 4. 添加环境光或太阳光
    sunPosition = new THREE.Vector3();
    const parameters = {
      elevation: 2,
      azimuth: 180
    };
    // 创建模型贴图
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const sceneEnv = new THREE.Scene();
    let renderTarget: any;

    // 5. 加载水面法线贴图（此处仅作演示，需替换为你自己的纹理路径）
    const textureLoader = new THREE.TextureLoader();
    const waterNormals = textureLoader.load(WaterNormals, function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // 让法线贴图可以重复
    });

    // 6. 创建水面
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    // 7. 使用 Water 类
    water = new Water(
      waterGeometry,
      {
        textureWidth: 512, // 生成的反射/折射纹理宽度
        textureHeight: 512, // 生成的反射/折射纹理高度
        waterNormals: waterNormals, // 法线贴图
        sunDirection: sunPosition.clone().normalize(), // 模拟太阳光的方向
        alpha: 1.0, // 水面的透明度
        // sunDirection: light.position.clone().normalize(), // 模拟环境光的方向
        sunColor: 0xffffff, // 太阳光颜色
        waterColor: 0x001e0f, // 水体颜色
        distortionScale: 3.7, // 失真程度，决定波纹起伏的大小
        fog: scene.fog !== undefined, // 是否结合场景雾效
      }
    );
    // 让水面水平
    water.rotation.x = - Math.PI / 2;
    scene.add(water);

    // 8. 初始化天空盒
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    // 设置天空盒的材质
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    // 更新太阳向量
    const updateSun = () => {
      const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
      const theta = THREE.MathUtils.degToRad(parameters.azimuth);
      sunPosition.setFromSphericalCoords(1, phi, theta);
      sky.material.uniforms['sunPosition'].value.copy(sunPosition);
      water.material.uniforms['sunDirection'].value.copy(sunPosition).normalize();
      renderTarget?.dispose();
      sceneEnv.add(sky);
      renderTarget = pmremGenerator.fromScene(sceneEnv);
      scene.add(sky);
      scene.environment = renderTarget.texture;
    };
    updateSun();

    // 初始化立方体
    const geometry = new THREE.BoxGeometry(30, 30, 30);
    // 创建网格材质
    const material = new THREE.MeshStandardMaterial({ roughness: 0 });
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 10, 0);
    controls.minDistance = 40.0;
    controls.maxDistance = 200.0;
    controls.update();

    // 添加fps统计
    const $fps = document.getElementById('fps');
    if ($fps) {
      stats = new Stats();
      $fps.appendChild(stats.dom);
    }

    // 初始化 GUI
    gui = new GUI();
    // // 添加 Sun 参数
    // const folderSky = gui.addFolder('Sky');
    // folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun);
    // folderSky.add(parameters, 'azimuth', - 180, 180, 0.1).onChange(updateSun);
    // // 默认展开
    // folderSky.open();
    // 添加 Sky
    const folderSky = gui.addFolder('Sky');
    folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun);
    folderSky.add(parameters, 'azimuth', - 180, 180, 0.1).onChange(updateSun);
    // 默认展开
    folderSky.open();

    // 设置水材质
    const waterUniforms = water.material.uniforms;
    const folderWater = gui.addFolder('Water');
    // 添加水材质的形变缩放级别 0.1-8
    folderWater.add(waterUniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');
    // 添加水材质的尺寸 0.1-10
    folderWater.add(waterUniforms.size, 'value', 0.1, 10, 0.1).name('size');
    folderWater.open();
    //
    dom.addEventListener('resize', onWindowResize);
  };
  // 窗口大小调整事件
  const onWindowResize = () => {
    if (!currentDom) return;
    camera.aspect = currentDom.clientWidth / currentDom.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(currentDom.clientWidth, currentDom.clientHeight);

  };

  const animate = () => {
    render();
    stats?.update();
  };

  const render = () => {
    const time = performance.now() * 0.001;
    if (!mesh || !water || !renderer) return;
    mesh.position.y = Math.sin(time) * 20 + 5;
    mesh.rotation.x = time * 0.5;
    mesh.rotation.z = time * 0.51;
    water.material.uniforms['time'].value += 1.0 / 60.0;
    renderer?.render(scene, camera);
  };
  // 销毁，防止内存泄漏
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
      renderer = null;
      camera = null;
      scene = null;
      gui = null;
      currentDom = null;
    } catch (e) {
      console.error("Failed to destroy threejs", e);
    }
  };

  return { initOcean, destroy };
}