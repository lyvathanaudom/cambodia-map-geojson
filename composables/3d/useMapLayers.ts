import { ref } from 'vue';
import * as THREE from 'three';
import { LAYER_ENDPOINTS, LAYER_DEPTH } from '../../consts/layerConfig';
import { createTextSprite } from '../../utils/3d/labelUtils';
import { createGeometry, handleMultiPolygon } from '../../utils/3d/threeUtils';
import type { GeoJSONFeatureCollection } from '../../types/3d/geoTypes';
import type { MapFeatureProperties } from '../../types/3d/mapTypes';

/**
 * useMapLayers
 *
 * Manages the loading and organization of provinces, districts, and communes
 * from GeoJSON endpoints. Creates extruded geometry & edges, plus optional labels.
 *
 * Usage:
 * const { provinces, districts, communes, loadAllLayers } = useMapLayers();
 * onMounted(() => loadAllLayers());
 */
export function useMapLayers() {
  const provinces = ref<THREE.Group>(new THREE.Group());
  const districts = ref<THREE.Group>(new THREE.Group());
  const communes = ref<THREE.Group>(new THREE.Group());

  /**
   * Generic loader for any layer endpoint; sets up geometry & labeling.
   */
  async function loadLayer(
    url: string,
    layerGroup: THREE.Group,
    color = 0xd84040,
    depth = 0.002,
    visible = false,
    labelFontSize = 24
  ) {
    try {
      const resp = await fetch(url);
      const data: GeoJSONFeatureCollection = await resp.json();
      const baseMaterial = new THREE.MeshPhongMaterial({ color, flatShading: true });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff });

      data.features.forEach((feature) => {
        const featureProps = feature.properties as MapFeatureProperties;
        const labelText = featureProps.HRName || featureProps.DName || featureProps.CName || 'N/A';

        let group: THREE.Group;
        if (feature.geometry.type === 'MultiPolygon') {
          group = handleMultiPolygon(feature.geometry.coordinates, baseMaterial, edgeMat, depth);
        } else {
          const geometry = createGeometry(feature.geometry.coordinates[0], depth);
          const mesh = new THREE.Mesh(geometry, baseMaterial);
          mesh.rotation.x = -Math.PI / 2;

          const edgesGeo = new THREE.EdgesGeometry(geometry);
          const edges = new THREE.LineSegments(edgesGeo, edgeMat);
          edges.rotation.x = -Math.PI / 2;

          group = new THREE.Group();
          group.add(mesh, edges);
        }

        group.userData = featureProps;
        group.visible = visible;

        // Optional labeling
        const bbox = new THREE.Box3().setFromObject(group);
        const center = bbox.getCenter(new THREE.Vector3());
        const sprite = createTextSprite(labelText, labelFontSize);
        sprite.position.copy(center);
        sprite.position.y += depth + 0.001;
        group.add(sprite);

        layerGroup.add(group);
      });
    } catch (error) {
      console.error(`Error loading layer from ${url}:`, error);
    }
  }

  /**
   * Load all 3 administrative levels:
   * - provinces
   * - districts
   * - communes
   */
  async function loadAllLayers() {
    await loadLayer(LAYER_ENDPOINTS.province, provinces.value, 0xd84040, LAYER_DEPTH.province, true, 24);
    await loadLayer(LAYER_ENDPOINTS.district, districts.value, 0xd84040, LAYER_DEPTH.district, false, 20);
    await loadLayer(LAYER_ENDPOINTS.commune, communes.value, 0xd84040, LAYER_DEPTH.commune, false, 10);
  }

  return {
    provinces,
    districts,
    communes,
    loadAllLayers
  };
}