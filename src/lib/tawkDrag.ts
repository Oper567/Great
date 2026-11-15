export interface SavedTawkPosition {
  xRatio: number;
  yRatio: number;
}

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const TAWK_POSITION_STORAGE_KEY = "gfms:tawk-widget-position:v1";
export const TAWK_DRAG_STYLE_ID = "gfms-tawk-drag-style";
export const DRAG_THRESHOLD_PX = 6;
export const VIEWPORT_EDGE_MARGIN_PX = 8;

const DRAGGING_CLASS = "gfms-tawk-dragging";
const MIN_WIDGET_IFRAME_SELECTOR = "#min-widget > iframe";
const BUBBLE_WIDGET_IFRAME_SELECTOR = "#chat-bubble > iframe";
const PREVIEW_WIDGET_IFRAME_SELECTOR = "#message-preview > iframe";
const MAX_WIDGET_IFRAME_SELECTOR = "#max-widget > iframe";
const WIDGET_CONTAINER_IDS = new Set([
  "min-widget",
  "chat-bubble",
  "message-preview",
  "max-widget",
]);

export function clamp(value: number, min: number, max: number): number {
  if (max <= min) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampTranslationToViewport(
  naturalRect: RectLike,
  desiredDx: number,
  desiredDy: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = VIEWPORT_EDGE_MARGIN_PX
): { dx: number; dy: number } {
  const minLeft = margin;
  const maxLeft = Math.max(margin, viewportWidth - naturalRect.width - margin);
  const minTop = margin;
  const maxTop = Math.max(margin, viewportHeight - naturalRect.height - margin);

  const clampedLeft = clamp(naturalRect.left + desiredDx, minLeft, maxLeft);
  const clampedTop = clamp(naturalRect.top + desiredDy, minTop, maxTop);

  return {
    dx: Math.round(clampedLeft - naturalRect.left),
    dy: Math.round(clampedTop - naturalRect.top),
  };
}

export function normalizedPositionFromRect(
  renderedLeft: number,
  renderedTop: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = VIEWPORT_EDGE_MARGIN_PX
): SavedTawkPosition {
  const minLeft = margin;
  const maxLeft = Math.max(margin, viewportWidth - width - margin);
  const minTop = margin;
  const maxTop = Math.max(margin, viewportHeight - height - margin);

  const spanX = maxLeft - minLeft;
  const spanY = maxTop - minTop;

  const xRatio = spanX > 0 ? clamp((renderedLeft - minLeft) / spanX, 0, 1) : 1;
  const yRatio = spanY > 0 ? clamp((renderedTop - minTop) / spanY, 0, 1) : 1;

  return {
    xRatio: Number(xRatio.toFixed(4)),
    yRatio: Number(yRatio.toFixed(4)),
  };
}

export function offsetFromNormalizedPosition(
  naturalRect: RectLike,
  saved: SavedTawkPosition,
  viewportWidth: number,
  viewportHeight: number,
  margin = VIEWPORT_EDGE_MARGIN_PX
): { dx: number; dy: number } {
  const minLeft = margin;
  const maxLeft = Math.max(margin, viewportWidth - naturalRect.width - margin);
  const minTop = margin;
  const maxTop = Math.max(margin, viewportHeight - naturalRect.height - margin);

  const targetLeft = minLeft + clamp(saved.xRatio, 0, 1) * (maxLeft - minLeft);
  const targetTop = minTop + clamp(saved.yRatio, 0, 1) * (maxTop - minTop);

  return {
    dx: Math.round(targetLeft - naturalRect.left),
    dy: Math.round(targetTop - naturalRect.top),
  };
}

export function readSavedTawkPosition(): SavedTawkPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TAWK_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedTawkPosition>;
    if (
      typeof parsed?.xRatio === "number" &&
      Number.isFinite(parsed.xRatio) &&
      typeof parsed?.yRatio === "number" &&
      Number.isFinite(parsed.yRatio)
    ) {
      return {
        xRatio: clamp(parsed.xRatio, 0, 1),
        yRatio: clamp(parsed.yRatio, 0, 1),
      };
    }
  } catch {
    // Ignore storage access errors in restricted browsing contexts.
  }
  return null;
}

export function writeSavedTawkPosition(position: SavedTawkPosition): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TAWK_POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Ignore storage quota or private browsing errors.
  }
}

function getViewportSize(): { width: number; height: number } {
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: document.documentElement.clientHeight || window.innerHeight,
  };
}

function supportsStandaloneTranslate(): boolean {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("translate", "1px 1px")
  );
}

function ensureHostDragStyle(): boolean {
  const useTranslate = supportsStandaloneTranslate();
  if (!useTranslate) return false;
  if (document.getElementById(TAWK_DRAG_STYLE_ID)) return true;

  const style = document.createElement("style");
  style.id = TAWK_DRAG_STYLE_ID;
  style.textContent = `
    ${MIN_WIDGET_IFRAME_SELECTOR},
    ${PREVIEW_WIDGET_IFRAME_SELECTOR} {
      translate: var(--gfms-tawk-dx, 0px) var(--gfms-tawk-dy, 0px) !important;
      touch-action: none !important;
    }
    ${BUBBLE_WIDGET_IFRAME_SELECTOR} {
      translate: var(--gfms-tawk-bubble-dx, 0px) var(--gfms-tawk-bubble-dy, 0px) !important;
      touch-action: none !important;
    }
    ${MAX_WIDGET_IFRAME_SELECTOR} {
      translate: var(--gfms-tawk-max-dx, 0px) var(--gfms-tawk-max-dy, 0px) !important;
    }
    html.${DRAGGING_CLASS},
    html.${DRAGGING_CLASS} body {
      user-select: none !important;
      -webkit-user-select: none !important;
      cursor: grabbing !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
  return true;
}

function ensureIframeDocumentStyle(doc: Document): void {
  const styleId = "gfms-tawk-iframe-drag-style";
  if (doc.getElementById(styleId)) return;
  const style = doc.createElement("style");
  style.id = styleId;
  style.textContent = `
    html, body, button, [role="button"], .tawk-min-container, .tawk-bubble-container {
      touch-action: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    body.${DRAGGING_CLASS},
    body.${DRAGGING_CLASS} * {
      cursor: grabbing !important;
    }
  `;
  (doc.head || doc.documentElement)?.appendChild(style);
}

function getNaturalRect(iframe: HTMLIFrameElement, appliedDx: number, appliedDy: number): RectLike | null {
  const rect = iframe.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    left: rect.left - appliedDx,
    top: rect.top - appliedDy,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Enables manual mouse and touch dragging for Tawk.to's native launcher button
 * and "We are here!" bubble while preserving tap/click chat toggling and
 * keeping both minimized and maximized panels clamped inside the viewport.
 */
export function attachTawkDragController(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const useTranslate = ensureHostDragStyle();
  const rootStyle = document.documentElement.style;
  const boundDocs = new WeakSet<Document>();
  const boundIframes = new WeakSet<HTMLIFrameElement>();
  const iframeCleanups: Array<() => void> = [];

  let currentDx = 0;
  let currentDy = 0;
  let bubbleDx = 0;
  let bubbleDy = 0;
  let maxDx = 0;
  let maxDy = 0;
  let savedPosition: SavedTawkPosition | null = readSavedTawkPosition();
  let suppressClickUntil = 0;
  let syncTimer: number | null = null;

  interface ActiveDrag {
    pointerId: number;
    sourceIframe: HTMLIFrameElement;
    sourceDoc: Document;
    downTarget: Element | null;
    startViewportX: number;
    startViewportY: number;
    startDx: number;
    startDy: number;
    hasActivated: boolean;
  }

  let activeDrag: ActiveDrag | null = null;

  const setCssOffsets = (
    dx: number,
    dy: number,
    bDx: number,
    bDy: number,
    mDx: number,
    mDy: number
  ) => {
    currentDx = dx;
    currentDy = dy;
    bubbleDx = bDx;
    bubbleDy = bDy;
    maxDx = mDx;
    maxDy = mDy;

    if (useTranslate) {
      rootStyle.setProperty("--gfms-tawk-dx", `${dx}px`);
      rootStyle.setProperty("--gfms-tawk-dy", `${dy}px`);
      rootStyle.setProperty("--gfms-tawk-bubble-dx", `${bDx}px`);
      rootStyle.setProperty("--gfms-tawk-bubble-dy", `${bDy}px`);
      rootStyle.setProperty("--gfms-tawk-max-dx", `${mDx}px`);
      rootStyle.setProperty("--gfms-tawk-max-dy", `${mDy}px`);
      return;
    }

    const applyTransform = (selector: string, x: number, y: number) => {
      const el = document.querySelector<HTMLIFrameElement>(selector);
      if (el) {
        el.style.setProperty("transform", `translate3d(${x}px, ${y}px, 0)`, "important");
      }
    };
    applyTransform(MIN_WIDGET_IFRAME_SELECTOR, dx, dy);
    applyTransform(PREVIEW_WIDGET_IFRAME_SELECTOR, dx, dy);
    applyTransform(BUBBLE_WIDGET_IFRAME_SELECTOR, bDx, bDy);
    applyTransform(MAX_WIDGET_IFRAME_SELECTOR, mDx, mDy);
  };

  const computeAndApplyOffsets = (desiredDx: number, desiredDy: number) => {
    const { width: vw, height: vh } = getViewportSize();
    const minIframe = document.querySelector<HTMLIFrameElement>(MIN_WIDGET_IFRAME_SELECTOR);
    const bubbleIframe = document.querySelector<HTMLIFrameElement>(BUBBLE_WIDGET_IFRAME_SELECTOR);
    const maxIframe = document.querySelector<HTMLIFrameElement>(MAX_WIDGET_IFRAME_SELECTOR);

    let nextDx = desiredDx;
    let nextDy = desiredDy;

    const minNatural = minIframe ? getNaturalRect(minIframe, currentDx, currentDy) : null;
    if (minNatural) {
      const clampedMin = clampTranslationToViewport(
        minNatural,
        desiredDx,
        desiredDy,
        vw,
        vh,
        VIEWPORT_EDGE_MARGIN_PX
      );
      nextDx = clampedMin.dx;
      nextDy = clampedMin.dy;
    }

    let nextBubbleDx = nextDx;
    let nextBubbleDy = nextDy;
    const bubbleNatural = bubbleIframe ? getNaturalRect(bubbleIframe, bubbleDx, bubbleDy) : null;
    if (bubbleNatural) {
      const clampedBubble = clampTranslationToViewport(bubbleNatural, nextDx, nextDy, vw, vh, 4);
      nextBubbleDx = clampedBubble.dx;
      nextBubbleDy = clampedBubble.dy;
    }

    let nextMaxDx = 0;
    let nextMaxDy = 0;
    const maxNatural = maxIframe ? getNaturalRect(maxIframe, maxDx, maxDy) : null;
    if (maxNatural && maxNatural.width < vw - 24 && maxNatural.height < vh - 24) {
      const clampedMax = clampTranslationToViewport(maxNatural, nextDx, nextDy, vw, vh, 12);
      nextMaxDx = clampedMax.dx;
      nextMaxDy = clampedMax.dy;
    }

    setCssOffsets(nextDx, nextDy, nextBubbleDx, nextBubbleDy, nextMaxDx, nextMaxDy);
  };

  const syncFromSavedOrCurrent = () => {
    if (activeDrag) return;
    const { width: vw, height: vh } = getViewportSize();
    const minIframe = document.querySelector<HTMLIFrameElement>(MIN_WIDGET_IFRAME_SELECTOR);
    const minNatural = minIframe ? getNaturalRect(minIframe, currentDx, currentDy) : null;

    if (savedPosition && minNatural) {
      const target = offsetFromNormalizedPosition(
        minNatural,
        savedPosition,
        vw,
        vh,
        VIEWPORT_EDGE_MARGIN_PX
      );
      computeAndApplyOffsets(target.dx, target.dy);
      return;
    }

    computeAndApplyOffsets(currentDx, currentDy);
  };

  const setDraggingVisualState = (isDragging: boolean, doc?: Document) => {
    document.documentElement.classList.toggle(DRAGGING_CLASS, isDragging);
    const docs = doc
      ? [doc]
      : ([
          document.querySelector<HTMLIFrameElement>(MIN_WIDGET_IFRAME_SELECTOR)?.contentDocument,
          document.querySelector<HTMLIFrameElement>(BUBBLE_WIDGET_IFRAME_SELECTOR)?.contentDocument,
        ].filter(Boolean) as Document[]);

    for (const d of docs) {
      d.body?.classList.toggle(DRAGGING_CLASS, isDragging);
    }
  };

  const toParentViewportCoords = (
    ev: PointerEvent,
    eventIframe: HTMLIFrameElement | null
  ): { x: number; y: number } => {
    if (!eventIframe || ev.view === window) {
      return { x: ev.clientX, y: ev.clientY };
    }
    const rect = eventIframe.getBoundingClientRect();
    return { x: rect.left + ev.clientX, y: rect.top + ev.clientY };
  };

  const finishDrag = (ev?: PointerEvent) => {
    if (!activeDrag) return;
    if (ev && ev.pointerId !== activeDrag.pointerId) return;

    const drag = activeDrag;
    activeDrag = null;
    setDraggingVisualState(false, drag.sourceDoc);

    if (drag.hasActivated) {
      suppressClickUntil = Date.now() + 180;
      const minIframe = document.querySelector<HTMLIFrameElement>(MIN_WIDGET_IFRAME_SELECTOR);
      const rendered = minIframe?.getBoundingClientRect();
      if (rendered && rendered.width > 0 && rendered.height > 0) {
        const { width: vw, height: vh } = getViewportSize();
        savedPosition = normalizedPositionFromRect(
          rendered.left,
          rendered.top,
          rendered.width,
          rendered.height,
          vw,
          vh,
          VIEWPORT_EDGE_MARGIN_PX
        );
        writeSavedTawkPosition(savedPosition);
      }
    }
  };

  const handlePointerMove = (ev: PointerEvent, eventIframe: HTMLIFrameElement | null) => {
    if (!activeDrag || ev.pointerId !== activeDrag.pointerId) return;
    if (ev.pointerType === "mouse" && ev.buttons === 0) {
      finishDrag(ev);
      return;
    }

    const { x, y } = toParentViewportCoords(ev, eventIframe);
    const deltaX = x - activeDrag.startViewportX;
    const deltaY = y - activeDrag.startViewportY;

    if (!activeDrag.hasActivated) {
      if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;
      activeDrag.hasActivated = true;
      setDraggingVisualState(true, activeDrag.sourceDoc);
      window.getSelection()?.removeAllRanges();
      try {
        activeDrag.downTarget?.setPointerCapture?.(activeDrag.pointerId);
      } catch {
        // Synthetic or cross-context pointer capture may throw; window/doc listeners cover it.
      }
    }

    computeAndApplyOffsets(activeDrag.startDx + deltaX, activeDrag.startDy + deltaY);
  };

  const applyButtonDragHint = (iframe: HTMLIFrameElement) => {
    if (iframe.parentElement?.id !== "min-widget") return;
    try {
      const btn = iframe.contentDocument?.querySelector("button");
      if (btn && !btn.getAttribute("data-gfms-drag-hint")) {
        btn.setAttribute("data-gfms-drag-hint", "1");
        const existingTitle =
          btn.getAttribute("title") || btn.getAttribute("aria-label") || "Chat widget";
        btn.setAttribute("title", `${existingTitle} (Drag to move)`);
      }
    } catch {
      // Ignore cross-origin or detached document errors.
    }
  };

  const bindIframeDocument = (iframe: HTMLIFrameElement) => {
    let doc: Document | null = null;
    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }
    if (!doc) return;

    ensureIframeDocumentStyle(doc);
    applyButtonDragHint(iframe);

    if (boundDocs.has(doc)) return;
    boundDocs.add(doc);

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      suppressClickUntil = 0;

      const { x, y } = toParentViewportCoords(ev, iframe);
      activeDrag = {
        pointerId: ev.pointerId,
        sourceIframe: iframe,
        sourceDoc: doc!,
        downTarget: ev.target instanceof Element ? ev.target : doc!.documentElement,
        startViewportX: x,
        startViewportY: y,
        startDx: currentDx,
        startDy: currentDy,
        hasActivated: false,
      };
    };

    const onClickCapture = (ev: MouseEvent) => {
      if (Date.now() <= suppressClickUntil) {
        suppressClickUntil = 0;
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
      }
    };

    const onDocPointerMove = (ev: PointerEvent) => handlePointerMove(ev, iframe);
    const onDocPointerUp = (ev: PointerEvent) => finishDrag(ev);

    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("pointermove", onDocPointerMove, true);
    doc.addEventListener("pointerup", onDocPointerUp, true);
    doc.addEventListener("pointercancel", onDocPointerUp, true);
    doc.addEventListener("click", onClickCapture, true);

    iframeCleanups.push(() => {
      doc?.removeEventListener("pointerdown", onPointerDown, true);
      doc?.removeEventListener("pointermove", onDocPointerMove, true);
      doc?.removeEventListener("pointerup", onDocPointerUp, true);
      doc?.removeEventListener("pointercancel", onDocPointerUp, true);
      doc?.removeEventListener("click", onClickCapture, true);
    });
  };

  const scanAndBindIframes = () => {
    const interactiveSelectors = [
      MIN_WIDGET_IFRAME_SELECTOR,
      BUBBLE_WIDGET_IFRAME_SELECTOR,
      PREVIEW_WIDGET_IFRAME_SELECTOR,
    ];
    for (const selector of interactiveSelectors) {
      const iframe = document.querySelector<HTMLIFrameElement>(selector);
      if (!iframe) continue;

      if (!boundIframes.has(iframe)) {
        boundIframes.add(iframe);
        const onLoad = () => {
          bindIframeDocument(iframe);
          syncFromSavedOrCurrent();
        };
        iframe.addEventListener("load", onLoad);
        iframeCleanups.push(() => iframe.removeEventListener("load", onLoad));
      }

      bindIframeDocument(iframe);
    }

    const maxIframe = document.querySelector<HTMLIFrameElement>(MAX_WIDGET_IFRAME_SELECTOR);
    if (maxIframe && !boundIframes.has(maxIframe)) {
      boundIframes.add(maxIframe);
      const onMaxLoad = () => syncFromSavedOrCurrent();
      maxIframe.addEventListener("load", onMaxLoad);
      iframeCleanups.push(() => maxIframe.removeEventListener("load", onMaxLoad));
    }

    syncFromSavedOrCurrent();
  };

  const observer = new MutationObserver((mutations) => {
    let relevant = false;
    for (const m of mutations) {
      if (m.type !== "childList") continue;
      const targetEl = m.target instanceof Element ? m.target : null;
      if (
        (targetEl && WIDGET_CONTAINER_IDS.has(targetEl.id)) ||
        Array.from(m.addedNodes).some(
          (n) =>
            n instanceof Element &&
            (WIDGET_CONTAINER_IDS.has(n.id) ||
              n.tagName === "IFRAME" ||
              Boolean(n.querySelector?.("#min-widget, #chat-bubble, #max-widget")))
        )
      ) {
        relevant = true;
        break;
      }
    }
    if (relevant) {
      scanAndBindIframes();
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  const onWindowPointerMove = (ev: PointerEvent) => handlePointerMove(ev, null);
  const onWindowPointerUp = (ev: PointerEvent) => finishDrag(ev);
  const onWindowBlur = () => finishDrag();
  const onSync = () => {
    scanAndBindIframes();
    requestAnimationFrame(syncFromSavedOrCurrent);
    if (syncTimer !== null) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = null;
      scanAndBindIframes();
    }, 150);
  };

  window.addEventListener("pointermove", onWindowPointerMove, true);
  window.addEventListener("pointerup", onWindowPointerUp, true);
  window.addEventListener("pointercancel", onWindowPointerUp, true);
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("resize", onSync);
  window.visualViewport?.addEventListener("resize", onSync);
  window.addEventListener("tawkLoad", onSync);
  window.addEventListener("tawkChatMaximized", onSync);
  window.addEventListener("tawkChatMinimized", onSync);

  scanAndBindIframes();

  return () => {
    observer.disconnect();
    if (syncTimer !== null) window.clearTimeout(syncTimer);
    window.removeEventListener("pointermove", onWindowPointerMove, true);
    window.removeEventListener("pointerup", onWindowPointerUp, true);
    window.removeEventListener("pointercancel", onWindowPointerUp, true);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("resize", onSync);
    window.visualViewport?.removeEventListener("resize", onSync);
    window.removeEventListener("tawkLoad", onSync);
    window.removeEventListener("tawkChatMaximized", onSync);
    window.removeEventListener("tawkChatMinimized", onSync);
    setDraggingVisualState(false);
    for (const cleanup of iframeCleanups) {
      cleanup();
    }
  };
}
