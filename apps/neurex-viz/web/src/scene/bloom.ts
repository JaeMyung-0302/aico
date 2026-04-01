import { WebGLRenderer, Scene, PerspectiveCamera } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Vector2 } from 'three'

export const createBloomComposer = (
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
) => {
  const composer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const bloomPass = new UnrealBloomPass(
    new Vector2(window.innerWidth, window.innerHeight),
    0.8,  // strength
    0.5,  // radius
    0.3,  // threshold
  )
  composer.addPass(bloomPass)

  return { composer, bloomPass }
}
