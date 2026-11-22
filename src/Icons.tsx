/** Ícones desenhados (traço arredondado, estilo minimalista). Herdam a cor do texto. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconChat = () => (
  <svg {...base}>
    <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    <path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01" strokeWidth="3.2" />
  </svg>
)

export const IconBowl = () => (
  <svg {...base}>
    <path d="M3 11h18a9 9 0 0 1-18 0Z" />
    <path d="M9 7c0-1.5 1-2 1-3.5M13 7c0-1.5 1-2 1-3.5" />
  </svg>
)

export const IconHome = () => (
  <svg {...base}>
    <path d="M3.5 10.5 12 4l8.5 6.5" />
    <path d="M5.5 9v10a1 1 0 0 0 1 1h3.5v-5.5h4V20h3.5a1 1 0 0 0 1-1V9" />
  </svg>
)

export const IconDumbbell = () => (
  <svg {...base}>
    <path d="M7 7v10M17 7v10M4 9.5v5M20 9.5v5M7 12h10" />
  </svg>
)

export const IconChart = () => (
  <svg {...base}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)

export const IconUser = () => (
  <svg {...base}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
)
