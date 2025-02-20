<template>
  <div ref="container" class="map-container">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const container = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls

function initThreeJS() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  const width = container.value!.clientWidth
  const height = container.value!.clientHeight

  camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 100)
  camera.position.set(0, 0.035, 0.07)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value!,
    antialias: true
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(50, 50, 50)
  scene.add(directionalLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 0.025
  controls.maxDistance = 0.25
}

function coordsToShape(coordinates: number[][]): THREE.Shape {
  const shape = new THREE.Shape()
  
  coordinates.forEach(([x, y], index) => {
    const [lon, lat] = webMercatorToWGS84(x, y)
    const scaledX = lon * 0.015
    const scaledY = lat * 0.015
    
    if (index === 0) {
      shape.moveTo(scaledX, scaledY)
    } else {
      shape.lineTo(scaledX, scaledY)
    }
  })
  
  return shape
}

function webMercatorToWGS84(x: number, y: number): [number, number] {
  const lon = (x / 6378137) * (180 / Math.PI)
  const lat = (Math.atan(Math.exp(y / 6378137)) * (360 / Math.PI)) - 90
  return [lon, lat]
}

function createStateGeometry(coordinates: number[][]): THREE.ExtrudeGeometry {
  const shape = coordsToShape(coordinates)
  
  const extrudeSettings = {
    steps: 1,
    depth: 0.0005,
    bevelEnabled: true,
    bevelThickness: 0.0001,
    bevelSize: 0.0001,
    bevelSegments: 2
  }
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings)
}

function handleMultiPolygon(polygons: number[][][], material: THREE.Material, edgesMaterial: THREE.Material) {
  polygons.forEach(polygon => {
    const geometry = createStateGeometry(polygon[0])
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2

    const edges = new THREE.EdgesGeometry(geometry)
    const line = new THREE.LineSegments(edges, edgesMaterial)
    line.rotation.x = -Math.PI / 2
    
    scene.add(mesh)
    scene.add(line)
  })
}

async function loadStates() {
  try {
    const response = await fetch('/province.geojson')
    const data = await response.json()
    
    data.features.forEach((feature: any) => {
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0xadd8e6),
        flatShading: true
      })

      const edgesMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff
      })

      if (feature.geometry.type === 'MultiPolygon') {
        // Handle all polygons in MultiPolygon
        handleMultiPolygon(feature.geometry.coordinates, material, edgesMaterial)
      } else {
        // Handle single polygon
        const geometry = createStateGeometry(feature.geometry.coordinates[0])
        
        const mesh = new THREE.Mesh(geometry, material)
        mesh.rotation.x = -Math.PI / 2

        const edges = new THREE.EdgesGeometry(geometry)
        const line = new THREE.LineSegments(edges, edgesMaterial)
        line.rotation.x = -Math.PI / 2
        
        scene.add(mesh)
        scene.add(line)
      }
    })
    
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    scene.position.sub(center)
    
  } catch (error) {
    console.error('Error loading GeoJSON:', error)
  }
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

function onWindowResize() {
  if (!container.value) return
  
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

onMounted(async () => {
  initThreeJS()
  await loadStates()
  animate()
  
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  controls.dispose()
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>