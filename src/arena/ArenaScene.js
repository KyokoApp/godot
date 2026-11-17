import Phaser from 'phaser';
import { Net } from '../net.js';

const W = 1280;
const H = 720;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const WEAPON_ICON = { pedang: '⚔', tombak: '↟', kapak: '🪓', panah: '➶' };

/**
 * Semua state datang dari server (authoritative). Klien hanya:
 *  - menyimpan satu "view" per petarung, interpolasi posisi biar mulus
 *  - menampilkan efek: hit, kill, join, hadiah, feed
 */
export class ArenaScene extends Phaser.Scene {
  constructor() { super('Arena'); }

  create() {
    this.overlay = this.registry.get('overlay');
    this.views = new Map();
    this.feedItems = [];
    this.kills = 0;

    this.drawBackground();
    this.fxLayer = this.add.container(0, 0).setDepth(20);
    this.buildHud();

    this.net = new Net({
      onOpen: () => this.setStatus('live tersambung', true),
      onClose: () => this.setStatus('terputus — mencoba lagi…', false),
      onInit: (state) => this.syncAll(state),
      onEvent: (msg) => this.onEvent(msg),
    });
    this.events.once('shutdown', () => this.net?.close());

    // uji coba tanpa TikTok: klik / tekan J mengirim komentar "join"
    if (!this.overlay) {
      this.input.on('pointerdown', () => this.selfJoinDemo());
      this.input.keyboard.on('keydown-J', () => this.selfJoinDemo());
    }
  }

  /* ------------------------------- background ------------------------------ */
  drawBackground() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x0b1020, this.overlay ? 0 : 1);
    g.fillRect(0, 0, W, H);

    g.lineStyle(3, 0x1e2b4d, 0.9);
    g.strokeCircle(W / 2, H / 2, 330);
    g.lineStyle(2, 0x16203a, 0.9);
    g.strokeCircle(W / 2, H / 2, 240);
    g.strokeCircle(W / 2, H / 2, 150);
    g.lineStyle(1, 0x141c31, 0.8);
    for (let r = 60; r < 640; r += 60) g.strokeCircle(W / 2, H / 2, r);

    for (let i = 0; i < 110; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.06, 0.28));
      g.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Phaser.Math.FloatBetween(0.6, 1.6));
    }

    this.add.text(W / 2, H / 2, 'SKY LEGION', {
      fontFamily: MONO, fontSize: '150px', fontStyle: 'bold',
      color: this.overlay ? 'rgba(255,255,255,0.05)' : '#111a2e',
    }).setOrigin(0.5).setDepth(1);
  }

  /* ---------------------------------- HUD --------------------------------- */
  buildHud() {
    if (this.overlay) {
      this.boardText = this.add.text(28, 24, '', {
        fontFamily: MONO, fontSize: '18px', color: '#d8e3ff', lineSpacing: 5,
      }).setDepth(30).setShadow(0, 2, '#000', 6, true, true);
      this.feedText = null;
      return;
    }

    this.add.rectangle(W / 2, 56, W - 48, 74, 0x0e1526, 0.86)
      .setDepth(28).setStrokeStyle(2, 0x223050);

    this.add.text(40, 28, 'SKY LEGION LIVE', {
      fontFamily: MONO, fontSize: '26px', color: '#eaf2ff', fontStyle: 'bold',
    }).setDepth(30).setShadow(0, 3, '#2b7dff', 12, true, true);

    this.add.text(40, 63, 'ketik  join  di komentar buat ikut perang · ketik pedang / tombak / kapak / panah buat ganti senjata', {
      fontFamily: MONO, fontSize: '14px', color: '#7f91bd',
    }).setDepth(30);

    this.counterText = this.add.text(W - 40, 32, '0 penonton', {
      fontFamily: MONO, fontSize: '18px', color: '#8fd0ff',
    }).setOrigin(1, 0).setDepth(30);

    this.recentText = this.add.text(W - 40, 60, '', {
      fontFamily: MONO, fontSize: '13px', color: '#5c6c95',
    }).setOrigin(1, 0).setDepth(30);

    this.boardText = this.add.text(28, 122, '', {
      fontFamily: MONO, fontSize: '16px', color: '#c8d6f8', lineSpacing: 4,
    }).setDepth(30).setShadow(0, 2, '#000', 5, true, true);

    this.add.text(W - 28, H - 24,
      'klik / tekan J = kirim "join" sendiri (uji coba) · ?overlay=1 untuk OBS', {
        fontFamily: MONO, fontSize: '12px', color: '#4b5877',
      }).setOrigin(1, 1).setDepth(30);
  }

  setStatus(text, ok) {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = text;
    el.className = ok ? 'on' : 'off';
  }

  /* --------------------------------- sinkron ------------------------------- */
  syncAll(state) {
    for (const f of state.fighters) this.upsert(f, true);
    if (state.feed) for (const item of [...state.feed].reverse()) this.pushFeed(item);
    this.refreshBoard();
  }

  onEvent(msg) {
    switch (msg.type) {
      case 'tick': return this.onTick(msg.fighters);
      case 'join': return this.onJoin(msg.fighter);
      case 'respawn': return this.onRespawn(msg.fighter);
      case 'leave': return this.removeView(msg.id);
      case 'hit': return this.onHit(msg);
      case 'kill': return this.onKill(msg);
      case 'feed': return this.pushFeed(msg.entry);
      case 'boost': return this.onBoost(msg);
      case 'reset':
        for (const id of [...this.views.keys()]) this.removeView(id);
        this.feedItems.forEach((t) => t.destroy());
        this.feedItems = [];
        return this.refreshBoard();
      case 'status':
        return this.setStatus(
          `tiktok: ${msg.tiktok}${msg.message ? ` (${msg.message})` : ''}`,
          msg.tiktok === 'connected'
        );
      default: return undefined;
    }
  }

  onTick(list) {
    const seen = new Set();
    for (const s of list) {
      seen.add(s.id);
      const v = this.views.get(s.id);
      if (!v) continue;
      if (s.tx) v.targetId = s.tx;
      v.targetX = s.x;
      v.targetY = s.y;
      if (s.hp !== v.hp) this.setHp(v, s.hp);
      if (s.kills !== v.kills) { v.kills = s.kills; v.killLabel.setText(`☠ ${s.kills}`); }
    }
    for (const [id, v] of this.views) if (!seen.has(id)) v.falling = true;
    this.refreshBoard();
  }

  onJoin(f) {
    this.upsert(f, false);
    this.spawnBurst(f.x, f.y, f.color);
    this.floatText(f.x, f.y - 46, `${f.name} JOIN`, f.color);
    this.refreshBoard();
  }

  onRespawn(f) {
    this.upsert(f, false);
    const v = this.views.get(f.id);
    if (v) { v.sprite.setAlpha(1); v.falling = false; this.setHp(v, f.hp); }
    this.refreshBoard();
  }

  onHit(msg) {
    const victim = this.views.get(msg.to);
    if (!victim) return;
    this.damageNumber(victim.x, victim.y - 26, msg.dmg, msg.crit);
    victim.sprite.setAlpha(0.55);
    this.time.delayedCall(70, () => { if (victim.sprite?.active) victim.sprite.setAlpha(1); });

    const attacker = this.views.get(msg.from);
    if (attacker) {
      this.tweens.add({ targets: attacker.sprite, scale: 1.16, duration: 60, yoyo: true });
      const line = this.add.line(0, 0, attacker.x, attacker.y, victim.x, victim.y, 0xffffff, msg.crit ? 0.45 : 0.18)
        .setOrigin(0).setLineWidth(msg.crit ? 2 : 1).setDepth(18);
      this.fxLayer.add(line);
      this.time.delayedCall(90, () => line.destroy());
    }
  }

  onKill(msg) {
    const victim = this.views.get(msg.id);
    const killer = this.views.get(msg.by);
    this.kills++;
    if (victim) {
      this.spawnBurst(victim.x, victim.y, victim.color, 22);
      this.floatText(victim.x, victim.y - 40, 'K.O.', 0xff5d7a, 26);
      victim.sprite.setAlpha(0.22);
      victim.falling = true;
    }
    if (killer) this.floatText(killer.x, killer.y - 54, `${msg.byName} ☠ ${msg.name}`, 0xffd166, 15);
    this.cameras.main.flash(80, 50, 16, 26);
    this.refreshBoard();
  }

  onBoost(msg) {
    const v = this.views.get(msg.id);
    if (!v) return;
    this.spawnBurst(v.x, v.y, 0xffd166, 16);
    this.floatText(v.x, v.y - 54, `GIFT +${msg.add} HP`, 0xffd166, 16);
    if (msg.maxHp) { v.maxHp = msg.maxHp; this.setHp(v, msg.hp); }
  }

  /* ------------------------------- view logic ------------------------------ */
  upsert(f, instant) {
    let v = this.views.get(f.id);
    if (v) {
      v.name = f.name;
      v.color = f.color;
      v.weapon = f.weapon;
      v.maxHp = f.maxHp;
      this.setHp(v, f.hp);
      return v;
    }

    v = {
      id: f.id, name: f.name, color: f.color, weapon: f.weapon || 'pedang',
      maxHp: f.maxHp || 100, hp: f.hp ?? 100, kills: f.kills || 0,
      x: f.x, y: f.y, targetX: f.x, targetY: f.y,
      falling: false, bob: Phaser.Math.FloatBetween(0, Math.PI * 2),
    };

    const body = this.add.circle(0, 0, 17, f.color, 1).setStrokeStyle(2.5, 0x0a0d16, 1);
    const face = this.add.circle(6, -4, 6, 0x0a0d16, 0.85);
    const weapon = this.add.text(-2, -30, WEAPON_ICON[f.weapon] || '⚔', {
      fontFamily: MONO, fontSize: '17px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.9);
    const label = this.add.text(0, 26, f.name, {
      fontFamily: MONO, fontSize: '13px', color: '#dfe8ff',
    }).setOrigin(0.5, 0).setShadow(0, 2, '#000', 4, true, true);
    const killLabel = this.add.text(22, -22, `☠ ${f.kills || 0}`, {
      fontFamily: MONO, fontSize: '12px', color: '#ffb703',
    }).setOrigin(0, 0.5);
    const barBg = this.add.rectangle(0, -26, 40, 5, 0x1a2338, 1).setOrigin(0.5);
    const bar = this.add.rectangle(-20, -26, 40, 5, 0x49d98b, 1).setOrigin(0, 0.5);

    const container = this.add.container(f.x, f.y, [body, face, weapon, label, killLabel, barBg, bar]).setDepth(12);
    if (!instant) {
      container.setScale(0.2);
      this.tweens.add({ targets: container, scale: 1, duration: 340, ease: 'Back.easeOut' });
    }

    v.sprite = container;
    v.body = body;
    v.weaponIcon = weapon;
    v.label = label;
    v.killLabel = killLabel;
    v.bar = bar;
    this.views.set(f.id, v);
    return v;
  }

  setHp(v, hp) {
    v.hp = hp;
    const ratio = Phaser.Math.Clamp(hp / (v.maxHp || 100), 0, 1);
    v.bar.width = 40 * ratio;
    v.bar.fillColor = ratio > 0.55 ? 0x49d98b : ratio > 0.25 ? 0xffd166 : 0xff5d7a;
  }

  removeView(id) {
    const v = this.views.get(id);
    if (!v) return;
    v.sprite.destroy();
    this.views.delete(id);
    this.refreshBoard();
  }

  /* --------------------------------- efek --------------------------------- */
  spawnBurst(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = this.add.circle(x, y, Phaser.Math.FloatBetween(1.5, 3.2), color, 0.95).setDepth(19);
      this.fxLayer.add(p);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.FloatBetween(18, 62);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        alpha: 0, scale: 0.2, duration: Phaser.Math.Between(260, 520),
        onComplete: () => p.destroy(),
      });
    }
  }

  damageNumber(x, y, dmg, crit) {
    const t = this.add.text(x + Phaser.Math.Between(-8, 8), y, crit ? `CRIT -${dmg}` : `-${dmg}`, {
      fontFamily: MONO, fontSize: crit ? '23px' : '17px',
      color: crit ? '#ffd166' : '#ff9aa8', fontStyle: crit ? 'bold' : 'normal',
    }).setOrigin(0.5).setDepth(25);
    this.fxLayer.add(t);
    this.tweens.add({
      targets: t, y: y - 42, alpha: 0, duration: 620, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  floatText(x, y, text, color = 0xffffff, size = 16) {
    const hex = `#${color.toString(16).padStart(6, '0')}`;
    const t = this.add.text(x, y, text, {
      fontFamily: MONO, fontSize: `${size}px`, color: hex, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(26).setShadow(0, 2, '#000', 6, true, true);
    this.fxLayer.add(t);
    this.tweens.add({
      targets: t, y: y - 46, alpha: 0, duration: 900, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  pushFeed(entry) {
    if (!entry) return;
    const hex = `#${(entry.color || 0x9fb3e0).toString(16).padStart(6, '0')}`;
    const line = this.add.text(28, H - 44, entry.text, {
      fontFamily: MONO, fontSize: '15px', color: hex,
    }).setAlpha(0).setDepth(31).setShadow(0, 2, '#000', 5, true, true);
    this.feedItems.unshift(line);
    while (this.feedItems.length > 4) this.feedItems.pop()?.destroy();
    this.feedItems.forEach((t, i) => {
      t.setPosition(28, H - 36 - i * 24);
      t.setAlpha(i === 0 ? 1 : 1 - i * 0.22);
    });
    this.tweens.add({ targets: line, alpha: { from: 0.15, to: 1 }, duration: 240 });
  }

  refreshBoard() {
    const top = [...this.views.values()]
      .sort((a, b) => (b.kills - a.kills) || a.name.localeCompare(b.name))
      .slice(0, 5);

    if (this.counterText) {
      this.counterText.setText(`${this.views.size} penonton · ${this.kills} KO`);
      const names = top.map((v) => v.name).slice(0, 4).join(', ');
      this.recentText.setText(names ? `di arena: ${names}` : 'menunggu komentar join…');
    }

    if (!top.length) {
      this.boardText.setText(this.overlay ? '' : 'belum ada petarung — ketik "join" di komentar');
      return;
    }
    this.boardText.setText(top.map((v, i) => {
      const name = v.name.length > 13 ? `${v.name.slice(0, 12)}…` : v.name;
      return `${i + 1}. ${name.padEnd(13, ' ')} ☠${String(v.kills).padStart(2, '0')} ${WEAPON_ICON[v.weapon] || ''}`;
    }).join('\n'));
  }

  /* --------------------------------- update -------------------------------- */
  update(_t, dt) {
    const k = Math.min(1, dt / 90);
    for (const v of this.views.values()) {
      v.bob += dt * 0.004;
      v.x += (v.targetX - v.x) * k;
      v.y += (v.targetY + Math.sin(v.bob) * 2.5 - v.y) * k;
      v.sprite.setPosition(v.x, v.y);
      v.sprite.setDepth(12 + v.y * 0.001);
      if (v.falling) v.sprite.setAlpha(Math.max(0.2, v.sprite.alpha - dt * 0.0012));
      if (v.weaponIcon) v.weaponIcon.setVisible(!v.falling);
    }
  }

  async selfJoinDemo() {
    try {
      await fetch('/api/mock/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: `kamu${Phaser.Math.Between(10, 99)}`, text: 'join' }),
      });
    } catch {}
  }
}
