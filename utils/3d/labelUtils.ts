/**
 * labelUtils.ts
 *
 * Houses text sprite creation and positioning logic for 3D labeling.
 */

import * as THREE from 'three';

/**
 * Creates a text sprite for labeling features in a Three.js scene.
 * @param message - The text to display on the label.
 * @param fontSize - Desired font size in px.
 * @returns A Three.js Sprite object.
 *
 * Usage Example:
 *   const label = createTextSprite("Hello World", 24);
 *   label.position.set(x, y, z);
 *   scene.add(label);
 */
export function createTextSprite(message: string, fontSize = 24): THREE.Sprite {
  const padding = 10;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  ctx.font = `${fontSize}px Arial`;
  const textWidth = ctx.measureText(message).width;
  
  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize + padding * 2;
  
  // Reassign font after resizing canvas
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);

  // Scale based on pixel size, so it’s not too large in the scene.
  sprite.scale.set(canvas.width / 20000, canvas.height / 20000, 1);

  // Omit own raycast to avoid interfering with geometry selection.
  sprite.raycast = () => {};

  return sprite;
}