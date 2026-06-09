'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Legend from '@/components/Legend';
import LocationCard from '@/components/LocationCard';
import Preloader from '@/components/Preloader';
import Sidebar from '@/components/Sidebar';
import { places } from '@/data/places';
import { flattenPlaces, findPlace } from '@/lib/geo';
import { SelectionProvider, useSelection } from '@/lib/selection';

const GlobeScene = dynamic(() => import('@/components/GlobeScene'), { ssr: false });

const flatPlaces = flattenPlaces(places);

/**
 * Inner shell, rendered inside SelectionProvider so it can read the current
 * selection and pass `selectedId` through to GlobeScene.
 */
function AtlasShell({ ready, onReady }: { ready: boolean; onReady: () => void }) {
  const { selected, select } = useSelection();

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
        <GlobeScene places={flatPlaces} selectedId={selected?.id ?? null} onReady={onReady} />
      </div>

      <Header />
      <Sidebar tree={places} />
      <LocationCard />
      <Legend />
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
