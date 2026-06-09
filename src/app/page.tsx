'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
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
  const { selected } = useSelection();

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
