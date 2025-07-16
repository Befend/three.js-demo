#include ./simplexNoise2D.glsl;

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