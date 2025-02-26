/**
 * geoUtils.ts
 *
 * Provides functions for geographic calculations and coordinate conversions.
 */

/**
 * Convert from Web Mercator to WGS84 (approx).
 * @param x - Web Mercator X coordinate
 * @param y - Web Mercator Y coordinate
 * @returns Tuple [longitude, latitude]
 */
export function webMercatorToWGS84(x: number, y: number): [number, number] {
  const lon = (x / 6378137) * (180 / Math.PI);
  const lat = (Math.atan(Math.exp(y / 6378137)) * (360 / Math.PI)) - 90;
  return [lon, lat];
}