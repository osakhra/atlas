import { siteConfig } from '@/data/site';

/**
 * Minimal fixed header, top-left. Terminal-prompt style with a blinking
 * teal cursor. Links back to the main portfolio site.
 */
export default function Header() {
  return (
    <header className="pointer-events-none fixed left-3 top-3 z-20 sm:left-4 sm:top-4">
      <a
        href={siteConfig.links.home}
        className="glass-panel pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors duration-200 hover:text-accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal"
      >
        <span>~/atlas</span>
        <span className="text-accent-teal animate-blink" aria-hidden="true">
          _
        </span>
      </a>
    </header>
  );
}
