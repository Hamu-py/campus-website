/**
 * 企画一覧パネルの夜空（Canvas）
 * ------------------------------------------------
 * ・星は Canvas 1枚のみ（DOM を増やさない）
 * ・瞬き・ごく弱い漂流・マウス微パララックス
 * ・AnimationEngine（parallax-scene.js）と rAF を共有
 */

const STARFIELD_CONFIG = {
  /** 星の総数（スマホは軽量化） */
  count: window.matchMedia("(max-width: 767px)").matches ? 72 : 128,
  /** ゆっくり漂う星の数 */
  driftCount: window.matchMedia("(max-width: 767px)").matches ? 8 : 16,
  /** マウスパララックス最大変位（px） */
  parallaxMax: 2,
  /** パララックス追従の滑らかさ（大きいほど遅い） */
  parallaxLerp: 0.06,
};

const STAR_COLORS = [
  { weight: 70, rgb: [236, 242, 255] }, // 白寄り
  { weight: 20, rgb: [170, 230, 245] }, // 水色
  { weight: 10, rgb: [210, 190, 245] }, // 薄紫
];

function pickStarColor(rand) {
  const total = STAR_COLORS.reduce((sum, item) => sum + item.weight, 0);
  let ticket = rand() * total;
  for (const item of STAR_COLORS) {
    ticket -= item.weight;
    if (ticket <= 0) return item.rgb;
  }
  return STAR_COLORS[0].rgb;
}

/** 0〜1 の決定論的乱数（見た目の再現性用） */
function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

class NightSkyScene {
  constructor(panel, engine, config = STARFIELD_CONFIG) {
    this.panel = panel;
    this.engine = engine;
    this.config = config;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isIntersecting = false;
    this.layoutDirty = true;
    this.stars = [];
    this.width = 0;
    this.height = 0;
    this.pointerX = 0;
    this.pointerY = 0;
    this.parallaxX = 0;
    this.parallaxY = 0;
    this.startTime = 0;
  }

  init() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "night-sky";
    this.canvas.setAttribute("aria-hidden", "true");
    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.panel.prepend(this.canvas);

    this.onPointerMove = (event) => {
      const rect = this.panel.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      // DOM 操作なし。正規化座標だけ更新
      this.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };

    // タッチ端末ではポインタパララックスを付けない（誤作動・負荷を避ける）
    if (window.matchMedia("(pointer: fine)").matches) {
      this.panel.addEventListener("pointermove", this.onPointerMove, { passive: true });
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.layoutDirty = true;
      this.engine.requestFrame();
    });
    this.resizeObserver.observe(this.panel);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.isIntersecting = entry.isIntersecting;
        this.updateCompositing(this.engine.pageVisible);
        if (this.isIntersecting) this.engine.requestFrame();
      },
      { rootMargin: "40px", threshold: 0 }
    );
    this.intersectionObserver.observe(this.panel);

    this.layout();
    this.engine.add(this);
  }

  needsFrame() {
    return this.layoutDirty || this.isAnimating();
  }

  isAnimating() {
    return this.isIntersecting && !this.reduceMotion;
  }

  updateCompositing(pageVisible) {
    this.canvas.classList.toggle(
      "is-active",
      pageVisible && this.isIntersecting && !this.reduceMotion
    );
  }

  layout() {
    this.layoutDirty = false;
    const rect = this.panel.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);

    if (width === this.width && height === this.height && this.stars.length) {
      return;
    }

    this.width = width;
    this.height = height;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.buildStars();
    if (this.reduceMotion) this.renderStatic();
  }

  buildStars() {
    const rand = createRng(20260729);
    const { count, driftCount } = this.config;
    const driftIndexes = new Set();

    while (driftIndexes.size < Math.min(driftCount, count)) {
      driftIndexes.add(Math.floor(rand() * count));
    }

    this.stars = [];
    for (let i = 0; i < count; i += 1) {
      const drifts = driftIndexes.has(i);
      const speed = drifts ? 0.2 + rand() * 0.6 : 0; // px/秒
      const angle = rand() * Math.PI * 2;
      this.stars.push({
        x: rand() * this.width,
        y: rand() * this.height,
        size: 1 + rand() * 2,
        baseAlpha: 0.35 + rand() * 0.55,
        color: pickStarColor(rand),
        period: 2000 + rand() * 6000, // 2〜8秒
        phase: rand(),
        driftX: Math.cos(angle) * speed,
        driftY: Math.sin(angle) * speed,
      });
    }
  }

  renderStatic() {
    const { ctx, width, height, stars } = this;
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const alpha = star.baseAlpha * 0.7;
      ctx.fillStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${alpha.toFixed(3)})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  render(time) {
    if (!this.startTime) this.startTime = time;
    const elapsed = (time - this.startTime) / 1000;
    const { ctx, width, height, stars, config } = this;
    const max = config.parallaxMax;

    this.parallaxX += (this.pointerX * max - this.parallaxX) * config.parallaxLerp;
    this.parallaxY += (this.pointerY * max - this.parallaxY) * config.parallaxLerp;

    ctx.clearRect(0, 0, width, height);

    for (const star of stars) {
      let x = star.x + star.driftX * elapsed + this.parallaxX;
      let y = star.y + star.driftY * elapsed + this.parallaxY;

      // 画面外へ出たら反対側へ（漂流星のみ意味がある）
      x = ((x % width) + width) % width;
      y = ((y % height) + height) % height;

      const twinkle = 0.5 - 0.5 * Math.cos(
        ((time / star.period) + star.phase) * Math.PI * 2
      );
      // 0.2 → peak → 0.2（peak は星ごとに 0.85〜1.0）
      const peak = 0.85 + star.baseAlpha * 0.15;
      const alpha = 0.2 + (peak - 0.2) * twinkle;

      ctx.fillStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${alpha.toFixed(3)})`;
      // 極小の光点（円より fillRect の方が軽い）
      ctx.fillRect(x, y, star.size, star.size);
    }
  }

  destroy() {
    if (window.matchMedia("(pointer: fine)").matches) {
      this.panel.removeEventListener("pointermove", this.onPointerMove);
    }
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.engine.remove(this);
    this.canvas.remove();
  }
}

function setupNightSkies(engine) {
  const panels = Array.from(document.querySelectorAll("[data-night-sky]"));
  if (panels.length === 0) return;

  const animEngine = engine || window.CampusAnim?.getEngine?.();
  if (!animEngine) return;

  for (const panel of panels) {
    const sky = new NightSkyScene(panel, animEngine);
    sky.init();
  }
}

window.CampusStarfield = { setupNightSkies };
