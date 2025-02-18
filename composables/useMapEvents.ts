import type { GeoJSONFeature } from '~/types/geojson'
import { ref } from 'vue'

export function useMapEvents() {
  const infoText = ref<string>('Default info')
  
  const handleMouseover = (feature: GeoJSONFeature, defaultText: string) => {
    infoText.value = feature.properties.HRName || feature.properties.name || defaultText
  }

  const handleMouseout = (defaultText: string) => {
    infoText.value = defaultText
  }
  
  return { infoText, handleMouseover, handleMouseout }
}