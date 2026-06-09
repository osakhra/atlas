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
  float blend = smoothstep(-0.12, 0.25, cosAngle);
  vec3 day = texture2D(dayTexture, vUv).rgb;
  vec3 night = texture2D(nightTexture, vUv).rgb * 1.35; // lift city lights
  gl_FragColor = vec4(mix(night, day, blend), 1.0);
}
`;
