
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';

export function useThunder() {
  let currentDom: any, stats: any;
  let camera: any, scene: any, renderer: any;
  let cloudParticles: any = [], flash: any, rain: any, rainGeo: any, rainCount = 15000;

  const initThunder = (dom: any) => {
    currentDom = dom;

    // 1. 创建一个场景
    scene = new THREE.Scene();
    // 2. 创建相机: 参数为视野FOV(60度)、纵横比/宽高比、近裁剪面(1)、远裁剪面(20000)
    camera = new THREE.PerspectiveCamera(60, dom.clientWidth / dom.clientHeight, 1, 1000);
    // 设置相机位置和旋转角度，以模拟向天空仰视的效果
    camera.position.set(0, 0, 1);
    camera.rotation.set(1.16, -0.12, 0.27);

    // 3. 环境光提供基础照明，避免场景过暗
    const ambient = new THREE.AmbientLight(0x555555);
    scene.add(ambient);

    // 4. 模拟方向性的微弱光照，增强立体感
    const directionalLight = new THREE.DirectionalLight(0xffeedd);
    directionalLight.position.set(0, 0, 1);
    scene.add(directionalLight);

    // 5. 闪电点光源
    flash = new THREE.PointLight(0x062d89, 30, 500, 1.7);
    flash.position.set(200, 300, 100);
    scene.add(flash);

    // 6. 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    // 指数型雾效，模拟雨雾中的视距衰减
    scene.fog = new THREE.FogExp2(0x11111f, 0.002);
    renderer.setClearColor(scene.fog.color);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(dom.clientWidth, dom.clientHeight);
    dom.appendChild(renderer.domElement);

    // 7. 生成雨点
    let positions = [];
    let sizes = [];
    rainGeo = new THREE.BufferGeometry();
    for (let i = 0; i < rainCount; i++) {
      positions.push(Math.random() * 400 - 200);
      positions.push(Math.random() * 500 - 250);
      positions.push(Math.random() * 400 - 200);
      sizes.push(30);
    }
    rainGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions), 3)
    );
    rainGeo.setAttribute(
      "size",
      new THREE.BufferAttribute(new Float32Array(sizes), 1)
    );
    const rainMaterial = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.1,
      transparent: true
    });
    rain = new THREE.Points(rainGeo, rainMaterial);
    scene.add(rain);

    let loader = new THREE.TextureLoader();
    loader.load(
      "/textures/air-effect.png",
      function (texture) {
        const cloudGeo = new THREE.PlaneGeometry(500, 500);
        const cloudMaterial = new THREE.MeshLambertMaterial({
          map: texture,
          transparent: true
        });

        for (let p = 0; p < 25; p++) {
          let cloud = new THREE.Mesh(cloudGeo, cloudMaterial);
          cloud.position.set(
            Math.random() * 800 - 400,
            500,
            Math.random() * 500 - 450
          );
          cloud.rotation.x = 1.16;
          cloud.rotation.y = -0.12;
          cloud.rotation.z = Math.random() * 360;
          cloud.material.opacity = 0.6;
          cloudParticles.push(cloud);
          scene.add(cloud);
        }
        animate();
        dom.addEventListener('resize', onWindowResize);
      }
    );

    // 添加fps统计
    const $fps = document.getElementById('fps');
    if ($fps) {
      stats = new Stats();
      $fps.appendChild(stats.dom);
    }
  };
  // 窗口大小调整事件
  const onWindowResize = () => {
    if (!currentDom) return;
    camera.aspect = currentDom.clientWidth / currentDom.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
  };

  const animate = () => {
    cloudParticles.forEach((p: any) => {
      p.rotation.z -= 0.002;
    });
    rainGeo.attributes.size.array.forEach((r: any) => {
      r += 0.3;
    });

    rainGeo.verticesNeedUpdate = true;

    rain.position.z -= 0.222;
    if (rain.position.z < -200) {
      rain.position.z = 0;
    }

    if (Math.random() > 0.93 || flash.power > 100) {
      if (flash.power < 100) {
        flash.position.set(Math.random() * 400, 300 + Math.random() * 200, 100);
      }
      flash.power = 50 + Math.random() * 500;
    }
    renderer?.render(scene, camera);
    requestAnimationFrame(animate);
    stats?.update();
  };
  // 销毁，防止内存泄漏
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

  return { initThunder, destroy };
}