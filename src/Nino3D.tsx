import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type NinoMood = 'presente' | 'curioso' | 'animado' | 'pensando' | 'cochilando' | 'concentrado' | 'confuso' | 'acolhedor' | 'orgulhoso'
type LookOffset = { x: number; y: number }

type Nino3DProps = {
  mood: NinoMood
  look: LookOffset | null
  speaking: boolean
  speechBeat: number
  fallback: ReactNode
}

type Runtime = {
  mixer: THREE.AnimationMixer
  clips: Map<string, THREE.AnimationClip>
  model: THREE.Group
  mouth: MorphMesh | null
  eyeLeft: MorphMesh | null
  eyeRight: MorphMesh | null
  eyelidLeft: THREE.Mesh | null
  eyelidRight: THREE.Mesh | null
  sleeping: boolean
  eyeSquint: { left: number; right: number }
}

type MorphMesh = THREE.Mesh & {
  morphTargetDictionary?: Record<string, number>
  morphTargetInfluences?: number[]
}

type Speech = {
  startsAt: number
  endsAt: number
}

const modelMood: Record<NinoMood, string> = {
  presente: 'presente',
  curioso: 'curioso',
  animado: 'eureka',
  pensando: 'pensando',
  cochilando: 'cochilando',
  concentrado: 'concentrado',
  confuso: 'confuso',
  acolhedor: 'acolhedor',
  orgulhoso: 'orgulhoso',
}

const eyeSquintByMood: Record<NinoMood, { left: number; right: number }> = {
  presente: { left: 0, right: 0 },
  curioso: { left: 0.08, right: 0.28 },
  animado: { left: 0.64, right: 0.64 },
  pensando: { left: 0.12, right: 0 },
  cochilando: { left: 0, right: 0 },
  concentrado: { left: 0.5, right: 0.5 },
  confuso: { left: 0.1, right: 0.36 },
  acolhedor: { left: 0.3, right: 0.3 },
  orgulhoso: { left: 0.2, right: 0.2 },
}

function setNodeScale(model: THREE.Object3D, name: string, visible: boolean) {
  const node = model.getObjectByName(name)
  if (node) node.scale.setScalar(visible ? 1 : 0.001)
}

function holdAction(mixer: THREE.AnimationMixer, clip: THREE.AnimationClip) {
  const action = mixer.clipAction(clip)
  action.reset()
  action.enabled = true
  action.setEffectiveWeight(1)
  action.setLoop(THREE.LoopOnce, 1)
  action.clampWhenFinished = true
  action.play()
  action.time = clip.duration * 0.5
  action.paused = true
}

function animateSpeech(mouth: MorphMesh | null, speech: Speech | null, now: number) {
  if (!mouth?.morphTargetDictionary || !mouth.morphTargetInfluences || !speech) return
  if (now < speech.startsAt || now >= speech.endsAt) return

  const dictionary = mouth.morphTargetDictionary
  const influences = mouth.morphTargetInfluences
  const sequence = ['MBP', 'A', 'E', 'L', 'O', 'MBP', 'U', 'A', 'E', 'O', 'L']
  const elapsed = Math.max(0, now - speech.startsAt)
  const syllableDuration = 112
  const scaled = elapsed / syllableDuration
  const phase = Math.floor(scaled) % sequence.length
  const pulse = Math.sin(Math.PI * (scaled - Math.floor(scaled)))
  const viseme = sequence[phase]
  const visemeIndex = dictionary[viseme]
  const jawIndex = dictionary.jaw_open
  const closedIndex = dictionary.closed

  if (visemeIndex !== undefined) influences[visemeIndex] = Math.max(influences[visemeIndex], pulse * 0.24)
  if (jawIndex !== undefined) {
    const opening = viseme === 'MBP' ? 0.012 : 0.065
    influences[jawIndex] = Math.max(influences[jawIndex], pulse * opening)
  }
  if (closedIndex !== undefined) influences[closedIndex] *= 1 - pulse * 0.28
}

function animateEye(
  eye: MorphMesh | null,
  eyelid: THREE.Mesh | null,
  side: 'L' | 'R',
  squint: number,
  sleeping: boolean,
  now: number,
) {
  if (!eye?.morphTargetDictionary || !eye.morphTargetInfluences) return
  const dictionary = eye.morphTargetDictionary
  const influences = eye.morphTargetInfluences
  const blinkIndex = dictionary[`blink_${side}`]
  const squintIndex = dictionary.squint

  // Um piscar curto a cada poucos segundos mantém o Nino vivo sem chamar atenção.
  const blinkPhase = now % 4300
  const blink = sleeping ? 1 : blinkPhase < 190 ? Math.sin((blinkPhase / 190) * Math.PI) : 0
  if (blinkIndex !== undefined) influences[blinkIndex] = blink
  if (squintIndex !== undefined) influences[squintIndex] = sleeping ? 0 : squint
  if (eyelid) {
    const lidAmount = sleeping ? 1 : blink
    eyelid.visible = lidAmount > 0.015
    eyelid.scale.y = Math.max(lidAmount, 0.001)
    eyelid.position.y = 2.14 - lidAmount * 0.06
  }
}

function createEyelid(name: string, x: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-0.43, 0)
  shape.quadraticCurveTo(0, -0.54, 0.43, 0)
  shape.lineTo(-0.43, 0)

  const material = new THREE.MeshStandardMaterial({
    color: 0xd7a23d,
    roughness: 0.72,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  const eyelid = new THREE.Mesh(new THREE.ShapeGeometry(shape, 20), material)
  eyelid.name = name
  eyelid.position.set(x, 2.14, 1.91)
  eyelid.scale.y = 0.001
  eyelid.visible = false
  eyelid.renderOrder = 8
  return eyelid
}

export function Nino3D({ mood, look, speaking, speechBeat, fallback }: Nino3DProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef<LookOffset | null>(look)
  const runtimeRef = useRef<Runtime | null>(null)
  const speechRef = useRef<Speech | null>(null)
  const baseMorphRef = useRef<number[]>([])
  const [runtime, setRuntime] = useState<Runtime | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    lookRef.current = look
  }, [look])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    host.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight(0xfff4cf, 0x203044, 2.4))
    const key = new THREE.DirectionalLight(0xffe4af, 4.2)
    key.position.set(-4, 7, 8)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x8eeeff, 2.6)
    fill.position.set(5, 3, 4)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0x9b8cff, 2.1)
    rim.position.set(0, 5, -6)
    scene.add(rim)

    let model: THREE.Group | null = null
    let frame = 0
    let disposed = false

    const resize = () => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    new GLTFLoader().load(
      '/models/nino-v6.glb',
      (gltf) => {
        if (disposed) return
        model = gltf.scene
        let mouth: MorphMesh | null = null
        let eyeLeft: MorphMesh | null = null
        let eyeRight: MorphMesh | null = null
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = false
            object.receiveShadow = false
            object.frustumCulled = false
            const candidate = object as MorphMesh
            if (candidate.morphTargetDictionary?.jaw_open !== undefined) mouth = candidate
            if (object.name === 'EyeWhite_L') eyeLeft = candidate
            if (object.name === 'EyeWhite_R') eyeRight = candidate
          }
        })

        const head = model.getObjectByName('head')
        const eyelidLeft = head ? createEyelid('Eyelid_L', -0.72) : null
        const eyelidRight = head ? createEyelid('Eyelid_R', 0.72) : null
        if (head && eyelidLeft && eyelidRight) head.add(eyelidLeft, eyelidRight)

        const bounds = new THREE.Box3().setFromObject(model)
        const size = bounds.getSize(new THREE.Vector3())
        const center = bounds.getCenter(new THREE.Vector3())
        model.position.sub(center)
        scene.add(model)

        const verticalDistance = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
        const horizontalDistance = size.x / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect)
        camera.position.set(0, size.y * 0.015, Math.max(verticalDistance, horizontalDistance) * 1.08)
        camera.lookAt(0, size.y * 0.015, 0)

        const mixer = new THREE.AnimationMixer(model)
        const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]))
        const nextRuntime = {
          mixer,
          clips,
          model,
          mouth,
          eyeLeft,
          eyeRight,
          eyelidLeft,
          eyelidRight,
          sleeping: false,
          eyeSquint: { left: 0, right: 0 },
        }
        runtimeRef.current = nextRuntime
        setRuntime(nextRuntime)
        setReady(true)
      },
      undefined,
      () => {
        if (!disposed) setFailed(true)
      },
    )

    const render = () => {
      const now = performance.now()
      const activeRuntime = runtimeRef.current
      if (activeRuntime) {
        const influences = activeRuntime.mouth?.morphTargetInfluences
        if (influences && baseMorphRef.current.length === influences.length) {
          for (let index = 0; index < influences.length; index += 1) {
            influences[index] = baseMorphRef.current[index]
          }
        }
        animateSpeech(activeRuntime.mouth, speechRef.current, now)
        animateEye(activeRuntime.eyeLeft, activeRuntime.eyelidLeft, 'L', activeRuntime.eyeSquint.left, activeRuntime.sleeping, now)
        animateEye(activeRuntime.eyeRight, activeRuntime.eyelidRight, 'R', activeRuntime.eyeSquint.right, activeRuntime.sleeping, now)
        if (speechRef.current && now >= speechRef.current.endsAt) speechRef.current = null
      }
      const gaze = lookRef.current
      if (model) {
        const targetY = THREE.MathUtils.degToRad((gaze?.x ?? 0) * 0.42)
        const targetX = THREE.MathUtils.degToRad((gaze?.y ?? 0) * -0.16)
        model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, targetY, 0.075)
        model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, targetX, 0.075)
      }
      renderer.render(scene, camera)
      frame = window.requestAnimationFrame(render)
    }
    render()

    return () => {
      disposed = true
      runtimeRef.current = null
      speechRef.current = null
      baseMorphRef.current = []
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.dispose()
      renderer.domElement.remove()
      scene.clear()
    }
  }, [])

  useEffect(() => {
    if (!runtime) return
    const slug = modelMood[mood]
    runtime.mixer.stopAllAction()

    const bodyClip = runtime.clips.get(`mood_${slug}`)
    const mouthClip = runtime.clips.get(`mood_${slug}_MouthV4`)
    if (bodyClip) holdAction(runtime.mixer, bodyClip)
    if (mouthClip) holdAction(runtime.mixer, mouthClip)

    for (const candidate of Object.values(modelMood)) {
      setNodeScale(runtime.model, `PendantIcon_${candidate}`, candidate === slug)
    }
    setNodeScale(runtime.model, 'SleepEyes_Group', slug === 'cochilando')
    setNodeScale(runtime.model, 'EyeDetailGroup_L', slug !== 'cochilando')
    setNodeScale(runtime.model, 'EyeDetailGroup_R', slug !== 'cochilando')
    const sleeping = slug === 'cochilando'
    runtime.sleeping = sleeping
    runtime.eyeSquint = eyeSquintByMood[mood]
    for (const eyeDetail of ['Iris_L', 'Iris_R', 'Pupil_L', 'Pupil_R', 'EyeGlint_L', 'EyeGlint_R']) {
      setNodeScale(runtime.model, eyeDetail, !sleeping)
    }
    runtime.mixer.update(0)
    baseMorphRef.current = runtime.mouth?.morphTargetInfluences?.slice() ?? []
  }, [mood, runtime])

  useEffect(() => {
    if (!runtime || !speaking || mood === 'cochilando') {
      speechRef.current = null
      return
    }
    speechRef.current = { startsAt: performance.now(), endsAt: Number.POSITIVE_INFINITY }
  }, [mood, runtime, speaking, speechBeat])

  return (
    <div className={`nino-3d ${ready ? 'nino-3d--ready' : ''} ${failed ? 'nino-3d--failed' : ''} ${speaking ? 'nino-3d--speaking' : ''}`}>
      <div className="nino-3d-canvas" ref={hostRef} aria-hidden={!ready} />
      <div className="nino-3d-fallback" aria-hidden={ready && !failed}>{fallback}</div>
      {!ready && !failed && <span className="nino-3d-loading">Preparando o Nino 3D…</span>}
    </div>
  )
}
