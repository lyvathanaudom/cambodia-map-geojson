// utils/geoHelpers.ts
import { zoomIdentity, type ZoomTransform } from 'd3-zoom'
import type { GeoJSONFeature } from '~/types/geojson'

export const calculateFeatureTransform = (
  feature: GeoJSONFeature,
  geoGenerator: any, 
  width: number,
  height: number
): ZoomTransform => {
  const bounds = geoGenerator.bounds(feature)
  const dx = bounds[1][0] - bounds[0][0]
  const dy = bounds[1][1] - bounds[0][1]
  const x = (bounds[0][0] + bounds[1][0]) / 2
  const y = (bounds[0][1] + bounds[1][1]) / 2
  const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)))
  const translate = [width / 2 - scale * x, height / 2 - scale * y]
  return zoomIdentity.translate(translate[0], translate[1]).scale(scale)
}