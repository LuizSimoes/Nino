import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { NinoChatMood } from './ninoChat'
import { drawTesloDisplay, tesloJawAngle, tesloModelUrl, tesloSignals } from './tesloDisplay'

type Props = { mood: NinoChatMood; gaze: 'esquerda' | 'centro' | 'direita'; blinking: boolean; look: { x: number; y: number } | null; speaking: boolean; speechLevel: { current: number }; onUseNino: () => void }
type MorphMesh = THREE.Mesh & { morphTargetDictionary?: Record<string, number>; morphTargetInfluences?: number[] }

function disposeModel(model: THREE.Object3D) {
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose()
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose()
    }
  })
}

export default function Teslo3D(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const current = useRef(props)
  current.current = props
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  useEffect(() => {
    const container = host.current
    if (!container) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }) }
    catch { setStatus('failed'); return }
    let stopped = false, lost = false, frame = 0
    let model: THREE.Group | null = null
    let head: THREE.Object3D | undefined, jaw: THREE.Object3D | undefined
    let headRest = new THREE.Euler(), jawRest = new THREE.Euler()
    const lids: MorphMesh[] = []
    const brows: { node: THREE.Object3D; base: number; sign: number }[] = []
    const optics: { node: THREE.Object3D; x: number; y: number }[] = []
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .1, 40)
    camera.position.set(.25, 2.5, 8); camera.lookAt(0, 2.45, 0)
    renderer.setClearColor(0, 0); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .85
    container.append(renderer.domElement)
    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, .04)
    scene.environment = environment.texture; scene.environmentIntensity = .8; room.dispose(); pmrem.dispose()
    scene.add(new THREE.HemisphereLight('#d9efff', '#403225', 1.3))
    const key = new THREE.DirectionalLight('#fff4db', 2.2); key.position.set(-3, 5, 5); scene.add(key)
    const fill = new THREE.DirectionalLight('#9cdfff', 1); fill.position.set(3, 3, 1); scene.add(fill)
    const textures: THREE.CanvasTexture[] = []
    const displayCanvases = [document.createElement('canvas'), document.createElement('canvas')]
    for (const canvas of displayCanvases) { canvas.width = 512; canvas.height = 256 }
    const contexts = displayCanvases.map((canvas) => canvas.getContext('2d')!)
    const materials = displayCanvases.map((canvas) => {
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture)
      return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide })
    })
    let lastPaint = -1, lastRender = -1
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    function resize() {
      const width = container!.clientWidth, height = container!.clientHeight
      if (!width || !height) return
      const aspect = width / height, h = Math.max(3.95, 3.15 / aspect)
      camera.left = -h * aspect / 2; camera.right = h * aspect / 2; camera.top = h / 2; camera.bottom = -h / 2
      camera.updateProjectionMatrix(); renderer.setSize(width, height, false)
    }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    const contextLost = (event: Event) => { event.preventDefault(); lost = true; setStatus('failed') }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    new GLTFLoader().load(tesloModelUrl, (gltf) => {
      if (stopped) { disposeModel(gltf.scene); return }
      model = gltf.scene; scene.add(model)
      head = model.getObjectByName('Head_Pivot'); jaw = model.getObjectByName('Jaw_Pivot')
      if (!head || !jaw) { lost = true; setStatus('failed'); return }
      headRest = head.rotation.clone(); jawRest = jaw.rotation.clone()
      model.traverse((o) => {
        if (o.name.startsWith('Shutter_') && o instanceof THREE.Mesh) lids.push(o as MorphMesh)
        if (o.name === 'Brow_L' || o.name === 'Brow_R') brows.push({ node: o, base: o.position.y, sign: o.name === 'Brow_L' ? -1 : 1 })
        if (/^(Iris_turquesa|Lente_escura|Reflexo_lente|Detalhe_iris)/.test(o.name)) optics.push({ node: o, x: o.position.x, y: o.position.y })
      })
      // Match the curved forehead geometry in Blender, converted from Z-up to Y-up.
      const geometry = new THREE.PlaneGeometry(1.13, .36, 32, 8)
      const positions = geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getY(i) + 3.8
        const front = .76 - .12 * (x / .85) ** 2 - .035 * ((z - 3.2) / 1.1) ** 2 + .19
        positions.setXYZ(i, x, z - 2.25, front)
      }
      geometry.computeVertexNormals(); head.add(new THREE.Mesh(geometry, materials[0]))
      const chest = new THREE.Mesh(new THREE.CircleGeometry(.16, 48), materials[1])
      chest.position.set(0, 1.29, .71); model.add(chest)
      // Circle UVs use a square: prevent the wide display canvas distorting its icon.
      textures[1].repeat.set(1, 1)
      setStatus('ready')
    }, undefined, () => { if (!stopped) { lost = true; setStatus('failed') } })
    function animate(now: number) {
      if (stopped || lost) return
      frame = requestAnimationFrame(animate)
      if (document.hidden || now - lastRender < 32) return
      lastRender = now
      const p = current.current, t = reducedMotion.matches ? 0 : now / 1000
      if (head && jaw) {
        const tilt = p.mood === 'curioso' ? -.09 : p.mood === 'confuso' ? .09 : p.mood === 'pensando' ? -.045 : 0
        head.rotation.z = headRest.z + tilt
        head.rotation.x = headRest.x + (p.mood === 'cochilando' ? .08 : p.mood === 'orgulhoso' ? -.045 : 0)
        const lookX = p.look?.x ?? (p.gaze === 'direita' ? 6 : p.gaze === 'esquerda' ? -6 : 0)
        head.rotation.y = headRest.y + Math.max(-.07, Math.min(.07, lookX * .006))
        jaw.rotation.x = jawRest.x + tesloJawAngle(p.speaking, p.speechLevel.current, now, p.mood)
        for (const lid of lids) {
          const index = lid.morphTargetDictionary?.Closed
          if (index !== undefined && lid.morphTargetInfluences) lid.morphTargetInfluences[index] = p.blinking || p.mood === 'cochilando' ? 1 : p.mood === 'concentrado' ? .18 : p.mood === 'acolhedor' ? .1 : 0
        }
        for (const brow of brows) brow.node.position.y = brow.base + (p.mood === 'curioso' || p.mood === 'confuso' ? brow.sign * .025 : p.mood === 'animado' ? .03 : 0)
        for (const optic of optics) {
          optic.node.position.x = optic.x + lookX * .0015
          optic.node.position.y = optic.y - (p.look?.y ?? 0) * .0015
        }
      }
      if (now - lastPaint > 80) {
        contexts.forEach((c, i) => drawTesloDisplay(c, p.mood, t, i === 1))
        textures.forEach((texture) => { texture.needsUpdate = true }); lastPaint = now
      }
      renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(animate)
    return () => {
      stopped = true; cancelAnimationFrame(frame); observer.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      if (model) disposeModel(model)
      textures.forEach((texture) => texture.dispose()); materials.forEach((material) => material.dispose())
      environment.dispose(); renderer.dispose(); renderer.domElement.remove()
    }
  }, [])
  return <div className="teslo-avatar" role="img" aria-label={`Teslo, androide 3D: ${tesloSignals[props.mood]}`} data-state={status}>
    <div ref={host} className="teslo-canvas" aria-hidden="true" />
    {status === 'loading' && <span className="teslo-status" role="status">Preparando Teslo…</span>}
    {status === 'failed' && <div className="teslo-status" role="alert">Não consegui exibir o 3D neste navegador.<button type="button" onClick={props.onUseNino}>Usar Nino</button></div>}
  </div>
}
