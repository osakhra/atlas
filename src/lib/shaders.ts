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
  float spec = pow(max(dot(N, Hd), 0.0), 90.0) * ocean * blend;
  color += spec * 0.9 * vec3(1.0, 0.96, 0.88);

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

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float rim = pow(0.62 + dot(viewDir, vWorldNormal), 3.2);
  gl_FragColor = vec4(glowColor, 1.0) * rim;
}
`;
