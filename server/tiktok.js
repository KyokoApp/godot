/**
 * Sumber komentar: TikTok Live asli (tiktok-live-connector) atau simulasi.
 *
 *   TIKTOK_USER=@namaakun npm start
 *   TIKTOK_SIGN_KEY=xxxx npm start     # kalau TikTok minta API key Euler Stream
 */
const NAMES = [
  'natsuki', 'kyoko', 'rizky', 'budi', 'sari', 'dimas', 'putri', 'andi', 'citra', 'fajar',
  'gita', 'hendra', 'indah', 'joko', 'kiki', 'lutfi', 'maya', 'nanda', 'oscar', 'pratiwi',
  'rama', 'sinta', 'tono', 'umi', 'vino', 'wawan', 'yuni', 'zaki', 'dewi', 'ega',
];
const WEAPONS = ['pedang', 'tombak', 'kapak', 'panah'];

export function connectTikTok(uniqueId, arena) {
  let conn = null;
  let stopped = false;
  let retry = 0;

  const scheduleRetry = () => {
    if (stopped) return;
    retry++;
    const delay = Math.min(30_000 * retry, 120_000);
    console.log(`  coba lagi dalam ${Math.round(delay / 1000)} detik`);
    setTimeout(start, delay).unref?.();
  };

  const start = async () => {
    if (stopped) return;
    const { TikTokLiveConnection } = await import('tiktok-live-connector');
    const opts = {};
    if (process.env.TIKTOK_SIGN_KEY) opts.signApiKey = process.env.TIKTOK_SIGN_KEY;
    conn = new TikTokLiveConnection(uniqueId, opts);

    conn.on('connected', (state) => {
      retry = 0;
      const title = state?.roomInfo?.title;
      console.log(`✔ tersambung ke live ${uniqueId}${title ? ` — "${title}"` : ''}`);
      arena.broadcast({ type: 'status', tiktok: 'connected', user: uniqueId });
    });

    conn.on('chat', (msg) => {
      arena.onChat({
        user: msg.user?.nickname || msg.user?.uniqueId || 'penonton',
        userId: msg.user?.userId || msg.user?.uniqueId,
        avatar: msg.user?.profilePicture?.urls?.[0] || null,
        text: msg.comment || '',
      });
    });

    // hadiah = karakter makin kuat (biar live rame)
    conn.on('gift', (msg) => {
      if (msg.giftType === 1 && !msg.repeatEnd) return;
      const count = Math.max(1, msg.repeatCount || 1);
      const name = msg.user?.nickname || msg.user?.uniqueId || 'penonton';
      const diamonds = (msg.gift?.diamondCount || 1) * count;
      arena.boost({ user: name, userId: msg.user?.userId || name, amount: diamonds });
    });

    conn.on('disconnected', () => {
      console.log('… terputus dari TikTok, mencoba lagi');
      arena.broadcast({ type: 'status', tiktok: 'disconnected' });
      scheduleRetry();
    });

    conn.on('error', (err) => {
      console.error('! TikTok:', err?.message || err);
      arena.broadcast({ type: 'status', tiktok: 'error', message: String(err?.message || err) });
    });

    try {
      await conn.connect();
    } catch (err) {
      console.error('! gagal connect TikTok:', err?.message || err);
      if (String(err?.name || '').includes('Offline')) console.error('  akun sedang tidak live.');
      if (String(err?.message || '').match(/sign|api key|premium/i)) {
        console.error('  TikTok minta API key Euler Stream. Daftar di eulerstream.com lalu:');
        console.error('  TIKTOK_SIGN_KEY=xxxx npm start');
      }
      scheduleRetry();
    }
  };

  start();

  return {
    stop() {
      stopped = true;
      try { conn?.disconnect(); } catch {}
    },
  };
}

/** Mode simulasi: penonton palsu join, lalu sesekali ganti senjata. */
export function startMockChat(arena) {
  const active = new Set();
  let i = 0;

  const join = () => {
    const name = NAMES[i++ % NAMES.length] + (i > NAMES.length ? Math.floor(i / NAMES.length) : '');
    active.add(name);
    arena.onChat({ user: name, userId: name, text: 'join' });
  };

  const chatter = () => {
    if (Math.random() < 0.55) join();
    else if (active.size) {
      const name = [...active][Math.floor(Math.random() * active.size)];
      arena.onChat({ user: name, userId: name, text: WEAPONS[Math.floor(Math.random() * WEAPONS.length)] });
    }
  };

  for (let k = 0; k < 6; k++) setTimeout(join, 400 * k);
  const timer = setInterval(chatter, 2600);

  console.log('▶ mode simulasi: komentar palsu tiap ±2,6 detik');
  return { stop() { clearInterval(timer); } };
}
