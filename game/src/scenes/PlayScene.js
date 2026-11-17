import Phaser from 'phaser';
import { GAME_SIZE } from '../main.js';

const GROUND_H = 64;
const GROUND_Y = GAME_SIZE.height - GROUND_H;

export default class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  create() {
    const { width, height } = GAME_SIZE;
    this.finished = false;
    this.score = 0;
    this.coins = 0;
    this.speed = 340;
    this.level = 1;
    this.startedAt = this.time.now;

    // langit
    this.add.tileSprite(0, 0, width, height, 'stars-far').setOrigin(0).setAlpha(0.8).setScrollFactor(0);
    this.far = this.add.tileSprite(0, 0, width, height, 'stars-near').setOrigin(0).setAlpha(0.45).setScrollFactor(0);
    this.far.tilePositionY = 40;

    // tanah
    this.ground = this.add.tileSprite(0, GROUND_Y, width, GROUND_H, 'ground').setOrigin(0);
    this.physics.add.existing(this.ground, true);
    this.ground.body.setSize(width, GROUND_H);
    this.ground.body.updateFromGameObject();

    // pemain
    // world bounds diperpanjang ke bawah supaya pesawat bisa "jatuh keluar layar"
    this.physics.world.setBounds(0, -200, width, height + 400);

    this.player = this.physics.add.sprite(200, GROUND_Y - 120, 'player');
    this.player.setScale(0.72);
    this.player.body.setSize(44, 40).setOffset(12, 26);
    this.player.setCollideWorldBounds(true);
    this.player.setMaxVelocity(900, 900);
    this.playerTrail = this.add.image(this.player.x, this.player.y, 'glow').setAlpha(0.55);

    this.physics.add.collider(this.player, this.ground, () => { this.onGround = true; });

    // grup
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.coinGroup = this.physics.add.group({ allowGravity: false, immovable: true });

    this.physics.add.overlap(this.player, this.coinGroup, (_p, coin) => this.collectCoin(coin));
    this.physics.add.overlap(this.player, this.obstacles, () => this.gameOver());

    // spawner
    this.spawnTimer = this.time.addEvent({
      delay: 1500, loop: true, callback: () => this.spawnObstacle(),
    });
    this.coinTimer = this.time.addEvent({
      delay: 2200, loop: true, callback: () => this.spawnCoin(),
    });

    // input
    const flap = () => this.flap();
    this.input.on('pointerdown', flap);
    this.input.keyboard.on('keydown-SPACE', flap);
    this.input.keyboard.on('keydown-UP', flap);
    this.input.keyboard.on('keydown-W', flap);

    // HUD
    const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    this.scoreText = this.add.text(24, 20, '0', { fontFamily: mono, fontSize: '40px', color: '#eaf3ff' }).setShadow(0, 4, '#2b7dff', 12, true, true);
    this.coinText = this.add.text(26, 68, '◎ 0', { fontFamily: mono, fontSize: '18px', color: '#ffd166' });
    this.levelText = this.add.text(GAME_SIZE.width - 24, 24, 'LV 1', { fontFamily: mono, fontSize: '18px', color: '#8ea3d6' }).setOrigin(1, 0);

    this.cameras.main.fadeIn(250, 7, 11, 24);
  }

  flap() {
    if (this.finished) return;
    this.player.setVelocityY(-560);
    this.tweens.add({ targets: this.player, angle: -12, duration: 120, yoyo: true });
  }

  spawnObstacle() {
    if (this.finished) return;
    const tall = Math.random() < 0.35;
    const key = tall ? 'obstacle-tall' : 'obstacle';
    const h = this.textures.get(key).getSourceImage().height;
    const ob = this.obstacles.create(GAME_SIZE.width + 80, GROUND_Y - h / 2, key);
    ob.setVelocityX(-this.speed);
    ob.body.setAllowGravity(false);
    ob.body.setImmovable(true);
    ob.setDepth(5);

    // hadiah di atas rintangan (kadang)
    if (Math.random() < 0.45) {
      const c = this.coinGroup.create(GAME_SIZE.width + 80, GROUND_Y - h - 60, 'coin');
      c.setVelocityX(-this.speed);
      c.body.setAllowGravity(false);
    }
  }

  spawnCoin() {
    if (this.finished) return;
    const y = Phaser.Math.Between(140, GROUND_Y - 80);
    const c = this.coinGroup.create(GAME_SIZE.width + 60, y, 'coin');
    c.setVelocityX(-this.speed);
    c.body.setAllowGravity(false);
    this.tweens.add({ targets: c, y: y - 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  collectCoin(coin) {
    coin.disableBody(true, true);
    this.coins += 1;
    this.coinText.setText(`◎ ${this.coins}`);
    this.score += 25;
    this.flashPulse(coin.x, coin.y);
  }

  flashPulse(x, y) {
    const ring = this.add.circle(x, y, 6, 0xffd166, 0.9).setDepth(8);
    this.tweens.add({
      targets: ring, radius: 34, alpha: 0, duration: 320,
      onUpdate: () => ring.setRadius(ring.radius),
      onComplete: () => ring.destroy(),
    });
  }

  update(_time, dt) {
    if (this.finished) return;

    const d = dt / 1000;

    // gerak paralaks
    this.far.tilePositionX += this.speed * d * 0.35;
    this.ground.tilePositionX += this.speed * d;

    // pesawat miring mengikuti kecepatan vertikal
    const targetAngle = Phaser.Math.Clamp(this.player.body.velocity.y / 22, -18, 26);
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, 0.16);
    this.playerTrail.setPosition(this.player.x - 26, this.player.y).setAlpha(0.25 + Math.random() * 0.2);

    // skor bertambah berdasarkan jarak
    this.score += (this.speed * d) / 9;
    this.scoreText.setText(String(Math.floor(this.score)));

    // naik level tiap 12 detik
    const lv = 1 + Math.floor((this.time.now - this.startedAt) / 12000);
    if (lv !== this.level) {
      this.level = Math.min(lv, 20);
      this.levelText.setText(`LV ${this.level}`);
      this.speed = Math.min(340 + (this.level - 1) * 38, 900);
      this.spawnTimer.delay = Math.max(1500 - this.level * 90, 620);
      this.spawnTimer.reset({ delay: this.spawnTimer.delay, loop: true, callback: () => this.spawnObstacle() });
      this.cameras.main.flash(120, 43, 125, 255);
    }

    // bersihkan entitas di luar layar
    for (const g of [this.obstacles, this.coinGroup]) {
      g.getChildren().forEach((o) => {
        if (o.active && o.x < -120) o.destroy();
        else if (o.active) o.setVelocityX(-this.speed);
      });
    }

    // jatuh keluar layar dianggap kalah
    if (this.player.y > GAME_SIZE.height + 120) this.gameOver();
  }

  gameOver() {
    if (this.finished) return;
    this.finished = true;
    this.player.setVelocity(0, 0);
    this.player.setTint(0xff6b6b);
    this.cameras.main.shake(220, 0.012);

    const stats = {
      score: Math.floor(this.score),
      coins: this.coins,
      level: this.level,
      durationMs: Math.round(this.time.now - this.startedAt),
    };

    this.time.delayedCall(420, () => {
      this.cameras.main.fadeOut(260, 7, 11, 24);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameOver', stats));
    });
  }
}
