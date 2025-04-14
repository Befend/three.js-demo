import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from 'three/addons/libs/stats.module.js';

export function useGalaxy() {
  let currentDom: any;
  let camera: any, renderer: any, scene: any, controls: any, stats: any, clock: any, material: any, mesh: any;
  const count1 = 50000;
  const count2 = 100000;
  const positions: any = [];
  const sizes: any = [];
  const shifts: any = [];
  /* 顶点着色器 */
  const vertexShader = `
  attribute float aSize;
  attribute vec4 aShift;

  uniform float uTime;

  varying vec3 vColor;

  const float PI = 3.141592653589793238;

  void main() {
      // float d = abs(position.y) / 10.0;
      float d = length(abs(position) / vec3(40., 10., 40.)); // 中间黄色、外面紫色
      d = clamp(d, 0., 1.);
      
      // rgb(227, 155, 0)
      // rgb(100, 50, 255)
      vec3 color1 = vec3(227., 155., 0.);
      vec3 color2 = vec3(100., 50., 255.);

      vColor = mix(color1, color2, d) / 255.;

      vec3 transformed = position;

      float theta = mod(aShift.x + aShift.z * uTime, PI * 2.);
      float phi = mod(aShift.y + aShift.z * uTime, PI * 2.);
      transformed += vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta)) * aShift.w;
      
      vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
      gl_PointSize = aSize * 50.0 / -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
  }
`;
  /* 片元着色器 */
  const fragmentShader = `
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord.xy - 0.5);
    if (d > 0.5) discard;
    // gl_FragColor = vec4(vColor, step(0.5, 1.0 - d));
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.1, d));
  }
`;
  const initGalaxy = (dom: any) => {
    currentDom = dom;
    // 场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // 设置背景颜色为黑色

    const width = dom.clientWidth;
    const height = dom.clientHeight;

    // 相机：视角设置为 75 度，近裁剪面 0.1，远裁剪面 1000
    camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(10, 20, 60);
    camera.lookAt(scene.position);

    // 渲染器
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x160016, 1);
    dom.appendChild(renderer.domElement);

    // 添加 OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    for (let i = 0; i < count1 + count2; i++) {
      let theta = Math.random() * Math.PI * 2;
      // let phi = Math.random() * Math.PI;
      let phi = Math.acos(Math.random() * 2 - 1);
      let angle = (Math.random() * 0.9 + 0.1) * Math.PI * 0.1;
      let strength = Math.random() * 0.9 + 0.1; // 0.1-1.0
      shifts.push(theta, phi, angle, strength);

      let size = Math.random() * 1.5 + 0.5; // 0.5-2.0
      sizes.push(size);

      if (i < count1) {
        // 中心球体粒子
        // let r = 10;
        let r = Math.random() * 0.5 + 9.5;
        // let x = r * Math.sin(phi) * Math.cos(theta);
        // let y = r * Math.sin(phi) * Math.sin(theta);
        // let z = r * Math.cos(phi);
        let { x, y, z } = new THREE.Vector3()
          .randomDirection()
          .multiplyScalar(r);
        positions.push(x, y, z);
      } else {
        // 外围圆盘粒子
        let r = 10;
        let R = 40;
        let rand = Math.pow(Math.random(), 1.5);
        let radius = Math.sqrt(R * R * rand + (1 - rand) * r * r); // 通过 rand=0-1 数值去线性插值 R^2 和 r^2 大概是按圆圈面积采样粒子分布更均匀
        let { x, y, z } = new THREE.Vector3().setFromCylindricalCoords(
          radius, // 半径
          Math.random() * 2 * Math.PI, // 角度
          (Math.random() - 0.5) * 2 // 高度y -1-1
        );
        positions.push(x, y, z);
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute("aShift", new THREE.Float32BufferAttribute(shifts, 4));

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    });

    // const mesh = new THREE.Mesh(geometry, material);
    mesh = new THREE.Points(geometry, material);
    mesh.rotation.order = "ZYX";
    mesh.rotation.z = 0.2;
    scene.add(mesh);
    clock = new THREE.Clock();

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
    // 文字向上移动
    let time = clock.getElapsedTime();
    mesh.rotation.y = time * 0.01;
    material.uniforms.uTime.value = time;
    // 更新控制器
    controls?.update();
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
  return { initGalaxy, destroy };
}