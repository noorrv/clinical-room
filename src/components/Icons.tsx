import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...rest,
  };
}

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 12h14.5" />
    <path d="M13.5 6.5 19 12l-5.5 5.5" />
  </svg>
);

export const Search = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 4.5 4.5" />
  </svg>
);

export const Bell = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </svg>
);

export const Menu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const Close = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m7 10 5 5 5-5" />
  </svg>
);

export const Play = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M9 6.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4l-8.3-5.2A.8.8 0 0 0 9 6.8z" />
  </svg>
);

export const Pause = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="7" y="6" width="3.4" height="12" rx="1" />
    <rect x="13.6" y="6" width="3.4" height="12" rx="1" />
  </svg>
);

export const Stop = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="7" y="7" width="10" height="10" rx="1.4" />
  </svg>
);

export const Calendar = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 16.5h.01M12 16.5h.01" strokeWidth="2.2" />
  </svg>
);

export const Document = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5z" />
    <path d="M14 3.5V8h4M9 12h6M9 15.5h6" />
  </svg>
);

/* Specialty marks — drawn a little heavier, like engraved book ornaments */
const mark = (p: IconProps) => ({ ...base({ size: 40, ...p }), viewBox: '0 0 40 40', strokeWidth: 1.6 });

export const Stethoscope = (p: IconProps) => (
  <svg {...mark(p)}>
    <path d="M9 5.5H7.5v9a7.5 7.5 0 0 0 15 0v-9H21" />
    <path d="M15 22v4.5a7 7 0 0 0 14 0V22" />
    <circle cx="29" cy="18.5" r="3.5" />
    <circle cx="29" cy="18.5" r="1" fill="currentColor" />
    <path d="M9 4v3M21 4v3" />
  </svg>
);

export const Scissors = (p: IconProps) => (
  <svg {...mark(p)}>
    <circle cx="10.5" cy="29" r="5" />
    <circle cx="29.5" cy="29" r="5" />
    <path d="M13.8 25.3 27 5.5M26.2 25.3 13 5.5" />
    <circle cx="20" cy="17.4" r="1" fill="currentColor" />
  </svg>
);

export const Venus = (p: IconProps) => (
  <svg {...mark(p)}>
    <circle cx="20" cy="14" r="9" />
    <path d="M20 23v13M14.5 30.5h11" />
  </svg>
);

export const TeddyBear = (p: IconProps) => (
  <svg {...mark(p)}>
    <circle cx="12" cy="8.5" r="3.6" />
    <circle cx="28" cy="8.5" r="3.6" />
    <circle cx="20" cy="14" r="8" />
    <ellipse cx="20" cy="17" rx="3.4" ry="2.6" />
    <path d="M19 16.4h2" strokeWidth="2" />
    <circle cx="17" cy="12.4" r=".7" fill="currentColor" />
    <circle cx="23" cy="12.4" r=".7" fill="currentColor" />
    <path d="M13.2 22.5C10 24.5 9 28.5 10.5 32a4 4 0 0 0 4 2.5h11a4 4 0 0 0 4-2.5c1.5-3.5.5-7.5-2.7-9.5" />
    <circle cx="20" cy="28.5" r="3.4" />
    <path d="M11.2 25.8 7.8 24M28.8 25.8l3.4-1.8" />
  </svg>
);

export const Sparkle = ({ size = 18, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false} {...rest}>
    <path
      d="M12 1.5c.5 4.7 1.4 8.3 2.4 9.1 1 .8 4.3 1.1 8.1 1.4-3.8.3-7.1.6-8.1 1.4-1 .8-1.9 4.4-2.4 9.1-.5-4.7-1.4-8.3-2.4-9.1-1-.8-4.3-1.1-8.1-1.4 3.8-.3 7.1-.6 8.1-1.4 1-.8 1.9-4.4 2.4-9.1z"
      fill="currentColor"
    />
  </svg>
);
