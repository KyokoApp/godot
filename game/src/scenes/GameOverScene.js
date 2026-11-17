import Phaser from 'phaser';
import { GAME_SIZE } from '../main.js';
import { submitScore, topScores } from '../api.js';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const NAME_KEY = 'sky-runner:name';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) {
    this.stats = data || { score: 0, coins: 0, level: 1, durationMs: 0 };
  }

  create() {
    const { width } = GAME_SIZE;
    const { score, coins, level, durationMs } = this.stats;

    this.add.tileSprite(0, 0, width, GAME_SIZE.height, 'stars-far').setOrigin(0).setAlpha(0.5);

    this.add.text(width / 2, 84, 'GAME OVER', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '52px',
      fontStyle: 'bold', color: '#ff6b8a',
    }).setOrigin(0.5).setShadow(0, 6, '#8a1030', 22, true, true);

    this.add.text(width / 2, 150, `${score} poin`, {
      fontFamily: MONO, fontSize: '40px', color: '#eaf3ff',
    }).setOrigin(0.5);

    const secs = (durationMs / 1000).toFixed(1);
    this.add.text(width / 2, 196, `level ${level} · ${coins} koin · ${secs} detik`, {
      fontFamily: MONO, fontSize: '16px', color: '#8ea3d6',
    }).setOrigin(0.5);

    // input nama (pakai DOM agar bisa diketik dengan keyboard asli)
    const saved = (localStorage.getItem(NAME_KEY) || '').slice(0, 14);
    const nameEl = document.createElement('input');
    nameEl.maxLength = 14;
    nameEl.value = saved;
    nameEl.placeholder = 'nama kamu';
    nameEl.setAttribute('aria-label', 'Nama pemain');
    Object.assign(nameEl.style, {
      width: '220px', padding: '10px 12px',
      font: '16px ui-monospace, monospace', textAlign: 'center',
      color: '#eaf3ff', background: '#101a33',
      border: '1px solid #2b7dff', borderRadius: '10px', outline: 'none',
    });
    // DOM element Phaser: ikut terskala bersama canvas
    const dom = this.add.dom(width / 2, 264, nameEl).setOrigin(0.5);
    this.nameEl = nameEl;
    this.events.once('shutdown', () => { nameEl.remove(); dom.destroy(); });

    this.saveBtn = this.add.text(width / 2, 296, 'SIMPAN SKOR', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '20px',
      fontStyle: 'bold', color: '#070b18', backgroundColor: '#ffd166', padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.saveBtn.on('pointerdown', () => this.save());

    const again = this.add.text(width / 2 - 96, 356, '↻ MAIN LAGI', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '18px',
      color: '#53e0ff', backgroundColor: '#101a33', padding: { x: 16, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => this.scene.start('Play'));

    const menu = this.add.text(width / 2 + 96, 356, '☰ MENU', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '18px',
      color: '#c9d6f5', backgroundColor: '#101a33', padding: { x: 16, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.on('pointerdown', () => this.scene.start('Menu'));

    this.status = this.add.text(width / 2, 402, '', {
      fontFamily: MONO, fontSize: '13px', color: '#8ea3d6',
    }).setOrigin(0.5);

    this.board = this.add.text(24, 430, '', {
      fontFamily: MONO, fontSize: '13px', color: '#98a8d2', lineSpacing: 4,
    }).setOrigin(0, 0);

    nameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.save();
      e.stopPropagation();
    });
    this.input.keyboard.on('keydown-ENTER', () => this.save());
    nameEl.focus();
    this.loadBoard();
  }

  async loadBoard() {
    try {
      const rows = await topScores(5);
      this.board.setText(
        rows.length
          ? rows.map((r, i) => `${String(i + 1).padStart(2, ' ')}. ${r.name.padEnd(14, ' ')} ${String(r.score).padStart(6, ' ')}`).join('\n')
          : 'papan skor masih kosong'
      );
    } catch {
      this.board.setText('papan skor tidak tersedia (offline)');
    }
  }

  async save() {
    if (this.saved) return;
    const name = (this.nameEl.value || '').trim() || 'anonim';
    localStorage.setItem(NAME_KEY, name);
    this.saveBtn.setStyle({ backgroundColor: '#8ea3d6' }).disableInteractive();
    this.status.setText('mengirim…');
    try {
      const res = await submitScore({
        name,
        score: this.stats.score,
        level: this.stats.level,
        durationMs: this.stats.durationMs,
      });
      this.saved = true;
      this.status.setColor('#46d98a').setText(
        res.rank ? `tersimpan! peringkat #${res.rank} dari ${res.total}` : 'tersimpan di server!'
      );
      this.loadBoard();
    } catch (err) {
      this.saveBtn.setStyle({ backgroundColor: '#ffd166' }).setInteractive({ useHandCursor: true });
      this.status.setColor('#ff7a7a').setText(`gagal: ${err.message}`);
    }
  }
}
