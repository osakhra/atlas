/**
 * Canonical design tokens as TypeScript constants.
 *
 * Use these when working outside Tailwind (canvas drawing, inline styles,
 * shader uniforms, etc). When updating values here, also update
 * src/app/globals.css (the CSS custom properties — the source of truth).
 *
 * This is the dark-only palette for atlas.andrewcastor.dev. There is no
 * light mode.
 */

export const tokens = {
  bg: {
    primary:  '#080B12',
    secondary: '#0D1117',
    tertiary:  '#131A24',
    terminal:  '#0A0E18',
  },
  accent: {
    teal:         '#1E9E8A',
    tealDim:      '#17796A',
    tealGlow:     'rgba(30, 158, 138, 0.4)',
    purple:       '#5B2D8E',
    purpleSoft:   '#B89CE0',
    purpleBright: '#9B6FD4',
  },
  text: {
    primary:   '#D5DDE0',
    secondary: '#B5BEC8',
    tertiary:  '#A8B2BF',
    muted:     '#7E8898',
  },
  border: {
    subtle:  '#1E2737',
    default: '#2A3444',
    accent:  'rgba(30, 158, 138, 0.4)',
  },
  /** Pin / legend colors per place category. */
  category: {
    lived:      '#1E9E8A',
    vacationed: '#9B6FD4',
    work:       '#C9922A',
    planned:    '#8294A6',
  },
  /** Globe atmosphere rim color. Physical pale blue, not the brand teal. */
  atmosphere: '#7FB7E3',
  /** Semantic tokens — status, finance, feedback */
  semantic: {
    gold:       '#C9922A',
    goldBright: '#E6B547',
    danger:     '#E5484D',
    warn:       '#F5A524',
    ok:         '#46A758',
  },
  font: {
    display: 'Sora, system-ui, sans-serif',
    body:    'Outfit, system-ui, sans-serif',
    mono:    '"JetBrains Mono", monospace',
  },
} as const;

export type Tokens = typeof tokens;
