// Floating hover/focus bubbles disabled at Evan's request. Keep control labels intact.
export function attachTrayTooltips(){document.getElementById('scene-tray-tooltip')?.remove();return {hide(){},dispose(){}};}
