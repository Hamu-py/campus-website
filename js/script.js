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
 * イベント・カルーセル（トップページ）
 * --------------------------------
 * ・7秒に1回、カードを1つ分だけ進める（手動スクロールなし）
 * ・複製セットでループし、端での跳ね返りを防ぐ
 * ・見える3枚のうち中央を is-active（1.3倍）にする
 */
function setupEventCarousel() {
  const root = document.querySelector("[data-event-carousel]");
  if (!root) return;

  const list = root.querySelector(".event-list");
  if (!list) return;

  const originals = Array.from(list.children);
  const count = originals.length;
  if (count === 0) return;

  // ループ用に同じ並びを複製
  originals.forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    list.appendChild(clone);
  });

  const INTERVAL_MS = 7000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let index = 0;
  let step = 0;
  let resetting = false;

  function measureStep() {
    const first = list.children[0];
    if (!first) {
      step = 0;
      return;
    }
    const gap = parseFloat(getComputedStyle(list).columnGap || getComputedStyle(list).gap) || 0;
    step = first.getBoundingClientRect().width + gap;
  }

  function setTransform(animate) {
    if (animate && !reduceMotion) {
      list.style.transition = "transform 0.45s ease";
    } else {
      list.style.transition = "none";
    }
    list.style.transform = `translate3d(${-index * step}px, 0, 0)`;
  }

  function updateActive() {
    const cards = Array.from(list.querySelectorAll(".event-card"));
    // 同時に見える3枚の中央 = 開始 index のひとつ右
    const activePos = index + 1;
    cards.forEach((card, i) => {
      card.classList.toggle("is-active", i === activePos);
    });
  }

  function goNext() {
    if (resetting || step <= 0) return;

    index += 1;
    setTransform(true);
    updateActive();

    // オリジナル末尾を超えたら、同じ見た目の先頭位置へ瞬時に戻す
    if (index >= count) {
      resetting = true;
      const onEnd = () => {
        list.removeEventListener("transitionend", onEnd);
        index = 0;
        setTransform(false);
        updateActive();
        // 次の transition を有効に戻すため再描画
        void list.offsetWidth;
        resetting = false;
      };

      if (reduceMotion) {
        onEnd();
      } else {
        list.addEventListener("transitionend", onEnd);
      }
    }
  }

  function layout() {
    measureStep();
    setTransform(false);
    updateActive();
  }

  layout();
  window.addEventListener("resize", layout);

  requestAnimationFrame(() => {
    layout();
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
