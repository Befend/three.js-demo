import { edgeColor1, edgeColor2 } from './Uniforms'
import { dissolveUniformData } from './Uniforms'
import { BladeApi } from 'tweakpane'
import { torusKnotGeo, sphereGeo, torusGeo, boxGeo, teapotGeo } from './geometries'
import { shaderPass } from './BloomComposer'
import {
  dissolve,
  mesh,
  particleMesh,
  meshColor,
  physicalMaterial,
  particleColor,
  particleUniforms,
  useDissolveEffect
} from '@/hooks/useDissolveEffect'
const { updateGenMeshGeo, updateParticleSystem, setAutoProgress } = useDissolveEffect()
function createTweakList(name: string, keys: string[], vals: any[]): BladeApi {
  const opts = []
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    const v = vals[i]
    opts.push({ text: k, value: v })
  }

  return dissolve.pane.addBlade({
    view: 'list',
    label: name,
    options: opts,
    value: vals[0]
  })
}

// 更新网格颜色
function handleMeshColorUpdate(color: string) {
  meshColor.setColor(color)
  physicalMaterial.color = meshColor.rgb
}

// 更新边缘颜色1
function handleEdge1ColorUpdate(color: string) {
  edgeColor1.setColor(color)
  dissolveUniformData.uEdgeColor1.value = edgeColor1.vec3
}

// 更新粒子颜色
function handleParticleColorUpdate(color: string) {
  particleColor.setColor(color)
  particleUniforms.uColor.value = particleColor.vec3
}

// 网格操作
export function handleMeshChange(geo: any) {
  dissolve.scene.remove(mesh)
  const newMesh = updateGenMeshGeo(geo)
  dissolve.scene.add(newMesh)
  dissolve.scene.remove(particleMesh)
  updateParticleSystem(geo)
  dissolve.scene.add(particleMesh)
}

export let speedBinding: any
export let autoProgressBinding: any
// 设置自动进度
export function updateAnimationTweaks(autoAnimate: boolean) {
  if (autoAnimate) {
    speedBinding.disabled = false
    progressBinding.disabled = true
  } else {
    speedBinding.disabled = true
    progressBinding.disabled = false
  }
}

export let meshBlade: BladeApi
export const meshArr = [teapotGeo, torusKnotGeo, torusGeo, boxGeo, sphereGeo]
export const keyArr = ['Tea Pot', 'Torus Knot', 'Torus', 'Box', 'Sphere']
export const TWEAKS: { [key: string]: any } = {}
export let progressBinding: any
// TWEAKS对象和绑定
export function setupTweaks() {
  TWEAKS.meshColor = meshColor.hexString
  TWEAKS.edgeColor = edgeColor1.hexString
  TWEAKS.edgeColor2 = edgeColor2.hexString
  TWEAKS.particleColor = particleColor.hexString
  TWEAKS.object = mesh
  TWEAKS.freq = dissolveUniformData.uFreq.value
  TWEAKS.amp = dissolveUniformData.uAmp.value
  TWEAKS.progress = dissolveUniformData.uProgress.value
  TWEAKS.edge = dissolveUniformData.uEdge.value
  TWEAKS.autoprogress = false
  TWEAKS.bloomStrength = 12.0
  TWEAKS.speed = 1.5

  meshBlade = createTweakList('Mesh', keyArr, meshArr)
  let colorFolder = dissolve.pane.addFolder({ title: 'Color' })
  let effectFolder = dissolve.pane.addFolder({ title: 'Dissolve Effect' })
  let animation = dissolve.pane.addFolder({ title: 'Animation' })
  let BloomFolder = dissolve.pane.addFolder({ title: 'Bloom Effect' })

  const meshColorBinding = colorFolder.addBinding(TWEAKS, 'meshColor', { label: 'Mesh' })
  const edge1ColorBinding = colorFolder.addBinding(TWEAKS, 'edgeColor', { label: 'Edge' })
  //const edge2ColorBinding = dissolve.pane.addBinding(TWEAKS, "edgeColor2")
  const particleColorBinding = colorFolder.addBinding(TWEAKS, 'particleColor', {
    label: 'Particle'
  })
  const frequencyBinding = effectFolder.addBinding(TWEAKS, 'freq', { min: 0, max: 5, step: 0.001 })
  //const amplitudeBinding = dissolve.pane.addBinding(TWEAKS, "amp", { min: 12, max: 25, step: 0.001 })
  autoProgressBinding = animation.addBinding(TWEAKS, 'autoprogress', { label: 'Auto' })
  progressBinding = animation.addBinding(TWEAKS, 'progress', {
    min: -20,
    max: 20,
    step: 0.001,
    label: 'Progress'
  })
  const edgeBinding = effectFolder.addBinding(TWEAKS, 'edge', { min: 0, max: 5, step: 0.0001 })
  const bloomStrengthBinding = BloomFolder.addBinding(TWEAKS, 'bloomStrength', {
    min: 0,
    max: 20,
    step: 0.01,
    label: 'Strength'
  })
  speedBinding = animation.addBinding(TWEAKS, 'speed', {
    min: 0.15,
    max: 3,
    step: 0.001,
    label: 'Speed',
    disabled: true
  })

  //@ts-ignore
  meshBlade.on('change', (val: any) => {
    handleMeshChange(val.value)
  })
  meshColorBinding.on('change', (val: any) => {
    handleMeshColorUpdate(val.value)
  })
  edge1ColorBinding.on('change', (val: any) => {
    handleEdge1ColorUpdate(val.value)
  })
  //edge2ColorBinding.on('change', (val:any) => { handleEdge2ColorUpdate(val.value) });
  particleColorBinding.on('change', (val: any) => {
    handleParticleColorUpdate(val.value)
  })
  frequencyBinding.on('change', (val: any) => {
    dissolveUniformData.uFreq.value = val.value
  })
  //amplitudeBinding.on('change', (val:any) => { dissolveUniformData.uAmp.value = val.value });
  progressBinding.on('change', (val: any) => {
    dissolveUniformData.uProgress.value = val.value as number
  })
  edgeBinding.on('change', (val: any) => {
    dissolveUniformData.uEdge.value = val.value
  })
  //@ts-ignore
  autoProgressBinding.on('change', (val: any) => {
    setAutoProgress(val.value)
    updateAnimationTweaks(val.value)
  })
  bloomStrengthBinding.on('change', (val: any) => {
    shaderPass.uniforms.uStrength.value = val.value
  })
  speedBinding.on('change', (val: any) => {
    TWEAKS.speed = val.value
  })
}
