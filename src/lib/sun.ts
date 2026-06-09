import * as THREE from 'three';

// Baked sun angle. Tune so the Americas sit in daylight and Europe/Middle
// East show city lights. Owner-adjustable constant.
export const SUN_DIRECTION = new THREE.Vector3(-0.8, 0.35, 0.5).normalize();
