/**
 * Arena — semua logika permainan, tanpa Phaser & tanpa DOM.
 * Tick 20 Hz, state disiarkan 10x/detik supaya hemat bandwidth dan mulus di OBS.
 */

export const ARENA_W = 1280;
export const ARENA_H = 720;

const MAX_FIGHTERS = 40;
const JOIN_COOLDOWN_MS = 8_000;
const TICK_MS = 50;
const TEAM_COLORS = [
  0xff5d5d, 0x4db8ff, 0xffd166, 0x9b8cff, 0x4dff9e, 0xff8ad8,
  0x7ad7ff, 0xffa94d, 0xb4e04d, 0xff6b9d, 0x8ba7ff, 0x5ce1c4,
];
const WEAPONS = ['pedang', 'tombak', 'kapak', 'panah'];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

export class Arena {
  constructor() {
    this.fighters = new Map();
    this.spectators = new Set();
    this.feed = [];
    this.kills = new Map();
    this.joinSeen = new Map();
    this.tick = 0;
    this.running = true;
    this.timer = null;
    this.colorCursor = 0;
    this.spawnSeq = 0;
  }

  /* ------------------------------ lifecycle ------------------------------ */
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  reset() {
    this.fighters.clear();
    this.feed = [];
    this.kills.clear();
    this.joinSeen.clear();
    this.tick = 0;
    this.broadcast({ type: 'reset' });
  }

  summary() {
    const alive = [...this.fighters.values()].filter((f) => !f.dead).length;
    return { fighters: this.fighters.size, alive, running: this.running, feed: this.feed.slice(0, 6) };
  }

  /* ------------------------------- viewers ------------------------------- */
  addViewer(socket) {
    this.spectators.add(socket);
    socket.send(JSON.stringify({ type: 'init', state: this.snapshot() }));
  }

  removeViewer(socket) {
    this.spectators.delete(socket);
  }

  broadcast(payload) {
    const data = JSON.stringify(payload);
    for (const s of this.spectators) {
      if (s.readyState === 1) s.send(data);
    }
  }

  /* ------------------------------ chat input ----------------------------- */
  onChat({ user, text, userId, avatar }) {
    const cmd = String(text || '').trim().toLowerCase();
    if (!cmd) return { ignored: true };

    if (/^(!?join|masuk|gabung|\+|hadir)\b/.test(cmd)) {
      return this.join({ user, userId, avatar, team: this.pickTeam(cmd) });
    }
    const weapon = WEAPONS.find((w) => cmd.includes(w));
    if (weapon) return this.switchWeapon(user, weapon);

    return { ignored: true, reason: 'perintah tidak dikenal' };
  }

  pickTeam(cmd) {
    const map = { merah: 0xff5d5d, biru: 0x4db8ff, kuning: 0xffd166, ungu: 0x9b8cff, hijau: 0x4dff9e };
    for (const [k, c] of Object.entries(map)) if (cmd.includes(k)) return c;
    return null;
  }

  join({ user, userId, avatar, team }) {
    const name = String(user || 'penonton').slice(0, 18);
    const key = String(userId || name);

    const known = [...this.fighters.values()].find((f) => f.key === key);
    if (known) {
      if (known.dead) this.reviveInPlace(known);
      return { joined: false, revived: true, id: known.id };
    }

    const last = this.joinSeen.get(key) || 0;
    if (Date.now() - last < JOIN_COOLDOWN_MS) return { joined: false, reason: 'cooldown' };
    this.joinSeen.set(key, Date.now());

    if (this.fighters.size >= MAX_FIGHTERS) {
      const weakest = [...this.fighters.values()].sort((a, b) => (a.hp - b.hp) || (a.lastMove - b.lastMove))[0];
      if (weakest) this.removeFighter(weakest.id, 'digantikan');
    }

    const color = team ?? TEAM_COLORS[this.colorCursor++ % TEAM_COLORS.length];
    const f = {
      id: `f${++this.spawnSeq}`,
      key,
      name,
      avatar: avatar || null,
      color,
      weapon: pick(WEAPONS),
      x: rand(120, ARENA_W - 120),
      y: rand(120, ARENA_H - 120),
      vx: 0, vy: 0,
      hp: 100, maxHp: 100, power: 1,
      kills: 0, deaths: 0,
      targetId: null,
      attackAt: 0,
      lastMove: this.tick,
      spawnedAt: Date.now(),
      dead: false,
    };
    this.fighters.set(f.id, f);
    this.pushFeed(`${name} masuk arena dengan ${f.weapon}`, color);
    this.broadcast({ type: 'join', fighter: this.pub(f) });
    return { joined: true, id: f.id, name };
  }

  /** Hadiah gift = karakter lebih kuat (HP + damage). */
  boost({ user, userId, amount = 1 }) {
    const key = String(userId || user);
    let f = [...this.fighters.values()].find((x) => x.key === key);
    if (!f) {
      const res = this.join({ user, userId, team: null });
      f = this.fighters.get(res.id);
      if (!f) return { ignored: true };
    }
    if (f.dead) this.reviveInPlace(f);
    const add = Math.min(40, 5 + Math.round(Math.log2(amount + 1) * 8));
    f.maxHp = Math.min(260, f.maxHp + add);
    f.hp = Math.min(f.maxHp, f.hp + add * 2);
    f.power = Math.min(3, f.power + 0.12);
    this.broadcast({ type: 'boost', id: f.id, add, hp: f.hp, maxHp: f.maxHp, amount, name: f.name });
    this.pushFeed(`${f.name} dapat hadiah (+${add} HP)`, f.color);
    return { boosted: true, id: f.id };
  }

  switchWeapon(user, weapon) {
    const f = [...this.fighters.values()].find((x) => x.name.toLowerCase() === String(user).toLowerCase());
    if (!f) return { ignored: true, reason: 'belum join' };
    f.weapon = weapon;
    this.pushFeed(`${f.name} ganti ke ${weapon}`, f.color);
    return { weapon };
  }

  removeFighter(id, reason) {
    const f = this.fighters.get(id);
    if (!f) return;
    this.fighters.delete(id);
    this.broadcast({ type: 'leave', id, reason });
  }

  pushFeed(text, color) {
    this.feed.unshift({ text, color, at: Date.now() });
    if (this.feed.length > 14) this.feed.pop();
    this.broadcast({ type: 'feed', entry: this.feed[0] });
  }

  /* --------------------------------- tick -------------------------------- */
  step() {
    if (!this.running) return;
    this.tick++;

    const alive = [...this.fighters.values()].filter((f) => !f.dead);
    for (const f of alive) this.think(f, alive);
    this.resolveAttacks(alive);
    this.separate(alive);

    if (this.tick % 2 === 0) {
      this.broadcast({
        type: 'tick',
        t: this.tick,
        fighters: alive.map((f) => this.pubLite(f)),
      });
    }
  }

  think(f, alive) {
    let target = f.targetId ? this.fighters.get(f.targetId) : null;
    if (!target || target.dead) {
      let best = null, bestD = Infinity;
      for (const o of alive) {
        if (o === f) continue;
        const d = dist2(f.x, f.y, o.x, o.y);
        if (d < bestD) { bestD = d; best = o; }
      }
      target = best;
      f.targetId = best ? best.id : null;
    }
    if (!target) { f.vx *= 0.9; f.vy *= 0.9; return; }

    const dx = target.x - f.x;
    const dy = target.y - f.y;
    const d = Math.hypot(dx, dy) || 1;

    const ideal = f.weapon === 'panah' ? 230 : f.weapon === 'tombak' ? 105 : 60;
    const speed = f.weapon === 'kapak' ? 2.4 : f.weapon === 'pedang' ? 2.9 : 2.6;

    if (d > ideal) {
      f.vx += (dx / d) * speed * 0.35;
      f.vy += (dy / d) * speed * 0.35;
    } else if (d < ideal * 0.75) {
      f.vx -= (dx / d) * speed * 0.2;
      f.vy -= (dy / d) * speed * 0.2;
    }

    for (const o of alive) {
      if (o === f) continue;
      const dd = dist2(f.x, f.y, o.x, o.y);
      if (dd < 46 * 46 && dd > 1) {
        const dd2 = Math.sqrt(dd);
        f.vx -= ((o.x - f.x) / dd2) * 0.5;
        f.vy -= ((o.y - f.y) / dd2) * 0.5;
      }
    }

    const vmax = 3.6;
    const vm = Math.hypot(f.vx, f.vy);
    if (vm > vmax) { f.vx = (f.vx / vm) * vmax; f.vy = (f.vy / vm) * vmax; }

    f.x = clamp(f.x + f.vx, 36, ARENA_W - 36);
    f.y = clamp(f.y + f.vy, 36, ARENA_H - 36);
    f.vx *= 0.94; f.vy *= 0.94;
    f.lastMove = this.tick;
  }

  resolveAttacks(alive) {
    for (const a of alive) {
      const t = a.targetId ? this.fighters.get(a.targetId) : null;
      if (!t || t.dead) continue;
      const d = Math.sqrt(dist2(a.x, a.y, t.x, t.y));
      const reach = a.weapon === 'panah' ? 260 : a.weapon === 'tombak' ? 120 : 72;
      if (d > reach) continue;
      if (this.tick < a.attackAt) continue;

      const cooldown = a.weapon === 'kapak' ? 22 : a.weapon === 'pedang' ? 14 : a.weapon === 'tombak' ? 18 : 26;
      a.attackAt = this.tick + cooldown;

      const base = a.weapon === 'kapak' ? 16 : a.weapon === 'pedang' ? 11 : a.weapon === 'tombak' ? 13 : 9;
      const crit = Math.random() < 0.12;
      const total = Math.round(base * a.power * (crit ? 2 : 1) * rand(0.85, 1.15));

      t.hp -= total;
      this.broadcast({ type: 'hit', from: a.id, to: t.id, dmg: total, crit, weapon: a.weapon, x: t.x, y: t.y });

      if (t.hp <= 0) this.kill(a, t);
    }
  }

  separate(alive) {
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j];
        const d2 = dist2(a.x, a.y, b.x, b.y);
        if (d2 > 0 && d2 < 30 * 30) {
          const d = Math.sqrt(d2);
          const push = (30 - d) / 2 / d;
          a.x = clamp(a.x + (a.x - b.x) * push, 36, ARENA_W - 36);
          a.y = clamp(a.y + (a.y - b.y) * push, 36, ARENA_H - 36);
        }
      }
    }
  }

  kill(killer, victim) {
    victim.dead = true;
    victim.hp = 0;
    victim.deaths++;
    killer.kills++;
    victim.targetId = null;
    this.kills.set(killer.name, (this.kills.get(killer.name) || 0) + 1);

    this.broadcast({
      type: 'kill', by: killer.id, id: victim.id,
      byName: killer.name, name: victim.name, color: killer.color,
    });
    this.pushFeed(`${killer.name} menumbangkan ${victim.name}`, killer.color);

    // respawn otomatis setelah 6 detik
    setTimeout(() => {
      const f = this.fighters.get(victim.id);
      if (f && f.dead) this.reviveInPlace(f);
    }, 6000).unref?.();
  }

  reviveInPlace(f) {
    f.hp = f.maxHp;
    f.dead = false;
    f.x = rand(120, ARENA_W - 120);
    f.y = rand(120, ARENA_H - 120);
    f.targetId = null;
    this.broadcast({ type: 'respawn', fighter: this.pub(f) });
  }

  /* ------------------------------- payload ------------------------------- */
  pub(f) {
    return {
      id: f.id, name: f.name, color: f.color, weapon: f.weapon,
      x: Math.round(f.x), y: Math.round(f.y), hp: f.hp, maxHp: f.maxHp,
      kills: f.kills, deaths: f.deaths, dead: f.dead, avatar: f.avatar,
    };
  }

  pubLite(f) {
    return {
      id: f.id, x: Math.round(f.x), y: Math.round(f.y), hp: Math.round(f.hp),
      tx: f.targetId, kills: f.kills, w: f.weapon,
    };
  }

  snapshot() {
    return {
      running: this.running,
      w: ARENA_W,
      h: ARENA_H,
      fighters: [...this.fighters.values()].filter((f) => !f.dead).map((f) => this.pub(f)),
      feed: this.feed.slice(0, 10),
    };
  }
}
