/**
 * 企画一覧のレイヤー背景
 * ------------------------------------------------
 * ・全シーンを1本の requestAnimationFrame で更新
 * ・アニメーション中に変更するのは transform / opacity のみ
 * ・画面外、非表示タブ、スマホでは更新しない
 * ・レイヤー追加は SCENE_LAYERS に設定を足すだけ
 */

const PARALLAX_CONFIG = {
  refWidth: 1280,
  refHeight: 960,
  breathScale: 0.045,
  particleCount: 8,
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
    moveX: 0,
    moveY: 0,
    period: 11000,
    phase: 0,
  },
  {
    id: "左壁_後",
    src: "images/class_all/layers_rgba/左壁_後.webp",
    left: 30.1253,
    top: 27.0106,
    width: 21.5831,
    depth: "mid-back",
    z: 2,
    moveX: -7,
    moveY: 31,
    period: 4300,
    phase: 0.17,
  },
  {
    id: "右壁_後",
    src: "images/class_all/layers_rgba/右壁_後.webp",
    left: 59.738,
    top: 34.9772,
    width: 26.2528,
    depth: "mid-back",
    z: 3,
    moveX: 6,
    moveY: 25,
    period: 4900,
    phase: 0.39,
  },
  {
    id: "缶",
    src: "images/class_all/layers_rgba/缶.webp",
    left: 33.8269,
    top: 54.6282,
    width: 8.713,
    depth: "mid-front",
    z: 4,
    moveX: -9,
    moveY: 38,
    period: 5600,
    phase: 0.61,
  },
  {
    id: "左壁",
    src: "images/class_all/layers_rgba/左壁.webp",
    left: 0,
    top: 4.7041,
    width: 39.9203,
    depth: "wall",
    z: 5,
    moveX: 5,
    moveY: 28,
    period: 6200,
    phase: 0.82,
  },
  {
    id: "右テーブル",
    src: "images/class_all/layers_rgba/右テーブル.webp",
    left: 51.8223,
    top: 59.8634,
    width: 34.1686,
    depth: "foreground",
    z: 6,
    moveX: -8,
    moveY: 45,
    period: 6800,
    phase: 0.28,
  },
  {
    id: "右壁",
    src: "images/class_all/layers_rgba/右壁.webp",
    left: 78.5308,
    top: 0,
    width: 21.4692,
    depth: "wall",
    z: 7,
    moveX: 6,
    moveY: 34,
    period: 7100,
    phase: 0.5,
  },
  {
    id: "中央テーブル",
    src: "images/class_all/layers_rgba/中央テーブル.webp",
    left: 39.9203,
    top: 51.214,
    width: 31.6059,
    depth: "foreground",
    z: 8,
    moveX: -7,
    moveY: 42,
    period: 7500,
    phase: 0.72,
  },
];

const TAU = Math.PI * 2;

/** 端で緩やかになる、連続した 0〜1 の往復値 */
function smoothWave(angle) {
  return (1 - Math.cos(angle)) * 0.5;
}

class AnimationEngine {
  constructor() {
    this.scenes = [];
    this.frameId = 0;
    this.pageVisible = !document.hidden;
    this.tick = this.tick.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  add(scene) {
    this.scenes.push(scene);
    this.requestFrame();
  }

  remove(scene) {
    const index = this.scenes.indexOf(scene);
    if (index !== -1) this.scenes.splice(index, 1);
    if (!this.hasWork() && this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  onVisibilityChange() {
    this.pageVisible = !document.hidden;
    for (const scene of this.scenes) {
      if (typeof scene.updateCompositing === "function") {
        scene.updateCompositing(this.pageVisible);
      }
    }
    if (!this.pageVisible && this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      return;
    }
    if (this.pageVisible) this.requestFrame();
  }

  hasWork() {
    return this.pageVisible && this.scenes.some((scene) => scene.needsFrame());
  }

  requestFrame() {
    if (!this.frameId && this.hasWork()) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  tick(time) {
    this.frameId = 0;
    if (!this.pageVisible) return;

    for (const scene of this.scenes) {
      if (scene.layoutDirty) scene.layout();
      if (scene.isAnimating()) scene.render(time);
    }
    if (this.hasWork()) this.requestFrame();
  }
}

/** ページ共通のアニメーションエンジン（rAF は常に1本） */
window.CampusAnim = window.CampusAnim || {
  _engine: null,
  getEngine() {
    if (!this._engine) this._engine = new AnimationEngine();
    return this._engine;
  },
};

class ParallaxScene {
  constructor(root, engine, layers = SCENE_LAYERS, config = PARALLAX_CONFIG) {
    this.root = root;
    this.engine = engine;
    this.layerSettings = layers;
    this.config = config;
    this.assetBase = root.dataset.assetBase || "";
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isIntersecting = false;
    this.layoutDirty = true;
    this.worldHeight = 0;
    this.layers = [];
    this.particles = [];
  }

  init() {
    this.root.classList.add("parallax-scene");
    this.root.setAttribute("aria-hidden", "true");

    this.world = document.createElement("div");
    this.world.className = "parallax-scene__world";

    this.glow = document.createElement("div");
    this.glow.className = "parallax-scene__glow";

    this.root.append(this.world, this.glow);
    this.buildLayers();
    this.buildParticles();
    this.bindObservers();
    this.layout();
    this.engine.add(this);
  }

  buildLayers() {
    const fragment = document.createDocumentFragment();

    for (const setting of this.layerSettings) {
      const slot = document.createElement("div");
      slot.className = "parallax-scene__slot";
      slot.style.cssText =
        `left:${setting.left}%;top:${setting.top}%;width:${setting.width}%;z-index:${setting.z}`;

      const image = document.createElement("img");
      image.className = "parallax-scene__layer";
      image.src = `${this.assetBase}${setting.src}`;
      image.alt = "";
      image.draggable = false;
      image.decoding = "async";
      image.loading = setting.depth === "background" ? "eager" : "lazy";
      image.dataset.depth = setting.depth;

      if (setting.depth === "background") {
        slot.classList.add("is-background");
        image.classList.add("is-background");
      } else {
        slot.classList.add("is-animated");
      }

      slot.appendChild(image);
      fragment.appendChild(slot);
      this.layers.push({ element: slot, setting });
    }

    this.world.appendChild(fragment);
  }

  buildParticles() {
    if (this.reduceMotion || this.config.particleCount <= 0) return;

    const container = document.createElement("div");
    container.className = "parallax-scene__particles";
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < this.config.particleCount; i += 1) {
      const element = document.createElement("span");
      const size = 7 + (i % 3) * 4;
      const setting = {
        duration: 15000 + (i % 4) * 3000,
        delay: (i * 2700) % 17000,
        drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 4),
        opacity: 0.22 + (i % 3) * 0.06,
      };

      element.className = "parallax-scene__particle";
      element.style.cssText =
        `left:${8 + ((i * 37) % 84)}%;width:${size}px;height:${size}px;` +
        `margin-left:${size / -2}px`;
      fragment.appendChild(element);
      this.particles.push({ element, setting });
    }

    container.appendChild(fragment);
    this.root.appendChild(container);
  }

  bindObservers() {
    this.resizeObserver = new ResizeObserver(() => {
      this.layoutDirty = true;
      this.engine.requestFrame();
    });
    this.resizeObserver.observe(this.root);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.isIntersecting = entry.isIntersecting;
        this.updateCompositing(this.engine.pageVisible);
        if (this.isIntersecting) this.engine.requestFrame();
      },
      { rootMargin: "40px", threshold: 0 }
    );
    this.intersectionObserver.observe(this.root);
  }

  needsFrame() {
    return this.layoutDirty || this.isAnimating();
  }

  isAnimating() {
    return this.isIntersecting && !this.reduceMotion;
  }

  updateCompositing(pageVisible) {
    this.root.classList.toggle(
      "is-active",
      pageVisible && this.isIntersecting && !this.reduceMotion
    );
  }

  layout() {
    this.layoutDirty = false;
    const { width: sceneWidth, height: sceneHeight } = this.root.getBoundingClientRect();
    if (sceneWidth <= 0 || sceneHeight <= 0) return;

    const referenceRatio = this.config.refWidth / this.config.refHeight;
    const sceneRatio = sceneWidth / sceneHeight;
    let worldWidth = sceneRatio > referenceRatio ? sceneWidth : sceneHeight * referenceRatio;
    let worldHeight = sceneRatio > referenceRatio ? sceneWidth / referenceRatio : sceneHeight;

    // 企画一覧ページは余白が出やすいので、カバーを少し拡大して埋める
    const coverScale = this.root.closest(".events-stage--list") ? 1.22 : 1;
    worldWidth *= coverScale;
    worldHeight *= coverScale;

    this.worldHeight = worldHeight;
    this.world.style.width = `${worldWidth}px`;
    this.world.style.height = `${worldHeight}px`;
    this.world.style.left = `${(sceneWidth - worldWidth) / 2}px`;
    this.world.style.top = `${(sceneHeight - worldHeight) / 2}px`;
  }

  render(time) {
    for (const layer of this.layers) {
      const { element, setting } = layer;
      const angle = (time / setting.period + setting.phase) * TAU;

      if (setting.depth === "background") {
        const scale = 1 + smoothWave(angle) * this.config.breathScale;
        element.style.transform = `translate3d(0,0,0) scale(${scale.toFixed(4)})`;
        continue;
      }

      const x = Math.sin(angle) * setting.moveX;
      const y = -smoothWave(angle) * setting.moveY;
      element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    }

    const particleTravel = this.worldHeight + 120;
    for (const particle of this.particles) {
      const { element, setting } = particle;
      const progress = ((time + setting.delay) % setting.duration) / setting.duration;
      const eased = progress * progress * (3 - 2 * progress);
      const x = setting.drift * Math.sin(progress * Math.PI);
      const y = -particleTravel * eased;
      const scale = 0.7 + progress * 0.45;
      const fadeIn = Math.min(1, progress / 0.12);
      const fadeOut = Math.min(1, (1 - progress) / 0.3);

      element.style.transform =
        `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(3)})`;
      element.style.opacity = (setting.opacity * fadeIn * fadeOut).toFixed(3);
    }

    const glowAngle = (time / 22000) * TAU;
    const glowX = Math.sin(glowAngle) * 3;
    const glowY = Math.cos(glowAngle) * 2;
    this.glow.style.transform =
      `translate3d(${glowX.toFixed(2)}%,${glowY.toFixed(2)}%,0) scale(1.08)`;
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.engine.remove(this);
  }
}

function setupParallaxScenes() {
  const engine = window.CampusAnim.getEngine();
  const roots = Array.from(document.querySelectorAll("[data-parallax-scene]"));
  const mobileQuery = window.matchMedia("(max-width: 767px)");
  const scenes = new Map();

  function syncScenes() {
    for (const root of roots) {
      if (mobileQuery.matches) {
        const scene = scenes.get(root);
        if (scene) {
          scene.destroy();
          scenes.delete(root);
        }
        root.replaceChildren();
        root.hidden = true;
      } else if (!scenes.has(root)) {
        root.hidden = false;
        const scene = new ParallaxScene(root, engine);
        scenes.set(root, scene);
        scene.init();
      }
    }
  }

  if (roots.length > 0) {
    syncScenes();
    mobileQuery.addEventListener("change", syncScenes);
  }

  // 企画一覧の夜空（同一 engine / 同一 rAF）
  if (window.CampusStarfield?.setupNightSkies) {
    window.CampusStarfield.setupNightSkies(engine);
  }
}

function bootCampusMotion() {
  setupParallaxScenes();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootCampusMotion, { once: true });
} else {
  bootCampusMotion();
}
