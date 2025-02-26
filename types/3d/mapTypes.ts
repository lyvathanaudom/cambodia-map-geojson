/**
 * mapTypes.ts
 * 
 * Defines interfaces and types used throughout the map layers,
 * focusing on application-specific properties.
 */

/**
 * Base interface for properties of a geographic feature
 * displayed in the 3D map. Titles (HRName, DName, etc.)
 * may differ depending on which administrative layer is loaded.
 */
export interface MapFeatureProperties {
  PRO_CODE?: number; // Province code
  DIS_CODE?: number; // District code
  COM_CODE?: number; // Commune code
  HRName?: string;   // Province name (string)
  DName?: string;    // District name (string)
  CName?: string;    // Commune name (string)
  [key: string]: any; // Additional properties
}

/**
 * An administrative layer can be "province", "district", or "commune".
 */
export type AdminLayerType = 'province' | 'district' | 'commune';

/**
 * Represents a clickable, extrudable 3D group in Three.js,
 * with userData storing its feature properties.
 */
export interface MapLayerGroup {
  userData: MapFeatureProperties;
  visible: boolean;
  children: any[];
}

/**
 * Possible drill-down states in the UI
 * (top-level, province selected, district selected, etc.).
 */
export enum DrillDownState {
  NONE = 'NONE',
  PROVINCE_SELECTED = 'PROVINCE_SELECTED',
  DISTRICT_SELECTED = 'DISTRICT_SELECTED',
  COMMUNE_SELECTED = 'COMMUNE_SELECTED'
}