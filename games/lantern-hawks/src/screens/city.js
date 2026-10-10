// City view: one full scene image with clickable points of interest.

import * as assets from '../gfx/registry.js';
import { el } from '../ui/dom.js';

export function hotspotScene(hs, state) {
  return state.mapVariant === 'ruined' && hs.sceneAfterRaid ? hs.sceneAfterRaid : hs.scene;
}

export class CityScreen {
  constructor(game, cityId) {
    this.game = game;
    this.cityId = cityId;
    this.city = game.data.cities[cityId];
    this.allowMenu = true;
    this.hover = null;
  }

  artKey() {
    return this.game.state.mapVariant === 'ruined' ? this.city.art.ruined : this.city.art.intact;
  }

  enter() {
    const g = this.game;
    const layer = el('div', { class: 'hotspots' });
    this.city.hotspots.forEach((hs, i) => {
      const b = el('button', {
        class: `hotspot ${hs.kind === 'person' ? 'person' : ''}`,
        style: { left: `${hs.x * 100}%`, top: `${hs.y * 100}%`, width: `${hs.w * 100}%`, height: `${hs.h * 100}%` },
        title: hs.label,
        'aria-label': hs.label,
        onclick: () => g.openScene(hotspotScene(hs, g.state), { kind: 'city', city: this.cityId }),
        onmouseenter: () => { this.hover = i; },
        onmouseleave: () => { this.hover = null; },
        onfocus: () => { this.hover = i; },
      }, el('span', { class: hs.y < 0.12 ? 'pin pin-in' : 'pin' }, hs.label));
      layer.append(b);
    });
    const ruined = g.state.mapVariant === 'ruined';
    g.overlay.append(
      layer,
      el('div', { class: 'city-name' }, `${this.city.label}${ruined ? ' (occupied)' : ''}`),
      el('button', { class: 'leave-city', onclick: () => g.toMap() }, 'To the map'),
      el('button', { class: 'menu-btn', onclick: () => g.openMenu() }, 'Menu'),
    );
  }

  render(g) {
    g.drawImage(assets.get(this.artKey()), 0, 0, 320, 180);
    if (this.hover !== null) {
      const hs = this.city.hotspots[this.hover];
      g.strokeStyle = '#ffd77a';
      g.strokeRect(Math.round(hs.x * 320) + 0.5, Math.round(hs.y * 180) + 0.5, Math.round(hs.w * 320) - 1, Math.round(hs.h * 180) - 1);
    }
  }
}
