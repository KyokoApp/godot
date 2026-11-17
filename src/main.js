import Phaser from 'phaser';
import { ArenaScene } from './arena/ArenaScene.js';

const params = new URLSearchParams(location.search);
const overlay = params.get('overlay') === '1';
const panel = params.get('panel') === '1';
if (overlay) document.body.classList.add('overlay');

// panel admin sederhana: reset / jeda arena
if (panel) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:14px;bottom:14px;display:flex;gap:8px;font:13px ui-monospace,monospace;z-index:99';
  for (const [label, action] of [['reset', 'reset'], ['jeda', 'pause'], ['lanjut', 'resume']]) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:8px 12px;background:#16203a;color:#dfe8ff;border:1px solid #2b7dff;border-radius:8px;cursor:pointer';
    b.onclick = () => fetch('/api/control', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    box.appendChild(b);
  }
  document.body.appendChild(box);
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  transparent: overlay,
  backgroundColor: overlay ? 'rgba(0,0,0,0)' : '#0a0d16',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [ArenaScene],
  render: { antialias: true, roundPixels: false },
  fps: { target: 60 },
  callbacks: { preBoot: (game) => game.registry.set('overlay', overlay) },
});
