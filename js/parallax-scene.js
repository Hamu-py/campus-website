/**
 * レイヤー舞台（企画一覧セクション背景）※軽量版
 * ------------------------------------------------
 * ・分割 WebP を % 配置
 * ・浮遊は CSS アニメーション（rAF / パーティクルなし）
 * ・画面外では animation を停止
 *
 * レイヤー追加: SCENE_LAYERS に 1 件足すだけ
 */

const PARALLAX_CONFIG = {
  refWidth: 1280,
  refHeight: 960,
  floatAmpMin: 14,
  floatAmpMax: 30,
  floatPeriodMin: 3.5,
  floatPeriodMax: 7.5,
  breathPeriodSec: 11,
  /** ぼんやりパーティクル（少量・CSS アニメ） */
  particleCount: 24,
};

const SCENE_LAYERS = [
  {
    id: "背景",
    src: "images/class_all/layers_rgba/背景.webp",
    left: 0,
    top: 0,
    width: 100,
    depth: "background",
    z: 1,
  },
  {
    id: "左壁_後",
    src: "images/class_all/layers_rgba/左壁_後.webp",
    left: 30.1253,
    top: 27.0106,
    width: 21.5831,
    depth: "mid-back",
    z: 2,
  },
  {
    id: "右壁_後",
    src: "images/class_all/layers_rgba/右壁_後.webp",
    left: 59.738,
    top: 34.9772,
    width: 26.2528,
    depth: "mid-back",
    z: 3,
  },
  {
    id: "缶",
    src: "images/class_all/layers_rgba/缶.webp",
    left: 33.8269,
    top: 54.6282,
    width: 8.713,
    depth: "mid-front",
    z: 4,
  },
  {
    id: "左壁",
    src: "images/class_all/layers_rgba/左壁.webp",
    left: 0,
    top: 4.7041,
    width: 39.9203,
    depth: "wall",
    z: 5,
  },
  {
    id: "右テーブル",
    src: "images/class_all/layers_rgba/右テーブル.webp",
    left: 51.8223,
    top: 59.8634,
    width: 34.1686,
    depth: "foreground",
    z: 6,
  },
  {
    id: "右壁",
    src: "images/class_all/layers_rgba/右壁.webp",
    left: 78.5308,
    top: 0,
    width: 21.4692,
    depth: "wall",
    z: 7,
  },
  {
    id: "中央テーブル",
    src: "images/class_all/layers_rgba/中央テーブル.webp",
    left: 39.9203,
    top: 51.214,
    width: 31.6059,
    depth: "foreground",
    z: 8,
  },
];

class ParallaxScene {
  constructor(root, layers = SCENE_LAYERS, config = PARALLAX_CONFIG) {
    this.root = root;
    this.layers = layers;
    this.config = config;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.world = null;
  }

  init() {
    this.root.classList.add("parallax-scene");
    this.root.setAttribute("aria-hidden", "true");

    this.world = document.createElement("div");
    this.world.className = "parallax-scene__world";
    this.root.appendChild(this.world);

    const glow = document.createElement("div");
    glow.className = "parallax-scene__glow";
    this.root.appendChild(glow);

    this.buildLayers();
    this.buildParticles();
    this.bindEvents();
    this.layoutWorld();
  }

  buildLayers() {
    const { floatAmpMin, floatAmpMax, floatPeriodMin, floatPeriodMax, breathPeriodSec } =
      this.config;
    const ordered = [...this.layers].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const n = ordered.length;

    ordered.forEach((def, i) => {
      const el = document.createElement("img");
      el.className = "parallax-scene__layer";
      el.src = `${def.src}?v=lite1`;
      el.alt = "";
      el.draggable = false;
      el.decoding = "async";
      el.loading = i === 0 ? "eager" : "lazy";
      el.style.left = `${def.left}%`;
      el.style.top = `${def.top}%`;
      el.style.width = `${def.width}%`;
      el.style.zIndex = String(def.z ?? i + 1);

      if (def.depth === "background") {
        el.classList.add("is-background");
        if (!this.reduceMotion) {
          el.style.setProperty("--breath-dur", `${breathPeriodSec}s`);
        }
      } else if (!this.reduceMotion) {
        const t = n <= 1 ? 0 : i / (n - 1);
        const amp = floatAmpMin + (floatAmpMax - floatAmpMin) * (0.35 + (0.65 * ((i * 37) % 10)) / 10);
        const period =
          floatPeriodMin + (floatPeriodMax - floatPeriodMin) * (0.2 + 0.8 * t);
        const delay = -((i * 1.3) % period);
        el.style.setProperty("--float-amp", `${amp.toFixed(1)}px`);
        el.style.setProperty("--float-dur", `${period.toFixed(1)}s`);
        el.style.setProperty("--float-delay", `${delay.toFixed(1)}s`);
        el.classList.add("is-floating");
      }

      this.world.appendChild(el);
    });
  }

  buildParticles() {
    if (this.reduceMotion) return;
    const count = this.config.particleCount ?? 24;
    const layer = document.createElement("div");
    layer.className = "parallax-scene__particles";
    this.root.appendChild(layer);

    for (let i = 0; i < count; i += 1) {
      const p = document.createElement("span");
      p.className = "parallax-scene__particle";
      const size = 6 + (i % 4) * 3; // 6〜15px
      const left = 8 + ((i * 37) % 84);
      const dur = 14 + (i % 5) * 3; // 14〜26s
      const delay = -((i * 2.7) % dur);
      const drift = (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 4);
      p.style.setProperty("--p-size", `${size}px`);
      p.style.setProperty("--p-left", `${left}%`);
      p.style.setProperty("--p-dur", `${dur}s`);
      p.style.setProperty("--p-delay", `${delay}s`);
      p.style.setProperty("--p-drift", `${drift}px`);
      p.style.setProperty("--p-opacity", String(0.22 + (i % 4) * 0.06));
      layer.appendChild(p);
    }
  }

  bindEvents() {
    this.ro = new ResizeObserver(() => this.layoutWorld());
    this.ro.observe(this.root);

    // 画面外では CSS アニメを止めて負荷を下げる
    this.io = new IntersectionObserver(
      ([entry]) => {
        this.root.classList.toggle("is-paused", !entry.isIntersecting);
      },
      { rootMargin: "80px", threshold: 0 }
    );
    this.io.observe(this.root);
  }

  layoutWorld() {
    const { refWidth, refHeight } = this.config;
    const rect = this.root.getBoundingClientRect();
    const sw = rect.width;
    const sh = rect.height;
    if (sw <= 0 || sh <= 0) return;

    const ra = refWidth / refHeight;
    const sa = sw / sh;
    let w;
    let h;
    if (sa > ra) {
      w = sw;
      h = sw / ra;
    } else {
      h = sh;
      w = sh * ra;
    }
    this.world.style.width = `${w}px`;
    this.world.style.height = `${h}px`;
    this.world.style.left = `${(sw - w) / 2}px`;
    this.world.style.top = `${(sh - h) / 2}px`;
  }

  destroy() {
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
  }
}

function setupParallaxScene() {
  const root = document.querySelector("[data-parallax-scene]");
  if (!root) return;
  new ParallaxScene(root).init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupParallaxScene);
} else {
  setupParallaxScene();
}
