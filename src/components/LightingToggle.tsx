import type { LightingMode } from '@/lib/sun';
import { MoonIcon, SunIcon } from './icons/Icons';

interface LightingToggleProps {
  mode: LightingMode;
  onToggle: () => void;
}

/**
 * Small glass icon button that switches between day and night lighting.
 * Shows a sun in day mode (click to switch to night) and a moon in night
 * mode (click to switch to day).
 */
export default function LightingToggle({ mode, onToggle }: LightingToggleProps) {
  const isDay = mode === 'day';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!isDay}
      aria-label={isDay ? 'Switch to night mode' : 'Switch to day mode'}
      className="glass-panel pointer-events-auto inline-flex items-center justify-center p-2 text-text-secondary transition-colors duration-200 hover:text-accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
    >
      {isDay ? <SunIcon size={15} /> : <MoonIcon size={15} />}
    </button>
  );
}
