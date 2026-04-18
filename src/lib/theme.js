export const T = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  border: '#E4E8F0',
  text: '#16191F',
  sub: '#6B7585',
  faint: '#9CA3AF',
  accent: '#0A6EFF',
  accentBg: '#EBF3FF',
  success: '#0C8A5F',
  successBg: '#E8F8F3',
  danger: '#D92B3A',
  dangerBg: '#FEF2F2',
  warn: '#B86800',
  warnBg: '#FFF7E6',
  navy: '#0C1623',
  navyMid: '#132032',
  radius: 14,
  radiusSm: 9,
  sidebarW: 224,
  sidebarCollapsed: 64,
}

export const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'DM Sans', sans-serif;
  background: ${T.bg};
  color: ${T.text};
  -webkit-font-smoothing: antialiased;
}
input, select, textarea, button { font-family: inherit; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.au { animation: fadeUp .32s ease both; }
`

export const SC = {
  pending:     { bg: T.warnBg,    color: T.warn,    dot: '#F59E0B', label: 'Pending' },
  'in-transit':{ bg: T.accentBg,  color: T.accent,  dot: T.accent,  label: 'In Transit' },
  delivered:   { bg: T.successBg, color: T.success,  dot: T.success, label: 'Delivered' },
  cancelled:   { bg: T.dangerBg,  color: T.danger,   dot: T.danger,  label: 'Cancelled' },
  active:      { bg: T.successBg, color: T.success,  dot: T.success, label: 'Active' },
  sanctioned:  { bg: T.dangerBg,  color: T.danger,   dot: T.danger,  label: 'Sanctioned' },
  suspended:   { bg: T.warnBg,    color: T.warn,     dot: '#F59E0B', label: 'Suspended' },
}
