uniform float time;
uniform vec3 baseColor;
uniform float opacityFactor;
varying float vNoise;
void main() {
  float colorIntensity=smoothstep(-1.0,1.0,vNoise)*0.6+0.8;
  vec3 dynamicColor=baseColor*colorIntensity;
  float pulse=sin(time*2.5+vNoise*2.0)*0.5+0.5;
  float noiseOpacity=smoothstep(-0.6,0.2,vNoise);
  float finalOpacity=noiseOpacity*pulse*opacityFactor; 
  gl_FragColor=vec4(dynamicColor,finalOpacity);
}