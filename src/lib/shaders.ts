/**
 * Day/night terrain shader for the globe surface. Blends an Earth day
 * texture with a city-lights night texture based on the angle between the
 * surface normal (in world space) and a fixed sun direction.
 */

export const dayNightVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const dayNightFragmentShader = /* glsl */ `
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D specularMap;
uniform sampler2D normalMap;
uniform sampler2D cloudTexture;
uniform float cloudOffset;
uniform vec3 sunDirection;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

// Derivative-based tangent frame (Schuler's perturbNormal2Arb), so a normal
// map can be applied without precomputed tangent attributes.
vec3 perturbNormal2Arb(vec3 eyePos, vec3 surfNormal, vec3 mapN) {
  vec3 q0 = dFdx(eyePos);
  vec3 q1 = dFdy(eyePos);
  vec2 st0 = dFdx(vUv);
  vec2 st1 = dFdy(vUv);

  vec3 N = surfNormal;
  vec3 q1perp = cross(q1, N);
  vec3 q0perp = cross(N, q0);

  vec3 T = q1perp * st0.x + q0perp * st1.x;
  vec3 B = q1perp * st0.y + q0perp * st1.y;

  float det = max(dot(T, T), dot(B, B));
  float scale = (det == 0.0) ? 0.0 : inversesqrt(det);

  return normalize(T * (mapN.x * scale) + B * (mapN.y * scale) + N * mapN.z);
}

// Specular ocean glint tuning. Shininess controls how tight the highlight
// is; strength controls its brightness. With the camera-relative sun (the
// sun direction is now usually close to the view direction in day mode),
// a low shininess spreads the highlight across a large fraction of the
// visible disc and blows out under bloom -- keep this tight.
const float SPEC_SHININESS = 600.0;
const float SPEC_STRENGTH = 0.15;

// Color grading: midtone lift/contrast applied to the blended day/night
// color. GRADE_GAMMA < 1 lifts shadows/midtones; GRADE_GAIN brightens
// overall. Together these make the day side read brighter and softer than
// the raw satellite imagery, similar to a lock-screen wallpaper grade.
const float GRADE_GAMMA = 0.90;
const float GRADE_GAIN = 1.06;

// In-disc atmosphere edge: a bluish wash that strengthens toward the
// grazing limb of the visible disc, plus a brighter additive rim that
// bloom fuses with the outer halo into a single glowing edge. The base
// haze mix runs on both day and night sides (a faint blue edge on the
// night side reads as a dawn rim); only the bright additive term is gated
// to the day side so night city lights stay clean. HAZE_RIM_POWER controls
// how tightly the band hugs the limb; HAZE_STRENGTH its opacity; RIM_BRIGHT
// the strength of the additive edge highlight.
const vec3 HAZE_COLOR = vec3(0.61, 0.76, 0.92);
const float HAZE_RIM_POWER = 2.2;
const float HAZE_STRENGTH = 0.42;
const float RIM_BRIGHT = 0.55;

// Cloud drop shadow: darken the day-side surface under clouds, sampling
// the cloud texture at its current rotation offset (cloudOffset = cloud
// mesh's Y rotation in turns). No shadow mapping involved. Confined to the
// day side via the blend factor.
const float CLOUD_SHADOW_STRENGTH = 0.22;

void main() {
  vec3 surfaceNormal = normalize(vWorldNormal);
  vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
  mapN.xy *= 0.5; // subtle relief
  vec3 N = perturbNormal2Arb(vWorldPosition, surfaceNormal, mapN);

  float cosAngle = dot(N, sunDirection);
  float blend = smoothstep(-0.08, 0.08, cosAngle);
  vec3 day = texture2D(dayTexture, vUv).rgb;
  vec3 night = texture2D(nightTexture, vUv).rgb * 2.2; // lift city lights
  vec3 color = mix(night, day, blend);

  // Sun glint on water: specularMap is a grayscale ocean mask (ocean
  // light, land dark). Confined to the day side via the blend factor.
  float ocean = texture2D(specularMap, vUv).r;
  vec3 Vd = normalize(cameraPosition - vWorldPosition);
  vec3 Hd = normalize(sunDirection + Vd);
  float spec = pow(max(dot(N, Hd), 0.0), SPEC_SHININESS) * ocean * blend;
  color += spec * SPEC_STRENGTH * vec3(1.0, 0.96, 0.88);

  // Cloud drop shadow on the day side.
  float cloudShadow = texture2D(cloudTexture, vec2(fract(vUv.x - cloudOffset), vUv.y)).a;
  color *= 1.0 - cloudShadow * CLOUD_SHADOW_STRENGTH * blend;

  // Midtone lift/contrast (day side reads brighter and softer than raw
  // satellite imagery; night side city lights pass through unchanged
  // because they are already handled above via the night/day mix).
  color = pow(color, vec3(GRADE_GAMMA)) * GRADE_GAIN;

  // Atmosphere edge: bluish wash toward the limb (both sides), plus a
  // brighter additive rim on the day side that bloom fuses with the halo.
  float rimEdge = pow(1.0 - max(dot(Vd, N), 0.0), HAZE_RIM_POWER);
  vec3 atmTint = mix(HAZE_COLOR, vec3(0.85, 0.93, 1.0), rimEdge);
  color = mix(color, atmTint, rimEdge * HAZE_STRENGTH);
  color += vec3(0.75, 0.88, 1.0) * pow(rimEdge, 3.5) * RIM_BRIGHT * blend;

  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Fresnel rim-glow shader for the atmospheric halo sphere. Renders a soft
 * blue glow that hugs the limb of the planet and fades toward the center,
 * using a view-direction fresnel term so it stays correct off-center.
 */
export const atmosphereGlowVertexShader = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const atmosphereGlowFragmentShader = /* glsl */ `
uniform vec3 glowColor;

varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

// Outer halo falloff. On a BackSide sphere the visible fragments are the
// far shell, so -dot(viewDir, normal) is largest where the line of sight
// passes nearest the planet limb and falls to zero at the halo's outer
// silhouette. The glow is therefore brightest exactly at the planet edge
// and decays smoothly outward, with no dark gap and no detached ring.
const float GLOW_FALLOFF = 2.2;
const float GLOW_INTENSITY = 2.6;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float rim = pow(max(-dot(viewDir, vWorldNormal), 0.0), GLOW_FALLOFF);
  float a = rim * GLOW_INTENSITY;
  gl_FragColor = vec4(glowColor * a, a);
}
`;
