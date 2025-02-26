/**
 * mapSettings.ts
 * 
 * Central file for project-wide default camera settings
 * and other general map configuration constants.
 */

/**
 * Default camera settings, used when resetting or initializing the view.
 */
export const DEFAULT_CAMERA_SETTINGS = {
  fov: 45,
  near: 0.001,
  far: 100,
  initialPosition: { x: 0, y: 0.1, z: 0 },
  initialTarget: { x: 0, y: 0, z: 0 }
};

/**
 * Default color constants (background, highlight colors, etc.)
 */
export const DEFAULT_COLORS = {
  background: 0x000000,
  highlight: 0x333333,
  meshBase: 0xd84040,
  lineEdges: 0xffffff
};

/**
 * Elevation offset used when "popping up" a layer.
 * Adjust this if you want more or less vertical extrusion
 * visible during transitions or hover highlights.
 */
export const ELEVATION_OFFSET = 0.0008;