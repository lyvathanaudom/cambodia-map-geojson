import gsap from 'gsap';
import * as THREE from 'three';
import { ref } from 'vue';
import { ELEVATION_OFFSET } from '../../consts/mapSettings';

/**
 * useMapAnimations
 *
 * Provides helper methods to animate elevation changes,
 * “popping up” or “lowering” geometry, etc. You can also
 * extend this to handle color transitions, fading labels, etc.
 *
 * Usage:
 * const { isAnimating, elevateGroup, lowerGroup } = useMapAnimations();
 */
export function useMapAnimations() {
  const isAnimating = ref(false);

  /**
   * Move a Three.Group’s meshes to a higher position, e.g., y = ELEVATION_OFFSET.
   */
  function elevateGroup(group: THREE.Group, duration = 1.2, offset = ELEVATION_OFFSET) {
    return new Promise<void>((resolve) => {
      isAnimating.value = true;
      const meshes = group.children.filter(
        (child) => child instanceof THREE.Mesh || child instanceof THREE.LineSegments
      );
      let completed = 0;
      meshes.forEach((mesh) => {
        gsap.killTweensOf(mesh.position);
        gsap.to(mesh.position, {
          y: mesh.position.y + offset,
          duration,
          ease: 'power2.inOut',
          onComplete: () => {
            completed++;
            if (completed === meshes.length) {
              isAnimating.value = false;
              resolve();
            }
          }
        });
      });
      if (meshes.length === 0) {
        isAnimating.value = false;
        resolve();
      }
    });
  }

  /**
   * Move a Three.Group’s meshes back down to y=0, then optionally hide them.
   */
  function lowerGroup(group: THREE.Group, duration = 0.6, hideAfter = false) {
    return new Promise<void>((resolve) => {
      isAnimating.value = true;
      const meshes = group.children.filter(
        (child) => child instanceof THREE.Mesh || child instanceof THREE.LineSegments
      );
      let completed = 0;
      meshes.forEach((mesh) => {
        gsap.killTweensOf(mesh.position);
        gsap.to(mesh.position, {
          y: 0,
          duration,
          ease: 'power2.out',
          onComplete: () => {
            completed++;
            if (completed === meshes.length) {
              if (hideAfter) {
                group.visible = false;
              }
              isAnimating.value = false;
              resolve();
            }
          }
        });
      });
      if (meshes.length === 0) {
        isAnimating.value = false;
        resolve();
      }
    });
  }

  return {
    isAnimating,
    elevateGroup,
    lowerGroup
  };
}