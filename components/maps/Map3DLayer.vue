<template>
  <div ref="container" class="map-container">
    <canvas ref="canvas"></canvas>
    <Button
      class="absolute top-4 left-10 z-50"
      @click="handleBackClick"
    >
      ← Back
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { gsap } from 'gsap'

const container = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls

// Groups for provinces, districts, and communes
const layers = {
  provinces: new THREE.Group(),
  districts: new THREE.Group(),
  communes: new THREE.Group()
}

// Track user selections
let selectedProvinceCode: number | null = null
let selectedDistrictCode: number | null = null
let selectedCommuneCode: number | null = null

let hoveredGroup: THREE.Group | null = null
let isTransitioning = false

// Camera/scene initialization
const initialCameraFov = 45
const initialCameraPosition = new THREE.Vector3(0, 0.1, 0)
const initialTarget = new THREE.Vector3(0, 0, 0)

// Slight altitude offset for extruded “popping up” animation
const ELEVATION_OFFSET = 0.0008

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

      const districtGroup = layers.districts.children.find(
        (d) => d.userData.DIS_CODE === selectedDistrictCode
      ) as THREE.Group

      if (districtGroup) {
        districtGroup.visible = true
        districtGroup.children.forEach(child => {
          child.visible = true
        })
        await zoomToGroup(districtGroup, 1.2) // using default settings for zooming to district level
      }
    }
    // If a district is selected (and no commune), drill up to the province level
    else if (selectedDistrictCode) {
      console.log("[Back Click] Returning from District to Province")
      selectedDistrictCode = null

      const districtPromises = Array.from(layers.districts.children).map((dg) => {
        return lowerGroup(dg as THREE.Group, 0.6, true)
      })
      await Promise.all(districtPromises)

      layers.communes.children.forEach(commune => {
        commune.visible = false
      })

      const provinceGroup = layers.provinces.children.find(
        (p) => p.userData.PRO_CODE === selectedProvinceCode
      ) as THREE.Group

      if (provinceGroup) {
        provinceGroup.visible = true
        // Hide province labels when showing districts
        provinceGroup.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            child.visible = false
          }
        })
        
        // Re-elevate all districts and their labels belonging to this province
        layers.districts.children.forEach(district => {
          if (district.userData?.PRO_CODE === selectedProvinceCode) {
            district.visible = true
            district.children.forEach(child => {
              // Show all district children including labels (Sprites)
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
        
        // For province level, use a lower angle (angleMultiplier = 0.4) for a less 3D view and normal zoom (zoomFactor = 1)
        await zoomToGroup(provinceGroup, 1.2, 0.4, 1)
      }
    }
    // When only a province is selected, return to the top-level view
    else if (selectedProvinceCode) {
      console.log("[Back Click] Returning from Province to Top Level")
      selectedProvinceCode = null
      
      const allLower = [
        ...Array.from(layers.districts.children).map(d => lowerGroup(d as THREE.Group, 0.6, true)),
        ...Array.from(layers.communes.children).map(c => lowerGroup(c as THREE.Group, 0.6, true))
      ]
      await Promise.all(allLower)

      // Hide all district labels when returning to top level
      hideDistrictLabels()
      
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
 * Added angleMultiplier and zoomFactor parameters for custom camera positioning.
 */
function zoomToGroup(featureGroup: THREE.Group, duration = 1.2, angleMultiplier = 0.6, zoomFactor = 0.6) {
  return new Promise<void>(resolve => {
    const box = new THREE.Box3().setFromObject(featureGroup)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fovInRadians = camera.fov * (Math.PI / 180)
    // Multiply the base distance by zoomFactor to adjust zoom level
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

/**
 * Province click → drill down to District.
 */
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

/**
 * Province click → drill down to District.
 */
function onProvinceClick(provinceGroup: THREE.Group) {
  if (isTransitioning) return
  const provinceCode = provinceGroup.userData.PRO_CODE
  selectedProvinceCode = provinceCode

  // Hide province labels
  hideProvinceLabels()
  
  // First ensure all district labels are hidden
  hideDistrictLabels()
  
  // Then show labels only for districts in this province
  showDistrictLabelsForProvince(provinceCode)
  
  // Elevate districts belonging to this province
  elevateLayer(layers.districts, 'PRO_CODE', provinceCode)
  
  // Use a lower angle (angleMultiplier = 0.4) for a less 3D view when viewing districts
  zoomToGroup(provinceGroup, 1.2, 0.4, 1)
}

/**
 * District click → drill down and reveal communes,
 * but do NOT allow further clicks on the commune layer.
 */
function onDistrictClick(districtGroup: THREE.Group) {
  if (isTransitioning) return
  isTransitioning = true

  const districtCode = districtGroup.userData.DIS_CODE
  selectedDistrictCode = districtCode

  // Lower all districts
  layers.districts.children.forEach(district => {
    if (district.userData?.DIS_CODE !== districtCode) {
      district.visible = false
    }
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

  // Show & elevate communes for this district
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

  hideDistrictLabels()

  // For district level, use a higher angle (angleMultiplier = 0.8) and a lower zoomFactor (0.5) for a more dramatic 3D, zoomed-in view
  zoomToGroup(districtGroup, 1.2, 0.8, 0.5).then(() => {
    setTimeout(() => {
      isTransitioning = false
    }, 100)
  })
}

/**
 * Commune click → final level.
 * We are now leaving this unused. 
 * If you ever want to allow commune clicks again, re-enable calls to onCommuneClick.
 */
function onCommuneClick(communeGroup: THREE.Group) {
  if (isTransitioning) return
  isTransitioning = true

  const communeCode = communeGroup.userData.COM_CODE
  selectedCommuneCode = communeCode

  // Lower all districts to emphasize the commune
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
      // Hide other communes
      comm.visible = false
      comm.children.forEach(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          gsap.killTweensOf(child.position)
          gsap.to(child.position, {
            y: 0,
            duration: 0.6,
            ease: 'power2.out'
          })
        }
      })
    }
  })

  hideCommuneLabels()

  zoomToGroup(communeGroup).then(() => {
    setTimeout(() => {
      isTransitioning = false
    }, 100)
  })
}

/**
 * Canvas click →
 * For this one-fix scenario, we remove the block that handles commune clicks,
 * so that the final drill-down stops at district.
 */
function onCanvasClick(e: MouseEvent) {
  if (!canvas.value || isTransitioning) return

  const rect = canvas.value.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  // If no province selected, the click is for a province
  if (!selectedProvinceCode) {
    const hits = raycaster.intersectObjects(
      layers.provinces.children.flatMap(p => p.children.filter(c => c instanceof THREE.Mesh)),
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

  // If province is selected but no district, the click is for a district
  if (selectedProvinceCode && !selectedDistrictCode) {
    const hits = raycaster.intersectObjects(
      layers.districts.children.flatMap(d => d.children.filter(c => c instanceof THREE.Mesh)),
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

  // Everything after district is intentionally disabled to prevent commune clicks.
  // If you want to allow commune clicks again, reintroduce the block below:
  //
  // if (selectedProvinceCode && selectedDistrictCode && !selectedCommuneCode) {
  //   const hits = raycaster.intersectObjects(
  //     layers.communes.children.flatMap(co => co.children.filter(c => c instanceof THREE.Mesh)),
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
 * Hover detection → highlights area under mouse if relevant.
 * We still allow district hovers, but not commune hovers.
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
      layers.provinces.children.flatMap(f => f.children.filter(c => c instanceof THREE.Mesh)),
      false
    )
    handleHoverChange(hits)
    return
  }

  // If province selected but no district selected, highlight districts
  if (selectedProvinceCode && !selectedDistrictCode) {
    const hits = raycaster.intersectObjects(
      layers.districts.children.flatMap(f => f.children.filter(c => c instanceof THREE.Mesh)),
      false
    )
    handleHoverChange(hits)
    return
  }

  // If the user is at the district level (or beyond), we won't highlight communes
  if (hoveredGroup) {
    updateHighlight(hoveredGroup, false)
    hoveredGroup = null
  }
}

/**
 * Managing hover highlight.
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

/** 
 * Clear highlight if mouse leaves canvas.
 */
function onCanvasOut() {
  if (hoveredGroup) {
    updateHighlight(hoveredGroup, false)
    hoveredGroup = null
  }
}

/**
 * Toggle emissive color for highlight effect.
 */
function updateHighlight(group: THREE.Group, highlight: boolean) {
  group.children.forEach(child => {
    if (child instanceof THREE.Mesh && 'emissive' in child.material) {
      const mat = child.material as THREE.MeshPhongMaterial
      mat.emissive.set(highlight ? 0x333333 : 0x000000)
    }
  })
}

/**
 * Hide all province labels.
 */
function hideProvinceLabels() {
  layers.provinces.children.forEach(prov => {
    prov.children.forEach(child => {
      if (child instanceof THREE.Sprite) {
        child.visible = false
      }
    })
  })
}

/**
 * Hide all district labels.
 */
function hideDistrictLabels() {
  layers.districts.children.forEach(dist => {
    dist.children.forEach(child => {
      if (child instanceof THREE.Sprite) {
        child.visible = false
      }
    })
  })
}

/**
 * Hide all commune labels.
 */
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

/**
 * Basic Three.js initialization.
 */
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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(50, 50, 50)
  scene.add(directionalLight)

  // OrbitControls now allow rotation and panning for a freer navigation experience.
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enableRotate = true
  controls.enablePan = true
  controls.minDistance = 0.001
  controls.maxDistance = 1.0

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
 */
function createGeometry(coords: number[][], depth: number) {
  const shape = coordsToShape(coords)
  const extrudeSettings = {
    steps: 1,
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0001,
    bevelSize: 0.0001,
    bevelSegments: 2
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
 * Load a GeoJSON, extrude, add to scene group.
 */
async function loadLayer(
  url: string,
  layerGroup: THREE.Group,
  color: THREE.Color,
  depth: number,
  showLabels = true
) {
  try {
    const resp = await fetch(url)
    const data = await resp.json()

    data.features.forEach((feature: any) => {
      const label = feature.properties.HRName || feature.properties.DName || feature.properties.CName || 'N/A'
      const material = new THREE.MeshPhongMaterial({ color, flatShading: true })
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

      // Optional labeling.
      if (showLabels) {
        const bbox = new THREE.Box3().setFromObject(group)
        const center = bbox.getCenter(new THREE.Vector3())
        
        // Set label sizes:
        // - Communes: 10px
        // - Districts: 20px (smaller than province)
        // - Provinces: 24px
        const fontSize = layerGroup === layers.communes
          ? 10
          : layerGroup === layers.districts
          ? 20
          : 24
          
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
 * Elevate (show + animate) the subset of features matching userData[key]=value in layerGroup.
 * Everything else is hidden/lowered.
 */
function elevateLayer(layerGroup: THREE.Group, key: string, value: number) {
  // First lower everything
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

  // Show & raise only the matching features
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

/**
 * Lifecycle: mount → init scene, load layers, start animation, add listeners.
 */
onMounted(async () => {
  initThreeJS()
  await loadLayers()
  animate()

  window.addEventListener('resize', onWindowResize)
  canvas.value?.addEventListener('click', onCanvasClick)
  canvas.value?.addEventListener('mousemove', onCanvasMove)
  canvas.value?.addEventListener('mouseout', onCanvasOut)
})

/**
 * Cleanup on unmount (remove listeners, dispose controls).
 */
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