'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import Globe, { type GlobeInstance } from 'globe.gl';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Place } from '@/lib/types';
import { findPlace, centroidOf, altitudeForTier } from '@/lib/geo';
import { tokens } from '@/data/tokens';
import { type LightingMode, DAY_SUN_OFFSET, NIGHT_SUN_OFFSET, MODE_TRANSITION_MS } from '@/lib/sun';
import {
  dayNightVertexShader,
  dayNightFragmentShader,
  atmosphereGlowVertexShader,
  atmosphereGlowFragmentShader,
  cloudVertexShader,
  cloudFragmentShader,
} from '@/lib/shaders';

export interface GlobeSceneHandle {
  /** Imperative camera fly-to, implemented via globe.pointOfView({lat,lng,altitude}, durationMs). */
  flyTo: (lat: number, lng: number, altitude: number, durationMs?: number) => void;
}

export interface GlobeSceneProps {
  /** Flattened leaf places (output of flattenPlaces) -- render as pins. */
  places: Place[];
  /** id of the currently selected place (leaf or branch), or null/undefined if none. */
  selectedId?: string | null;
  /** Day or night lighting. Defaults to 'day' if omitted. */
  lightingMode?: LightingMode;
  /** Call once after the globe textures finish loading, so the page can dismiss its Preloader. */
  onReady?: () => void;
}

const CLOUD_REVOLUTION_SECONDS = 40 * 60;
const CLOUD_ANGULAR_SPEED = (2 * Math.PI) / CLOUD_REVOLUTION_SECONDS; // rad/sec
const IDLE_RESUME_MS = 8000;

// Outer atmosphere halo sphere, relative to the globe radius (100). Must
// stay below 100 * (1 + minimum camera altitude) -- the closest tier (poi)
// is 0.85, so the ceiling is 185. A slim 1.10 keeps the halo hugging the
// limb instead of reaching far into space.
const GLOW_SCALE = 1.1;
const GLOW_COLOR = new THREE.Color(0.45, 0.7, 1.0);

// Pin sprite scale. sizeAttenuation is off, so pins hold a constant screen
// size at every zoom level; selected pins scale up. With a non-attenuated
// three.js sprite the scale is in clip-space units (not pixels), so these
// values are tuned to land at roughly 28 px and 38 px tall on screen.
const PIN_BASE_SCALE = 0.03;
const PIN_SELECTED_SCALE = 0.04;
// Tip-anchored sprites (center y = 0) hang upward from the location, so the
// body never intersects the surface; a tiny altitude keeps the tip on it.
const PIN_OBJECT_ALTITUDE = 0.005;

// Bloom strength per lighting mode, before per-frame zoom scaling (see the
// rAF loop). Threshold stays mode-based and is set in the mode effect.
const BLOOM_DAY_STRENGTH = 0.3;
const BLOOM_NIGHT_STRENGTH = 0.5;

// Procedural starfield: point count and base sprite size. Stars live on a
// thick shell far outside the globe; sizeAttenuation shrinks distant points,
// so the base size is tuned up to keep them crisp and visible.
const STAR_COUNT = 2400;
const STAR_BASE_SIZE = 6;

// Time constant for the per-frame sun-direction lerp, derived so a mode
// toggle reaches ~95% of its new position after MODE_TRANSITION_MS.
const SUN_LERP_TAU = MODE_TRANSITION_MS / 1000 / 3;

// Opening camera position: Earth filling most of the frame.
const OPENING_VIEW = { lat: 20, lng: -85, altitude: 1.35 };

const GlobeScene = forwardRef<GlobeSceneHandle, GlobeSceneProps>(function GlobeScene(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const controlsRef = useRef<ReturnType<GlobeInstance['controls']> | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);
  const glowRef = useRef<THREE.Mesh | null>(null);
  const starfieldRef = useRef<THREE.Points | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const outputPassRef = useRef<OutputPass | null>(null);
  const reducedMotionRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionActiveRef = useRef(false);
  const pinSpritesRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const pinTexturesRef = useRef<Map<string, THREE.CanvasTexture>>(new Map());
  const selectedPinIdRef = useRef<string | null>(null);

  // Disposable resources populated once textures finish loading.
  const dayTextureRef = useRef<THREE.Texture | null>(null);
  const nightTextureRef = useRef<THREE.Texture | null>(null);
  const cloudsTextureRef = useRef<THREE.Texture | null>(null);
  const specularTextureRef = useRef<THREE.Texture | null>(null);
  const normalTextureRef = useRef<THREE.Texture | null>(null);
  const globeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Latest props mirrored into refs so the init effect (which runs once) and
  // the rAF loop can read current values without re-subscribing.
  const placesRef = useRef<Place[]>(props.places);
  const selectedIdRef = useRef<string | null | undefined>(props.selectedId);
  const lightingModeRef = useRef<LightingMode>(props.lightingMode ?? 'day');
  placesRef.current = props.places;
  selectedIdRef.current = props.selectedId;
  lightingModeRef.current = props.lightingMode ?? 'day';

  // Imperative fly-to, also used internally for selection-driven camera moves.
  const flyTo = (lat: number, lng: number, altitude: number, durationMs = 1800) => {
    const globe = globeRef.current;
    if (!globe) return;
    const ms = reducedMotionRef.current ? 0 : durationMs;
    globe.pointOfView({ lat, lng, altitude }, ms);
  };

  useImperativeHandle(ref, () => ({ flyTo }), []);

  const clearIdleTimer = () => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  // --- One-time globe setup -------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = reducedMotionQuery.matches;

    // --- Pin sprite textures (one teardrop per category, cached) ------------
    // Four textures are built once and shared across all pins; never one
    // texture per pin (that would leak 34 canvases).
    const pinCategories = ['lived', 'vacationed', 'work', 'planned'] as const;
    const pinTextures = new Map<string, THREE.CanvasTexture>();
    for (const cat of pinCategories) {
      pinTextures.set(cat, createPinTexture(categoryColor(cat)));
    }
    pinTexturesRef.current = pinTextures;

    const makePin = (place: Place): THREE.Sprite => {
      const texture = pinTextures.get(place.category ?? 'planned') ?? pinTextures.get('planned')!;
      const material = new THREE.SpriteMaterial({
        map: texture,
        depthTest: true,
        depthWrite: false,
        sizeAttenuation: false,
        transparent: true,
      });
      const sprite = new THREE.Sprite(material);
      // Anchor the teardrop tip on the location; the body hangs upward.
      sprite.center.set(0.5, 0.0);
      const isSelected = place.id === selectedIdRef.current;
      const scale = isSelected ? PIN_SELECTED_SCALE : PIN_BASE_SCALE;
      sprite.scale.set(scale, scale, 1);
      pinSpritesRef.current.set(place.id, sprite);
      if (isSelected) selectedPinIdRef.current = place.id;
      return sprite;
    };

    const globe = new Globe(container)
      .atmosphereAltitude(0)
      .objectsData(placesRef.current)
      .objectLat((d) => (d as Place).lat ?? 0)
      .objectLng((d) => (d as Place).lng ?? 0)
      .objectAltitude(PIN_OBJECT_ALTITUDE)
      .objectThreeObject((d) => makePin(d as Place))
      .ringsData([])
      .ringLat((d: any) => d.lat)
      .ringLng((d: any) => d.lng)
      .ringColor((d: any) => () => d.color)
      .ringMaxRadius(2.5)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1800)
      .width(container.clientWidth)
      .height(container.clientHeight);

    globeRef.current = globe;

    // Opening view: Earth massive, filling most of the frame. Set instantly
    // (0ms) so there's no fly-in animation on first paint.
    globe.pointOfView(OPENING_VIEW, 0);

    // --- Camera-relative sun direction ---------------------------------------
    // Recomputed every frame (in the render loop below) from the camera's
    // current orientation, offset by a small yaw/pitch so the terminator
    // sits at a pleasing angle regardless of how far the globe has been
    // rotated. These temps are reused each frame to avoid allocation.
    const sunCamDir = new THREE.Vector3();
    const sunRight = new THREE.Vector3();
    const sunUp = new THREE.Vector3();
    const sunForward = new THREE.Vector3();
    const targetSunDirection = new THREE.Vector3();

    const computeTargetSunDirection = (out: THREE.Vector3) => {
      const camera = globe.camera();
      sunCamDir.copy(camera.position).normalize();
      camera.matrixWorld.extractBasis(sunRight, sunUp, sunForward);

      const mode = lightingModeRef.current;
      const offset = mode === 'day' ? DAY_SUN_OFFSET : NIGHT_SUN_OFFSET;
      out.copy(sunCamDir);
      if (mode === 'night') out.negate();
      out.applyAxisAngle(sunUp, offset.yaw);
      out.applyAxisAngle(sunRight, offset.pitch);
      out.normalize();
    };

    // Live sun direction, lerped toward the target each frame. Shared by
    // reference with the globeMaterial uniform once it's created below.
    const sunDirection = new THREE.Vector3();
    computeTargetSunDirection(sunDirection);

    // --- Atmospheric rim glow -------------------------------------------------
    const globeRadius = globe.getGlobeRadius();
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: GLOW_COLOR },
      },
      vertexShader: atmosphereGlowVertexShader,
      fragmentShader: atmosphereGlowFragmentShader,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(globeRadius * GLOW_SCALE, 64, 64), glowMaterial);
    glowRef.current = glowMesh;
    globe.scene().add(glowMesh);

    // --- Procedural starfield (replaces the old night-sky PNG) --------------
    const starfield = createStarfield();
    starfieldRef.current = starfield;
    globe.scene().add(starfield);

    // --- Day/night shader material + cloud layer, once textures load --------
    const renderer = globe.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const maxTextureSize = renderer.capabilities.maxTextureSize;
    const dayTextureUrl = maxTextureSize >= 8192 ? '/textures/earth-day-8k.jpg' : '/textures/earth-day-4k.jpg';

    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (url: string) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(url, resolve, undefined, reject);
      });

    Promise.all([
      loadTexture(dayTextureUrl),
      loadTexture('/textures/earth-night.jpg'),
      loadTexture('/textures/earth-clouds.png'),
      loadTexture('/textures/earth-specular.jpg'),
      loadTexture('/textures/earth-normal.jpg'),
    ])
      .then(([dayTexture, nightTexture, cloudsTexture, specularTexture, normalTexture]) => {
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        for (const tex of [dayTexture, nightTexture]) {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAnisotropy;
          tex.needsUpdate = true;
        }
        cloudsTexture.colorSpace = THREE.SRGBColorSpace;
        cloudsTexture.needsUpdate = true;

        // Specular and normal maps are data, not color.
        for (const tex of [specularTexture, normalTexture]) {
          tex.colorSpace = THREE.NoColorSpace;
          tex.anisotropy = maxAnisotropy;
          tex.needsUpdate = true;
        }

        dayTextureRef.current = dayTexture;
        nightTextureRef.current = nightTexture;
        cloudsTextureRef.current = cloudsTexture;
        specularTextureRef.current = specularTexture;
        normalTextureRef.current = normalTexture;

        const globeMaterial = new THREE.ShaderMaterial({
          uniforms: {
            dayTexture: { value: dayTexture },
            nightTexture: { value: nightTexture },
            specularMap: { value: specularTexture },
            normalMap: { value: normalTexture },
            cloudTexture: { value: cloudsTexture },
            cloudOffset: { value: 0 },
            sunDirection: { value: sunDirection },
          },
          vertexShader: dayNightVertexShader,
          fragmentShader: dayNightFragmentShader,
        });
        globeMaterialRef.current = globeMaterial;
        globe.globeMaterial(globeMaterial);

        const cloudsMaterial = new THREE.ShaderMaterial({
          uniforms: {
            cloudTexture: { value: cloudsTexture },
            // Same live Vector3 the surface shader uses, so the lit side of
            // the clouds tracks the same sun every frame.
            sunDirection: { value: sunDirection },
          },
          vertexShader: cloudVertexShader,
          fragmentShader: cloudFragmentShader,
          transparent: true,
          depthWrite: false,
          blending: THREE.NormalBlending,
        });
        const cloudsMesh = new THREE.Mesh(
          new THREE.SphereGeometry(globeRadius * 1.005, 64, 64),
          cloudsMaterial
        );
        cloudsRef.current = cloudsMesh;
        globe.scene().add(cloudsMesh);

        props.onReady?.();
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load globe textures', err);
        props.onReady?.();
      });

    // --- Controls ---------------------------------------------------------
    const controls = globe.controls();
    controlsRef.current = controls;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.autoRotate = !reducedMotionRef.current;
    controls.autoRotateSpeed = 0.35;

    const handleControlsStart = () => {
      clearIdleTimer();
      controls.autoRotate = false;
    };
    const handleControlsEnd = () => {
      clearIdleTimer();
      if (reducedMotionRef.current) return;
      // Hold position while a place is selected; only resume idle rotation
      // once the selection is cleared.
      if (selectionActiveRef.current) return;
      idleTimerRef.current = setTimeout(() => {
        controls.autoRotate = true;
      }, IDLE_RESUME_MS);
    };
    controls.addEventListener('start', handleControlsStart);
    controls.addEventListener('end', handleControlsEnd);

    // --- Bloom postprocessing -------------------------------------------------
    // globe.gl already drives an EffectComposer with a RenderPass; add bloom
    // and a final output pass to it rather than building a custom pipeline.
    const composer = globe.postProcessingComposer();
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.5, // strength
      0.4, // radius
      0.7 // threshold: only bright pixels (lights, limb, glint) bloom
    );
    composer.addPass(bloomPass);
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    bloomPassRef.current = bloomPass;
    outputPassRef.current = outputPass;

    // --- Resize -----------------------------------------------------------
    const handleResize = () => {
      if (!container) return;
      globe.width(container.clientWidth);
      globe.height(container.clientHeight);
      bloomPass.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Page visibility ----------------------------------------------------
    const handleVisibilityChange = () => {
      if (document.hidden) {
        globe.pauseAnimation();
      } else {
        globe.resumeAnimation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // --- Cloud rotation render loop -----------------------------------------
    let rafId: number | null = null;
    let lastTime = performance.now();
    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      if (!reducedMotionRef.current && cloudsRef.current) {
        cloudsRef.current.rotation.y += CLOUD_ANGULAR_SPEED * delta;
      }
      if (cloudsRef.current && globeMaterialRef.current) {
        globeMaterialRef.current.uniforms.cloudOffset.value = cloudsRef.current.rotation.y / (2 * Math.PI);
      }

      computeTargetSunDirection(targetSunDirection);
      if (reducedMotionRef.current) {
        sunDirection.copy(targetSunDirection);
      } else {
        const damping = 1 - Math.exp(-delta / SUN_LERP_TAU);
        sunDirection.lerp(targetSunDirection, damping).normalize();
      }

      // Zoom-aware bloom: keep the mode-based threshold, but damp bloom
      // strength as the camera moves in so close night cities read as crisp
      // points with a soft glow rather than blowing into white blobs. Far
      // out, bloom is at full mode strength.
      const bloom = bloomPassRef.current;
      if (bloom) {
        const baseStrength =
          lightingModeRef.current === 'night' ? BLOOM_NIGHT_STRENGTH : BLOOM_DAY_STRENGTH;
        const alt = globe.pointOfView().altitude;
        const zoomK = THREE.MathUtils.clamp((alt - 0.3) / (1.6 - 0.3), 0.35, 1.0);
        bloom.strength = baseStrength * zoomK;
      }

      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    // --- Reduced motion change listener --------------------------------------
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
      if (event.matches) {
        controls.autoRotate = false;
        clearIdleTimer();
      }
    };
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (typeof reducedMotionQuery.removeEventListener === 'function') {
        reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      }
      controls.removeEventListener('start', handleControlsStart);
      controls.removeEventListener('end', handleControlsEnd);
      clearIdleTimer();
      if (rafId !== null) cancelAnimationFrame(rafId);

      if (cloudsRef.current) {
        globe.scene().remove(cloudsRef.current);
        cloudsRef.current.geometry.dispose();
        (cloudsRef.current.material as THREE.Material).dispose();
        cloudsRef.current = null;
      }

      if (glowRef.current) {
        globe.scene().remove(glowRef.current);
        glowRef.current.geometry.dispose();
        (glowRef.current.material as THREE.Material).dispose();
        glowRef.current = null;
      }

      if (starfieldRef.current) {
        globe.scene().remove(starfieldRef.current);
        starfieldRef.current.geometry.dispose();
        const starMat = starfieldRef.current.material as THREE.PointsMaterial;
        starMat.map?.dispose();
        starMat.dispose();
        starfieldRef.current = null;
      }

      if (bloomPassRef.current) {
        composer.removePass(bloomPassRef.current);
        bloomPassRef.current.dispose();
        bloomPassRef.current = null;
      }
      if (outputPassRef.current) {
        composer.removePass(outputPassRef.current);
        outputPassRef.current = null;
      }

      for (const sprite of pinSpritesRef.current.values()) {
        (sprite.material as THREE.SpriteMaterial).dispose();
      }
      pinSpritesRef.current.clear();
      for (const tex of pinTexturesRef.current.values()) tex.dispose();
      pinTexturesRef.current.clear();

      dayTextureRef.current?.dispose();
      nightTextureRef.current?.dispose();
      cloudsTextureRef.current?.dispose();
      specularTextureRef.current?.dispose();
      normalTextureRef.current?.dispose();
      globeMaterialRef.current?.dispose();

      globe._destructor();
      if (container) container.innerHTML = '';
      globeRef.current = null;
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Update objects data when places change --------------------------------
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.objectsData(props.places);
  }, [props.places]);

  // --- Selection: pin scale + ring + fly-to + auto-rotate hold ----------------
  useEffect(() => {
    const globe = globeRef.current;
    const controls = controlsRef.current;
    if (!globe) return;

    const selectedId = props.selectedId ?? null;

    // Reset the previously-highlighted pin (if different from the new one).
    if (selectedPinIdRef.current && selectedPinIdRef.current !== selectedId) {
      const prevSprite = pinSpritesRef.current.get(selectedPinIdRef.current);
      prevSprite?.scale.set(PIN_BASE_SCALE, PIN_BASE_SCALE, 1);
      selectedPinIdRef.current = null;
    }

    if (!selectedId) {
      globe.ringsData([]);
      selectionActiveRef.current = false;
      if (controls && !reducedMotionRef.current) {
        clearIdleTimer();
        controls.autoRotate = true;
      }
      return;
    }

    selectionActiveRef.current = true;
    if (controls) {
      clearIdleTimer();
      controls.autoRotate = false;
    }

    const place = findPlace(selectedId);
    if (!place) {
      globe.ringsData([]);
      return;
    }

    const centroid = centroidOf(place);
    if (centroid) {
      const altitude = altitudeForTier(place.tier);
      flyTo(centroid.lat, centroid.lng, altitude, 1800);
    }

    // Only leaves get a selection ring + enlarged pin (single-pin highlight).
    const isLeaf = props.places.some((p) => p.id === selectedId);
    if (isLeaf && place.lat !== undefined && place.lng !== undefined) {
      globe.ringsData([
        {
          lat: place.lat,
          lng: place.lng,
          color: categoryColor(place.category),
        },
      ]);
      const sprite = pinSpritesRef.current.get(selectedId);
      sprite?.scale.set(PIN_SELECTED_SCALE, PIN_SELECTED_SCALE, 1);
      selectedPinIdRef.current = selectedId;
    } else {
      globe.ringsData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedId, props.places]);

  // --- Mode-aware bloom -------------------------------------------------------
  // Day mode raises the bloom threshold and drops its strength so the bright
  // summer day texture (snow caps, deserts) does not wash into a featureless
  // glow; night mode lowers the threshold so city lights and the limb bloom.
  useEffect(() => {
    const bloom = bloomPassRef.current;
    if (!bloom) return;
    // Threshold is mode-based; strength is set per frame (zoom-scaled) in the
    // rAF loop, so it is not touched here.
    bloom.threshold = (props.lightingMode ?? 'day') === 'day' ? 0.85 : 0.7;
  }, [props.lightingMode]);

  return <div ref={containerRef} className="absolute inset-0" />;
});

/**
 * Draws a classic teardrop map pin in the given category color: a round
 * head tapering to a point at the bottom, a dark outline so it stays legible
 * over snow and ocean alike, a white inner dot, and a soft ground shadow
 * beneath the tip to sell contact with the surface. 128px canvas for crisp
 * edges on high-DPI displays. The tip sits near the lower-middle of the
 * canvas so a tip-anchored sprite (center y = 0) lands it on the location.
 */
function createPinTexture(color: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 64;
    const cy = 46;
    const r = 38;
    const tipY = 112;
    const s = Math.SQRT1_2; // sin/cos 45 deg, the circle/tail tangent points

    // Ground shadow beneath the tip (drawn first, so it sits behind the pin).
    ctx.save();
    ctx.translate(cx, 118);
    ctx.scale(15, 5); // unit circle -> 30x10 ellipse
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    shadow.addColorStop(0, 'rgba(0,0,0,0.35)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Teardrop silhouette: tip -> up the right tail -> over the top of the
    // head -> down the left tail -> back to the tip.
    const pin = new Path2D();
    pin.moveTo(cx, tipY);
    pin.quadraticCurveTo(cx + r * 0.88, cy + r * 0.95, cx + r * s, cy + r * s);
    pin.arc(cx, cy, r, Math.PI / 4, (Math.PI * 3) / 4, true);
    pin.quadraticCurveTo(cx - r * 0.88, cy + r * 0.95, cx, tipY);
    pin.closePath();

    // Solid category fill.
    ctx.fillStyle = color;
    ctx.fill(pin);

    // Subtle bottom-half darkening so the pin reads as an object, not a sticker.
    const shade = ctx.createLinearGradient(0, cy, 0, tipY);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = shade;
    ctx.fill(pin);

    // Dark outline around the full silhouette (legibility over any surface).
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,11,18,0.92)';
    ctx.stroke(pin);

    // White inner dot.
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Small deterministic PRNG so the starfield is identical on every load. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft circular sprite for star points (radial gradient, transparent rim). */
function createStarTexture(): THREE.CanvasTexture {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds the static starfield: STAR_COUNT points scattered on a thick shell
 * (radius 1800-2400) with a seeded PRNG so the sky is identical across loads.
 * Most stars are white, a few blue-white or warm; a small fraction are larger
 * and brighter. Per-vertex size is injected into PointsMaterial via
 * onBeforeCompile, since PointsMaterial otherwise exposes only a single size.
 */
function createStarfield(): THREE.Points {
  const rand = mulberry32(0x5eed1234);
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform random direction on the sphere, random radius within the shell.
    const cosTheta = rand() * 2 - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = rand() * Math.PI * 2;
    const radius = 1800 + rand() * 600;
    positions[i * 3] = radius * sinTheta * Math.cos(phi);
    positions[i * 3 + 1] = radius * cosTheta;
    positions[i * 3 + 2] = radius * sinTheta * Math.sin(phi);

    // ~78% white, ~15% blue-white, ~7% warm.
    const hue = rand();
    if (hue < 0.78) {
      const w = 0.9 + rand() * 0.1;
      colors[i * 3] = w;
      colors[i * 3 + 1] = w;
      colors[i * 3 + 2] = w;
    } else if (hue < 0.93) {
      colors[i * 3] = 0.78;
      colors[i * 3 + 1] = 0.86;
      colors[i * 3 + 2] = 1.0;
    } else {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.92;
      colors[i * 3 + 2] = 0.8;
    }

    // Most stars 0.8-2.2; ~3% brighter "feature" stars up to 3.5.
    sizes[i] = rand() < 0.03 ? 2.2 + rand() * 1.3 : 0.8 + rand() * 1.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: STAR_BASE_SIZE,
    map: createStarTexture(),
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      'attribute float aSize;\n' +
      shader.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = size * aSize;');
  };

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function categoryColor(category: Place['category']): string {
  switch (category) {
    case 'lived':
      return tokens.category.lived;
    case 'vacationed':
      return tokens.category.vacationed;
    case 'work':
      return tokens.category.work;
    case 'planned':
      return tokens.category.planned;
    default:
      return tokens.category.planned;
  }
}

export default GlobeScene;
