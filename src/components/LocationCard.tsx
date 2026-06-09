'use client';

import { tokens } from '@/data/tokens';
import { useSelection } from '@/lib/selection';
import type { Category } from '@/lib/types';
import { XIcon } from './icons/Icons';

const CATEGORY_LABELS: Record<Category, string> = {
  lived: 'Lived',
  vacationed: 'Vacationed',
  work: 'Work / Mission',
  planned: 'Planned',
};

/**
 * Reads the current selection and renders details about it:
 * - Nothing if nothing is selected.
 * - A minimal glass chip with just the name for non-leaf nodes (continents,
 *   countries, states, islands without their own coordinates/category).
 * - A full glass card for leaves (places with a category).
 */
export default function LocationCard() {
  const { selected, clear } = useSelection();

  if (!selected) return null;

  const hasSpots = !!selected.bestSpots && selected.bestSpots.length > 0;
  const hasNote = !!selected.note && selected.note.trim().length > 0;

  // Non-leaf node (continent / country / state / island grouping): minimal chip.
  if (!selected.category) {
    return (
      <div
        className="glass-panel pointer-events-auto fixed bottom-3 right-3 z-30 max-w-[calc(100vw-1.5rem)] px-4 py-2.5 sm:bottom-4 sm:right-4 sm:max-w-xs"
        role="status"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate font-display text-sm font-medium text-text-primary">{selected.name}</h2>
          <button
            type="button"
            onClick={clear}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-text-muted transition-colors duration-200 hover:text-accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>
    );
  }

  const categoryColor = tokens.category[selected.category];
  const categoryLabel = CATEGORY_LABELS[selected.category];

  return (
    <div
      className="glass-panel pointer-events-auto fixed bottom-3 right-3 z-30 w-[calc(100vw-1.5rem)] max-w-sm px-4 py-4 sm:bottom-4 sm:right-4 sm:w-auto"
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-text-primary">{selected.name}</h2>
        <button
          type="button"
          onClick={clear}
          aria-label="Close"
          className="shrink-0 rounded-md p-1 text-text-muted transition-colors duration-200 hover:text-accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColor }}
          aria-hidden="true"
        />
        <span className="font-body text-xs text-text-secondary">{categoryLabel}</span>
      </div>

      {selected.lat !== undefined && selected.lng !== undefined && (
        <p className="mt-2 font-mono text-[11px] text-text-muted">
          {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
        </p>
      )}

      {hasSpots && (
        <div className="mt-3">
          <span className="ac-label">Best spots</span>
          <ul className="flex flex-col gap-1">
            {selected.bestSpots!.map((spot) => (
              <li key={spot} className="font-body text-[13px] text-text-secondary">
                · {spot}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasNote && (
        <div className="mt-3">
          <span className="ac-label">Note</span>
          <p className="font-body text-[13px] leading-relaxed text-text-secondary">{selected.note}</p>
        </div>
      )}
    </div>
  );
}
