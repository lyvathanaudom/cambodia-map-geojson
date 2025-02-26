import { ref } from 'vue';
import * as THREE from 'three';
import type { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';

/**
 * useMapInteractions
 *
 * Handles raycasting, hover highlighting, and click-based selection.
 * Abstracts away logic to highlight objects on hover and
 * call external callbacks (like onProvinceClick, onDistrictClick, etc.) on click.
 *
 * Usage Example:
 * const { hoveredGroup,
 *         onCanvasMove,
 *         onCanvasClick,
 *         onCanvasOut } = useMapInteractions(camera, controls);
 */
export function useMapInteractions(camera: PerspectiveCamera, controls: OrbitControls) {
  const hoveredGroup = ref<THREE.Group | null>(null);

  /**
   * For colored highlights, we set mesh.material.emissive to gray when hovered.
   * Turn off the highlight by reverting back to black.
   */
  function updateHighlight(group: THREE.Group | null, highlight: boolean) {
    if (!group) return;
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh && 'emissive' in child.material) {
        const mat = child.material as THREE.MeshPhongMaterial;
        mat.emissive.set(highlight ? 0x333333 : 0x000000);
      }
    });
  }

  function handleHoverChange(hits: THREE.Intersection[]) {
    const newHover = hits.length ? (hits[0].object.parent as THREE.Group) : null;
    if (newHover !== hoveredGroup.value) {
      if (hoveredGroup.value) {
        updateHighlight(hoveredGroup.value, false);
      }
      if (newHover) {
        updateHighlight(newHover, true);
      }
      hoveredGroup.value = newHover;
    }
  }

  /**
   * Mouse move over canvas → check if we hover over a province, district, etc.
   * The calling component can determine which group to test based on the user's selection state.
   */
  function onCanvasMove(e: MouseEvent, canvas: HTMLCanvasElement, testGroups: THREE.Group[]) {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(
      testGroups.flatMap((g) => g.children.filter((c) => c instanceof THREE.Mesh)),
      false
    );
    handleHoverChange(hits);
  }

  /**
   * Mouse out of canvas → remove highlight if any.
   */
  function onCanvasOut() {
    if (hoveredGroup.value) {
      updateHighlight(hoveredGroup.value, false);
      hoveredGroup.value = null;
    }
  }

  /**
   * Canvas click → figure out whichever group is clicked, if any.
   * The calling component can handle multiple states (province selected, etc.),
   * so we just return the group that was clicked (if any).
   */
  function onCanvasClick(e: MouseEvent, canvas: HTMLCanvasElement, testGroups: THREE.Group[]): THREE.Group | null {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(
      testGroups.flatMap((g) => g.children.filter((c) => c instanceof THREE.Mesh)),
      false
    );

    if (hits.length) {
      // Return the first group that was hit
      return hits[0].object.parent as THREE.Group;
    }
    return null;
  }

  return {
    hoveredGroup,
    onCanvasMove,
    onCanvasOut,
    onCanvasClick
  };
}