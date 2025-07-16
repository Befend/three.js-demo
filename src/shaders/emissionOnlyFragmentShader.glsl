#include ./simplexNoise2D.glsl;

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