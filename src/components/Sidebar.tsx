'use client';

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { tokens } from '@/data/tokens';
import { useSelection } from '@/lib/selection';
import type { Place } from '@/lib/types';
import { ChevronDownIcon, ChevronRightIcon, MenuIcon, XIcon } from './icons/Icons';

interface SidebarProps {
  tree: Place[];
}

/** A flattened, visibility-aware row used for keyboard navigation and rendering. */
interface VisibleRow {
  place: Place;
  depth: number;
  isLeaf: boolean;
}

/**
 * Recursively builds the list of currently-visible rows, skipping the
 * children of collapsed branches.
 */
function buildVisibleRows(nodes: Place[], depth: number, expanded: Set<string>, out: VisibleRow[]) {
  for (const node of nodes) {
    const isLeaf = !node.children || node.children.length === 0;
    out.push({ place: node, depth, isLeaf });
    if (!isLeaf && expanded.has(node.id)) {
      buildVisibleRows(node.children!, depth + 1, expanded, out);
    }
  }
}

/** Recursively collects every branch node id so the tree starts fully expanded. */
function collectBranchIds(nodes: Place[], out: Set<string>) {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      out.add(node.id);
      collectBranchIds(node.children, out);
    }
  }
}

export default function Sidebar({ tree }: SidebarProps) {
  const { selected, select } = useSelection();
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    collectBranchIds(tree, ids);
    return ids;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const visibleRows = useMemo(() => {
    const out: VisibleRow[] = [];
    buildVisibleRows(tree, 0, expanded, out);
    return out;
  }, [tree, expanded]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const focusRow = useCallback((id: string) => {
    setFocusedId(id);
    const el = rowRefs.current.get(id);
    el?.focus();
  }, []);

  const handleActivate = useCallback(
    (row: VisibleRow) => {
      if (row.isLeaf) {
        select(row.place.id);
      } else {
        toggleExpanded(row.place.id);
      }
    },
    [select, toggleExpanded]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, row: VisibleRow) => {
      const index = visibleRows.findIndex((r) => r.place.id === row.place.id);

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const next = visibleRows[index + 1];
          if (next) focusRow(next.place.id);
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prev = visibleRows[index - 1];
          if (prev) focusRow(prev.place.id);
          break;
        }
        case 'ArrowRight': {
          if (!row.isLeaf) {
            event.preventDefault();
            if (!expanded.has(row.place.id)) {
              toggleExpanded(row.place.id);
            } else {
              const next = visibleRows[index + 1];
              if (next) focusRow(next.place.id);
            }
          }
          break;
        }
        case 'ArrowLeft': {
          if (!row.isLeaf && expanded.has(row.place.id)) {
            event.preventDefault();
            toggleExpanded(row.place.id);
          } else if (row.depth > 0) {
            event.preventDefault();
            // Move focus to the parent row (the nearest preceding row with a smaller depth).
            for (let i = index - 1; i >= 0; i--) {
              if (visibleRows[i].depth < row.depth) {
                focusRow(visibleRows[i].place.id);
                break;
              }
            }
          }
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          handleActivate(row);
          break;
        }
        default:
          break;
      }
    },
    [visibleRows, expanded, toggleExpanded, focusRow, handleActivate]
  );

  const renderRow = (row: VisibleRow) => {
    const { place, depth, isLeaf } = row;
    const isExpanded = !isLeaf && expanded.has(place.id);
    const isSelected = selected?.id === place.id;
    const isFocused = focusedId === place.id || (focusedId === null && visibleRows[0]?.place.id === place.id);

    return (
      <div
        key={place.id}
        ref={(el) => {
          if (el) rowRefs.current.set(place.id, el);
          else rowRefs.current.delete(place.id);
        }}
        role="treeitem"
        aria-expanded={isLeaf ? undefined : isExpanded}
        aria-selected={isLeaf ? isSelected : undefined}
        aria-level={depth + 1}
        tabIndex={isFocused ? 0 : -1}
        onFocus={() => setFocusedId(place.id)}
        onKeyDown={(e) => handleKeyDown(e, row)}
        onClick={() => handleActivate(row)}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 font-display text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:ring-inset ${
          isSelected
            ? 'bg-accent-teal/10 text-accent-teal'
            : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
        }`}
      >
        {!isLeaf && (
          <span className="shrink-0 text-text-muted" aria-hidden="true">
            {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </span>
        )}
        {isLeaf && place.category && (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: tokens.category[place.category] }}
            aria-hidden="true"
          />
        )}
        {isLeaf && !place.category && <span className="inline-block h-2 w-2 shrink-0" aria-hidden="true" />}
        <span className="truncate">{place.name}</span>
      </div>
    );
  };

  const treeContent = (
    <div role="tree" aria-label="Places" className="flex flex-col gap-0.5 overflow-y-auto">
      {visibleRows.map(renderRow)}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Place navigation"
        className="glass-panel pointer-events-auto fixed left-4 top-1/2 z-20 hidden max-h-[70vh] w-[300px] -translate-y-1/2 flex-col overflow-hidden p-3 md:flex"
      >
        <h2 className="ac-label px-2">Places</h2>
        {treeContent}
      </nav>

      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-mobile-sheet"
        className="glass-panel pointer-events-auto fixed bottom-3 left-3 z-30 flex items-center gap-2 px-3 py-2.5 font-body text-xs text-text-secondary transition-colors duration-200 hover:text-accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal md:hidden"
      >
        {mobileOpen ? <XIcon size={16} /> : <MenuIcon size={16} />}
        <span>Places</span>
      </button>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <div
          id="sidebar-mobile-sheet"
          className="glass-panel pointer-events-auto fixed bottom-16 left-3 right-3 z-30 max-h-[50vh] overflow-hidden p-3 md:hidden"
        >
          <h2 className="ac-label px-2">Places</h2>
          {treeContent}
        </div>
      )}
    </>
  );
}
