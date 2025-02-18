// utils/projectionUtils.ts
import proj4 from 'proj4';
import type { GeoJSON, GeoJSONFeature } from '../types/geojson';

export function reprojectCoordinates(coords: any): any {
  if (typeof coords[0] === 'number') {
    return proj4(
      '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs',
      'EPSG:4326',
      coords
    );
  }
  return coords.map((c: any) => reprojectCoordinates(c));
}

export function convertGeoJSON(geojson: GeoJSON): GeoJSON {
  const crsName = geojson.crs?.properties?.name || '';
  if (crsName.indexOf('EPSG::32648') !== -1) {
    geojson.features.forEach(feature => {
      if (feature.geometry && feature.geometry.coordinates) {
        feature.geometry.coordinates = reprojectCoordinates(feature.geometry.coordinates);
      }
    });
    geojson.crs = { 
      type: 'name', 
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } 
    };
  }
  return geojson;
}