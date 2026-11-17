/** Koneksi WebSocket ke server arena: auto-reconnect + heartbeat. */
export class Net {
  constructor({ onInit, onEvent, onOpen, onClose }) {
    this.handlers = { onInit, onEvent, onOpen, onClose };
    this.retry = 0;
    this.alive = true;
    this.pingTimer = null;
    this.connect();
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);

    this.ws.onopen = () => {
      this.retry = 0;
      this.handlers.onOpen?.();
      this.pingTimer = setInterval(() => {
        if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
      }, 15000);
    };

    this.ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === 'init') this.handlers.onInit?.(msg.state);
      else if (msg.type !== 'pong') this.handlers.onEvent?.(msg);
    };

    this.ws.onclose = () => {
      clearInterval(this.pingTimer);
      this.handlers.onClose?.();
      if (!this.alive) return;
      this.retry++;
      const delay = Math.min(1000 * 2 ** Math.min(this.retry, 4), 15000);
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = () => {};
  }

  close() {
    this.alive = false;
    clearInterval(this.pingTimer);
    try { this.ws.close(); } catch {}
  }
}
