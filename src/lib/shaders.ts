/**
 * Day/night terrain shader for the globe surface. Blends an Earth day
 * texture with a city-lights night texture based on the angle between the
 * surface normal (in world space) and a fixed sun direction.
 */

export const dayNightVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const dayNightFragmentShader = /* glsl */ `
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform vec3 sunDirection;

varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
  float cosAngle = dot(normalize(vWorldNormal), sunDirection);
  float blend = smoothstep(-0.08, 0.08, cosAngle);
  vec3 day = texture2D(dayTexture, vUv).rgb;
  vec3 night = texture2D(nightTexture, vUv).rgb * 2.2; // lift city lights
  gl_FragColor = vec4(mix(night, day, blend), 1.0);
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
