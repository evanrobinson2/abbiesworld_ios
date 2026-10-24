// The icons the chronograph (chrono.mjs) asks for, for pages that don't build ui-v2's own set (chrono-host.mjs).
const svg = (body, view = '0 0 24 24') => `<svg viewBox="${view}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const ICONS = {
  pause: svg('<path d="M9 5v14M15 5v14" stroke-width="3"/>'),
  play: svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  plus: svg('<path d="M12 6v12M6 12h12" stroke-width="2.4"/>'),
  todo: svg('<path d="M9 7h11M9 12h11M9 17h11"/><path d="m3.5 7 1.2 1.2L7 5.8M3.5 12l1.2 1.2L7 10.8"/>'),
  guests: svg('<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.5-4 3-6 5.5-6s5 2 5.5 6M13.5 19.5c.4-3 2-4.5 3.5-4.5s3.2 1.5 3.5 4.5"/>'),
  hungry: svg('<path d="M4 13h16l-1.5 6h-13z"/><path d="M8 13c0-3 1.5-5 4-5s4 2 4 5"/>'),
  feed: svg('<path d="M5 20 7 8h10l2 12z"/><path d="M9 8c0-2 1-4 3-4s3 2 3 4M9 13h6"/>'),
  water: svg('<path d="M12 3c3.5 4.5 6 7.7 6 11a6 6 0 0 1-12 0c0-3.3 2.5-6.5 6-11z"/>'),
  people: svg('<circle cx="12" cy="7" r="3.5"/><path d="M5 21c.6-5 3.4-7.5 7-7.5s6.4 2.5 7 7.5"/>'),
  season: svg('<path d="M12 21c-4-3-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-3 8-7 11z"/><path d="M12 21V9"/>'),
  seasonSpring: svg('<path d="M12 21v-8M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 13c4 0 6-3 6-7-4 0-6 3-6 7z"/>'),
  seasonSummer: svg('<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>'),
  seasonAutumn: svg('<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z"/><path d="M5 19 13 11"/>'),
  seasonWinter: svg('<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>')
};
