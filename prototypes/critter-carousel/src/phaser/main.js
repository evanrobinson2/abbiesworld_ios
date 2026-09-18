// Phaser is only a renderer here. It owns no game state: every frame it hands
// the elapsed delta to the pure core and draws whatever comes back.
//
// Input is a single tap anywhere on the canvas, plus the spacebar. No drag,
// no pinch, no swipe — so the same inputs a script can send are the only ones
// a player has.

import Phaser from 'phaser';

import {
  CELEBRATE_MS,
  createGame,
  currentStage,
  recipe,
  renderText,
  spotlight,
  stagePrompt,
  tap,
  tick,
} from '../core/machine.js';
import { laneFor } from '../core/catalog.js';
import { composePrompt } from '../core/prompt.js';

const WIDTH = 1024;
const HEIGHT = 768;
const CARD_W = 190;
const CARD_H = 230;
const CARD_GAP = 40;

const STAGE_TINTS = {
  creature: 0x5b8def,
  outfit: 0xef6c8d,
  buddy: 0x46b98a,
};

class CarouselScene extends Phaser.Scene {
  constructor() {
    super('carousel');
    this.state = createGame({ seed: Number(new URLSearchParams(location.search).get('seed') ?? 1) });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1d2233');

    this.laneLayer = this.add.container(0, 0);
    this.spotlightRing = this.add
      .rectangle(WIDTH / 2, HEIGHT / 2, CARD_W + 26, CARD_H + 26, 0x000000, 0)
      .setStrokeStyle(8, 0xffd166)
      .setDepth(5);

    this.promptText = this.add
      .text(WIDTH / 2, 84, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.gotItText = this.add
      .text(WIDTH / 2, HEIGHT / 2, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#1d2233',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.picksText = this.add
      .text(WIDTH / 2, HEIGHT - 120, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#c9d4f0',
        align: 'center',
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(WIDTH / 2, HEIGHT - 48, 'TAP ANYWHERE', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.input.on('pointerdown', () => this.doTap());
    this.input.keyboard.on('keydown-SPACE', () => this.doTap());

    this.buildLane();
    this.exposeDebugApi();
  }

  doTap() {
    this.state = tap(this.state);
    if (currentStage(this.state) !== this.laneStage) this.buildLane();
  }

  buildLane() {
    this.laneLayer.removeAll(true);
    this.laneStage = currentStage(this.state);
    this.cards = [];
    const lane = laneFor(this.laneStage ?? 'creature');
    const tint = STAGE_TINTS[this.laneStage] ?? 0x888888;

    // Two copies of the lane so the loop never shows a gap.
    for (let copy = 0; copy < 2; copy += 1) {
      lane.forEach((entry, index) => {
        const container = this.add.container(0, HEIGHT / 2);
        const body = this.add
          .rectangle(0, 0, CARD_W, CARD_H, tint)
          .setStrokeStyle(5, 0xffffff, 0.9);
        const label = this.add
          .text(0, 0, entry.name, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: CARD_W - 28 },
          })
          .setOrigin(0.5);
        container.add([body, label]);
        container.setData('slot', copy * lane.length + index);
        this.laneLayer.add(container);
        this.cards.push(container);
      });
    }
  }

  update(_time, delta) {
    this.state = tick(this.state, delta);
    if (currentStage(this.state) !== this.laneStage) this.buildLane();
    this.draw();
  }

  draw() {
    const stage = currentStage(this.state);
    const lane = laneFor(stage ?? 'creature');
    const spacing = CARD_W + CARD_GAP;
    const loopWidth = spacing * lane.length;

    if (stage) {
      const shot = spotlight(this.state);
      // Cards slide right to left; the spotlighted one sits dead center.
      const offset = (shot.position * spacing) % loopWidth;
      for (const card of this.cards) {
        const slot = card.getData('slot');
        let x = WIDTH / 2 + slot * spacing - offset;
        // Wrap into a window centered on the screen.
        while (x < WIDTH / 2 - loopWidth / 2) x += loopWidth;
        while (x > WIDTH / 2 + loopWidth / 2) x -= loopWidth;
        card.setX(x);
        const closeness = 1 - Math.min(1, Math.abs(x - WIDTH / 2) / (spacing * 1.6));
        card.setScale(0.72 + closeness * 0.38);
        card.setAlpha(0.35 + closeness * 0.65);
        card.setDepth(Math.round(closeness * 10));
      }
      this.spotlightRing.setVisible(true);
      this.spotlightRing.setStrokeStyle(8, shot.isBlend ? 0xff8fd1 : 0xffd166);
      this.promptText.setText(stagePrompt(this.state));
    } else {
      this.spotlightRing.setVisible(false);
      for (const card of this.cards) card.setVisible(false);
      const composed = composePrompt(recipe(this.state) ?? {});
      this.promptText.setText(composed.ok ? composed.title : 'Look what you made!');
    }

    if (this.state.phase === 'celebrating') {
      const last = this.state.picks[this.state.picks.length - 1];
      this.gotItText.setText(`${last.name}!${last.surprise ? '\nsurprise!' : ''}`);
      const progress = 1 - this.state.celebrateRemaining / CELEBRATE_MS;
      this.gotItText.setAlpha(Math.sin(Math.PI * Math.min(1, progress)) * 1.2);
    } else {
      this.gotItText.setText('');
    }

    this.picksText.setText(
      this.state.picks.map((p) => `${p.name}${p.surprise ? ' *' : ''}`).join('   +   ')
    );
    this.hintText.setText(this.state.phase === 'done' ? 'TAP TO PLAY AGAIN' : 'TAP ANYWHERE');
  }

  // Everything a headless driver needs, and nothing that requires a gesture.
  exposeDebugApi() {
    window.__CAROUSEL__ = {
      state: () => structuredClone(this.state),
      text: () => renderText(this.state),
      recipe: () => recipe(this.state),
      card: () => {
        const result = recipe(this.state);
        return result ? composePrompt(result) : null;
      },
      tap: () => {
        this.doTap();
        return renderText(this.state);
      },
      advance: (ms) => {
        this.state = tick(this.state, ms);
        if (currentStage(this.state) !== this.laneStage) this.buildLane();
        return renderText(this.state);
      },
      reset: (seed = 1) => {
        this.state = createGame({ seed });
        this.buildLane();
        return renderText(this.state);
      },
    };
    console.log('window.__CAROUSEL__ ready: state/text/recipe/card/tap/advance/reset');
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#1d2233',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [CarouselScene],
});
