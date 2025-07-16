#include ./simplexNoise3D.glsl;

uniform float time;
uniform float noiseScale;
uniform float noiseAmplitude;
varying float vNoise;

void main() {
  float noise= snoise(position*noiseScale+vec3(time*0.3));
  vNoise=noise;
  vec3 displacedPosition=position+normal*noise*noiseAmplitude;     
  gl_Position=projectionMatrix*modelViewMatrix*vec4(displacedPosition,1.0);
}