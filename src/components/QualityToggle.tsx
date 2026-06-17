import { ZapIcon, SparkleIcon } from './icons/Icons';

interface QualityToggleProps {
  mode: 'quality' | 'performance';
  onToggle: () => void;
}

export default function QualityToggle({ mode, onToggle }: QualityToggleProps) {
  const isPerf = mode === 'performance';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isPerf}
      aria-label={isPerf ? 'Switch to quality mode' : 'Switch to performance mode'}
      title={isPerf ? 'Performance mode · click for quality' : 'Quality mode · click for performance'}
      className="glass-panel pointer-events-auto inline-flex items-center justify-center p-2 text-text-secondary transition-colors duration-200 hover:text-accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
    >
      {isPerf ? <ZapIcon size={15} /> : <SparkleIcon size={15} />}
    </button>
  );
}
