import { tokens } from '@/data/tokens';
import type { Category } from '@/lib/types';

const LEGEND_ITEMS: { category: Category; label: string }[] = [
  { category: 'lived', label: 'Lived' },
  { category: 'vacationed', label: 'Vacationed' },
  { category: 'work', label: 'Work / Mission' },
  { category: 'planned', label: 'Planned' },
];

/**
 * Small fixed glass chip listing all four place categories. Always renders
 * all four entries, even ones with zero current entries (e.g. "planned").
 */
export default function Legend() {
  return (
    <div className="glass-panel pointer-events-none fixed right-3 top-3 z-20 px-3 py-2 sm:right-4 sm:top-4">
      <ul className="flex flex-col gap-1.5">
        {LEGEND_ITEMS.map(({ category, label }) => (
          <li key={category} className="flex items-center gap-2 font-body text-[11px] text-text-secondary">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: tokens.category[category] }}
              aria-hidden="true"
            />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
