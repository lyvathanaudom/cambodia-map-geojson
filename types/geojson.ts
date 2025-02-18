export interface GeoJSONFeature {
  type: string
  properties: Record<string, any>
  geometry: {
    type: string
    coordinates: any
  }
}

export interface GeoJSON {
  type: string
  features: GeoJSONFeature[]
  crs?: {
    type: string
    properties: { name: string }
  }
}

export type MapLevel = 'province' | 'district' | 'commune'
