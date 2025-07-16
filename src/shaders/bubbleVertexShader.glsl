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
