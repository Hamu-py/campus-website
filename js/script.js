/**
 * 文化祭 Webサイト - JavaScript
 * --------------------------------
 * 【初心者向けメモ】
 * ・企画の中身は HTML を編集すれば変わります
 * ・動き（カルーセルなど）はこのファイルで制御します
 */

document.addEventListener("DOMContentLoaded", () => {
  setupEventCarousel();
});


/**
 * イベント・カルーセル（トップページ）※仮実装
 * --------------------------------
 * ・正面の後ろを中心にした円（円筒）配置の 3D カルーセル
 * ・正面カードは正面向き・大きめ（is-active）
 * ・7秒に1回、円を1コマ分回転
 */
function setupEventCarousel() {
  const root = document.querySelector("[data-event-carousel]");
  if (!root) return;

  const list = root.querySelector(".event-list");
  if (!list) return;

  const items = Array.from(list.children);
  const count = items.length;
  if (count === 0) return;

  const INTERVAL_MS = 7000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let index = 0;

  /** 円の半径（カード拡大後も間隔は従来どおり） */
  function radius() {
    // 基準幅(220)で計算した半径を、横間隔 1.5 倍にする
    const refW = 220;
    const base = Math.max(260, Math.round(refW / (2 * Math.tan(Math.PI / count))));
    return base * 1.5 * 1.5;
  }

  function layout(animate) {
    const r = radius();
    const step = 360 / count;

    list.style.transition = animate && !reduceMotion ? "transform 0.9s ease" : "none";
    // 円全体を回して、index 番目が正面に来るようにする
    list.style.transform = `translateZ(${-r}px) rotateY(${-index * step}deg)`;

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

  function goNext() {
    index = (index + 1) % count;
    layout(true);
  }

  // リサイズ時も半径を再計算
  window.addEventListener("resize", () => layout(false));

  requestAnimationFrame(() => {
    layout(false);
    if (!reduceMotion) {
      setInterval(goNext, INTERVAL_MS);
    }
  });
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
