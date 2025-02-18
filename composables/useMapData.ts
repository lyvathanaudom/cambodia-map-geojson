import { ref } from 'vue'
import type { GeoJSON } from '../types/geojson'

export function useMapData() {
  const provinceGeoData = ref<GeoJSON | null>(null)
  const districtGeoDataRaw = ref<GeoJSON | null>(null)
  const communeGeoDataRaw = ref<GeoJSON | null>(null)

  const initializeMapData = async (
    provinceData: GeoJSON | null,
    districtData: GeoJSON | null,
    communeData: GeoJSON | null
  ) => {
    provinceGeoData.value = provinceData
    districtGeoDataRaw.value = districtData
    communeGeoDataRaw.value = communeData
  }

  return {
    provinceGeoData,
    districtGeoDataRaw,
    communeGeoDataRaw,
    initializeMapData
  }
}