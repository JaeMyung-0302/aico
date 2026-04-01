import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  PointLight,
  Color,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createBloomComposer } from './bloom.ts'

export const createScene = (container: HTMLElement) => {
  const scene = new Scene()
  scene.background = new Color(0x0a0a1a)

  const camera = new PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000,
  )
  camera.position.set(0, 2, 24)

  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // Lights
  const ambient = new AmbientLight(0xffffff, 0.4)
  scene.add(ambient)

  const pointLight = new PointLight(0xffffff, 1, 100)
  pointLight.position.set(10, 10, 10)
  scene.add(pointLight)

  const backLight = new PointLight(0x4466ff, 0.5, 100)
  backLight.position.set(-10, -5, -10)
  scene.add(backLight)

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 8
  controls.maxDistance = 50

  // Bloom
  const { composer, bloomPass } = createBloomComposer(renderer, scene, camera)

  // Resize handler
  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
    composer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)

  // Toggle bloom with 'B' key
  let bloomEnabled = true
  window.addEventListener('keydown', (e) => {
    if (e.key === 'b' || e.key === 'B') {
      bloomEnabled = !bloomEnabled
      bloomPass.enabled = bloomEnabled
    }
  })

  return { scene, camera, renderer, controls, composer }
}
