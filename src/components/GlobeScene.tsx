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
// stay below 100 * (1 + minimum camera altitude) -- poi tier altitude is
// 0.24, so the hard ceiling is 124. 122 < 124 holds.
const GLOW_SCALE = 1.22;
const GLOW_COLOR = new THREE.Color(0.62, 0.82, 1.0);

// Pin sprite scale (world units). Selected pins scale up by 1.6x.
const PIN_BASE_SCALE = 2.5;
const PIN_SELECTED_SCALE = PIN_BASE_SCALE * 1.6;
const PIN_OBJECT_ALTITUDE = 0.015;

const CLOUDS_OPACITY = 0.18;

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
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const outputPassRef = useRef<OutputPass | null>(null);
  const reducedMotionRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionActiveRef = useRef(false);
  const pinSpritesRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const selectedPinIdRef = useRef<string | null>(null);

  // Disposable resources populated once textures finish loading.
  const dayTextureRef = useRef<THREE.Texture | null>(null);
  const nightTextureRef = useRef<THREE.Texture | null>(null);
  const cloudsTextureRef = useRef<THREE.Texture | null>(null);
  const specularTextureRef = useRef<THREE.Texture | null>(null);
  const normalTextureRef = useRef<THREE.Texture | null>(null);
  const globeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const pinTextureRef = useRef<THREE.CanvasTexture | null>(null);

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

    // --- Pin sprite texture (shared, soft circular gradient) ----------------
    const pinTexture = createPinTexture();
    pinTextureRef.current = pinTexture;

    const makePin = (place: Place): THREE.Sprite => {
      const material = new THREE.SpriteMaterial({
        map: pinTexture,
        color: categoryColor(place.category),
        depthTest: true,
        depthWrite: false,
        sizeAttenuation: true,
        transparent: true,
      });
      const sprite = new THREE.Sprite(material);
      const isSelected = place.id === selectedIdRef.current;
      const scale = isSelected ? PIN_SELECTED_SCALE : PIN_BASE_SCALE;
      sprite.scale.set(scale, scale, 1);
      pinSpritesRef.current.set(place.id, sprite);
      if (isSelected) selectedPinIdRef.current = place.id;
      return sprite;
    };

    const globe = new Globe(container)
      .backgroundImageUrl('/textures/night-sky.png')
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

        const cloudsMesh = new THREE.Mesh(
          new THREE.SphereGeometry(globeRadius * 1.005, 64, 64),
          new THREE.MeshPhongMaterial({
            map: cloudsTexture,
            transparent: true,
            opacity: CLOUDS_OPACITY,
            depthWrite: false,
          })
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
      pinTextureRef.current?.dispose();

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
    if ((props.lightingMode ?? 'day') === 'day') {
      bloom.threshold = 0.85;
      bloom.strength = 0.3;
    } else {
      bloom.threshold = 0.7;
      bloom.strength = 0.5;
    }
  }, [props.lightingMode]);

  return <div ref={containerRef} className="absolute inset-0 md:left-[340px]" />;
});

/** Soft circular radial-gradient texture shared by all pin sprites. */
function createPinTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
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
