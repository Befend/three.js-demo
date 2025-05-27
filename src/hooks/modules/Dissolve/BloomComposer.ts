import * as THREE from 'three'
import { EffectComposer, UnrealBloomPass } from 'three/examples/jsm/Addons.js'
import { RenderPass } from 'three/examples/jsm/Addons.js'
import { OutputPass } from 'three/examples/jsm/Addons.js'
import { ShaderPass } from 'three/examples/jsm/Addons.js'
import { TWEAKS } from './tweaks'

let effectComposer: EffectComposer
let effectComposer2: EffectComposer

let renderPass: RenderPass
let bloomPass: UnrealBloomPass
let outPass: OutputPass
export let shaderPass: ShaderPass

// 设置Bloom效果的混合器
// 该函数创建两个EffectComposer实例，一个用于Bloom效果，另一个用于输出效果
export function setupBloomComposer(
  world: any,
  dom: any
): { composer1: EffectComposer; composer2: EffectComposer } {
  let res = new THREE.Vector2(dom.clientWidth, dom.clientHeight)
  // 创建EffectComposer实例
  effectComposer = new EffectComposer(world.renderer)
  effectComposer2 = new EffectComposer(world.renderer)
  // 设置渲染目标的大小
  renderPass = new RenderPass(world.scene, world.camera)

  bloomPass = new UnrealBloomPass(res, 0.5, 0.4, 0.2)
  outPass = new OutputPass()

  // use when there are multiple objects
  const layer1 = new THREE.Layers()
  layer1.set(1)

  // 添加
  effectComposer.addPass(renderPass)
  // 添加BloomPass
  effectComposer.addPass(bloomPass)

  effectComposer.renderToScreen = false

  shaderPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, // effect Composer will set this value it'll pass the base textre from previous pass
        uBloomTexture: {
          value: effectComposer.renderTarget2.texture
        },
        uStrength: {
          value: TWEAKS.bloomStrength || 12.01
        }
      },

      vertexShader: `
        varying vec2 vUv;
        void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `,

      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D uBloomTexture;
        uniform float uStrength;
        varying vec2 vUv;
        void main(){
            vec4 baseEffect = texture2D(tDiffuse,vUv);
            vec4 bloomEffect = texture2D(uBloomTexture,vUv);
            gl_FragColor =baseEffect + bloomEffect * uStrength;
        }
    `
    })
  )

  effectComposer2.addPass(renderPass)
  effectComposer2.addPass(shaderPass)
  effectComposer2.addPass(outPass)

  return {
    composer1: effectComposer,
    composer2: effectComposer2
  }
}

// 调整Bloom效果的大小
export function resizeBloomComposer(dom: any) {
  const w = dom.clientWidth
  const h = dom.clientHeight

  renderPass.setSize(w, h)
  bloomPass.setSize(w, h)
  shaderPass.setSize(w, h)
  outPass.setSize(w, h)
  effectComposer.setSize(w, h)
  effectComposer2.setSize(w, h)
}
