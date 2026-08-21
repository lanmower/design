import * as THREE from 'https://esm.sh/three@r128'
import { GLTFLoader } from 'https://esm.sh/three@r128/examples/jsm/loaders/GLTFLoader.js'

export class ModelPreview {
  constructor(container, opts = {}) {
    this.container = container
    this.model = opts.model || null
    this.modelPath = opts.modelPath || null
    this.size = opts.size || { width: 512, height: 512 }
    this.autoRotate = opts.autoRotate !== false
    this.showWireframe = opts.showWireframe || false
    this.showCollider = opts.showCollider || false
    this.backgroundColor = opts.backgroundColor || 0x1a1a1a
    this.cameraDistance = opts.cameraDistance || 5

    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.model = null
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.animationId = null
    this.dragging = false
    this.previousMousePosition = { x: 0, y: 0 }

    this._init()
  }

  _init() {
    this.container.style.cssText = 'position:relative;width:100%;height:100%;background:var(--bg-2);overflow:hidden'

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(this.backgroundColor)

    const width = this.container.clientWidth || this.size.width
    const height = this.container.clientHeight || this.size.height

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    this.camera.position.set(this.cameraDistance, this.cameraDistance * 0.6, this.cameraDistance)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    this.container.appendChild(this.renderer.domElement)

    this._setupLighting()
    this._setupControls()
    this._setupUI()
    this._animate()
  }

  _setupLighting() {
    const keyLight = new THREE.DirectionalLight(0xffffff, 1)
    keyLight.position.set(5, 8, 5)
    keyLight.castShadow = false
    this.scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(-5, 3, -5)
    this.scene.add(fillLight)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    this.keyLight = keyLight
    this.fillLight = fillLight
  }

  _setupControls() {
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.dragging = true
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (!this.dragging || !this.model) return
      const deltaX = e.clientX - this.previousMousePosition.x
      const deltaY = e.clientY - this.previousMousePosition.y
      this.model.rotation.y += deltaX * 0.01
      this.model.rotation.x += deltaY * 0.01
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })

    this.renderer.domElement.addEventListener('mouseup', () => {
      this.dragging = false
    })

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault()
      this.camera.position.multiplyScalar(1 + e.deltaY * 0.001)
    })
  }

  _setupUI() {
    const uiContainer = document.createElement('div')
    uiContainer.style.cssText = 'position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:4px;z-index:100'

    const toggleWireframe = document.createElement('button')
    toggleWireframe.textContent = 'Wireframe'
    toggleWireframe.style.cssText = 'padding:4px 8px;background:var(--accent);color:var(--accent-fg);border:none;border-radius:3px;cursor:pointer;font-size:11px'
    toggleWireframe.addEventListener('click', () => this.toggleWireframe())
    uiContainer.appendChild(toggleWireframe)

    const toggleCollider = document.createElement('button')
    toggleCollider.textContent = 'Collider'
    toggleCollider.style.cssText = 'padding:4px 8px;background:var(--accent);color:var(--accent-fg);border:none;border-radius:3px;cursor:pointer;font-size:11px;opacity:0.6'
    toggleCollider.addEventListener('click', () => this.toggleCollider())
    uiContainer.appendChild(toggleCollider)

    const toggleRotate = document.createElement('button')
    toggleRotate.textContent = 'AutoRotate'
    toggleRotate.style.cssText = 'padding:4px 8px;background:var(--accent);color:var(--accent-fg);border:none;border-radius:3px;cursor:pointer;font-size:11px'
    toggleRotate.addEventListener('click', () => this.toggleAutoRotate())
    uiContainer.appendChild(toggleRotate)

    const exportBtn = document.createElement('button')
    exportBtn.textContent = 'Export'
    exportBtn.style.cssText = 'padding:4px 8px;background:var(--accent);color:var(--accent-fg);border:none;border-radius:3px;cursor:pointer;font-size:11px'
    exportBtn.addEventListener('click', () => this.exportPreview())
    uiContainer.appendChild(exportBtn)

    this.renderer.domElement.parentNode.appendChild(uiContainer)
  }

  async loadModel(modelPath) {
    this.modelPath = modelPath
    const loader = new GLTFLoader()

    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(modelPath, resolve, undefined, reject)
      })

      if (this.model) {
        this.scene.remove(this.model)
      }

      this.model = gltf.scene
      this.scene.add(this.model)

      const box = new THREE.Box3().setFromObject(this.model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      this.model.position.sub(center)
      const fov = this.camera.fov * (Math.PI / 180)
      const cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2))
      this.camera.position.z = cameraZ * 1.5
      this.camera.lookAt(0, 0, 0)

      this.bbox = box
      this.model.castShadow = false
      this.model.receiveShadow = false

      this.model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = false
          node.receiveShadow = false
        }
      })
    } catch (err) {
      console.error('Failed to load model:', err)
    }
  }

  toggleWireframe() {
    this.showWireframe = !this.showWireframe
    if (!this.model) return
    this.model.traverse((node) => {
      if (node.isMesh && node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach(mat => { mat.wireframe = this.showWireframe })
        } else {
          node.material.wireframe = this.showWireframe
        }
      }
    })
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate
  }

  toggleCollider() {
    this.showCollider = !this.showCollider
  }

  _animate = () => {
    this.animationId = requestAnimationFrame(this._animate)

    if (this.model && this.autoRotate && !this.dragging) {
      this.model.rotation.y += 0.005
    }

    this.renderer.render(this.scene, this.camera)
  }

  exportPreview() {
    const canvas = this.renderer.domElement
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `preview-${Date.now()}.png`
    link.click()
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement)
    }
  }

  resize(width, height) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  setCameraDistance(distance) {
    this.cameraDistance = distance
    const currentDist = this.camera.position.length()
    this.camera.position.multiplyScalar(distance / currentDist)
  }

  setBackgroundColor(color) {
    this.backgroundColor = color
    this.scene.background = new THREE.Color(color)
  }

  setKeyLightIntensity(intensity) {
    this.keyLight.intensity = intensity
  }

  setFillLightIntensity(intensity) {
    this.fillLight.intensity = intensity
  }
}

export function createModelPreviewViewer(containerElement, opts = {}) {
  return new ModelPreview(containerElement, opts)
}
