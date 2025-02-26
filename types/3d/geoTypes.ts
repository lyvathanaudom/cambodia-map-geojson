/**
 * geoTypes.ts
 * 
 * Provides basic GeoJSON-related type definitions
 * that can be used to ensure consistent handling
 * of geographic data (features, geometries, etc.).
 */

/**
 * A minimal GeoJSON Feature interface. Expand as needed for your project.
 */
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: Record<string, any>;
}

/**
 * Geometry can be "Polygon", "MultiPolygon", etc.
 */
export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString';
  coordinates: any[]; // For simplicity, we'll allow any[] here; refine if needed
}

/**
 * A simple GeoJSON FeatureCollection structure.
 */
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}