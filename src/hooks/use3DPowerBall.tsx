import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import Stats from 'three/addons/libs/stats.module.js'
import simplexNoise2D from '@/shaders/simplexNoise2D.glsl'
import simplexNoise3D from '@/shaders/simplexNoise3D.glsl'
// import bubbleFragmentShader from '@/shaders/bubbleFragmentShader.glsl'
// import bubbleVertexShader from '@/shaders/bubbleVertexShader.glsl'
import coreFragmentShader from '@/shaders/coreFragmentShader.glsl'
import coreVertexShader from '@/shaders/coreVertexShader.glsl'
// import emissionOnlyFragmentShader from '@/shaders/emissionOnlyFragmentShader.glsl'
import px from '@/assets/textures/cube/px.jpg'
import py from '@/assets/textures/cube/py.jpg'
import pz from '@/assets/textures/cube/pz.jpg'
import nx from '@/assets/textures/cube/nx.jpg'
import ny from '@/assets/textures/cube/ny.jpg'
import nz from '@/assets/textures/cube/nz.jpg'

export function use3DPowerBall() {
  let currentDom: any
  let camera: any, renderer: any, scene: any, controls: any, stats: any
  let bubble: any, innerCore: any, emissionBubble: any, clock: any, particles: any, composer: any
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let isHovering = false
  const surfaceWaves = []
  const maxWaves = 5
  const lightningBranches = []
  const maxBranches = 15
  const particleCount = 5000
  let originalParticlePositions

  const bubbleFragmentShader = `
    uniform samplerCube envMap;
    uniform float time;
    uniform float aberrationStrength;
    uniform float iridescenceIntensity;
    uniform float u_hoverIntensity;
    uniform vec2 u_crackleOriginUV;
    uniform float u_crackleStartTime;
    uniform float u_crackleDuration;
    uniform vec3 u_crackleColor;
    uniform float u_crackleIntensity;
    uniform float u_crackleScale;
    uniform float u_crackleSpeed;
    uniform float u_volumetricIntensity;
    uniform vec2 u_branchOrigins[${maxBranches}];
    uniform vec2 u_branchEnds[${maxBranches}];
    uniform float u_branchStartTimes[${maxBranches}];
    uniform float u_branchIntensities[${maxBranches}];

    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vViewPosition;
    varying float vWaveIntensity;

    ${simplexNoise2D}
    float cracklePattern(vec2 uv, float scale, float timeOffset) {
      float flowNoise = snoise2d(uv * scale * 0.3 + vec2(timeOffset * 0.2));
      vec2 flowDirection = vec2(cos(flowNoise * 2.0), sin(flowNoise * 2.0));
      vec2 flowUV = uv + flowDirection * 0.02;
      float n1 = snoise2d(flowUV * scale);
      float n2 = snoise2d(flowUV * scale * 1.5 + vec2(timeOffset * 0.3));
      float ridge1 = 1.0 - abs(n1);
      float ridge2 = 1.0 - abs(n2 * 0.7);
      float pattern = max(ridge1, ridge2);
      pattern = smoothstep(0.85, 0.9, pattern);
      float branches = abs(snoise2d(flowUV * scale * 3.0 - timeOffset));
      branches = smoothstep(0.98, 0.99, branches);
      pattern = max(pattern, branches * 0.5);
      return smoothstep(0.4, 0.6, pattern);
    }

    float lightningBranch(vec2 uv, vec2 start, vec2 end, float thickness, float time) {
      vec2 dir = end - start;
      float len = length(dir);
      if (len == 0.0) return 0.0;
      vec2 norm = dir / len;
      vec2 perp = vec2(-norm.y, norm.x);
      vec2 toPoint = uv - start;
      float alongLine = dot(toPoint, norm);
      float perpDist = abs(dot(toPoint, perp));
      if (alongLine < 0.0 || alongLine > len) return 0.0;
      float noiseOffset = snoise2d(vec2(alongLine * 10.0, time * 3.0)) * 0.02;
      perpDist -= noiseOffset;
      float intensity = exp(-perpDist * perpDist / (thickness * thickness));
      return intensity;
    }

    void main() {
      vec3 viewDirection = normalize(vViewPosition);
      vec3 normal = normalize(vNormal);
      vec3 worldNormal = normalize(vWorldNormal);
      vec3 worldViewDir = normalize(cameraPosition - vPosition);
      vec3 reflectDir = reflect(-worldViewDir, worldNormal);
      float iorRatio = 1.0 / 1.33;
      vec3 refractDirBase = refract(-worldViewDir, worldNormal, iorRatio);
      vec3 aberrationOffset = worldNormal * aberrationStrength * 0.05;
      vec3 refractDirR = normalize(refractDirBase + aberrationOffset);
      vec3 refractDirG = refractDirBase;
      vec3 refractDirB = normalize(refractDirBase - aberrationOffset);
      float refractR = textureCube(envMap, refractDirR).r;
      float refractG = textureCube(envMap, refractDirG).g;
      float refractB = textureCube(envMap, refractDirB).b;
      vec3 refractedColorAberrated = vec3(refractR, refractG, refractB);
      vec4 reflectColor = textureCube(envMap, reflectDir);
      float fresnelPower = 4.0;
      float fresnelBase = 0.06;
      float fresnel = fresnelBase + (1.0 - fresnelBase) * pow(1.0 - max(0.0, dot(viewDirection, normal)), fresnelPower);
      fresnel = clamp(fresnel, 0.0, 1.0);
      float noiseScale = 3.5;
      float n1 = snoise2d(vUv * noiseScale + vec2(time * 0.05)) * 0.5 + 0.5;
      float n2 = snoise2d(vUv * noiseScale * 1.5 + vec2(time * 0.08 + 50.0)) * 0.5 + 0.5;
      float thicknessNoise = n1 * n2;
      float baseFilmThickness = 350.0;
      float filmThicknessRange = 450.0;
      float filmThickness = baseFilmThickness + thicknessNoise * filmThicknessRange;
      vec3 wavelengths = vec3(700.0, 530.0, 440.0);
      vec3 interference = vec3(
        sin(filmThickness / wavelengths.r * 20.0 + time * 0.5) * 0.5 + 0.5,
        sin(filmThickness / wavelengths.g * 20.0 + time * 0.6) * 0.5 + 0.5,
        sin(filmThickness / wavelengths.b * 20.0 + time * 0.7) * 0.5 + 0.5
      );
      interference = pow(interference, vec3(1.5));
      vec3 combinedColor = mix(refractedColorAberrated, reflectColor.rgb, fresnel);
      combinedColor = mix(combinedColor, combinedColor * interference, iridescenceIntensity);
      float rimPower = 3.0;
      float rimAmount = 0.7;
      float rim = rimAmount * pow(1.0 - max(0.0, dot(viewDirection, normal)), rimPower);
      combinedColor += vec3(rim * (0.8 + u_hoverIntensity * 0.4));
      float crackleEmissionStrength = 0.0;
      if (u_crackleStartTime > 0.0) {
        float crackleTime = time - u_crackleStartTime;
        if (crackleTime >= 0.0 && crackleTime < u_crackleDuration) {
          float dist = distance(vUv, u_crackleOriginUV) * 10.0;
          float currentRadius = crackleTime * u_crackleSpeed;
          if (dist < currentRadius) {
            float timeProgress = crackleTime / u_crackleDuration;
            float timeFalloff = smoothstep(1.0, 0.5, timeProgress);
            float patternValue = cracklePattern(vUv, u_crackleScale, time * 0.8);
            float distMask = smoothstep(currentRadius, currentRadius * 0.5, dist);
            float depth = length(vViewPosition);
            float volumetricFactor = 1.0 + u_volumetricIntensity * (1.0 - exp(-depth * 0.1));
            crackleEmissionStrength = patternValue * u_crackleIntensity * timeFalloff * distMask * volumetricFactor;
          }
        }
      }

      float lightningEmissionStrength = 0.0;
      for (int i = 0; i < ${maxBranches}; i++) {
        if (u_branchStartTimes[i] > 0.0) {
          float branchTime = time - u_branchStartTimes[i];
          float branchDuration = 0.5;
          if (branchTime > 0.0 && branchTime < branchDuration) {
            float branchProgress = branchTime / branchDuration;
            float branchFade = smoothstep(1.0, 0.0, branchProgress);
            float branchIntensity = lightningBranch(vUv, u_branchOrigins[i], u_branchEnds[i], 0.005, time);
            lightningEmissionStrength += branchIntensity * u_branchIntensities[i] * branchFade * 2.0;
          }
        }
      }

      vec3 waveGlow = u_crackleColor * vWaveIntensity * 0.2;
      float patternOnly = step(0.7, crackleEmissionStrength + lightningEmissionStrength);
      combinedColor += u_crackleColor * (crackleEmissionStrength + lightningEmissionStrength) * 0.05 * patternOnly + waveGlow;

      float baseAlpha = 0.4;
      float finalAlpha = mix(baseAlpha * 0.5, baseAlpha, fresnel);
      finalAlpha = clamp(finalAlpha + rim * 0.1 + (crackleEmissionStrength + lightningEmissionStrength) * 0.1 + vWaveIntensity * 0.2, 0.0, 1.0);

      gl_FragColor = vec4(combinedColor, finalAlpha);
    }
  `
  const bubbleVertexShader = `
    uniform float time;
    uniform vec2 waveOrigins[${maxWaves}];
    uniform float waveStartTimes[${maxWaves}];
    uniform float waveSpeeds[${maxWaves}];
    uniform float waveAmplitudes[${maxWaves}];

    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vViewPosition;
    varying float vWaveIntensity;

    ${simplexNoise3D}

    void main() {
      vUv = uv;

      float noiseScale1 = 0.8;
      float noiseScale2 = 1.8;
      float noiseScale3 = 3.2;
      float baseWobbleAmp = 0.12;
      float mediumWobbleAmp = 0.06;
      float rippleAmp = 0.03;

      vec3 baseWobblePos = position * noiseScale1 + vec3(time * 0.15, time * 0.12, time * 0.20);
      float baseWobble = snoise(baseWobblePos) * baseWobbleAmp;

      vec3 mediumWobblePos = position * noiseScale2 + vec3(time * 0.3, time * 0.4, time * 0.25);
      float mediumWobble = snoise(mediumWobblePos) * mediumWobbleAmp;

      vec3 ripplePos = position * noiseScale3 + vec3(time * 0.6, time * 0.7, time * 0.5);
      float ripple = snoise(ripplePos) * rippleAmp;

      float deformation = baseWobble + mediumWobble + ripple;

      float totalWaveDeformation = 0.0;
      vWaveIntensity = 0.0;

      for (int i = 0; i < ${maxWaves}; i++) {
        if (waveStartTimes[i] > 0.0) {
          float waveTime = time - waveStartTimes[i];
          if (waveTime > 0.0 && waveTime < 2.0) {
            float dist = distance(uv, waveOrigins[i]);
            float waveRadius = waveTime * waveSpeeds[i];
            float waveFalloff = exp(-waveTime * 2.0);
            float waveWidth = 0.1;
            float wave = exp(-pow((dist - waveRadius) / waveWidth, 2.0)) * waveFalloff;
            totalWaveDeformation += wave * waveAmplitudes[i] * sin(dist * 30.0 - waveTime * 15.0);
            vWaveIntensity += wave * waveFalloff;
          }
        }
      }

      deformation += totalWaveDeformation * 0.2;

      vec3 deformedNormal = normalize(normal);
      vec3 newPosition = position + deformedNormal * deformation;

      vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
      vPosition = worldPosition.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * deformedNormal);
      vNormal = normalize(normalMatrix * deformedNormal);

      vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
      vViewPosition = -mvPosition.xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `
  const emissionOnlyFragmentShader = `
    uniform float time;
    uniform vec2 u_crackleOriginUV;
    uniform float u_crackleStartTime;
    uniform float u_crackleDuration;
    uniform vec3 u_crackleColor;
    uniform float u_crackleIntensity;
    uniform float u_crackleScale; 
    uniform float u_crackleSpeed;
    uniform float u_volumetricIntensity;

    uniform vec2 u_branchOrigins[${maxBranches}];
    uniform vec2 u_branchEnds[${maxBranches}];
    uniform float u_branchStartTimes[${maxBranches}];
    uniform float u_branchIntensities[${maxBranches}];

    varying vec2 vUv;
    varying vec3 vViewPosition;

    ${simplexNoise2D}
    float cracklePattern(vec2 uv, float scale, float timeOffset) {
      float n1 = snoise2d(uv * scale + vec2(timeOffset * 0.5));
      float n2 = snoise2d(uv * scale * 2.1 + vec2(-timeOffset * 0.3, timeOffset * 0.4) + 10.0);
      float n3 = snoise2d(uv * scale * 0.8 + vec2(timeOffset * 0.2, -timeOffset * 0.6) - 5.0);
      float combined = abs(n1 * 0.5 + n2 * 0.3 + n3 * 0.2);
      float pattern = pow(1.0 - combined, 40.0);
      float sparks = snoise2d(uv * scale * 5.0 + timeOffset * 2.0);
      pattern += pow(max(0.0, sparks), 40.0) * 0.1;
      pattern = step(0.95, pattern);
      return pattern;
    }

    float lightningBranch(vec2 uv, vec2 start, vec2 end, float thickness, float time) {
      vec2 dir = end - start;
      float len = length(dir);
      if (len == 0.0) return 0.0;
      vec2 norm = dir / len;
      vec2 perp = vec2(-norm.y, norm.x);
      vec2 toPoint = uv - start;
      float alongLine = dot(toPoint, norm);
      float perpDist = abs(dot(toPoint, perp));
      if (alongLine < 0.0 || alongLine > len) return 0.0;
      float noiseOffset = snoise2d(vec2(alongLine * 10.0, time * 3.0)) * 0.02;
      perpDist -= noiseOffset;
      float intensity = exp(-perpDist * perpDist / (thickness * thickness));
      return intensity;
    }

    void main() {
      float crackleEmissionStrength = 0.0;
      if (u_crackleStartTime > 0.0) {
        float crackleTime = time - u_crackleStartTime;
        if (crackleTime >= 0.0 && crackleTime < u_crackleDuration) {
          float dist = distance(vUv, u_crackleOriginUV) * 10.0;
          float currentRadius = crackleTime * u_crackleSpeed;
          if (dist < currentRadius) {
            float timeProgress = crackleTime / u_crackleDuration;
            float timeFalloff = smoothstep(1.0, 0.5, timeProgress);
            float patternValue = cracklePattern(vUv, u_crackleScale, time * 0.8);
            float distMask = smoothstep(currentRadius, currentRadius * 0.5, dist);
            float depth = length(vViewPosition);
            float volumetricFactor = 1.0 + u_volumetricIntensity * (1.0 - exp(-depth * 0.1));
            crackleEmissionStrength = patternValue * u_crackleIntensity * timeFalloff * distMask * volumetricFactor;
          }
        }
      }

      float lightningEmissionStrength = 0.0;
      for (int i = 0; i < ${maxBranches}; i++) {
        if (u_branchStartTimes[i] > 0.0) {
          float branchTime = time - u_branchStartTimes[i];
          float branchDuration = 0.5;
          if (branchTime > 0.0 && branchTime < branchDuration) {
            float branchProgress = branchTime / branchDuration;
            float branchFade = smoothstep(1.0, 0.0, branchProgress);
            float branchIntensity = lightningBranch(vUv, u_branchOrigins[i], u_branchEnds[i], 0.005, time);
            lightningEmissionStrength += branchIntensity * u_branchIntensities[i] * branchFade * 2.0;
          }
        }
      }

      float totalEmissionStrength = crackleEmissionStrength + lightningEmissionStrength;
      float emissionBoost = 8.0;
      vec3 finalColor = u_crackleColor * totalEmissionStrength * emissionBoost;
      gl_FragColor = vec4(finalColor, step(0.9, totalEmissionStrength));
    }
  `
  const init3DPowerBall = (dom: any) => {
    currentDom = dom
    // 场景
    scene = new THREE.Scene()
    clock = new THREE.Clock()
    const width = dom.clientWidth
    const height = dom.clientHeight

    // 相机：视角设置为 75 度，近裁剪面 0.1，远裁剪面 1000
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.z = 7 // 将相机位置设置在中心点

    // 渲染器
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.toneMapping = THREE.ACESFilmicToneMapping // 添加电影级别的色调映射
    renderer.toneMappingExposure = 1.2
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    dom.appendChild(renderer.domElement)

    // 添加轨道控制器
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.maxDistance = 25
    controls.minDistance = 3
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.15

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
    directionalLight.position.set(5, 7, 5).normalize()
    scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0xffccaa, 1.2, 150)
    pointLight.position.set(-6, 4, -4)
    scene.add(pointLight)

    const cubeTextureLoader = new THREE.CubeTextureLoader()
    const environmentMap = cubeTextureLoader.load(
      [px, nx, py, ny, pz, nz],
      () => {
        scene.background = environmentMap
        scene.environment = environmentMap
        if (bubble) {
          bubble.material.uniforms.envMap.value = environmentMap
          bubble.material.needsUpdate = true
        }
      },
      undefined,
      (error) => {
        console.error('Error loading environment map:', error)
        scene.background = new THREE.Color(0x15151a)
        const fallbackEnvMap = new THREE.CubeTexture()
        scene.environment = fallbackEnvMap
        if (bubble) {
          bubble.material.uniforms.envMap.value = fallbackEnvMap
          bubble.material.needsUpdate = true
        }
      }
    )
    scene.background = new THREE.Color(0x15151a)
    const particleData = createReactiveParticleSystem()
    particles = particleData.particles
    originalParticlePositions = particleData.originalPositions
    scene.add(particles)

    const bubbleGeometry = new THREE.SphereGeometry(2, 128, 128)
    const bubbleMaterial = new THREE.ShaderMaterial({
      vertexShader: bubbleVertexShader,
      fragmentShader: bubbleFragmentShader,
      uniforms: THREE.UniformsUtils.clone({
        envMap: { value: scene.environment || new THREE.CubeTexture() },
        time: { value: 0 },
        aberrationStrength: { value: 0.8 },
        iridescenceIntensity: { value: 0.6 },
        u_hoverIntensity: { value: 0.0 },
        u_crackleOriginUV: { value: new THREE.Vector2(0.5, 0.5) },
        u_crackleStartTime: { value: -1.0 },
        u_crackleDuration: { value: 1.5 },
        u_crackleColor: { value: new THREE.Color(0.9, 0.95, 1.0) },
        u_crackleIntensity: { value: 1.5 },
        u_crackleScale: { value: 25.0 },
        u_crackleSpeed: { value: 8.0 },
        u_volumetricIntensity: { value: 0.05 },
        waveOrigins: {
          value: Array(maxWaves)
            ?.fill()
            ?.map(() => new THREE.Vector2(0, 0))
        },
        waveStartTimes: { value: Array(maxWaves).fill(-1) },
        waveSpeeds: { value: Array(maxWaves).fill(1.0) },
        waveAmplitudes: { value: Array(maxWaves).fill(0.1) },
        u_branchOrigins: {
          value: Array(maxBranches)
            ?.fill()
            ?.map(() => new THREE.Vector2(0, 0))
        },
        u_branchEnds: {
          value: Array(maxBranches)
            ?.fill()
            ?.map(() => new THREE.Vector2(0, 0))
        },
        u_branchStartTimes: { value: Array(maxBranches).fill(-1) },
        u_branchIntensities: { value: Array(maxBranches).fill(1.0) }
      }),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial)
    scene.add(bubble)
    const emissionOnlyMaterial = new THREE.ShaderMaterial({
      vertexShader: bubbleVertexShader,
      fragmentShader: emissionOnlyFragmentShader,
      uniforms: bubbleMaterial.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    emissionBubble = new THREE.Mesh(bubbleGeometry, emissionOnlyMaterial)
    scene.add(emissionBubble)
    const coreGeometry = new THREE.SphereGeometry(0.6, 64, 64)
    const coreMaterial = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      uniforms: {
        time: { value: 0.0 },
        noiseScale: { value: 2.5 },
        noiseAmplitude: { value: 0.25 },
        baseColor: { value: new THREE.Color(0x99bbff) },
        opacityFactor: { value: 0.85 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    innerCore = new THREE.Mesh(coreGeometry, coreMaterial)
    scene.add(innerCore)
    setupPostProcessing()
    // 添加fps统计
    const $fps = document.getElementById('fps')
    if ($fps) {
      stats = new Stats()
      $fps.appendChild(stats.dom)
    }
    currentDom?.removeEventListener('resize', onWindowResize)
    // renderer.domElement.addEventListener('mousedown', onMouseDown)
    // renderer.domElement.addEventListener('mousemove', onMouseMove)
    currentDom?.removeEventListener('pointerdown', onMouseDown)
    currentDom?.removeEventListener('pointermove', onMouseMove)

    animate()
  }

  const createParticleTexture = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context: any = canvas.getContext('2d')
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(0.6, 'rgba(200,200,255,0.4)')
    gradient.addColorStop(1, 'rgba(150,150,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }

  const createReactiveParticleSystem = () => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const radius = 15
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = Math.cbrt(Math.random()) * radius
      positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = r * Math.cos(phi)
      const colorVariance = Math.random() * 0.3
      colors[i3] = 1.0 - colorVariance * 0.5
      colors[i3 + 1] = 1.0 - colorVariance * 0.5
      colors[i3 + 2] = 1.0
      velocities[i3] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
    }
    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const particleTexture = createParticleTexture()
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.12,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    particles.userData.velocities = velocities
    return { particles: particles, originalPositions: new Float32Array(positions) }
  }

  const setupPostProcessing = () => {
    const width = currentDom.clientWidth
    const height = currentDom.clientHeight
    composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.1, 0.3, 0.97)
    composer.addPass(bloomPass)
    const colorGradingShader = {
      uniforms: {
        tDiffuse: { value: null },
        contrast: { value: 1.15 },
        brightness: { value: 0.03 },
        saturation: { value: 1.2 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float contrast;
        uniform float brightness;
        uniform float saturation;
        varying vec2 vUv;
        vec3 adjustSaturation(vec3 color, float adjustment) {
          vec3 gray = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
          return mix(gray, color, adjustment);
        }
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          color.rgb = adjustSaturation(color.rgb, saturation);
          color.rgb = (color.rgb - 0.5) * contrast + 0.5 + brightness;
          gl_FragColor = clamp(color, 0.0, 1.0);
        }`
    }
    const colorGradingPass = new ShaderPass(colorGradingShader)
    composer.addPass(colorGradingPass)
  }

  const onMouseDown = (event: any) => {
    mouse.x = (event.clientX / currentDom.clientWidth) * 2 - 1
    mouse.y = -(event.clientY / currentDom.clientHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(bubble)
    if (intersects.length > 0) {
      const intersection = intersects[0]
      const uv = intersection.uv
      bubble.material.uniforms.u_crackleOriginUV.value.copy(uv)
      bubble.material.uniforms.u_crackleStartTime.value = clock.getElapsedTime()
      addSurfaceWave(uv)
      generateLightningBranches(uv)
    }
  }

  const onMouseMove = (event: any) => {
    mouse.x = (event.clientX / currentDom.clientWidth) * 2 - 1
    mouse.y = -(event.clientY / currentDom.clientHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(bubble)
    isHovering = intersects.length > 0
  }

  const addSurfaceWave = (uv: any) => {
    const waveIndex = surfaceWaves.length % maxWaves
    const uniforms = bubble.material.uniforms
    uniforms.waveOrigins.value[waveIndex].copy(uv)
    uniforms.waveStartTimes.value[waveIndex] = clock.getElapsedTime()
    uniforms.waveSpeeds.value[waveIndex] = 0.8 + Math.random() * 0.4
    uniforms.waveAmplitudes.value[waveIndex] = 0.08 + Math.random() * 0.04
    surfaceWaves.push({ index: waveIndex, startTime: clock.getElapsedTime() })
  }

  const generateLightningBranches = (origin: any) => {
    const branchCount = 1 + Math.floor(Math.random() * 3)
    const uniforms = bubble.material.uniforms
    for (let i = 0; i < branchCount; i++) {
      const branchIndex = lightningBranches.length % maxBranches
      const angle = Math.random() * Math.PI * 2
      const length = 0.1 + Math.random() * 0.3
      uniforms.u_branchOrigins.value[branchIndex].copy(origin)
      uniforms.u_branchEnds.value[branchIndex].set(
        origin.x + Math.cos(angle) * length,
        origin.y + Math.sin(angle) * length
      )
      uniforms.u_branchStartTimes.value[branchIndex] = clock.getElapsedTime() + Math.random() * 0.2
      uniforms.u_branchIntensities.value[branchIndex] = 0.5 + Math.random() * 0.5
      lightningBranches.push({ index: branchIndex })
    }
  }

  const updateParticles = (time: any, deltaTime: any) => {
    const positions = particles.geometry.attributes.position.array
    const velocities = particles.userData.velocities
    const bubblePosition = bubble.position
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      let x = positions[i3]
      let y = positions[i3 + 1]
      let z = positions[i3 + 2]
      const dx = x - bubblePosition.x
      const dy = y - bubblePosition.y
      const dz = z - bubblePosition.z
      const distSq = dx * dx + dy * dy + dz * dz
      const dist = Math.sqrt(distSq)
      if (bubble.material.uniforms.u_crackleStartTime.value > 0) {
        const crackleTime = time - bubble.material.uniforms.u_crackleStartTime.value
        if (crackleTime > 0 && crackleTime < 1.5 && dist > 0) {
          const repelForce = 0.5 * (1 - crackleTime / 1.5)
          const invDist = 1.0 / dist
          velocities[i3] += dx * invDist * repelForce * deltaTime
          velocities[i3 + 1] += dy * invDist * repelForce * deltaTime
          velocities[i3 + 2] += dz * invDist * repelForce * deltaTime
        }
      }
      const attractionForce = 0.1
      if (dist > 3 && dist > 0) {
        const invDist = 1.0 / dist
        velocities[i3] -= dx * invDist * attractionForce * deltaTime
        velocities[i3 + 1] -= dy * invDist * attractionForce * deltaTime
        velocities[i3 + 2] -= dz * invDist * attractionForce * deltaTime
      }
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]
      velocities[i3] *= 0.98
      velocities[i3 + 1] *= 0.98
      velocities[i3 + 2] *= 0.98
    }
    particles.geometry.attributes.position.needsUpdate = true
  }
  // 动画循环
  let animateId: any
  const animate = () => {
    animateId = requestAnimationFrame(animate)
    const elapsedTime = clock?.getElapsedTime()
    const deltaTime = clock?.getDelta()
    if (bubble && elapsedTime) {
      bubble.material.uniforms.time.value = elapsedTime
      const targetHover = isHovering ? 1.0 : 0.0
      bubble.material.uniforms.u_hoverIntensity.value +=
        (targetHover - bubble.material.uniforms.u_hoverIntensity.value) * 0.1
    }
    if (innerCore && elapsedTime) {
      innerCore.material.uniforms.time.value = elapsedTime
    }
    if (elapsedTime && deltaTime) updateParticles(elapsedTime, deltaTime)

    // 更新控制器
    controls?.update()
    composer?.render()

    // 更新性能监控
    stats?.update()

    // 渲染场景
    // renderer?.render(scene, camera)
  }
  // 窗口大小调整事件
  const onWindowResize = () => {
    const width = currentDom.clientWidth
    const height = currentDom.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    composer.setSize(width, height)
  }
  const destroy = () => {
    try {
      renderer?.dispose()
      renderer?.forceContextLoss()
      renderer && (renderer.content = null)
      animateId && cancelAnimationFrame(animateId)
      const gl: any = renderer?.domElement?.getContext('webgl')
      if (gl?.getExtension('WEBGL_lose_context')) {
        gl?.getExtension('WEBGL_lose_context')?.loseContext?.()
      }
      currentDom?.removeEventListener('resize', onWindowResize, false)
      currentDom?.removeEventListener('pointerdown', onMouseDown, false)
      currentDom?.removeEventListener('pointermove', onMouseMove, false)
      scene?.traverse((child: any) => {
        if (child.material) {
          child.material.dispose()
        }
        if (child.geometry) {
          child.geometry.dispose()
        }
        child = null
      })
      renderer = null
      camera = null
      scene = null
      currentDom = null
    } catch (e) {
      console.error('Failed to destroy threejs', e)
    }
  }
  return { init3DPowerBall, destroy }
}
