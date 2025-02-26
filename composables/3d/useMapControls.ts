import { ref } from 'vue';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DEFAULT_CAMERA_SETTINGS } from '../../consts/mapSettings';

/**
 * useMapControls
 *
 * Provides convenience methods for advanced camera transitions
 * (resetting, zooming to a bounding box for certain objects, etc.).
 *
 * Usage Example:
 * const { resetCamera, zoomToGroup } = useMapControls(camera, controls);
 */
export function useMapControls(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  const isTransitioning = ref(false);

  /**
   * Reset camera to your default settings (FOV, position, etc.).
   */
  function resetCamera(duration = 1.2) {
    return Promise.all([
      new Promise<void>((resolve) => {
        gsap.to(camera, {
          duration,
          fov: DEFAULT_CAMERA_SETTINGS.fov,
          onUpdate: () => camera.updateProjectionMatrix(),
          onComplete: resolve
        });
      }),
      new Promise<void>((resolve) => {
        gsap.to(camera.position, {
          duration,
          x: DEFAULT_CAMERA_SETTINGS.initialPosition.x,
          y: DEFAULT_CAMERA_SETTINGS.initialPosition.y,
          z: DEFAULT_CAMERA_SETTINGS.initialPosition.z,
          ease: 'power2.inOut',
          onUpdate: () => {
            camera.lookAt(
              DEFAULT_CAMERA_SETTINGS.initialTarget.x,
              DEFAULT_CAMERA_SETTINGS.initialTarget.y,
              DEFAULT_CAMERA_SETTINGS.initialTarget.z
            );
            controls.target.set(
              DEFAULT_CAMERA_SETTINGS.initialTarget.x,
              DEFAULT_CAMERA_SETTINGS.initialTarget.y,
              DEFAULT_CAMERA_SETTINGS.initialTarget.z
            );
            controls.update();
          },
          onComplete: resolve
        });
      })
    ]);
  }

  /**
   * Smooth camera movement to focus on a specific group or object bounding box.
   * Adjust angleMultiplier and zoomFactor for fine-tuned 3D "angle" and distance.
   */
  function zoomToGroup(
    featureGroup: THREE.Group,
    duration = 1.2,
    angleMultiplier = 0.6,
    zoomFactor = 0.6
  ) {
    if (isTransitioning.value) return Promise.resolve();

    isTransitioning.value = true;
    return new Promise<void>((resolve) => {
      const box = new THREE.Box3().setFromObject(featureGroup);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fovInRadians = camera.fov * (Math.PI / 180);
      const baseDistance = Math.abs(maxDim / Math.sin(fovInRadians / 2)) * zoomFactor;
  
      const targetY = center.y + baseDistance * angleMultiplier;
      const targetZ = center.z + baseDistance * angleMultiplier;
  
      gsap.to(camera.position, {
        duration,
        x: center.x,
        y: targetY,
        z: targetZ,
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.lookAt(center);
          controls.target.copy(center);
          controls.update();
        },
        onComplete: () => {
          isTransitioning.value = false;
          resolve();
        }
      });
    });
  }

  return {
    isTransitioning,
    resetCamera,
    zoomToGroup
  };
}