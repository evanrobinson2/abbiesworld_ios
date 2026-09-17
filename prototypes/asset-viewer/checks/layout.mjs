// Layout check for the browser-friendly claims.
//
// The other checks are pure functions, so node:test can hold them. Layout
// cannot be asserted that way — it only exists once a browser has applied the
// CSS at a given width. This drives a real browser at three sizes and prints a
// readable report, so the claims stay inspectable instead of becoming a
// screenshot somebody took once.
//
//   npm run build && npm start -- --port 5174
//   npm run layout
//
// Pass a different origin with LAYOUT_URL if the server is elsewhere.

const URL = process.env.LAYOUT_URL ?? 'http://localhost:5174';

// Below this width the filter rows fold behind the Filters button. Kept in step
// with the 900px breakpoint in globals.css.
const FOLD_WIDTH = 900;
const MIN_TAP = 44; // WCAG 2.5.8 target size (minimum)
const MIN_INPUT_FONT = 16; // below this, iOS Safari zooms the page on focus

// maxScreens is how far down the first piece of art is allowed to sit. Touch
// sizes get the tight budget because scrolling is the whole cost there. Desktop
// gets a looser one on purpose: above the fold width every filter row is shown
// outright, which is worth a little scroll when you have a mouse and a wheel.
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, touch: true, maxScreens: 1.2 },
  { name: 'tablet portrait', width: 820, height: 1180, touch: true, maxScreens: 1.2 },
  { name: 'desktop', width: 1440, height: 900, touch: false, maxScreens: 1.6 },
];

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('This check needs playwright:\n  npm install\n  npx playwright install chromium');
  process.exit(2);
}

function measure({ minTap, minFont }) {
  const interactive = [...document.querySelectorAll('button, a, select, input, summary')]
    .map((element) => {
      const box = element.getBoundingClientRect();
      return {
        label: `${element.tagName.toLowerCase()}.${element.className?.toString().slice(0, 30)}`,
        // Inline links live inside a sentence, which WCAG 2.5.8 exempts from
        // the target size rule; sizing them to 44px would wreck the prose.
        inline: element.classList.contains('linkish'),
        side: Math.min(box.width, box.height),
        visible: box.height > 0,
      };
    })
    .filter((item) => item.visible);

  const smallFonts = [...document.querySelectorAll('input, select, textarea')]
    .filter((element) => element.getBoundingClientRect().height > 0)
    .map((element) => ({
      label: `${element.tagName.toLowerCase()}.${element.className?.toString().slice(0, 30)}`,
      size: Number.parseFloat(getComputedStyle(element).fontSize),
    }))
    .filter((item) => item.size < minFont);

  const firstCard = document.querySelector('.card');
  const tray = document.querySelector('.tray');
  const panel = document.querySelector('.filters');

  return {
    overflowBy: document.documentElement.scrollWidth - window.innerWidth,
    tooSmall: interactive.filter((item) => !item.inline && item.side < minTap),
    interactiveCount: interactive.length,
    smallFonts,
    firstCardTop: firstCard ? firstCard.getBoundingClientRect().top : null,
    trayHeight: tray ? tray.getBoundingClientRect().height : null,
    filtersVisible: panel ? getComputedStyle(panel).display !== 'none' : null,
    coarse: window.matchMedia('(pointer: coarse)').matches,
  };
}

const failures = [];
const browser = await chromium.launch();

for (const view of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    isMobile: view.touch,
    hasTouch: view.touch,
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('.card');

  const found = await page.evaluate(measure, { minTap: MIN_TAP, minFont: MIN_INPUT_FONT });
  const screens = found.firstCardTop / view.height;
  const trayShare = found.trayHeight / view.height;
  const shouldFold = view.width <= FOLD_WIDTH;

  const report = [];
  const check = (ok, text) => {
    report.push(`    ${ok ? 'ok  ' : 'FAIL'}  ${text}`);
    if (!ok) failures.push(`${view.name}: ${text}`);
  };

  console.log(`\n  ${view.name} — ${view.width}x${view.height}${view.touch ? ', touch' : ''}`);

  check(found.overflowBy <= 1, `no sideways scrolling (overflows by ${found.overflowBy}px)`);

  check(
    screens <= view.maxScreens,
    `first artwork within ${view.maxScreens} screens (at ${Math.round(found.firstCardTop)}px, ${screens.toFixed(1)} screens down)`,
  );

  check(
    trayShare <= 0.15,
    `empty recipe tray under 15% of the screen (${Math.round(found.trayHeight)}px, ${Math.round(trayShare * 100)}%)`,
  );

  check(
    found.filtersVisible === !shouldFold,
    shouldFold
      ? 'filter rows folded away until asked for'
      : 'filter rows shown outright, no toggle needed',
  );

  if (view.touch) {
    check(found.coarse, 'browser reports a coarse pointer, so the touch rules apply');
    check(
      found.tooSmall.length === 0,
      `all ${found.interactiveCount} targets at least ${MIN_TAP}px${
        found.tooSmall.length
          ? ` — ${found.tooSmall.length} too small, e.g. ${found.tooSmall
              .slice(0, 3)
              .map((item) => `${item.label} at ${Math.round(item.side)}px`)
              .join(', ')}`
          : ''
      }`,
    );
    check(
      found.smallFonts.length === 0,
      `every field at least ${MIN_INPUT_FONT}px so iOS will not zoom${
        found.smallFonts.length
          ? ` — ${found.smallFonts.map((item) => `${item.label} at ${item.size}px`).join(', ')}`
          : ''
      }`,
    );
  }

  console.log(report.join('\n'));
  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.log(`\n  ${failures.length} failed:`);
  for (const failure of failures) console.log(`    - ${failure}`);
  process.exit(1);
}

console.log('\n  All viewports pass.\n');
