interface PreloaderProps {
  visible: boolean;
}

/**
 * Full-screen overlay shown while the globe textures are loading. Pulses
 * gently, then fades out (via opacity transition) once `visible` is false.
 */
export default function Preloader({ visible }: PreloaderProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-bg-primary transition-opacity duration-700 ease-out ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div className="flex flex-col items-center gap-3 animate-pulse-slow">
        <span className="h-2 w-2 rounded-full bg-accent-teal" aria-hidden="true" />
        <p className="font-display text-sm uppercase tracking-[0.4em] text-text-secondary">atlas</p>
      </div>
    </div>
  );
}
