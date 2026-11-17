import Phaser from 'phaser';
import { GAME_SIZE } from '../main.js';
import { health } from '../api.js';

/**
 * Semua tekstur dibuat procedural (tanpa aset eksternal), jadi build tetap
 * ringan dan tidak butuh CDN/gambar apa pun saat runtime.
 */
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeStarfield();
    this.makePlayer();
    this.makeObstacle();
    this.makeCoin();
    this.makeGround();
    this.makeGlow();

    // Cek koneksi backend sekali di awal (non-blocking).
    const el = document.getElementById('hud-status');
    health()
      .then((h) => {
        if (el) { el.textContent = `server online · v${h.version}`; el.className = 'ok'; }
      })
      .catch(() => {
        if (el) { el.textContent = 'server offline · skor lokal saja'; el.className = 'off'; }
      });

    this.scene.start('Menu');
  }

  makeStarfield() {
    const { width, height } = GAME_SIZE;
    for (const [key, count, size, alpha] of [['stars-far', 90, 2, 0.55], ['stars-near', 55, 3, 0.95]]) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, alpha);
      for (let i = 0; i < count; i++) {
        g.fillCircle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(1, size));
      }
      g.generateTexture(key, width, height);
      g.destroy();
    }
  }

  makePlayer() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // badan
    g.fillStyle(0x53e0ff, 1);
    g.beginPath();
    g.moveTo(22, 46);
    g.lineTo(62, 26);
    g.lineTo(62, 66);
    g.closePath();
    g.fillPath();
    // sirip
    g.fillStyle(0x2b7dff, 1);
    g.beginPath();
    g.moveTo(30, 34);
    g.lineTo(6, 46);
    g.lineTo(30, 58);
    g.closePath();
    g.fillPath();
    // kokpit
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(44, 46, 7);
    g.generateTexture('player', 68, 92);
    g.destroy();
  }

  makeObstacle() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xff4d6d, 1);
    g.fillRect(4, 0, 34, 60);
    g.fillStyle(0xff85a1, 1);
    g.fillRect(10, 6, 8, 48);
    g.fillStyle(0x9d1230, 1);
    g.fillRect(4, 54, 34, 6);
    g.generateTexture('obstacle', 42, 60);

    const t = this.make.graphics({ x: 0, y: 0 }, false);
    t.fillStyle(0xffb703, 1);
    t.fillRect(6, 0, 26, 34);
    t.fillStyle(0xffd166, 1);
    t.fillRect(11, 5, 7, 24);
    t.generateTexture('obstacle-tall', 38, 34);
    t.destroy();
  }

  makeCoin() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffd166, 1);
    g.fillCircle(14, 14, 13);
    g.fillStyle(0xfff3b0, 1);
    g.fillCircle(14, 14, 8);
    g.fillStyle(0x8a6a00, 1);
    g.fillRect(13, 7, 3, 14);
    g.generateTexture('coin', 28, 28);
    g.destroy();
  }

  makeGround() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x121a33, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x1b2a4d, 1);
    g.fillRect(0, 0, 64, 5);
    g.fillStyle(0x22355e, 1);
    for (let i = 0; i < 4; i++) g.fillRect(6 + i * 16, 20, 8, 4);
    g.generateTexture('ground', 64, 64);
    g.destroy();
  }

  makeGlow() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    for (let i = 14; i > 0; i--) {
      g.fillStyle(0x53e0ff, 0.05);
      g.fillCircle(64, 64, i * 4.5);
    }
    g.generateTexture('glow', 128, 128);
    g.destroy();
  }
}
