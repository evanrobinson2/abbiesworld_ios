// The app screens the Claude-page mirror carries, in dock order. `route` is the live site path.
// crawl.mjs opens each route and records what it loads; WHOLE_DIRS are copied in full because their
// pages load files on demand (a study's pictures, a model's GLB).
export const SCREENS = [
  { id: 'sandbox', label: 'Sandbox', route: '/sandbox', icon: 'hex', wait: 20000 },
  { id: 'studies', label: 'Studies', route: '/studies/', icon: 'book' },
  { id: 'review', label: 'Inbox', route: '/review/', icon: 'inbox' },
  { id: 'models', label: 'Models', route: '/models/', icon: 'cube' },
  { id: 'cards', label: 'Cards', route: '/cards/', icon: 'cards' },
  { id: 'ranch', label: 'Ranch map', route: '/authored-ranch.html', icon: 'map' },
  { id: 'moon', label: 'Moon', route: '/moon/', icon: 'moon' },
];

export const WHOLE_DIRS = ['studies', 'review', 'models', 'cards', 'whats-new'];
export const ALWAYS = ['vendor/html2canvas-pro.min.js'];
