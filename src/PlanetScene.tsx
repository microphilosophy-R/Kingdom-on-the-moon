import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type PlanetTexture = {
  id: string
  name: string
  path: string
}

type PlanetSceneProps = {
  texture: PlanetTexture
  compact?: boolean
  onActivate?: () => void
}

const BASE = import.meta.env.BASE_URL

export const planetTextures: PlanetTexture[] = [
  { id: 'mercury', name: '水星纹理', path: `${BASE}textures/planets/mercury.jpg` },
  { id: 'venus', name: '金星纹理', path: `${BASE}textures/planets/venus.jpg` },
  { id: 'earth', name: '地球纹理', path: `${BASE}textures/planets/earth.jpg` },
  { id: 'mars', name: '火星纹理', path: `${BASE}textures/planets/mars.jpg` },
  { id: 'moon', name: '月球纹理', path: `${BASE}textures/planets/moon.jpg` },
]

export function PlanetScene({ texture, compact = false, onActivate }: PlanetSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const onActivateRef = useRef(onActivate)

  useEffect(() => {
    onActivateRef.current = onActivate
  }, [onActivate])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0.18, compact ? 4.2 : 3.55)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const loader = new THREE.TextureLoader()
    const planetMap = loader.load(texture.path)
    planetMap.colorSpace = THREE.SRGBColorSpace
    planetMap.anisotropy = 8

    const geometry = new THREE.SphereGeometry(1, 96, 64)
    const material = new THREE.MeshStandardMaterial({
      map: planetMap,
      roughness: 0.86,
      metalness: 0.02,
    })
    const planet = new THREE.Mesh(geometry, material)
    group.add(planet)

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.025, 96, 64),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(compact ? '#d5c18c' : '#bfb07d'),
        transparent: true,
        opacity: compact ? 0.12 : 0.18,
        side: THREE.BackSide,
      }),
    )
    group.add(atmosphere)

    const starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(360)
    for (let index = 0; index < starPositions.length; index += 3) {
      starPositions[index] = (Math.random() - 0.5) * 8
      starPositions[index + 1] = (Math.random() - 0.5) * 5
      starPositions[index + 2] = -2 - Math.random() * 5
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xd8cfaf, size: 0.015, transparent: true, opacity: 0.72 }))
    scene.add(stars)

    scene.add(new THREE.AmbientLight(0x8f95a6, 1.2))
    const keyLight = new THREE.DirectionalLight(0xffdf9b, 3.2)
    keyLight.position.set(3.5, 2.8, 4)
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0x85bfff, 1.1)
    rimLight.position.set(-4, -1.2, -2)
    scene.add(rimLight)

    let width = 1
    let height = 1
    const resize = () => {
      const rect = host.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      camera.aspect = width / height

      // Ensure sphere (radius=1) always fits within the camera frustum.
      // When aspect < 1 (narrow/portrait), the horizontal FOV shrinks and
      // the sphere can overflow.  Push the camera back as needed.
      const baseZ = compact ? 4.2 : 3.55
      const halfFovVert = (42 * Math.PI) / 360
      const minZByAspect = 1 / (Math.tan(halfFovVert) * Math.min(camera.aspect, 1))
      const adjustedZ = Math.max(baseZ, minZByAspect)
      camera.position.set(0, 0.18, adjustedZ)

      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height, false)
      // Keep CSS in control of the display size so the canvas always fills
      // its container, even if a previous inline style or attribute sticks.
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    window.addEventListener('resize', resize)
    resize()

    let animationId = 0
    let dragging = false
    let moved = false
    let lastX = 0
    let lastY = 0

    const pointerDown = (event: PointerEvent) => {
      dragging = true
      moved = false
      lastX = event.clientX
      lastY = event.clientY
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const deltaX = event.clientX - lastX
      const deltaY = event.clientY - lastY
      if (Math.abs(deltaX) + Math.abs(deltaY) > 3) moved = true
      group.rotation.y += deltaX * 0.008
      group.rotation.x = THREE.MathUtils.clamp(group.rotation.x + deltaY * 0.006, -0.9, 0.9)
      lastX = event.clientX
      lastY = event.clientY
    }
    const pointerUp = (event: PointerEvent) => {
      dragging = false
      renderer.domElement.releasePointerCapture(event.pointerId)
      if (!moved) onActivateRef.current?.()
    }

    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)

    const tick = () => {
      animationId = window.requestAnimationFrame(tick)
      if (!dragging) group.rotation.y += compact ? 0.0018 : 0.0025
      stars.rotation.y += 0.00045
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      window.cancelAnimationFrame(animationId)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      host.removeChild(renderer.domElement)
      planetMap.dispose()
      material.dispose()
      geometry.dispose()
      atmosphere.geometry.dispose()
      ;(atmosphere.material as THREE.Material).dispose()
      starGeometry.dispose()
      ;(stars.material as THREE.Material).dispose()
      renderer.dispose()
    }
  }, [compact, texture.path])

  return <div className={compact ? 'planet-scene compact' : 'planet-scene'} ref={hostRef} role="button" aria-label={`查看${texture.name}`} />
}
