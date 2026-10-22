// One optical grid, stroke weight and colour contract for simulator controls.
const cube=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 4 7 0 14 4 14 12 7 16 0 12Z" fill="currentColor" fill-opacity=".1"/><path d="m0 4 7 4 7-4M7 8v8"/></g>`;
const gear=Array.from({length:32},(_,i)=>{const a=(i*11.25-5.625)*Math.PI/180,r=i%4===0||i%4===3?8:10;return `${i?'L':'M'}${12+Math.cos(a)*r},${12+Math.sin(a)*r}`;}).join('')+'Z';
const paths={
 tiles:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 ranch:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7M10 9h4"/>',
 garden:'<path d="M4 20h16M7 20v-5m5 5V9m5 11v-5M12 9C6 9 5 5 6 3c4 0 6 2 6 6Zm0 3c0-5 3-7 7-7 0 4-2 7-7 7Z"/>',
 meadow:'<path d="M3 20h18M7 20c0-5-1-8-4-10m9 10V5m5 15c0-6 1-9 4-12M12 12c-4 0-6-3-6-6 4 0 6 2 6 6Z"/>',
 rocket:'<path d="M9 15c-2-5 0-10 8-12 1 7-1 11-6 13l-2-1ZM9 9 5 10l-2 5 5-1m6 1-1 5-5 1 2-5M5 18l-2 3"/><circle cx="13" cy="8" r="1.5"/>',
 supply:'<path d="m3 7 9-4 9 4v13H3V7Zm0 0h18M12 3v17M8 12h8m-4-4v8"/>',
 follow:'<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
 interior:'<path d="M4 21V3h16v18M9 21V7h7v14M2 21h20M12 13h1"/>',

 sparkles:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
 city:'<path d="M3 21V10h6v11m0 0V3h7v18m0 0V8h5v13M2 21h20M12 6h1m-1 4h1m-1 4h1M5 13h1m-1 4h1m12-6h1m-1 4h1"/>',
 moon:'<path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 10v7M8 21h8M18 3v5m-2-3h4"/>',

 automatic:'<path d="M19 7a8 8 0 0 0-13-1L3 9m0-6v6h6M5 17a8 8 0 0 0 13 1l3-3m0 6v-6h-6"/>',
 speed:'<path d="M4 18a9 9 0 1 1 16 0M5 12h2m10 0h2M8 6l1 2m7-2-1 2M12 14l4-4"/><circle cx="12" cy="14" r="2"/>',
 slow:'<path d="m9 5 9 7-9 7ZM4 5v14"/>',
 fast:'<path d="m3 5 8 7-8 7Zm10 0 8 7-8 7Z"/>',

 cloud:'<path d="M6 18a4 4 0 0 1-1-7.9A6 6 0 0 1 16.5 8 5 5 0 0 1 18 18Z"/>',
 rain:'<path d="M5 15a3 3 0 0 1 0-6 5 5 0 0 1 10-1 4 4 0 0 1 3 7M7 18l-1 3m6-3-1 3m6-3-1 3"/>',
 wind:'<path d="M3 8h13a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3"/>',
 hail:'<path d="M5 15a3 3 0 0 1 0-6 5 5 0 0 1 10-1 4 4 0 0 1 3 7"/><circle cx="6" cy="20" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="18" cy="21" r="1"/>',
 heat:'<path d="M14 14V5a3 3 0 0 0-6 0v9a5 5 0 1 0 6 0ZM11 8v9m7-11h3m-3 5h3"/><circle cx="11" cy="18" r="1.5"/>',

 bell:'<path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4ZM10 20h4M12 2v2"/>',

 spring:'<circle cx="12" cy="10" r="2"/><path d="M10 8C5 3 3 10 8 11c-5 4 1 8 4 3 3 5 9 1 4-3 5-1 3-8-2-3 2-6-6-6-4 0ZM12 16v6m0-2 5-2"/>',
 summer:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 winter:'<path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4"/>',

 time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 season:'<path d="M20 3C9 2 3 7 4 14c1 7 11 8 14 1 2-4 2-8 2-12Z M4 21 15 10"/>',
 nature:'<path d="M12 21V10m0 6C4 17 2 11 3 7c6 0 9 3 9 9Zm0-3c0-6 4-9 9-10 1 7-2 11-9 10Z"/>',

 settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--app-paper,#fffcf0)"/><circle cx="15" cy="17" r="3" fill="var(--app-paper,#fffcf0)"/>',
 sliders:'<path d="M3 6h18M3 12h18M3 18h18"/><path d="M8 3v6M16 9v6M8 15v6"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 play:'<path d="m7 4 13 8-13 8Z"/>',
 dice:'<rect x="3" y="3" width="18" height="18" rx="4"/><g fill="currentColor" stroke="none"><circle cx="7.5" cy="7.5" r="1.25"/><circle cx="16.5" cy="7.5" r="1.25"/><circle cx="12" cy="12" r="1.25"/><circle cx="7.5" cy="16.5" r="1.25"/><circle cx="16.5" cy="16.5" r="1.25"/></g>',
 smallHex:'<path d="m12 7 4.33 2.5v5L12 17l-4.33-2.5v-5Z" fill="currentColor" fill-opacity=".1"/>',
 largeHex:'<path d="m12 2 8.66 5v10L12 22l-8.66-5V7Z" fill="currentColor" fill-opacity=".1"/>',
 cube:cube(5,4),
 cubes:'<ellipse cx="12" cy="21.5" rx="10" ry="2" fill="currentColor" fill-opacity=".18" stroke="none"/>'+cube(2,10,.7)+cube(12,10,.7)+cube(7,3,.7),
 chevron:'<path d="m7 10 5 5 5-5"/>',
 external:'<path d="M14 3h7v7M21 3 10 14M10 4H4v16h16v-6"/>'
};
export function uiIcon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]||''}</svg>`;}
