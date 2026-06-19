<script lang="ts">
  import { useMutation, usePaginatedQuery, useQuery } from "convex-svelte";
  import { untrack } from "svelte";
  import { api } from "../../convex/_generated/api";
  import type { Id } from "../../convex/_generated/dataModel";
  import VoxelCanvas from "$lib/components/VoxelCanvas.svelte";
  import BioPanel from "$lib/components/BioPanel.svelte";

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
  type SnapshotTapeRow = {
    _id: Id<"snapshots">;
    t: number;
    tickSeq: number;
    cells: Cell[];
  };

  // ── Virtual scroll state ──────────────────────────────────────────────────
  // The body has `overflow: hidden`. We don't scroll the page; we accumulate
  // wheel + touch deltas into these numbers and derive UI state from them.
  const MIN_SCROLL_X_RANGE = 1200; // minimum virtual units for the timeline
  const SCROLL_Y_RANGE = 340; // virtual units that fully reveal the bio
  const LIVE_BAND = 0.07; // top 7% of virtualX counts as "live"
  const HISTORY_PIXELS_PER_SNAPSHOT = 10;
  const HISTORY_PAGE_SIZE = 120;
  const HISTORY_PREFETCH_HEADROOM = 24;
  const UP_FLICK_MIN_TOTAL_Y = 48;
  const UP_FLICK_MIN_VY = 2.2;
  const UP_FLICK_MAX_MS = 700;

  let virtualX = $state(MIN_SCROLL_X_RANGE); // start at live
  let virtualY = $state(0); // start with bio hidden

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function nudge(dx: number, dy: number) {
    virtualX = clamp(virtualX + dx, 0, scrollXRange);
    virtualY = clamp(virtualY + dy, 0, SCROLL_Y_RANGE);
  }

  // ── Touch inertia ────────────────────────────────────────────────────────
  // Receive the final shape of a touch swipe. A clear upward flick snaps the
  // bio fully open; other swipes decay as momentum fake-scroll.
  let inertiaRaf = 0;
  let snapRaf = 0;
  function cancelMotion() {
    if (inertiaRaf) {
      cancelAnimationFrame(inertiaRaf);
      inertiaRaf = 0;
    }
    if (snapRaf) {
      cancelAnimationFrame(snapRaf);
      snapRaf = 0;
    }
  }

  function runInertia(vx: number, vy: number) {
    const FRICTION = 0.93;
    const MIN_VEL = 0.05;
    let cx = vx;
    let cy = vy;
    const loop = () => {
      nudge(cx, cy);
      cx *= FRICTION;
      cy *= FRICTION;
      if (Math.abs(cx) < MIN_VEL && Math.abs(cy) < MIN_VEL) {
        inertiaRaf = 0;
        return;
      }
      inertiaRaf = requestAnimationFrame(loop);
    };
    inertiaRaf = requestAnimationFrame(loop);
  }

  function snapBioOpen() {
    const from = virtualY;
    const to = SCROLL_Y_RANGE;
    const started = performance.now();
    const DURATION_MS = 260;
    const loop = (now: number) => {
      const p = clamp((now - started) / DURATION_MS, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      virtualY = from + (to - from) * eased;
      if (p >= 1) {
        virtualY = to;
        snapRaf = 0;
        return;
      }
      snapRaf = requestAnimationFrame(loop);
    };
    snapRaf = requestAnimationFrame(loop);
  }

  function shouldOpenBio(gesture: TouchFlingGesture) {
    const verticalEnough =
      gesture.totalDy > UP_FLICK_MIN_TOTAL_Y &&
      gesture.totalDy > Math.abs(gesture.totalDx) * 0.6;
    return (
      verticalEnough &&
      gesture.vy > UP_FLICK_MIN_VY &&
      gesture.durationMs < UP_FLICK_MAX_MS
    );
  }

  function onFling(gesture: TouchFlingGesture) {
    cancelMotion();
    const openBio = shouldOpenBio(gesture);
    const inertiaVy = openBio ? 0 : gesture.vy;
    if (gesture.vx * gesture.vx + inertiaVy * inertiaVy > 0.5) {
      runInertia(gesture.vx, inertiaVy);
    }
    if (openBio) snapBioOpen();
  }

  $effect(() => {
    return () => cancelMotion();
  });

  // ── Convex ────────────────────────────────────────────────────────────────
  const live = useQuery(api.world.state, {});
  const tapeQ = usePaginatedQuery(api.world.snapshotTape, () => ({}), {
    initialNumItems: HISTORY_PAGE_SIZE,
  });
  const tapeNewestFirst = $derived<SnapshotTapeRow[]>(tapeQ.results ?? []);
  const tape = $derived.by<SnapshotTapeRow[]>(() => {
    const rows = tapeNewestFirst.slice();
    rows.reverse();
    return rows;
  });
  const scrollXRange = $derived(
    Math.max(
      MIN_SCROLL_X_RANGE,
      Math.ceil(
        ((Math.max(1, tape.length) - 1) * HISTORY_PIXELS_PER_SNAPSHOT) /
          (1 - LIVE_BAND),
      ),
    ),
  );

  let previousScrollXRange = MIN_SCROLL_X_RANGE;
  let previousOldestSnapshotId: Id<"snapshots"> | null = null;
  $effect(() => {
    const nextOldestSnapshotId = tape[0]?._id ?? null;
    const previousOldestIndex =
      previousOldestSnapshotId === null
        ? -1
        : tape.findIndex((row) => row._id === previousOldestSnapshotId);
    const olderRowsPrepended = Math.max(0, previousOldestIndex);
    const currentVirtualX = untrack(() => virtualX);
    const wasLive = currentVirtualX >= previousScrollXRange - 1;

    if (wasLive) {
      virtualX = scrollXRange;
    } else if (olderRowsPrepended > 0) {
      virtualX = clamp(
        currentVirtualX + olderRowsPrepended * HISTORY_PIXELS_PER_SNAPSHOT,
        0,
        scrollXRange,
      );
    } else {
      virtualX = clamp(currentVirtualX, 0, scrollXRange);
    }

    previousScrollXRange = scrollXRange;
    previousOldestSnapshotId = nextOldestSnapshotId;
  });

  const bioProgress = $derived(Math.min(1, virtualY / SCROLL_Y_RANGE));

  const viewIdx = $derived.by<number | "live">(() => {
    const p = virtualX / scrollXRange;
    if (p >= 1 - LIVE_BAND || tape.length === 0) return "live";
    const q = p / (1 - LIVE_BAND);
    return Math.min(
      tape.length - 1,
      Math.max(0, Math.round(q * (tape.length - 1))),
    );
  });

  const cells = $derived.by<Cell[]>(() => {
    if (viewIdx === "live") return (live.data?.cells as Cell[]) ?? [];
    return tape[viewIdx]?.cells ?? [];
  });

  let lastHistoryLoadLength = 0;
  $effect(() => {
    if (viewIdx === "live") return;
    if (viewIdx > HISTORY_PREFETCH_HEADROOM) return;
    if (tapeQ.status !== "CanLoadMore") return;
    if (tape.length === lastHistoryLoadLength) return;
    lastHistoryLoadLength = tape.length;
    tapeQ.loadMore(HISTORY_PAGE_SIZE);
  });

  // ── Paint ────────────────────────────────────────────────────────────────
  const paint = useMutation(api.world.paint);

  let paintError = $state<string | null>(null);
  let errorTimer: ReturnType<typeof setTimeout> | null = null;
  function flashError(msg: string) {
    paintError = msg;
    if (errorTimer !== null) clearTimeout(errorTimer);
    errorTimer = setTimeout(() => {
      paintError = null;
      errorTimer = null;
    }, 4000);
  }

  function onPaintPoint(gx: number, gy: number) {
    const stamp = Date.now();
    void paint(
      { gx, gy },
      {
        optimisticUpdate: (store) => {
          const cur = store.getQuery(api.world.state, {});
          if (!cur) return;
          const cells = (cur.cells as Cell[]).slice();
          let found = -1;
          for (let i = 0; i < cells.length; i++) {
            if (cells[i].gx === gx && cells[i].gy === gy) {
              found = i;
              break;
            }
          }
          const ex = found >= 0 ? cells[found] : undefined;
          const baseHt = Math.max(ex?.ht ?? 0, Math.ceil(ex?.hc ?? 0));
          const next = {
            gx,
            gy,
            ht: Math.min(10, Math.max(ex?.ht ?? 0, baseHt + 1)),
            hc: ex?.hc ?? 0,
            lastPaintedAt: stamp,
          };
          if (found >= 0) cells[found] = next;
          else cells.push(next);
          store.setQuery(api.world.state, {}, { ...cur, cells });
        },
      },
    ).catch((err) => {
      console.error("paint failed", err);
      flashError(`Couldn't save: ${(err as Error)?.message ?? "unknown error"}`);
    });
  }

  function onStrokeEnd() {
    // noop
  }

  // ── Wheel → virtual scroll ───────────────────────────────────────────────
  $effect(() => {
    // Keep this manual listener: <svelte:window> cannot request passive:false,
    // and fake scroll must call preventDefault() to keep the document locked.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return; // zoom blocker (layout) handles it
      e.preventDefault();
      cancelMotion();
      nudge(e.deltaX, e.deltaY);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  });

  // ── Tick the live timestamp once a second ────────────────────────────────
  let nowTick = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => {
      nowTick = Date.now();
    }, 1000);
    return () => clearInterval(id);
  });

  function fmtTime(ms: number) {
    return new Date(ms).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  const cueLabel = $derived.by(() => {
    if (viewIdx === "live") return fmtTime(nowTick);
    if (!tape.length) return fmtTime(nowTick);
    const row = tape[viewIdx];
    return fmtTime(row?.t ?? nowTick);
  });
</script>

<svelte:head>
  <title>Robel Estifanos</title>
  <meta
    name="description"
    content="Robel Estifanos. Technical lead at Trestle."
  />
  <meta property="og:title" content="Robel Estifanos" />
  <meta
    property="og:description"
    content="A live, shared world of voxels accreting over time."
  />
  <meta property="og:url" content="https://estifanos.com" />
  <meta property="og:image" content="https://estifanos.com/logo512.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<VoxelCanvas
  {cells}
  interactive={viewIdx === "live"}
  veilOpacity={0.5 * bioProgress}
  {onPaintPoint}
  {onStrokeEnd}
  onScroll={(dx, dy) => {
    cancelMotion();
    nudge(dx, dy);
  }}
  {onFling}
/>

<BioPanel progress={bioProgress} />

<div class="cue" aria-hidden="true">
  {#if viewIdx === "live"}
    <span class="live-dot"></span>
  {/if}
  {cueLabel}
</div>

{#if paintError}
  <div class="err" role="status" aria-live="polite">{paintError}</div>
{/if}

<style>
  .cue {
    position: fixed;
    top: calc(24px + env(safe-area-inset-top));
    right: calc(28px + env(safe-area-inset-right));
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--color-th-ink-2);
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }

  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #b94ed9;
    box-shadow: 0 0 8px rgba(185, 78, 217, 0.55);
    animation: live-pulse 1.8s ease-in-out infinite;
  }

  @keyframes live-pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.55;
      transform: scale(0.85);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .live-dot {
      animation: none;
    }
  }

  .err {
    position: fixed;
    left: 50%;
    bottom: 80px;
    transform: translateX(-50%);
    z-index: 6;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--color-th-ink);
    background: rgba(207, 106, 67, 0.18);
    border: 1px solid rgba(207, 106, 67, 0.45);
    padding: 6px 12px;
    border-radius: 4px;
    pointer-events: none;
    animation: fade-in 0.18s ease-out;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translate(-50%, 4px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
</style>
