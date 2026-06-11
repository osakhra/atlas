/**
 * Camera-relative lighting. Instead of a fixed sun position in world space,
 * the sun direction is derived each frame from the camera's current
 * orientation, offset by a small yaw/pitch so the terminator sits at a
 * pleasing angle regardless of how far the globe has been rotated.
 */
export type LightingMode = 'day' | 'night';

// Angular offsets (radians) applied to the camera direction to place the
// sun. Day: a small yaw/pitch keeps the specular hotspot mid-disc rather
// than riding up onto the bright polar cap (which blew out under bloom).
// Night: sun behind the globe, offset so a thin dawn sliver lights the
// upper-left limb.
export const DAY_SUN_OFFSET = { yaw: -0.35, pitch: 0.12 };
export const NIGHT_SUN_OFFSET = { yaw: -0.55, pitch: 0.25 };

// How long a day/night mode toggle takes for the terminator to sweep into
// its new position.
export const MODE_TRANSITION_MS = 1200;

/** Default lighting mode based on the visitor's local clock: 7am-7pm is day. */
export function defaultLightingMode(): LightingMode {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? 'day' : 'night';
}
