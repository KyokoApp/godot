// Klien API. Selalu pakai URL relatif -> di-proxy Vite ke backend.
const BASE = '/api';

async function json(res) {
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) throw new Error((body && body.error) || `HTTP ${res.status}`);
  return body;
}

export async function health() {
  const res = await fetch(`${BASE}/health`);
  return json(res);
}

export async function submitScore({ name, score, level, durationMs }) {
  const res = await fetch(`${BASE}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score, level, durationMs }),
  });
  return json(res);
}

export async function topScores(limit = 10) {
  const res = await fetch(`${BASE}/scores?limit=${limit}`);
  const data = await json(res);
  return data.scores || [];
}
