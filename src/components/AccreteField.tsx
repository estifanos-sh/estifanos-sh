import { onCleanup, onMount } from "solid-js";

import { SiteHeader } from "./SiteHeader";

type Column = {
  ht: number;
  hc: number;
};

declare global {
  interface Window {
    __forceCoh?: number;
  }
}

const HMAX = 4;
const MAXCOLS = 320;
const SH = 13;
const BASE = [130, 170, 162] as const;
const H_RATE = 5;
const STAR_H = 2;

export function AccreteField(props: { showContent?: boolean } = {}) {
  let stageRef: HTMLDivElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;

  onMount(() => {
    if (props.showContent !== false) document.title = "estifanos.com";

    const stageEl = stageRef;
    const canvasEl = canvasRef;
    if (!stageEl || !canvasEl) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    const rootStyle = document.documentElement.style;
    const previousGridSize = rootStyle.getPropertyValue("--grid-size");
    const previousLayoutWidth = rootStyle.getPropertyValue("--layout-width");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cols = new Map<string, Column>();
    const activeKeys: string[] = [];
    const activeKeyIndexes = new Map<string, number>();
    const star = new Map<string, number>();
    const t0 = performance.now();
    const key = (x: number, y: number) => `${x},${y}`;

    let scale = 18;
    let ox = 560;
    let oy = 330;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let gAcc = 0;
    let dAcc = 0;
    let hAcc = 0;
    let coh = 0;
    let frame = 0;
    let last = performance.now();

    const nowSec = () => (performance.now() - t0) / 1000;
    const splitKey = (cellKey: string) => {
      const [gx, gy] = cellKey.split(",");
      return { gx: Number(gx), gy: Number(gy) };
    };
    const gridToScreen = (gx: number, gy: number) => ({
      x: ox + gx * scale,
      y: oy + gy * scale,
    });
    const screenToGrid = (x: number, y: number) => ({
      gx: Math.round((x - ox) / scale),
      gy: Math.round((y - oy) / scale),
    });
    const setCell = (cellKey: string, cell: Column) => {
      if (!cols.has(cellKey)) {
        activeKeyIndexes.set(cellKey, activeKeys.length);
        activeKeys.push(cellKey);
      }
      cols.set(cellKey, cell);
    };
    const removeCell = (cellKey: string) => {
      const index = activeKeyIndexes.get(cellKey);
      if (index == null) return;

      const lastKey = activeKeys.pop();
      if (lastKey !== undefined && lastKey !== cellKey) {
        activeKeys[index] = lastKey;
        activeKeyIndexes.set(lastKey, index);
      }

      activeKeyIndexes.delete(cellKey);
      cols.delete(cellKey);
    };
    const randomActiveKey = () => activeKeys[(Math.random() * activeKeys.length) | 0];
    const buildStar = () => {
      const h = SH;
      const d = h * Math.SQRT2;
      const tw = 0.9;
      const td = 1.5;
      const radius = Math.ceil(d) + 1;

      for (let gx = -radius; gx <= radius; gx++) {
        for (let gy = -radius; gy <= radius; gy++) {
          const mx = Math.max(Math.abs(gx), Math.abs(gy));
          const di = Math.abs(gx) + Math.abs(gy);
          const onSquare = mx <= h && mx >= h - tw;
          const onDiamond = di <= d && di >= d - td;
          if (onSquare || onDiamond) star.set(key(gx, gy), 2);
        }
      }
    };

    buildStar();
    const starKeys = [...star.keys()];

    const drawCell = (gx: number, gy: number, hc: number) => {
      const { x, y } = gridToScreen(gx, gy);
      const t = Math.min(1, hc / 2);
      const b = 0.34 + 0.62 * t;
      const inset = Math.max(0.8, Math.min(1.6, scale * 0.08));
      const size = Math.max(1, scale - inset * 2);
      const half = size / 2;

      ctx.fillStyle = `rgb(${Math.round(BASE[0] * b)},${Math.round(BASE[1] * b)},${Math.round(BASE[2] * b)})`;
      ctx.fillRect(x - half, y - half, size, size);
      ctx.strokeStyle = "rgba(18,19,15,.35)";
      ctx.lineWidth = 0.7;
      ctx.strokeRect(x - half + 0.35, y - half + 0.35, size - 0.7, size - 0.7);
    };

    const prepareFrame = () => {
      ctx.clearRect(0, 0, width, height);
    };

    const render = () => {
      prepareFrame();
      for (const cellKey of activeKeys) {
        const cell = cols.get(cellKey);
        if (!cell || cell.hc <= 0.04) continue;
        const { gx, gy } = splitKey(cellKey);
        drawCell(gx, gy, cell.hc);
      }
    };

    const coherence = (t: number) => {
      if (window.__forceCoh != null) return window.__forceCoh;

      const period = 78;
      const phase = (t % period) / period;
      const cycle = Math.floor(t / period);
      const a = 0.42;
      const b = 0.58;
      const ramp = 0.05;
      let p = 0;

      if (phase < a || phase > b) p = 0;
      else if (phase < a + ramp) p = (phase - a) / ramp;
      else if (phase > b - ramp) p = (b - phase) / ramp;
      else p = 1;

      const strength = 0.85 + 0.15 * Math.abs(Math.sin(cycle * 1.7 + 0.5));
      return p * strength;
    };

    const seed = () => {
      for (let s = 0; s < 5; s++) {
        const cxs = (Math.random() * 30 - 15) | 0;
        const cys = (Math.random() * 30 - 15) | 0;

        for (let i = 0; i < 3; i++) {
          const gx = cxs + ((Math.random() * 3 - 1) | 0);
          const gy = cys + ((Math.random() * 3 - 1) | 0);
          const cellKey = key(gx, gy);
          if (!cols.has(cellKey)) {
            setCell(cellKey, { ht: (1 + Math.random() * 2) | 0, hc: 0 });
          }
        }
      }
    };

    const occN = (gx: number, gy: number) =>
      cols.has(key(gx + 1, gy)) ||
      cols.has(key(gx - 1, gy)) ||
      cols.has(key(gx, gy + 1)) ||
      cols.has(key(gx, gy - 1));

    const emptyNbrs = (gx: number, gy: number) => {
      const out: Array<[number, number]> = [];
      if (!cols.has(key(gx + 1, gy))) out.push([gx + 1, gy]);
      if (!cols.has(key(gx - 1, gy))) out.push([gx - 1, gy]);
      if (!cols.has(key(gx, gy + 1))) out.push([gx, gy + 1]);
      if (!cols.has(key(gx, gy - 1))) out.push([gx, gy - 1]);

      if (Math.random() < 0.22) {
        const diagonals = [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ] as const;
        const [dx, dy] = diagonals[(Math.random() * diagonals.length) | 0];
        if (!cols.has(key(gx + dx, gy + dy))) out.push([gx + dx, gy + dy]);
      }

      return out;
    };

    const spread = () => {
      if (coh > 0.12 && Math.random() < coh * 1.25) {
        for (let t = 0; t < 12; t++) {
          const starKey = starKeys[(Math.random() * starKeys.length) | 0];
          if (cols.has(starKey)) continue;
          const { gx, gy } = splitKey(starKey);
          if (occN(gx, gy)) {
            setCell(starKey, { ht: 1, hc: 0 });
            return;
          }
        }

        if (Math.random() < 0.3) {
          const starKey = starKeys[(Math.random() * starKeys.length) | 0];
          if (!cols.has(starKey)) setCell(starKey, { ht: 1, hc: 0 });
        }
        return;
      }

      if (!activeKeys.length || (Math.random() < 0.04 && activeKeys.length < MAXCOLS)) {
        const gx = (Math.random() * 44 - 22) | 0;
        const gy = (Math.random() * 44 - 22) | 0;
        setCell(key(gx, gy), { ht: 1, hc: 0 });
        return;
      }

      if (activeKeys.length >= MAXCOLS) return;

      for (let t = 0; t < 6; t++) {
        const { gx, gy } = splitKey(randomActiveKey());
        const neighbors = emptyNbrs(gx, gy);
        if (neighbors.length) {
          const [nx, ny] = neighbors[(Math.random() * neighbors.length) | 0];
          setCell(key(nx, ny), { ht: 1, hc: 0 });
          return;
        }
      }
    };

    const del = () => {
      if (!activeKeys.length) return;

      if (coh > 0.12 && Math.random() < coh) {
        for (let t = 0; t < 16; t++) {
          const cellKey = randomActiveKey();
          if (!star.has(cellKey)) {
            const cell = cols.get(cellKey);
            if (cell) cell.ht = Math.max(0, cell.ht - 1);
            return;
          }
        }
        return;
      }

      let cellKey = randomActiveKey();
      for (let t = 0; t < 3; t++) {
        const candidate = randomActiveKey();
        const { gx, gy } = splitKey(candidate);
        if (emptyNbrs(gx, gy).length >= 3) {
          cellKey = candidate;
          break;
        }
      }

      const cell = cols.get(cellKey);
      if (cell) cell.ht = Math.max(0, cell.ht - 1);
    };

    const heightEv = () => {
      if (!activeKeys.length) return;

      const cellKey = randomActiveKey();
      const cell = cols.get(cellKey);
      if (!cell) return;

      if (coh > 0.12 && Math.random() < coh) {
        if (star.has(cellKey)) {
          if (cell.ht < STAR_H) cell.ht++;
        } else if (cell.ht > 0) {
          cell.ht--;
        }
        return;
      }

      if (Math.random() < 0.55) cell.ht = Math.min(3, cell.ht + 1);
      else cell.ht = Math.max(0, cell.ht - 1);
    };

    const ease = () => {
      for (let i = activeKeys.length - 1; i >= 0; i--) {
        const cellKey = activeKeys[i];
        const cell = cols.get(cellKey);
        if (!cell) continue;
        cell.hc += (cell.ht - cell.hc) * 0.08;
        if (cell.ht === 0 && cell.hc < 0.04) removeCell(cellKey);
      }
    };

    const fit = () => {
      const rect = stageEl.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);

      width = Math.max(2, Math.floor(rect.width));
      height = Math.max(2, Math.floor(rect.height));
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.max(18, (Math.min(width, height) * 0.82) / (2 * SH * Math.SQRT2));

      const targetX = width > 720 ? width * 0.62 : width * 0.5;
      const targetY = height * 0.5;
      ox = (Math.round(targetX / scale - 0.5) + 0.5) * scale;
      oy = (Math.round(targetY / scale - 0.5) + 0.5) * scale;

      const gutterColumns = width > 720 ? 4 : 2;
      const layoutColumns = Math.max(1, Math.floor((width - scale * gutterColumns) / scale));
      rootStyle.setProperty("--grid-size", `${scale}px`);
      rootStyle.setProperty("--layout-width", `${layoutColumns * scale}px`);
      render();
    };

    const pick = (clientX: number, clientY: number) => {
      const rect = canvasEl.getBoundingClientRect();
      return screenToGrid(
        ((clientX - rect.left) / rect.width) * width,
        ((clientY - rect.top) / rect.height) * height,
      );
    };

    let down = false;
    let canceled = false;
    let isMouse = false;
    let sx = 0;
    let sy = 0;
    let stroke = new Set<string>();

    const paintAt = (clientX: number, clientY: number) => {
      const { gx, gy } = pick(clientX, clientY);
      const cellKey = key(gx, gy);
      if (stroke.has(cellKey)) return;

      stroke.add(cellKey);

      const cell = cols.get(cellKey);
      if (cell) {
        cell.ht = Math.min(HMAX, Math.max(cell.ht, Math.ceil(cell.hc)) + 1);
      } else {
        setCell(cellKey, { ht: 1, hc: 0 });
      }

      if (reduced) render();
    };

    const onPointerDown = (event: PointerEvent) => {
      down = true;
      canceled = false;
      isMouse = event.pointerType === "mouse";
      sx = event.clientX;
      sy = event.clientY;

      if (isMouse) {
        stroke = new Set<string>();
        paintAt(event.clientX, event.clientY);
        canvasEl.setPointerCapture?.(event.pointerId);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!down) return;

      if (isMouse) {
        paintAt(event.clientX, event.clientY);
        return;
      }

      const dx = event.clientX - sx;
      const dy = event.clientY - sy;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) canceled = true;
    };

    const onPointerCancel = () => {
      canceled = true;
      down = false;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!down) return;

      down = false;

      if (
        !isMouse &&
        !canceled &&
        Math.abs(event.clientX - sx) + Math.abs(event.clientY - sy) < 10
      ) {
        stroke = new Set<string>();
        paintAt(event.clientX, event.clientY);
      }
    };

    const scheduleLoop = () => {
      if (!reduced && !frame && document.visibilityState === "visible") {
        frame = requestAnimationFrame(loop);
      }
    };

    const stopLoop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        last = performance.now();
        scheduleLoop();
      } else {
        stopLoop();
      }
    };

    const loop = (now: number) => {
      frame = 0;
      const dt = Math.min(80, now - last);
      last = now;

      const n = activeKeys.length;
      coh = coherence(nowSec());

      gAcc += (dt / 1000) * (6 + 0.05 * n + coh * 24);
      while (gAcc >= 1) {
        spread();
        gAcc--;
      }

      dAcc += (dt / 1000) * (0.0009 * Math.pow(n, 1.9) + coh * 16);
      while (dAcc >= 1) {
        del();
        dAcc--;
      }

      hAcc += (dt / 1000) * (H_RATE + coh * 22);
      while (hAcc >= 1) {
        heightEv();
        hAcc--;
      }

      ease();
      render();
      scheduleLoop();
    };

    const resizeObserver = new ResizeObserver(() => {
      const rect = stageEl.getBoundingClientRect();
      if (Math.abs(rect.width - width) > 2 || Math.abs(rect.height - height) > 2) {
        fit();
      }
    });

    canvasEl.addEventListener("pointerdown", onPointerDown);
    canvasEl.addEventListener("pointermove", onPointerMove);
    canvasEl.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("pointerup", onPointerUp);
    document.addEventListener("visibilitychange", onVisibilityChange);
    resizeObserver.observe(stageEl);

    fit();
    seed();
    if (reduced) {
      for (let i = 0; i < 120; i++) {
        spread();
        heightEv();
      }
      for (const cell of cols.values()) {
        cell.hc = cell.ht;
      }
      render();
    } else {
      scheduleLoop();
    }

    onCleanup(() => {
      stopLoop();
      resizeObserver.disconnect();
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      canvasEl.removeEventListener("pointermove", onPointerMove);
      canvasEl.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      if (previousGridSize) rootStyle.setProperty("--grid-size", previousGridSize);
      else rootStyle.removeProperty("--grid-size");

      if (previousLayoutWidth) rootStyle.setProperty("--layout-width", previousLayoutWidth);
      else rootStyle.removeProperty("--layout-width");
    });
  });

  return (
    <div
      class="accrete-page"
      classList={{ "accrete-page--field-only": props.showContent === false }}
    >
      <div ref={(el) => (stageRef = el)} class="accrete-stage" aria-hidden="true">
        <canvas ref={(el) => (canvasRef = el)} class="accrete-canvas" />
      </div>
      <div class="accrete-veil" aria-hidden="true" />
      {props.showContent !== false && (
        <>
          <SiteHeader site="com" />
          <main class="accrete-content" aria-label="Robel Estifanos">
            <div class="accrete-copy">
              <p class="accrete-desc">
                From enterprise infrastructure to building on the ground, I focus on environments
                where software quality and judgment actually matter. I now lead technical direction{" "}
                <a href="https://trestle.inc" target="_blank" rel="noreferrer">
                  @Trestle
                </a>
                , building a system of record designed around the authentic workflows of frontline
                staff. As AI collapses the cost of automation, I've shifted my focus to the new
                frontier: reducing cognitive load and designing software that remains durable over
                time.
              </p>
              <nav class="accrete-links" aria-label="External links">
                <a href="https://github.com/estifanos-sh" target="_blank" rel="noreferrer">
                  GitHub
                </a>
                <a href="https://twitter.com/robelestifanos_" target="_blank" rel="noreferrer">
                  Twitter
                </a>
                <a href="https://linkedin.com/in/robelest" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
                <a href="mailto:robel@estifanos.com">Email</a>
              </nav>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
