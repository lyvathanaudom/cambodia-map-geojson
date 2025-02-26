/**
 * layerConfig.ts
 *
 * Contains configuration details related to different layers,
 * such as GeoJSON endpoints, base styling, and extrude depths.
 */

/**
 * Endpoints used for loading each administrative layer.
 */
export const LAYER_ENDPOINTS = {
  province: '/province.geojson',
  district: '/district.geojson',
  commune: '/commune.geojson'
};

/**
 * Default extrude depth for each layer if needed.
 * Tweak these values to control how "thick" your
 * provinces, districts, and communes appear.
 */
export const LAYER_DEPTH = {
  province: 0.002,
  district: 0.002,
  commune: 0.002
};

/**
 * Labeling options for each layer.
 * For instance, you might set 'showLabels' to false for
 * performance reasons or hide them until user interaction.
 */
export const LAYER_LABEL_OPTIONS = {
  province: {
    showLabels: true,
    fontSize: 24
  },
  district: {
    showLabels: true,
    fontSize: 20
  },
  commune: {
    showLabels: true,
    fontSize: 10
  }
};