import * as THREE from 'three';
import { webMercatorToWGS84 } from './geoUtils';

/**
 * Converts an array of [x, y] coordinates into a Three.js Shape.
 * Applies a custom scale for more convenient sizing.
 */
export function coordsToShape(coords: number[][]): THREE.Shape {
  const shape = new THREE.Shape();

  coords.forEach(([x, y], i) => {
    const [lon, lat] = webMercatorToWGS84(x, y);
    // Scale down for a more manageable size in the Three.js scene.
    const scaledX = lon * 0.015;
    const scaledY = lat * 0.015;

    if (i === 0) {
      shape.moveTo(scaledX, scaledY);
    } else {
      shape.lineTo(scaledX, scaledY);
    }
  });

  return shape;
}

/**
 * Creates extruded geometry from shape coordinates.
 * Applies bevel for visuals, but you can tweak or remove if undesired.
 */
export function createGeometry(coords: number[][], depth: number): THREE.ExtrudeGeometry {
  const shape = coordsToShape(coords);
  const extrudeSettings = {
    steps: 1,
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0001,
    bevelSize: 0.0001,
    bevelSegments: 2
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Handles the extrusion of MultiPolygon geometry by constructing
 * an individual mesh+edges pair per ring (outer boundary, holes, etc.),
 * and combining them into a single Three.Group.
 */
export function handleMultiPolygon(
  polygons: number[][][],
  material: THREE.Material,
  edgesMaterial: THREE.Material,
  depth: number
): THREE.Group {
  const polygonGroup = new THREE.Group();

  polygons.forEach((polygon) => {
    const geometry = createGeometry(polygon[0], depth);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;

    const edgesGeo = new THREE.EdgesGeometry(geometry);
    const edges = new THREE.LineSegments(edgesGeo, edgesMaterial);
    edges.rotation.x = -Math.PI / 2;

    polygonGroup.add(mesh, edges);
  });

  return polygonGroup;
}
