import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import PlayScene from './scenes/PlayScene.js';
import GameOverScene from './scenes/GameOverScene.js';

export const GAME_SIZE = { width: 960, height: 540 };

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_SIZE.width,
  height: GAME_SIZE.height,
  backgroundColor: '#070b18',
  pixelArt: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // container DOM untuk input nama (otomatis ikut skala canvas)
  dom: { createContainer: true },
  input: { keyboard: { capture: [] } },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1900 }, debug: false },
  },
  scene: [BootScene, MenuScene, PlayScene, GameOverScene],
};

window.addEventListener('load', () => {
  window.__game = new Phaser.Game(config);
});
