import { ref } from 'vue'
import { zoomIdentity, type ZoomTransform } from 'd3-zoom'
import type { GeoJSON, GeoJSONFeature } from '~/types/geojson'

export function useMapInteractions(
  geoGenerator: any,
  width: number,
  height: number,
  zoomTo: (transform: ZoomTransform) => void
) {
  const currentLevel = ref<'province' | 'district' | 'commune'>('province')
  
  // Selected features and names
  const selectedProvinceFeature = ref<GeoJSONFeature | null>(null)
  const selectedDistrictFeature = ref<GeoJSONFeature | null>(null)
  const selectedProvinceName = ref<string>('')
  const selectedDistrictName = ref<string>('')

  // Zoom transforms with enhanced scaling
  const provinceTransform = ref<ZoomTransform>(zoomIdentity)
  const districtTransform = ref<ZoomTransform>(zoomIdentity)
  
  // Filtered data
  const districtGeoData = ref<GeoJSON | null>(null)
  const communeGeoData = ref<GeoJSON | null>(null)

  // Enhanced transform calculation with padding
  const calculateEnhancedTransform = (
    feature: GeoJSONFeature,
    level: 'province' | 'district'
  ): ZoomTransform => {
    const bounds = geoGenerator.bounds(feature)
    const dx = bounds[1][0] - bounds[0][0]
    const dy = bounds[1][1] - bounds[0][1]
    const x = (bounds[0][0] + bounds[1][0]) / 2
    const y = (bounds[0][1] + bounds[1][1]) / 2

    const padding = level === 'province' ? 0.8 : 0.7
    
    const minScale = level === 'province' ? 1.5 : 2.5
    const scale = Math.max(
      minScale,
      Math.min(12, padding / Math.max(dx / width, dy / height))
    )

    const translate = [width / 2 - scale * x, height / 2 - scale * y]
    return zoomIdentity.translate(translate[0], translate[1]).scale(scale)
  }

  const handleProvinceClick = (
    feature: GeoJSONFeature,
    districtGeoDataRaw: GeoJSON | null
  ) => {
    selectedProvinceFeature.value = feature
    selectedProvinceName.value = 
      feature.properties.HRName || 
      feature.properties.name || 
      feature.properties.province || 
      'Unknown'
    
    provinceTransform.value = calculateEnhancedTransform(feature, 'province')
    zoomTo(provinceTransform.value)
    
    if (districtGeoDataRaw) {
      const provinceCode = feature.properties.PRO_CODE
      districtGeoData.value = {
        type: "FeatureCollection",
        features: districtGeoDataRaw.features.filter(
          (f: GeoJSONFeature) => f.properties.PRO_CODE === provinceCode
        )
      }
    }
    
    currentLevel.value = 'district'
  }

  const handleDistrictClick = (
    feature: GeoJSONFeature,
    communeGeoDataRaw: GeoJSON | null
  ) => {
    selectedDistrictFeature.value = feature
    selectedDistrictName.value = feature.properties.DIS_NAME || ''
    
    districtTransform.value = calculateEnhancedTransform(feature, 'district')
    zoomTo(districtTransform.value)
    
    if (communeGeoDataRaw) {
      const districtCode = feature.properties.DIS_CODE
      communeGeoData.value = {
        type: "FeatureCollection",
        features: communeGeoDataRaw.features.filter(
          (f: GeoJSONFeature) => f.properties.DIS_CODE === districtCode
        )
      }
    }
    
    currentLevel.value = 'commune'
  }

  const goBack = (
    setInfoText: (text: string) => void
  ) => {
    if (currentLevel.value === 'commune') {
      zoomTo(provinceTransform.value)
      communeGeoData.value = null
      selectedDistrictFeature.value = null
      selectedDistrictName.value = ''
      currentLevel.value = 'district'
      setInfoText(selectedProvinceName.value)
    } else if (currentLevel.value === 'district') {
      setTimeout(() => {
        zoomTo(zoomIdentity)
        selectedProvinceFeature.value = null
        selectedProvinceName.value = ''
        districtGeoData.value = null
        communeGeoData.value = null
        currentLevel.value = 'province'
        setInfoText('អូសម៉ៅស៍លើខេត្ត')
      }, 100)
    }
  }

  return {
    currentLevel,
    selectedProvinceFeature,
    selectedDistrictFeature,
    selectedProvinceName,
    selectedDistrictName,
    districtGeoData,
    communeGeoData,
    handleProvinceClick,
    handleDistrictClick,
    goBack
  }
}