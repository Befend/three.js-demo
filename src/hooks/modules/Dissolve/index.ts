import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/Addons.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Pane } from 'tweakpane'

// 溶解类
export default class Dissolve {
  static fov = 75
  static near = 0.01
  static far = 1000
  dom: HTMLCanvasElement
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  orbitCtrls: OrbitControls
  texture!: THREE.DataTexture
  rgbeLoader: RGBELoader
  clock: THREE.Clock
  resizeHandler: (dom: any) => void
  pane: Pane

  constructor(dom: HTMLCanvasElement, resizeHandler: (dom: any) => void) {
    let w = dom.clientWidth
    let h = dom.clientHeight
    let aspect = w / h

    // create and setup the scene
    this.dom = dom
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    this.renderer.toneMapping = THREE.CineonToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    dom.appendChild(this.renderer.domElement)
    if (this?.isMobileDevice()) {
      this.renderer.setSize(dom.clientWidth * 0.7, dom.clientHeight * 0.7, false)
    } else {
      this.renderer.setSize(dom.clientWidth, dom.clientHeight, false)
    }
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.camera = new THREE.PerspectiveCamera(75, aspect, Dissolve.near, Dissolve.far)
    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()
    this.orbitCtrls = new OrbitControls(this.camera, this.dom)
    //this.orbitCtrls.enableZoom = false;
    this.rgbeLoader = new RGBELoader()
    this.pane = new Pane()
    this.resizeHandler = resizeHandler
    // attach resize handler
    this.dom.addEventListener('resize', this.windowResize)
  }

  isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  }

  // 设置贴图
  setEnvMap(url: string) {
    this.rgbeLoader.load(url, (texture: THREE.DataTexture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      this.scene.background = texture
      this.scene.environment = texture
      this.texture = texture
    })
  }

  // 更新贴图
  updateTexture() {
    this.scene.environment = this.texture
  }

  // 窗口大小变化处理
  private windowResize() {
    this.resizeHandler(this.dom)
  }
}
