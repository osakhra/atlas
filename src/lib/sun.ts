/**
 * Camera-relative lighting. Instead of a fixed sun position in world space,
 * the sun direction is derived each frame from the camera's current
 * orientation, offset by a small yaw/pitch so the terminator sits at a
 * pleasing angle regardless of how far the globe has been rotated.
 */
export type LightingMode = 'day' | 'night';

// Angular offsets (radians) applied to the camera direction to place the
// sun. Day: sun behind the viewer's upper-left shoulder -> full lit disc
// with gentle falloff toward the lower-right limb. Night: sun behind the
// globe, offset so a thin dawn sliver lights the upper-left limb.
export const DAY_SUN_OFFSET = { yaw: -0.35, pitch: 0.30 };
export const NIGHT_SUN_OFFSET = { yaw: -0.55, pitch: 0.25 };

// How long a day/night mode toggle takes for the terminator to sweep into
// its new position.
export const MODE_TRANSITION_MS = 1200;
