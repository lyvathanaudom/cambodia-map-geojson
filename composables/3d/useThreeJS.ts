import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DEFAULT_CAMERA_SETTINGS, DEFAULT_COLORS } from '../../consts/mapSettings';

/**
 * useThreeJS
 *
 * Initializes core Three.js objects:
 * - Scene + background color
 * - PerspectiveCamera + default position, near/far planes
 * - WebGLRenderer with dynamic sizing
 * - OrbitControls for camera movement
 *
 * Returns references to scene, camera, renderer, controls,
 * and a function to safely dispose them.
 *
 * Usage:
 * const { scene, camera, renderer, controls, initThreeJS, dispose } = useThreeJS();
 * onMounted(() => initThreeJS(containerRef.value, canvasRef.value));
 * onBeforeUnmount(() => dispose());
 */
export function useThreeJS() {
  const scene = ref<THREE.Scene>();
  const camera = ref<THREE.PerspectiveCamera>();
  const renderer = ref<THREE.WebGLRenderer>();
  const controls = ref<OrbitControls>();

  let animationId: number | null = null;

  /**
   * Initialize the Three.js scene, camera, renderer, and controls.
   * @param container - the parent HTMLDivElement
   * @param canvas - the HTMLCanvasElement used by WebGL
   */
  function initThreeJS(container: HTMLDivElement, canvas: HTMLCanvasElement) {
    // Create scene with background
    scene.value = new THREE.Scene();
    scene.value.background = new THREE.Color(DEFAULT_COLORS.background);

    // Camera
    camera.value = new THREE.PerspectiveCamera(
      DEFAULT_CAMERA_SETTINGS.fov,
      container.clientWidth / container.clientHeight,
      DEFAULT_CAMERA_SETTINGS.near,
      DEFAULT_CAMERA_SETTINGS.far
    );
    camera.value.position.set(
      DEFAULT_CAMERA_SETTINGS.initialPosition.x,
      DEFAULT_CAMERA_SETTINGS.initialPosition.y,
      DEFAULT_CAMERA_SETTINGS.initialPosition.z
    );
    camera.value.lookAt(
      DEFAULT_CAMERA_SETTINGS.initialTarget.x,
      DEFAULT_CAMERA_SETTINGS.initialTarget.y,
      DEFAULT_CAMERA_SETTINGS.initialTarget.z
    );

    // Renderer
    renderer.value = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    renderer.value.setSize(container.clientWidth, container.clientHeight);
    renderer.value.setPixelRatio(window.devicePixelRatio);

    // Basic Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.value.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.value.add(directionalLight);

    // Orbit controls
    controls.value = new OrbitControls(camera.value, renderer.value.domElement);
    controls.value.enableDamping = true;
    controls.value.dampingFactor = 0.05;
    controls.value.enableRotate = true;
    controls.value.enablePan = true;
    controls.value.minDistance = 0.001;
    controls.value.maxDistance = 1.0;
  }

  /**
   * Called each animation frame to keep the scene rendered
   * and the controls updated.
   */
  function animate() {
    animationId = requestAnimationFrame(animate);
    if (controls.value) controls.value.update();
    if (renderer.value && scene.value && camera.value) {
      renderer.value.render(scene.value, camera.value);
    }
  }

  /** Begin the animation loop. */
  function startRendering() {
    if (!animationId) {
      animate();
    }
  }

  /** Stop the animation loop and free up resources. */
  function dispose() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    controls.value?.dispose();
    renderer.value?.dispose();
    scene.value?.clear();
  }

  // Hook into Vue lifecycle if desired
  onBeforeUnmount(() => {
    dispose();
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    initThreeJS,
    startRendering,
    dispose
  };
}