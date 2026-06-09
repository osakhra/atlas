'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import Globe, { type GlobeInstance } from 'globe.gl';
import type { Place } from '@/lib/types';
import { findPlace, centroidOf, altitudeForTier } from '@/lib/geo';
import { tokens } from '@/data/tokens';
import { SUN_DIRECTION } from '@/lib/sun';
import { dayNightVertexShader, dayNightFragmentShader } from '@/lib/shaders';

export interface GlobeSceneHandle {
  /** Imperative camera fly-to, implemented via globe.pointOfView({lat,lng,altitude}, durationMs). */
  flyTo: (lat: number, lng: number, altitude: number, durationMs?: number) => void;
}

export interface GlobeSceneProps {
  /** Flattened leaf places (output of flattenPlaces) -- render as pins. */
  places: Place[];
  /** id of the currently selected place (leaf or branch), or null/undefined if none. */
  selectedId?: string | null;
  /** Call once after globe.gl's onGlobeReady fires (textures loaded), so the page can dismiss its Preloader. */
  onReady?: () => void;
}

const CLOUD_REVOLUTION_SECONDS = 40 * 60;
const CLOUD_ANGULAR_SPEED = (2 * Math.PI) / CLOUD_REVOLUTION_SECONDS; // rad/sec
const IDLE_RESUME_MS = 8000;

const GlobeScene = forwardRef<GlobeSceneHandle, GlobeSceneProps>(function GlobeScene(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);
  const reducedMotionRef = useRef(false);

  // Latest props mirrored into refs so the init effect (which runs once) and
  // the rAF loop can read current values without re-subscribing.
  const placesRef = useRef<Place[]>(props.places);
  const selectedIdRef = useRef<string | null | undefined>(props.selectedId);
  placesRef.current = props.places;
  selectedIdRef.current = props.selectedId;

  // Imperative fly-to, also used internally for selection-driven camera moves.
  const flyTo = (lat: number, lng: number, altitude: number, durationMs = 1800) => {
    const globe = globeRef.current;
    if (!globe) return;
    const ms = reducedMotionRef.current ? 0 : durationMs;
    globe.pointOfView({ lat, lng, altitude }, ms);
  };

  useImperativeHandle(ref, () => ({ flyTo }), []);

  // --- One-time globe setup -------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = reducedMotionQuery.matches;

    const globe = new Globe(container)
      .backgroundImageUrl('/textures/night-sky.png')
      .atmosphereColor(tokens.atmosphere)
      .atmosphereAltitude(0.15)
      .pointsData(placesRef.current)
      .pointLat((d) => (d as Place).lat ?? 0)
      .pointLng((d) => (d as Place).lng ?? 0)
      .pointColor((d) => categoryColor((d as Place).category))
      .pointAltitude(0.01)
      .pointRadius((d) => ((d as Place).tier === 'city' ? 0.5 : 0.35))
      .ringsData([])
      .ringLat((d: any) => d.lat)
      .ringLng((d: any) => d.lng)
      .ringColor((d: any) => () => d.color)
      .ringMaxRadius(2.5)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1800)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .onGlobeReady(() => {
        props.onReady?.();
      });

    globeRef.current = globe;

    // --- Day/night shader material -----------------------------------------
    const textureLoader = new THREE.TextureLoader();
    const dayTexture = textureLoader.load('/textures/earth-day.jpg');
    const nightTexture = textureLoader.load('/textures/earth-night.jpg');
    if ('SRGBColorSpace' in THREE) {
      dayTexture.colorSpace = THREE.SRGBColorSpace;
      nightTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const sunDirectionArray: [number, number, number] = [
      SUN_DIRECTION.x,
      SUN_DIRECTION.y,
      SUN_DIRECTION.z,
    ];

    const globeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: new THREE.Vector3(...sunDirectionArray) },
      },
      vertexShader: dayNightVertexShader,
      fragmentShader: dayNightFragmentShader,
    });
    globe.globeMaterial(globeMaterial as unknown as THREE.MeshPhongMaterial);

    // --- Cloud layer ----------------------------------------------------------
    const cloudsTexture = textureLoader.load('/textures/earth-clouds.png');
    if ('SRGBColorSpace' in THREE) {
      cloudsTexture.colorSpace = THREE.SRGBColorSpace;
    }
    const globeRadius = globe.getGlobeRadius();
    const cloudsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius * 1.01, 64, 64),
      new THREE.MeshPhongMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    );
    cloudsRef.current = cloudsMesh;
    globe.scene().add(cloudsMesh);

    // --- Controls ---------------------------------------------------------
    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.autoRotate = !reducedMotionRef.current;
    controls.autoRotateSpeed = 0.35;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const clearIdleTimer = () => {
      if (idleTimer !== null) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };
    const handleControlsStart = () => {
      clearIdleTimer();
      controls.autoRotate = false;
    };
    const handleControlsEnd = () => {
      clearIdleTimer();
      if (reducedMotionRef.current) return;
      idleTimer = setTimeout(() => {
        controls.autoRotate = true;
      }, IDLE_RESUME_MS);
    };
    controls.addEventListener('start', handleControlsStart);
    controls.addEventListener('end', handleControlsEnd);

    // --- Renderer pixel ratio ------------------------------------------------
    const renderer = globe.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- Resize -----------------------------------------------------------
    const handleResize = () => {
      if (!container) return;
      globe.width(container.clientWidth);
      globe.height(container.clientHeight);
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

      dayTexture.dispose();
      nightTexture.dispose();
      cloudsTexture.dispose();
      globeMaterial.dispose();

      globe._destructor();
      if (container) container.innerHTML = '';
      globeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Update points data when places change --------------------------------
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointsData(props.places);
  }, [props.places]);

  // --- Selection: rings + fly-to ---------------------------------------------
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const selectedId = props.selectedId;
    if (!selectedId) {
      globe.ringsData([]);
      return;
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

    // Only leaves get a selection ring (single-pin highlight).
    const isLeaf = props.places.some((p) => p.id === selectedId);
    if (isLeaf && place.lat !== undefined && place.lng !== undefined) {
      globe.ringsData([
        {
          lat: place.lat,
          lng: place.lng,
          color: categoryColor(place.category),
        },
      ]);
    } else {
      globe.ringsData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedId, props.places]);

  return <div ref={containerRef} className="absolute inset-0" />;
});

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
