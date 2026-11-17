import Phaser from 'phaser';
import { GAME_SIZE } from '../main.js';
import { topScores } from '../api.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { width, height } = GAME_SIZE;

    this.add.tileSprite(0, 0, width, height, 'stars-far').setOrigin(0).setAlpha(0.7);
    this.near = this.add.tileSprite(0, 0, width, height, 'stars-near').setOrigin(0).setAlpha(0.5);

    this.add.text(width / 2, 118, 'SKY RUNNER', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#eaf3ff',
    }).setOrigin(0.5).setShadow(0, 8, '#2b7dff', 24, true, true);

    this.add.text(width / 2, 168, 'Godot Arena · demo pipeline game + server + deploy', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '17px',
      color: '#8ea3d6',
    }).setOrigin(0.5);

    const ship = this.add.image(width / 2, 292, 'player').setScale(1.5);
    this.add.image(width / 2, 292, 'glow').setScale(1.8).setAlpha(0.7);
    this.tweens.add({ targets: ship, y: 276, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const hint = this.add.text(width / 2, 392, 'Klik / Spasi / ⬆ untuk terbang · hindari balok merah · ambil koin', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '16px',
      color: '#c9d6f5',
    }).setOrigin(0.5);

    const start = this.add.text(width / 2, 442, '▶  MULAI', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#070b18',
      backgroundColor: '#53e0ff',
      padding: { x: 26, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    start.on('pointerover', () => start.setStyle({ backgroundColor: '#a6f0ff' }));
    start.on('pointerout', () => start.setStyle({ backgroundColor: '#53e0ff' }));
    start.on('pointerdown', () => this.begin());
    this.tweens.add({ targets: hint, alpha: 0.45, duration: 900, yoyo: true, repeat: -1 });

    this.input.keyboard.once('keydown-SPACE', () => this.begin());
    this.input.keyboard.once('keydown-UP', () => this.begin());
    this.input.keyboard.once('keydown-ENTER', () => this.begin());

    this.best = this.add.text(width - 24, height - 24, 'memuat papan skor…', {
      fontFamily: 'ui-monospace, monospace', fontSize: '13px', color: '#6f80ab', align: 'right',
    }).setOrigin(1, 1);

    topScores(3)
      .then((rows) => {
        if (!rows.length) return this.best.setText('papan skor kosong · jadilah yang pertama');
        this.best.setText(rows.map((r, i) => `${i + 1}. ${r.name} — ${r.score}`).join('\n'));
      })
      .catch(() => this.best.setText('papan skor tidak tersedia (offline)'));
  }

  update(_t, dt) {
    this.near.tilePositionX += dt * 0.012;
  }

  begin() {
    this.cameras.main.fadeOut(220, 7, 11, 24);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Play'));
  }
}
