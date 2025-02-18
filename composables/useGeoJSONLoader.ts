import { ref } from 'vue'
import { json } from 'd3-fetch'
import { convertGeoJSON } from '~/utils/projectionUtils'
import type { GeoJSON } from '~/types/geojson'


// Constants for performance tuning
const CHUNK_SIZE = 500
const LARGE_DATASET_THRESHOLD = 1000
const CACHE_MAX_AGE = 1000 * 60 * 30 // 30 minutes

interface CacheEntry {
  data: GeoJSON
  timestamp: number
}
function processInChunks<T>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => void
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0
    
    function processNextChunk() {
      const chunk = items.slice(index, index + chunkSize)
      if (chunk.length === 0) {
        resolve()
        return
      }
      
      processor(chunk)
      index += chunkSize
      
      requestAnimationFrame(processNextChunk)
    }
    
    processNextChunk()
  })
}
// load
export function useGeoJSONLoader() {
  const provinceData = ref<GeoJSON | null>(null)
  const districtData = ref<GeoJSON | null>(null)
  const communeData = ref<GeoJSON | null>(null)
  const loading = ref(false)
  const progress = ref(0)

  const cache = new Map<string, CacheEntry>()
  async function convertGeoJSONWithProgress(data: GeoJSON): Promise<GeoJSON> {
    const convertedFeatures: any[] = []
    const totalFeatures = data.features.length
    
    await processInChunks(
      data.features,
      CHUNK_SIZE,
      (chunk) => {
        const converted = convertGeoJSON({
          ...data,
          features: chunk
        })
        convertedFeatures.push(...converted.features)
        progress.value = (convertedFeatures.length / totalFeatures) * 100
      }
    )

    return {
      ...data,
      features: convertedFeatures
    }
  }

  const fetchWithCache = async (url: string): Promise<GeoJSON | null> => {
    const now = Date.now()
    const cached = cache.get(url)

    if (cached && (now - cached.timestamp) < CACHE_MAX_AGE) {
      return cached.data
    }

    try {
      const data = await json<GeoJSON>(url)
      if (!data) return null

      let convertedData: GeoJSON

      if (data.features.length > LARGE_DATASET_THRESHOLD) {
        convertedData = await convertGeoJSONWithProgress(data)
      } else {
        convertedData = convertGeoJSON(data)
      }

      cache.set(url, {
        data: convertedData,
        timestamp: now
      })

      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > CACHE_MAX_AGE) {
          cache.delete(key)
        }
      }

      return convertedData
    } catch (err) {
      console.error(`Error loading ${url}:`, err)
      return null
    }
  }

  const loadGeoJSON = async () => {
    loading.value = true
    progress.value = 0

    try {
 
      provinceData.value = await fetchWithCache('/province.geojson')
      
     
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const [district, commune] = await Promise.all([
        fetchWithCache('/district.geojson'),
        fetchWithCache('/commune.geojson')
      ])
      
      districtData.value = district
      communeData.value = commune
    } catch (err) {
      console.error('Unhandled error loading GeoJSON files:', err)
    } finally {
      loading.value = false
      progress.value = 100
    }
  }

  return {
    provinceData,
    districtData,
    communeData,
    loading,
    progress,
    loadGeoJSON
  }
}