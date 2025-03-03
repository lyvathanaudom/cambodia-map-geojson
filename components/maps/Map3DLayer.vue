<template>
  <div ref="container" class="map-container">
    <canvas ref="canvas"></canvas>
    <Button
      class="absolute top-4 left-10 z-50"
      @click="handleBackClick"
    >
      ← Back
    </Button>

    <!-- Example legend for Crime Rate (optional) -->
    <div
      class="absolute bottom-4 right-4 bg-black/70 p-4 rounded-lg text-white"
      v-if="showLegend"
    >
      <h3 class="text-sm font-bold mb-2">Crime Rate</h3>
      <div class="flex items-center flex-col gap-2">
        <div class="w-24 h-4 bg-gradient-to-r from-[#e57373] to-[#b71c1c]"></div>
        <div class="flex justify-between w-full text-xs">
          <span>{{ minValue }}</span>
          <span>{{ maxValue }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { gsap } from 'gsap'
import { numberOfProvinceCrimes } from '@/data/provinceCrimes'
import { numberOfDistrictCrimes } from '@/data/districtCrimes'
import { createColorScale } from '@/utils/colorScale'

// ------------------------------------
// Crime color scales
// ------------------------------------
const {
  colorScale: provinceColorScale,
  customInterpolator: provinceInterpolator,
  minValue,
  maxValue
} = createColorScale(numberOfProvinceCrimes)

const {
  colorScale: districtColorScale,
  customInterpolator: districtInterpolator
} = createColorScale(numberOfDistrictCrimes)

// If you'd like to show the minValue–maxValue legend, set this to true
const showLegend = true

// ------------------------------------
// Vue refs for container/canvas
// ------------------------------------
const container = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()

// ------------------------------------
// Three.js scene globals
// ------------------------------------
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls

// Groups for each administrative level
const layers = {
  provinces: new THREE.Group(),
  districts: new THREE.Group(),
  communes: new THREE.Group()
}

// Track user selections for the three levels
let selectedProvinceCode: number | null = null
let selectedDistrictCode: number | null = null
let selectedCommuneCode: number | null = null

// Track hovered object for highlighting
let hoveredGroup: THREE.Group | null = null
let isTransitioning = false

// Camera & scene settings
const initialCameraFov = 45
const initialCameraPosition = new THREE.Vector3(0, 0.1, 0)
const initialTarget = new THREE.Vector3(0, 0, 0)

// Slight altitude offset for extruded “popping up” animation
const ELEVATION_OFFSET = 0.0008

// ------------------------------------
// "Back" button logic
// ------------------------------------
async function handleBackClick() {
  if (isTransitioning) return
  isTransitioning = true

  try {
    // If a commune is currently selected, drill up to the district level
    if (selectedCommuneCode) {
      selectedCommuneCode = null

      const communePromises = Array.from(layers.communes.children).map((cg) => {
        return lowerGroup(cg as THREE.Group, 0.6, true)
      })
      await Promise.all(communePromises)

      // Show the district again
      const districtGroup = layers.districts.children.find(
        (d) => d.userData.DIS_CODE === selectedDistrictCode
      ) as THREE.Group

      if (districtGroup) {
        districtGroup.visible = true
        districtGroup.children.forEach(child => {
          child.visible = true
        })
        await zoomToGroup(districtGroup, 1.2)
      }
    }
    // If a district is selected (and no commune), drill up to the province level
    else if (selectedDistrictCode) {
      selectedDistrictCode = null

      // Lower all districts
      const districtPromises = Array.from(layers.districts.children).map((dg) => {
        return lowerGroup(dg as THREE.Group, 0.6, true)
      })
      await Promise.all(districtPromises)

      // Hide all communes
      layers.communes.children.forEach(commune => {
        commune.visible = false
      })

      const provinceGroup = layers.provinces.children.find(
        (p) => p.userData.PRO_CODE === selectedProvinceCode
      ) as THREE.Group

      if (provinceGroup) {
        provinceGroup.visible = true

        // Show all districts for this province
        layers.districts.children.forEach(district => {
          if (district.userData?.PRO_CODE === selectedProvinceCode) {
            district.visible = true
            district.children.forEach(child => {
              child.visible = true
              if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
                gsap.killTweensOf(child.position)
                gsap.to(child.position, {
                  y: ELEVATION_OFFSET,
                  duration: 1.2,
                  ease: 'power2.inOut'
                })
              }
            })
          }
        })

        // Show district labels for this province
        showDistrictLabelsForProvince(selectedProvinceCode)

        await zoomToGroup(provinceGroup, 1.2, 0.4, 1)
      }
    }
    // When only a province is selected, return to the top-level view
    else if (selectedProvinceCode) {
      selectedProvinceCode = null

      // Lower all districts and communes
      const allLower = [
        ...Array.from(layers.districts.children).map(d => lowerGroup(d as THREE.Group, 0.6, true)),
        ...Array.from(layers.communes.children).map(c => lowerGroup(c as THREE.Group, 0.6, true))
      ]
      await Promise.all(allLower)

      showAllProvinces()
      await resetCamera()
    }
  } catch (err) {
    console.error('Error in handleBackClick:', err)
  } finally {
    isTransitioning = false
  }
}

/**
 * Lower a feature group’s position to y=0 with an animation, then optionally hide it.
 */
function lowerGroup(group: THREE.Group, duration = 0.6, hideAfter = false) {
  return new Promise<void>((resolve) => {
    const meshes = group.children.filter(
      child => child instanceof THREE.Mesh || child instanceof THREE.LineSegments
    )
    if (meshes.length === 0) {
      if (hideAfter) group.visible = false
      resolve()
      return
    }

    let completed = 0
    meshes.forEach((mesh) => {
      gsap.killTweensOf(mesh.position)
      gsap.to(mesh.position, {
        y: 0,
        duration,
        ease: 'power2.out',
        onComplete: () => {
          completed++
          if (completed === meshes.length) {
            if (hideAfter) group.visible = false
            resolve()
          }
        }
      })
    })
  })
}

/**
 * Resets camera to the initial position/FOV to show all provinces.
 */
function resetCamera(duration = 1.2) {
  return Promise.all([
    new Promise<void>(resolve => {
      gsap.killTweensOf(camera)
      gsap.to(camera, {
        duration,
        fov: initialCameraFov,
        onUpdate: () => camera.updateProjectionMatrix(),
        onComplete: resolve
      })
    }),
    new Promise<void>(resolve => {
      gsap.killTweensOf(camera.position)
      gsap.to(camera.position, {
        duration,
        x: initialCameraPosition.x,
        y: initialCameraPosition.y,
        z: initialCameraPosition.z,
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.lookAt(initialTarget)
          controls.target.copy(initialTarget)
          controls.update()
        },
        onComplete: resolve
      })
    })
  ])
}

/**
 * Makes all provinces (and their labels) visible.
 */
function showAllProvinces() {
  layers.provinces.children.forEach(province => {
    province.visible = true
    province.children.forEach(child => {
      if (child instanceof THREE.Sprite) {
        child.visible = true
      }
    })
  })
}

/**
 * Smooth camera movement to focus on a feature group.
 */
function zoomToGroup(featureGroup: THREE.Group, duration = 1.2, angleMultiplier = 0.6, zoomFactor = 0.6) {
  return new Promise<void>(resolve => {
    const box = new THREE.Box3().setFromObject(featureGroup)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fovInRadians = camera.fov * (Math.PI / 180)
    const baseDistance = Math.abs(maxDim / Math.sin(fovInRadians / 2)) * zoomFactor

    const targetY = center.y + baseDistance * angleMultiplier
    const targetZ = center.z + baseDistance * angleMultiplier

    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(camera)
    gsap.to(camera.position, {
      duration,
      x: center.x,
      y: targetY,
      z: targetZ,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(center)
        controls.target.copy(center)
        controls.update()
      },
      onComplete: resolve
    })
  })
}

// ------------------------------------
// Province → District
// ------------------------------------
function showDistrictLabelsForProvince(provinceCode: number) {
  layers.districts.children.forEach(district => {
    if (district.userData?.PRO_CODE === provinceCode) {
      district.children.forEach(child => {
        if (child instanceof THREE.Sprite) {
          child.visible = true
        }
      })
    }
  })
}

function onProvinceClick(provinceGroup: THREE.Group) {
  if (isTransitioning) return
  isTransitioning = true

  const provinceCode = provinceGroup.userData.PRO_CODE
  selectedProvinceCode = provinceCode

  hideProvinceLabels()
  hideDistrictLabels()

  // Show and elevate districts belonging to this province
  elevateLayer(layers.districts, 'PRO_CODE', provinceCode)
  showDistrictLabelsForProvince(provinceCode)

  // Zoom in
  zoomToGroup(provinceGroup, 1.2, 0.4, 1).then(() => {
    isTransitioning = false
  })
}

// ------------------------------------
// District → Communes
// ------------------------------------
function onDistrictClick(districtGroup: THREE.Group) {
  if (isTransitioning) return
  isTransitioning = true

  const districtCode = districtGroup.userData.DIS_CODE
  selectedDistrictCode = districtCode

  // Hide all district labels before elevating
  hideDistrictLabels()

  // 1) Elevate only the selected district
  elevateLayer(layers.districts, 'DIS_CODE', districtCode)

  // 2) Show & elevate communes for this district
  layers.communes.children.forEach(commune => {
    if (commune.userData?.DIS_CODE === districtCode) {
      commune.visible = true
      commune.children.forEach(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          gsap.killTweensOf(child.position)
          gsap.to(child.position, {
            y: child.position.y + ELEVATION_OFFSET,
            duration: 1.2,
            ease: 'power2.inOut'
          })
        }
      })
    } else {
      commune.visible = false
    }
  })

  zoomToGroup(districtGroup, 1.2, 0.8, 0.5).then(() => {
    isTransitioning = false
  })
}

// ------------------------------------
// Optional final level: District → Commune
// ------------------------------------
function onCommuneClick(communeGroup: THREE.Group) {
  if (isTransitioning) return
  isTransitioning = true

  const communeCode = communeGroup.userData.COM_CODE
  selectedCommuneCode = communeCode

  // Lower all districts
  layers.districts.children.forEach(district => {
    district.children.forEach(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        gsap.killTweensOf(child.position)
        gsap.to(child.position, {
          y: 0,
          duration: 0.6,
          ease: 'power2.out'
        })
      }
    })
  })

  // Show & elevate just the clicked commune
  layers.communes.children.forEach(comm => {
    if (comm.userData?.COM_CODE === communeCode) {
      comm.visible = true
      comm.children.forEach(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          gsap.killTweensOf(child.position)
          gsap.to(child.position, {
            y: child.position.y + ELEVATION_OFFSET,
            duration: 1.2,
            ease: 'power2.inOut'
          })
        }
      })
    } else {
      comm.visible = false
    }
  })

  hideCommuneLabels()
  zoomToGroup(communeGroup).then(() => {
    setTimeout(() => {
      isTransitioning = false
    }, 100)
  })
}

// ------------------------------------
// Mouse interactions: clicks & hovers
// ------------------------------------
function onCanvasClick(e: MouseEvent) {
  if (!canvas.value || isTransitioning) return

  const rect = canvas.value.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  // No province selected → check provinces
  if (!selectedProvinceCode) {
    const hits = raycaster.intersectObjects(
      layers.provinces.children.flatMap(p =>
        p.children.filter(c => c instanceof THREE.Mesh)
      ),
      false
    )
    if (hits.length) {
      const provGroup = hits[0].object.parent as THREE.Group
      if (provGroup.userData?.PRO_CODE !== undefined) {
        onProvinceClick(provGroup)
      }
    }
    return
  }

  // Province is selected, but no district → check districts
  if (selectedProvinceCode && !selectedDistrictCode) {
    const hits = raycaster.intersectObjects(
      layers.districts.children.flatMap(d =>
        d.children.filter(c => c instanceof THREE.Mesh)
      ),
      false
    )
    if (hits.length) {
      const distGroup = hits[0].object.parent as THREE.Group
      if (distGroup.userData?.DIS_CODE !== undefined) {
        onDistrictClick(distGroup)
      }
    }
    return
  }

  // Uncomment to allow clicking on communes
  // if (selectedProvinceCode && selectedDistrictCode && !selectedCommuneCode) {
  //   const hits = raycaster.intersectObjects(
  //     layers.communes.children.flatMap(co =>
  //       co.children.filter(c => c instanceof THREE.Mesh)
  //     ),
  //     false
  //   )
  //   if (hits.length) {
  //     const communeGroup = hits[0].object.parent as THREE.Group
  //     if (communeGroup.userData?.COM_CODE !== undefined) {
  //       onCommuneClick(communeGroup)
  //     }
  //   }
  //   return
  // }
}

/**
 * Hover detection → highlight area under mouse if relevant.
 */
function onCanvasMove(e: MouseEvent) {
  if (!canvas.value) return

  const rect = canvas.value.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  // If no province selected, highlight provinces
  if (!selectedProvinceCode) {
    const hits = raycaster.intersectObjects(
      layers.provinces.children.flatMap(f =>
        f.children.filter(c => c instanceof THREE.Mesh)
      ),
      false
    )
    handleHoverChange(hits)
    return
  }

  // If province is selected but no district, highlight districts
  if (selectedProvinceCode && !selectedDistrictCode) {
    const hits = raycaster.intersectObjects(
      layers.districts.children.flatMap(f =>
        f.children.filter(c => c instanceof THREE.Mesh)
      ),
      false
    )
    handleHoverChange(hits)
    return
  }

  // District or commune selected, skip extra highlight
  if (hoveredGroup) {
    updateHighlight(hoveredGroup, false)
    hoveredGroup = null
  }
}

/**
 * If mouse leaves canvas, remove highlight.
 */
function onCanvasOut() {
  if (hoveredGroup) {
    updateHighlight(hoveredGroup, false)
    hoveredGroup = null
  }
}

/**
 * Update highlight color.
 */
function handleHoverChange(hits: THREE.Intersection[]) {
  const newHover = hits.length ? (hits[0].object.parent as THREE.Group) : null
  if (newHover !== hoveredGroup) {
    if (hoveredGroup) {
      updateHighlight(hoveredGroup, false)
    }
    if (newHover) {
      updateHighlight(newHover, true)
    }
    hoveredGroup = newHover
  }
}

function updateHighlight(group: THREE.Group, highlight: boolean) {
  group.children.forEach(child => {
    if (child instanceof THREE.Mesh && 'emissive' in child.material) {
      const mat = child.material as THREE.MeshPhongMaterial
      mat.emissive.set(highlight ? 0x333333 : 0x000000)
    }
  })
}

// ------------------------------------
// Label utilities
// ------------------------------------
function hideProvinceLabels() {
  layers.provinces.children.forEach(prov => {
    prov.children.forEach(child => {
      if (child instanceof THREE.Sprite) {
        child.visible = false
      }
    })
  })
}

function hideDistrictLabels() {
  layers.districts.children.forEach(dist => {
    dist.children.forEach(child => {
      if (child instanceof THREE.Sprite) {
        child.visible = false
      }
    })
  })
}

function hideCommuneLabels() {
  layers.communes.children.forEach(comm => {
    comm.children.forEach(child => {
      if (child instanceof THREE.Sprite) {
        child.visible = false
      }
    })
  })
}

/**
 * Creates a simple text sprite for labeling features.
 */
function createTextSprite(message: string, fontSize = 24): THREE.Sprite {
  const padding = 10
  const canvasElem = document.createElement('canvas')
  const ctx = canvasElem.getContext('2d')!
  ctx.font = `${fontSize}px Arial`
  const textWidth = ctx.measureText(message).width
  canvasElem.width = textWidth + padding * 2
  canvasElem.height = fontSize + padding * 2

  ctx.font = `${fontSize}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'white'
  ctx.fillText(message, canvasElem.width / 2, canvasElem.height / 2)

  const texture = new THREE.CanvasTexture(canvasElem)
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(spriteMat)
  sprite.scale.set(canvasElem.width / 20000, canvasElem.height / 20000, 1)
  sprite.raycast = () => {}
  return sprite
}

// ------------------------------------
// Basic Three.js initialization
// ------------------------------------
function initThreeJS() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const width = container.value!.clientWidth
  const height = container.value!.clientHeight

  camera = new THREE.PerspectiveCamera(initialCameraFov, width / height, 0.001, 100)
  camera.position.copy(initialCameraPosition)
  camera.lookAt(initialTarget)

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value!, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  // Performance tip #1: limit shadow usage or disable if not necessary
  renderer.shadowMap.enabled = false

  // Simple lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(50, 50, 50)
  scene.add(directionalLight)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enableRotate = true
  controls.enablePan = true
  // Performance tip #2: tighten up minDistance and maxDistance to avoid huge scene draws
  controls.minDistance = 0.001
  controls.maxDistance = 0.7

  scene.add(layers.provinces, layers.districts, layers.communes)
}

/**
 * Load all needed layers (province, district, commune).
 */
async function loadLayers() {
  // Load each administrative level
  await loadLayer('/province.geojson', layers.provinces, new THREE.Color(0xd84040), 0.002, true)
  await loadLayer('/district.geojson', layers.districts, new THREE.Color(0xd84040), 0.002, true)
  await loadLayer('/commune.geojson', layers.communes, new THREE.Color(0xd84040), 0.002, true)

  // Center everything
  const box = new THREE.Box3().setFromObject(scene)
  const center = box.getCenter(new THREE.Vector3())
  scene.position.sub(center)
}

/**
 * Animation loop.
 */
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

/**
 * Window resize event → adapt camera & renderer.
 */
function onWindowResize() {
  if (!container.value) return
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

/**
 * If geometry is MultiPolygon, extrude each ring separately.
 */
function handleMultiPolygon(
  polygons: number[][][],
  material: THREE.Material,
  edgesMaterial: THREE.Material,
  depth: number
) {
  const group = new THREE.Group()
  polygons.forEach(polygon => {
    const geometry = createGeometry(polygon[0], depth)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2

    const edgesGeo = new THREE.EdgesGeometry(geometry)
    const edges = new THREE.LineSegments(edgesGeo, edgesMaterial)
    edges.rotation.x = -Math.PI / 2

    group.add(mesh, edges)
  })
  return group
}

/**
 * Create extruded geometry from shape coords.
 * Performance tip #3: remove beveling for large data to reduce geometry complexity.
 */
function createGeometry(coords: number[][], depth: number) {
  const shape = coordsToShape(coords)
  const extrudeSettings = {
    steps: 1,
    depth,
    bevelEnabled: false,
    bevelThickness: 0,
    bevelSize: 0,
    bevelSegments: 0
  }
  return new THREE.ExtrudeGeometry(shape, extrudeSettings)
}

/**
 * Convert raw coords to a Three.js shape, applying a custom scale.
 */
function coordsToShape(coords: number[][]) {
  const shape = new THREE.Shape()
  coords.forEach(([x, y], i) => {
    const [lon, lat] = webMercatorToWGS84(x, y)
    const scaledX = lon * 0.015
    const scaledY = lat * 0.015
    i === 0 ? shape.moveTo(scaledX, scaledY) : shape.lineTo(scaledX, scaledY)
  })
  return shape
}

/**
 * Convert from Web Mercator to WGS84 (approx).
 */
function webMercatorToWGS84(x: number, y: number): [number, number] {
  const lon = (x / 6378137) * (180 / Math.PI)
  const lat = (Math.atan(Math.exp(y / 6378137)) * (360 / Math.PI)) - 90
  return [lon, lat]
}

/**
 * Load a GeoJSON, extrude, and add to scene group. Applies color from crime data if applicable.
 */
async function loadLayer(
  url: string,
  layerGroup: THREE.Group,
  baseColor: THREE.Color,
  depth: number,
  showLabels = true
) {
  try {
    const resp = await fetch(url)
    const data = await resp.json()

    data.features.forEach((feature: any) => {
      const label = feature.properties.HRName || feature.properties.DName || feature.properties.CName || 'N/A'
      let color = baseColor

      if (layerGroup === layers.provinces) {
        const crimeCount = numberOfProvinceCrimes[label] || 0
        const t = provinceColorScale(crimeCount)
        color = new THREE.Color(provinceInterpolator(t))
      } else if (layerGroup === layers.districts) {
        const crimeCount = numberOfDistrictCrimes[label] || 0
        const t = districtColorScale(crimeCount)
        color = new THREE.Color(districtInterpolator(t))
      }

      const material = new THREE.MeshPhongMaterial({
        color,
        flatShading: true,
        transparent: true,
        opacity: 0.98
      })
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff })

      let group: THREE.Group
      if (feature.geometry.type === 'MultiPolygon') {
        group = handleMultiPolygon(feature.geometry.coordinates, material, edgeMat, depth)
      } else {
        const geometry = createGeometry(feature.geometry.coordinates[0], depth)
        const mesh = new THREE.Mesh(geometry, material)
        mesh.rotation.x = -Math.PI / 2

        const edgesGeo = new THREE.EdgesGeometry(geometry)
        const edges = new THREE.LineSegments(edgesGeo, edgeMat)
        edges.rotation.x = -Math.PI / 2

        group = new THREE.Group()
        group.add(mesh, edges)
      }

      group.userData = feature.properties

      // Hide districts & communes by default
      if (layerGroup === layers.districts || layerGroup === layers.communes) {
        group.visible = false
      }

      // Optional labeling
      if (showLabels) {
        const bbox = new THREE.Box3().setFromObject(group)
        const center = bbox.getCenter(new THREE.Vector3())
        const fontSize =
          layerGroup === layers.communes ? 10 :
          layerGroup === layers.districts ? 20 : 24

        const sprite = createTextSprite(label, fontSize)
        sprite.position.copy(center)
        sprite.position.y += depth + 0.001
        group.add(sprite)
      }

      layerGroup.add(group)
    })
  } catch (err) {
    console.error('Error loading GeoJSON:', err)
  }
}

/**
 * Elevate (show + animate) the subset of features matching `userData[key] = value` in layerGroup.
 * Everything else is hidden or lowered.
 */
function elevateLayer(layerGroup: THREE.Group, key: string, value: number) {
  // First, lower all features
  layerGroup.children.forEach(feature => {
    feature.children.forEach(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        gsap.killTweensOf(child.position)
        gsap.to(child.position, {
          y: 0,
          duration: 0.6,
          ease: 'power2.out'
        })
      }
    })
  })

  // Show & raise only matching features
  let foundMatch = false
  layerGroup.children.forEach(feature => {
    if (feature.userData && feature.userData[key] === value) {
      foundMatch = true
      feature.visible = true
      feature.children.forEach(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          gsap.killTweensOf(child.position)
          gsap.to(child.position, {
            y: ELEVATION_OFFSET,
            duration: 1.2,
            ease: 'power2.inOut'
          })
        }
      })
    } else {
      feature.visible = false
    }
  })

  if (!foundMatch) {
    console.warn(`No features found with ${key}=${value}`)
  }
}

// ------------------------------------
// Lifecycle hooks
// ------------------------------------
onMounted(async () => {
  initThreeJS()
  await loadLayers()
  animate()

  window.addEventListener('resize', onWindowResize)
  canvas.value?.addEventListener('click', onCanvasClick)
  canvas.value?.addEventListener('mousemove', onCanvasMove)
  canvas.value?.addEventListener('mouseout', onCanvasOut)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  canvas.value?.removeEventListener('click', onCanvasClick)
  canvas.value?.removeEventListener('mousemove', onCanvasMove)
  canvas.value?.removeEventListener('mouseout', onCanvasOut)
  controls.dispose()
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: black;
}

canvas {
  width: 90%;
  height: 90%;
}
</style>