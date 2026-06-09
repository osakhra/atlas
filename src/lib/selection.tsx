'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Place } from './types';

interface SelectionContextValue {
  selected: Place | null;
  select: (id: string) => void;
  clear: () => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

interface SelectionProviderProps {
  children: ReactNode;
  /** Resolves a place id to a Place. Wired to geo.ts findPlace during integration. */
  resolve?: (id: string) => Place | null;
}

export function SelectionProvider({ children, resolve }: SelectionProviderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const select = useCallback((id: string) => setSelectedId(id), []);
  const clear = useCallback(() => setSelectedId(null), []);

  const selected = useMemo<Place | null>(() => {
    if (!selectedId || !resolve) return null;
    return resolve(selectedId);
  }, [selectedId, resolve]);

  const value = useMemo<SelectionContextValue>(
    () => ({ selected, select, clear }),
    [selected, select, clear]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within a SelectionProvider');
  return ctx;
}
