/**
 * 文化祭 Webサイト - JavaScript
 * --------------------------------
 * 【初心者向けメモ】
 * ・企画の中身は HTML を編集すれば変わります
 * ・動き（カルーセルなど）はこのファイルで制御します
 */

document.addEventListener("DOMContentLoaded", () => {
  setupStickyHeader();
  setupEventCarousel();
});


/**
 * ヘッダー追従
 * --------------------------------
 * ・縦スクロールしても上部に固定
 * ・元の位置から動いたら背景を少し透過
 * ・固定分の余白を body に確保
 */
function setupStickyHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const syncOffset = () => {
    document.documentElement.style.setProperty(
      "--header-offset",
      `${header.offsetHeight}px`
    );
  };

  const updateScrolled = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  syncOffset();
  updateScrolled();
  window.addEventListener("scroll", updateScrolled, { passive: true });
  window.addEventListener("resize", syncOffset);
}


/**
 * イベント・カルーセル（トップページ）※仮実装
 * --------------------------------
 * ・正面の後ろを中心にした円（円筒）配置の 3D カルーセル
 * ・正面カードは正面向き・大きめ（is-active）
 * ・7秒に1回、円を1コマ分回転（自動）
 * ・左右の三角形ボタンで手動送りも可能
 *
 * 【回転の向きについて】
 * index を 0 に戻すと rotateY が一気に 0° に戻り、逆回転に見える。
 * そのため累積角度（rotationDeg）で ±1コマずつ動かす。
 */
function setupEventCarousel() {
  const root = document.querySelector("[data-event-carousel]");
  if (!root) return;

  const list = root.querySelector(".event-list");
  if (!list) return;

  const items = Array.from(list.children);
  const count = items.length;
  if (count === 0) return;

  const prevBtn = root.querySelector("[data-carousel-prev]");
  const nextBtn = root.querySelector("[data-carousel-next]");

  const INTERVAL_MS = 7000;
  const TRANSITION_MS = 900;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step = 360 / count;

  let index = 0;
  /** 表示用の累積回転角（周回しても値が飛び跳ねない） */
  let rotationDeg = 0;
  let timerId = null;
  let animating = false;
  let pendingDir = 0; // -1 | 0 | 1（連打時は最後の方向を1回だけ消化）

  /** 円の半径（カード拡大後も間隔は従来どおり） */
  function radius() {
    // 基準幅(220)で計算した半径を、横間隔 1.5 倍にする
    const refW = 220;
    const base = Math.max(260, Math.round(refW / (2 * Math.tan(Math.PI / count))));
    const desktop = base * 1.5 * 1.5;
    // スマホでは円を小さくして、カードが画面内に収まりやすくする
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    return isMobile ? Math.round(desktop * 0.52) : desktop;
  }

  function layout(animate) {
    const r = radius();

    list.style.transition = animate && !reduceMotion ? `transform ${TRANSITION_MS}ms ease` : "none";
    list.style.transform = `translateZ(${-r}px) rotateY(${rotationDeg}deg)`;

    items.forEach((li, i) => {
      const angle = i * step;
      li.style.transform = `rotateY(${angle}deg) translateZ(${r}px)`;

      // 正面からの距離（短い方）で奥行きの優先度を決める
      let diff = Math.abs(i - index);
      diff = Math.min(diff, count - diff);
      li.style.zIndex = String(count - diff);

      const card = li.querySelector(".event-card");
      if (card) {
        card.classList.toggle("is-active", diff === 0);
      }
    });
  }

  function applyStep(dir) {
    // dir: 1 = 次（自動と同じ向き）, -1 = 前
    index = (index + dir + count) % count;
    rotationDeg -= dir * step;
    layout(true);
  }

  function goNext() {
    applyStep(1);
  }

  function goPrev() {
    applyStep(-1);
  }

  function finishAnim() {
    animating = false;
    if (pendingDir !== 0) {
      const dir = pendingDir;
      pendingDir = 0;
      runStep(dir);
    }
  }

  function runStep(dir) {
    if (reduceMotion) {
      applyStep(dir);
      return;
    }

    if (animating) {
      // 連打中は最新の方向だけ覚え、アニメ完了後に1回実行
      pendingDir = dir;
      return;
    }

    animating = true;
    applyStep(dir);
    window.setTimeout(finishAnim, TRANSITION_MS);
  }

  function startAuto() {
    stopAuto();
    if (reduceMotion) return;
    timerId = window.setInterval(() => {
      runStep(1);
    }, INTERVAL_MS);
  }

  function stopAuto() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  /** 手動操作後は自動送りの待ち時間をリセット */
  function onManual(dir) {
    runStep(dir);
    startAuto();
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onManual(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onManual(1);
    });
  }

  // リサイズ時も半径を再計算（角度はそのまま）
  window.addEventListener("resize", () => layout(false));

  // タブ非表示中は自動送りを止めて安定性を確保
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  layout(false);
  startAuto();
}


/* ========================================
   今後追加予定の機能（メモ）
   ----------------------------------------
   ・モバイルメニューの開閉
   ・スムーススクロール（アンカーリンク）
   ・FAQ アコーディオン
   ・お知らせのフィルタ / タブ切替
   ・企画一覧のカテゴリ絞り込み
   ======================================== */
