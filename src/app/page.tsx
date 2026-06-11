'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { CameraIcon, XIcon } from '@/components/icons/Icons';
import Legend from '@/components/Legend';
import LightingToggle from '@/components/LightingToggle';
import LocationCard from '@/components/LocationCard';
import Preloader from '@/components/Preloader';
import Sidebar from '@/components/Sidebar';
import { places } from '@/data/places';
import { flattenPlaces, findPlace } from '@/lib/geo';
import { SelectionProvider, useSelection } from '@/lib/selection';
import { defaultLightingMode, type LightingMode } from '@/lib/sun';

const GlobeScene = dynamic(() => import('@/components/GlobeScene'), { ssr: false });

const flatPlaces = flattenPlaces(places);

/**
 * Inner shell, rendered inside SelectionProvider so it can read the current
 * selection and pass `selectedId` through to GlobeScene.
 */
function AtlasShell({ ready, onReady }: { ready: boolean; onReady: () => void }) {
  const { selected, select } = useSelection();
  const [lightingMode, setLightingMode] = useState<LightingMode>(defaultLightingMode());
  const [captureMode, setCaptureMode] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);

  const toggleLightingMode = () => {
    setLightingMode((mode) => (mode === 'day' ? 'night' : 'day'));
  };

  // Capture mode: fade the UI chrome out (200ms), then mark it hidden so it
  // also leaves the accessibility tree and focus order. Reduced motion skips
  // the fade and hides instantly.
  useEffect(() => {
    if (!captureMode) {
      setChromeHidden(false);
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setChromeHidden(true);
      return;
    }
    const timer = window.setTimeout(() => setChromeHidden(true), 200);
    return () => window.clearTimeout(timer);
  }, [captureMode]);

  // Esc exits capture mode.
  useEffect(() => {
    if (!captureMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCaptureMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captureMode]);

  // Deep link: select a place from the URL hash on first load.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && findPlace(id)) {
      select(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL hash in sync with the current selection (no history spam).
  useEffect(() => {
    const hash = selected ? `#${selected.id}` : '';
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, '', url);
  }, [selected]);

  return (
    <>
      <div className="absolute inset-0 z-0">
        <GlobeScene
          places={flatPlaces}
          selectedId={selected?.id ?? null}
          lightingMode={lightingMode}
          onReady={onReady}
        />
      </div>

      {/* UI chrome. In capture mode it fades out, then goes fully hidden. */}
      <div
        className={`transition-opacity duration-200 motion-reduce:transition-none ${
          captureMode ? 'pointer-events-none opacity-0' : 'opacity-100'
        } ${chromeHidden ? 'invisible' : ''}`}
        aria-hidden={captureMode}
      >
        <Header />
        <Sidebar tree={places} />
        <LocationCard />
        <div className="pointer-events-none fixed right-3 top-3 z-20 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCaptureMode(true)}
              aria-label="Enter capture mode"
              className="glass-panel pointer-events-auto inline-flex items-center justify-center p-2 text-text-secondary transition-colors duration-200 hover:text-accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
            >
              <CameraIcon size={15} />
            </button>
            <LightingToggle mode={lightingMode} onToggle={toggleLightingMode} />
          </div>
          <Legend />
        </div>
      </div>

      {/* Exit-capture chip: only in capture mode, low opacity until hover/focus. */}
      {captureMode && (
        <button
          type="button"
          onClick={() => setCaptureMode(false)}
          aria-label="Exit capture mode"
          autoFocus
          className="glass-panel pointer-events-auto fixed right-3 top-3 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs text-text-secondary opacity-40 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal sm:right-4 sm:top-4"
        >
          <XIcon size={13} />
          <span>Exit</span>
        </button>
      )}

      <Preloader visible={!ready} />
    </>
  );
}

export default function HomePage() {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative h-full w-full">
      <SelectionProvider resolve={(id) => findPlace(id)}>
        <AtlasShell ready={ready} onReady={() => setReady(true)} />
      </SelectionProvider>
    </div>
  );
}
