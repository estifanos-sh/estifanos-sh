<script lang="ts">
  type Cell = {
    gx: number;
    gy: number;
    ht: number;
    hc: number;
    lastPaintedAt?: number;
  };

  type TouchFlingGesture = {
    vx: number;
    vy: number;
    totalDx: number;
    totalDy: number;
    durationMs: number;
  };
  // Cells touched by paint in the last FRESH_MS ease toward `ht` (the visible
  // target) instead of `hc` (the server's slowly-eased value). That way the
  // cube grows smoothly to full height in ~170ms instead of stalling at the
  // server's interim hc until the next 500ms tick lifts it.
  const FRESH_MS = 1500;

  type Props = {
    cells: readonly Cell[];
    interactive: boolean;
    veilOpacity?: number;
    onPaintPoint: (gx: number, gy: number) => void;
    onStrokeEnd: () => void;
    /** Touch drag deltas → virtual scroll in the page. */
    onScroll: (dx: number, dy: number) => void;
    /** Touch release shape → momentum scroll or snap in the page. */
    onFling: (gesture: TouchFlingGesture) => void;
  };

  let {
    cells: incoming,
    interactive,
    veilOpacity = 0,
    onPaintPoint,
    onStrokeEnd,
    onScroll,
    onFling,
  }: Props = $props();

  // ── Constants (verbatim from Accrete.html lines 309–314) ──
  const SH = 13;
  const ZS = 1.35;
  const YAW = 0.62;
  const PITCH = 0.95;
  const LX = -0.5;
  const LY = -0.36;
  const LZ = 0.79;
  const BASE: [number, number, number] = [206, 104, 67];
  const CY = Math.cos(YAW);
  const SY = Math.sin(YAW);
  const CP = Math.cos(PITCH);
  const SP = Math.sin(PITCH);
  const FWD_X = SY * CP;
  const FWD_Y = CY * CP;
  const FWD_Z = ZS * SP;
  const GRID_RADIUS_SCALE = 40 * 14;

  function faceColor(nx: number, ny: number, nz: number) {
    const rnx = nx * CY - ny * SY;
    const rny = nx * SY + ny * CY;
    let dot = rnx * LX + rny * LY + nz * LZ;
    if (dot < 0) dot = 0;
    const b = 0.42 + 0.58 * dot;
    return `rgb(${Math.round(BASE[0] * b)}, ${Math.round(BASE[1] * b)}, ${Math.round(BASE[2] * b)})`;
  }

  const TOP_COLOR = faceColor(0, 0, 1);
  const EAST_COLOR = faceColor(1, 0, 0);
  const WEST_COLOR = faceColor(-1, 0, 0);
  const SOUTH_COLOR = faceColor(0, 1, 0);
  const NORTH_COLOR = faceColor(0, -1, 0);
  const EAST_VISIBLE = FWD_X > 0.0001;
  const WEST_VISIBLE = -FWD_X > 0.0001;
  const SOUTH_VISIBLE = FWD_Y > 0.0001;
  const NORTH_VISIBLE = -FWD_Y > 0.0001;

  // ── Camera state ──
  let S = 26;
  let ox = 0;
  let oy = 0;
  let W = 0;
  let H = 0;
  let DPR = 1;
  let ctx2d: CanvasRenderingContext2D | null = null;
  let bgGradient: CanvasGradient | null = null;
  let gridPath: Path2D | null = null;

  // Non-reactive easing buffer. RAF reads this 60×/sec; reactivity would be pure
  // overhead. The page owns the authoritative cells; this Map only smooths the
  // visual disp toward the latest server `hc`.
  type DispCell = {
    gx: number;
    gy: number;
    ht: number;
    hc: number;
    disp: number;
    lastPaintedAt?: number;
  };
  const display = new Map<string, DispCell>();
  const k = (x: number, y: number) => `${x},${y}`;

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let stageEl = $state<HTMLDivElement | null>(null);
  let rafId = 0;
  const reduced =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Sync server cells → display. Easing happens in frame().
  // A cell that's missing from `incoming` but was painted in the last FRESH_MS
  // is **sticky**: we ignore the absence and keep the cube on screen. This
  // makes the renderer robust against the sub-frame window between Convex
  // rolling back an optimistic patch and the post-mutation snapshot arriving,
  // which was the "click → cube clears → remote arrives" flicker.
  $effect(() => {
    const seen = new Set<string>();
    for (const c of incoming) {
      const key = k(c.gx, c.gy);
      seen.add(key);
      const existing = display.get(key);
      if (existing) {
        existing.ht = c.ht;
        existing.hc = c.hc;
        // Take max so an earlier server stamp can never shorten the freshness
        // window started by a more recent optimistic paint.
        const merged = Math.max(
          existing.lastPaintedAt ?? 0,
          c.lastPaintedAt ?? 0,
        );
        existing.lastPaintedAt = merged || undefined;
      } else {
        display.set(key, {
          gx: c.gx,
          gy: c.gy,
          ht: c.ht,
          hc: c.hc,
          disp: reduced ? c.hc : 0,
          lastPaintedAt: c.lastPaintedAt,
        });
      }
    }
    const now = Date.now();
    for (const [key, c] of display) {
      if (seen.has(key)) continue;
      const fresh =
        c.lastPaintedAt !== undefined && now - c.lastPaintedAt < FRESH_MS;
      if (fresh) continue;
      c.ht = 0;
      c.hc = 0;
    }
  });

  function fit() {
    if (!stageEl || !canvasEl) return;
    const r = stageEl.getBoundingClientRect();
    const nextDPR = Math.min(2, window.devicePixelRatio || 1);
    const nextW = Math.max(2, Math.floor(r.width));
    const nextH = Math.max(2, Math.floor(r.height));
    if (!ctx2d) ctx2d = canvasEl.getContext("2d");
    if (nextDPR === DPR && nextW === W && nextH === H && bgGradient && gridPath) {
      return;
    }
    DPR = nextDPR;
    W = nextW;
    H = nextH;
    canvasEl.width = W * DPR;
    canvasEl.height = H * DPR;
    canvasEl.style.width = W + "px";
    canvasEl.style.height = H + "px";
    ox = W * 0.52;
    oy = H * 0.5;
    S = Math.max(8, (Math.min(W, H) * 0.45) / (SH * Math.SQRT2));
    rebuildCaches();
  }

  function cx() {
    return ox;
  }
  function cyo() {
    return oy;
  }

  function projectX(wx: number, wy: number) {
    const rx = wx * CY - wy * SY;
    return cx() + rx * S;
  }

  function projectY(wx: number, wy: number, wz: number) {
    const ry = wx * SY + wy * CY;
    return cyo() + (ry * SP - wz * ZS * CP) * S;
  }

  function projectDepth(wx: number, wy: number, wz: number) {
    const ry = wx * SY + wy * CY;
    return ry * CP + wz * ZS * SP;
  }

  // ── project / groundAt / shade — fixed camera math from Accrete.html ──
  function groundAt(Xc: number, Yc: number) {
    const rx = (Xc - cx()) / S;
    const ry = (Yc - cyo()) / (S * SP);
    return { wx: rx * CY + ry * SY, wy: -rx * SY + ry * CY };
  }

  function drawQuad(
    ctx: CanvasRenderingContext2D,
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    qx: number,
    qy: number,
    qz: number,
    dx: number,
    dy: number,
    dz: number,
    color: string,
  ) {
    ctx.beginPath();
    ctx.moveTo(projectX(ax, ay), projectY(ax, ay, az));
    ctx.lineTo(projectX(bx, by), projectY(bx, by, bz));
    ctx.lineTo(projectX(qx, qy), projectY(qx, qy, qz));
    ctx.lineTo(projectX(dx, dy), projectY(dx, dy, dz));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(18, 19, 15, 0.5)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  function drawLayerLines(
    ctx: CanvasRenderingContext2D,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    nFull: number,
    hc: number,
  ) {
    if (nFull < 1) return;
    ctx.strokeStyle = "rgba(18, 19, 15, 0.34)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let kk = 1; kk <= nFull; kk++) {
      if (kk > hc - 0.02) break;
      ctx.moveTo(projectX(ax, ay), projectY(ax, ay, kk));
      ctx.lineTo(projectX(bx, by), projectY(bx, by, kk));
    }
    ctx.stroke();
  }

  // ── drawBox — cube is centered at (gx, gy) ──
  function drawBox(
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    hc: number,
    alpha: number,
  ) {
    if (hc <= 0.02) return;
    const x0 = gx - 0.5,
      x1 = gx + 0.5,
      y0 = gy - 0.5,
      y1 = gy + 0.5,
      z1 = hc;
    ctx.globalAlpha = alpha;
    const nFull = Math.floor(hc + 1e-6);
    if (FWD_Z > 0.0001) {
      drawQuad(ctx, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, TOP_COLOR);
    }
    if (EAST_VISIBLE) {
      drawQuad(ctx, x1, y0, 0, x1, y1, 0, x1, y1, z1, x1, y0, z1, EAST_COLOR);
      drawLayerLines(ctx, x1, y0, x1, y1, nFull, hc);
    }
    if (WEST_VISIBLE) {
      drawQuad(ctx, x0, y1, 0, x0, y0, 0, x0, y0, z1, x0, y1, z1, WEST_COLOR);
      drawLayerLines(ctx, x0, y1, x0, y0, nFull, hc);
    }
    if (SOUTH_VISIBLE) {
      drawQuad(ctx, x1, y1, 0, x0, y1, 0, x0, y1, z1, x1, y1, z1, SOUTH_COLOR);
      drawLayerLines(ctx, x1, y1, x0, y1, nFull, hc);
    }
    if (NORTH_VISIBLE) {
      drawQuad(ctx, x0, y0, 0, x1, y0, 0, x1, y0, z1, x0, y0, z1, NORTH_COLOR);
      drawLayerLines(ctx, x0, y0, x1, y0, nFull, hc);
    }
    ctx.globalAlpha = 1;
  }

  function rebuildCaches() {
    if (!ctx2d) return;
    bgGradient = ctx2d.createRadialGradient(
      W * 0.5,
      H * 0.3,
      0,
      W * 0.5,
      H * 0.3,
      Math.max(W, H) * 1.2,
    );
    bgGradient.addColorStop(0, "#15160f");
    bgGradient.addColorStop(0.7, "#0f100c");

    const c = groundAt(W / 2, H / 2);
    const cgx = Math.round(c.wx);
    const cgy = Math.round(c.wy);
    const R = Math.round(GRID_RADIUS_SCALE / S) + 14;
    const path = new Path2D();
    for (let i = -R; i <= R; i++) {
      path.moveTo(projectX(cgx - R, cgy + i), projectY(cgx - R, cgy + i, 0));
      path.lineTo(projectX(cgx + R, cgy + i), projectY(cgx + R, cgy + i, 0));
      path.moveTo(projectX(cgx + i, cgy - R), projectY(cgx + i, cgy - R, 0));
      path.lineTo(projectX(cgx + i, cgy + R), projectY(cgx + i, cgy + R, 0));
    }
    gridPath = path;
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    if (!gridPath) return;
    ctx.strokeStyle = "rgba(231, 226, 214, 0.05)";
    ctx.lineWidth = 1;
    ctx.stroke(gridPath);
  }

  function render() {
    const ctx = ctx2d;
    if (!ctx || !bgGradient) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Demo uses CSS background-gradient + ctx.clearRect. We mirror that here.
    ctx.clearRect(0, 0, W, H);
    const grd = bgGradient;
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    drawGrid(ctx);

    const list: {
      gx: number;
      gy: number;
      hc: number;
      d: number;
      alpha: number;
    }[] = [];
    for (const c of display.values()) {
      if (c.disp <= 0.02) continue;
      const top = Math.floor(c.disp);
      const frac = c.disp - top;
      list.push({
        gx: c.gx,
        gy: c.gy,
        hc: c.disp,
        d: projectDepth(c.gx, c.gy, c.disp * 0.5),
        alpha: top >= 1 ? 1 : Math.max(0.15, frac),
      });
    }
    list.sort((a, b) => a.d - b.d);
    for (const it of list) drawBox(ctx, it.gx, it.gy, it.hc, it.alpha);

    if (veilOpacity > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.7, veilOpacity)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function frame() {
    if (!reduced) {
      for (const [key, c] of display) {
        // Always ease toward the higher of (hc, ht). A fresh paint has
        // ht=1, hc=0 → grows in immediately without waiting for the 500ms
        // server tick to lift hc. An eroding cell drops gradually as both
        // ht and hc converge to 0. No flickery branch-on-freshness.
        const target = Math.max(c.hc, c.ht);
        c.disp += (target - c.disp) * 0.18;
        if (target === 0 && c.disp < 0.02) {
          c.disp = 0;
          if (c.ht === 0) display.delete(key);
        }
      }
    } else {
      for (const c of display.values()) c.disp = Math.max(c.hc, c.ht);
    }
    render();
    if (!reduced) rafId = requestAnimationFrame(frame);
  }

  $effect(() => {
    if (!canvasEl || !stageEl) return;
    fit();
    const ro = new ResizeObserver(() => {
      fit();
      render();
    });
    ro.observe(stageEl);
    if (reduced) render();
    else rafId = requestAnimationFrame(frame);
    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  });

  function pick(clientX: number, clientY: number): [number, number] | null {
    if (!canvasEl) return null;
    const r = canvasEl.getBoundingClientRect();
    const Xc = ((clientX - r.left) / r.width) * W;
    const Yc = ((clientY - r.top) / r.height) * H;
    const g = groundAt(Xc, Yc);
    return [Math.round(g.wx), Math.round(g.wy)];
  }

  // Pointer handling. Two flavors:
  //   - Mouse/pen: drag-to-stroke. Capture the pointer; every move emits a
  //     unique cell. A short click also paints one cube.
  //   - Touch: tap-to-place AND drag-to-scroll. We don't capture; on every
  //     pointermove past the tap threshold we hand the delta to `onScroll`
  //     so the page can drive virtual scroll state from finger motion. A
  //     release before crossing the threshold paints one cube.
  let dragging = false;
  const stroke = new Set<string>();
  let touchStart: { x: number; y: number; t: number } | null = null;
  let touchPrev: { x: number; y: number; t: number } | null = null;
  let touchScrolled = false;
  // Exponential moving average of finger velocity (px / ms). The page eats
  // this on release to run a fling.
  let velX = 0;
  let velY = 0;

  const TAP_MAX_MOVE = 12;
  const VEL_SMOOTH = 0.4;

  function emitAt(clientX: number, clientY: number) {
    const c = pick(clientX, clientY);
    if (!c) return;
    const [gx, gy] = c;
    const key = `${gx},${gy}`;
    if (stroke.has(key)) return;
    stroke.add(key);
    onPaintPoint(gx, gy);
  }

  function pointerDown(e: PointerEvent) {
    if (e.pointerType === "touch") {
      const now = performance.now();
      touchStart = { x: e.clientX, y: e.clientY, t: now };
      touchPrev = { x: e.clientX, y: e.clientY, t: now };
      touchScrolled = false;
      velX = 0;
      velY = 0;
      onScroll(0, 0);
      return;
    }
    if (!interactive) return;
    dragging = true;
    stroke.clear();
    canvasEl?.setPointerCapture?.(e.pointerId);
    emitAt(e.clientX, e.clientY);
  }

  function pointerMove(e: PointerEvent) {
    if (e.pointerType === "touch") {
      if (!touchPrev) return;
      const dx = e.clientX - touchPrev.x;
      const dy = e.clientY - touchPrev.y;
      if (!touchScrolled && dx * dx + dy * dy > TAP_MAX_MOVE * TAP_MAX_MOVE) {
        touchScrolled = true;
      }
      if (touchScrolled) {
        // Swipe up → reveal bio (virtualY grows). Swipe left → past
        // (virtualX shrinks). Finger delta is the inverse of the scroll
        // direction, hence the negation.
        onScroll(-dx, -dy);
        const now = performance.now();
        const dt = Math.max(1, now - touchPrev.t);
        const instVx = -dx / dt;
        const instVy = -dy / dt;
        velX = velX * (1 - VEL_SMOOTH) + instVx * VEL_SMOOTH;
        velY = velY * (1 - VEL_SMOOTH) + instVy * VEL_SMOOTH;
        touchPrev = { x: e.clientX, y: e.clientY, t: now };
      }
      return;
    }
    if (!dragging) return;
    emitAt(e.clientX, e.clientY);
  }

  function pointerUp(e: PointerEvent) {
    if (e.pointerType === "touch") {
      if (touchPrev && !touchScrolled && interactive) {
        const c = pick(e.clientX, e.clientY);
        if (c) {
          stroke.clear();
          stroke.add(`${c[0]},${c[1]}`);
          onPaintPoint(c[0], c[1]);
        }
      } else if (touchScrolled) {
        // Convert px/ms → px/frame at 60fps and fling.
        const fVx = velX * 16;
        const fVy = velY * 16;
        const totalDx = touchStart ? -(e.clientX - touchStart.x) : 0;
        const totalDy = touchStart ? -(e.clientY - touchStart.y) : 0;
        const durationMs = touchStart
          ? Math.max(1, performance.now() - touchStart.t)
          : 1;
        onFling({ vx: fVx, vy: fVy, totalDx, totalDy, durationMs });
      }
      touchStart = null;
      touchPrev = null;
      touchScrolled = false;
      velX = 0;
      velY = 0;
      onStrokeEnd();
      return;
    }
    if (!dragging) return;
    dragging = false;
    canvasEl?.releasePointerCapture?.(e.pointerId);
    onStrokeEnd();
  }

  function pointerCancel(e: PointerEvent) {
    if (e.pointerType === "touch") {
      touchStart = null;
      touchPrev = null;
      touchScrolled = false;
      return;
    }
    dragging = false;
    canvasEl?.releasePointerCapture?.(e.pointerId);
    onStrokeEnd();
  }
</script>

<div bind:this={stageEl} class="stage">
  <canvas
    bind:this={canvasEl}
    class:interactive
    onpointerdown={pointerDown}
    onpointermove={pointerMove}
    onpointerup={pointerUp}
    onpointercancel={pointerCancel}
  ></canvas>
</div>

<style>
  .stage {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    width: var(--app-vw, 100vw);
    height: var(--app-vh, 100dvh);
    z-index: 0;
    overflow: hidden;
    background: var(--app-bg);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--app-bg);
    /* All gestures handled in JS — page never scrolls, browser never pans. */
    touch-action: none;
    cursor: default;
  }

  canvas.interactive {
    cursor: crosshair;
  }
</style>
