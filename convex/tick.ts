import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Verbatim port of the Accrete.html ambient simulation
// (spread / del / heightEv / coherence / buildStar / ease) running on
// Convex. One server tick = `TICK_MS` of demo-equivalent dt.

const TICK_MS = 500;
const MAXCOLS = 260;
const SH = 13;
const STAR_H = 2;
const H_RATE = 5;
const PERIOD_S = 34;

type Cell = {
  gx: number;
  gy: number;
  ht: number;
  hc: number;
  lastPaintedAt?: number;
};

// Erosion grace: don't pick a cell that a visitor painted in the last
// `PAINT_GRACE_MS` so the stroke is guaranteed to stick for the user.
const PAINT_GRACE_MS = 1500;

function key(x: number, y: number) {
  return `${x},${y}`;
}

// Octagram seal — exact buildStar from Accrete.html (two square outlines).
const STAR_KEYS: string[] = (() => {
  const out: string[] = [];
  const h = SH;
  const d = h * Math.SQRT2;
  const tw = 0.9;
  const td = 1.5;
  for (let gx = -h - 3; gx <= h + 3; gx++) {
    for (let gy = -h - 3; gy <= h + 3; gy++) {
      const mx = Math.max(Math.abs(gx), Math.abs(gy));
      const di = Math.abs(gx) + Math.abs(gy);
      const onSquare = mx <= h && mx >= h - tw;
      const onDiamond = di <= d && di >= d - td;
      if (onSquare || onDiamond) out.push(key(gx, gy));
    }
  }
  return out;
})();
const STAR_SET = new Set(STAR_KEYS);

function coherence(tSec: number) {
  const period = PERIOD_S;
  const ph = (tSec % period) / period;
  const cycle = Math.floor(tSec / period);
  const a = 0.25;
  const b = 0.75;
  const r = 0.1;
  let p: number;
  if (ph < a || ph > b) p = 0;
  else if (ph < a + r) p = (ph - a) / r;
  else if (ph > b - r) p = (b - ph) / r;
  else p = 1;
  const strength = 0.85 + 0.15 * Math.abs(Math.sin(cycle * 1.7 + 0.5));
  return { coh: p * strength, phase: ph };
}

function occN(cols: Map<string, Cell>, gx: number, gy: number) {
  return (
    cols.has(key(gx + 1, gy)) ||
    cols.has(key(gx - 1, gy)) ||
    cols.has(key(gx, gy + 1)) ||
    cols.has(key(gx, gy - 1))
  );
}

function spread(cols: Map<string, Cell>, coh: number) {
  if (coh > 0.12 && Math.random() < coh * 1.25) {
    for (let t = 0; t < 12; t++) {
      const sk = STAR_KEYS[(Math.random() * STAR_KEYS.length) | 0];
      if (cols.has(sk)) continue;
      const parts = sk.split(",");
      const gx = +parts[0];
      const gy = +parts[1];
      if (occN(cols, gx, gy)) {
        cols.set(sk, { gx, gy, ht: 1, hc: 0 });
        return;
      }
    }
    if (Math.random() < 0.3) {
      const sk = STAR_KEYS[(Math.random() * STAR_KEYS.length) | 0];
      if (!cols.has(sk)) {
        const parts = sk.split(",");
        cols.set(sk, { gx: +parts[0], gy: +parts[1], ht: 1, hc: 0 });
      }
    }
    return;
  }
  const keys = [...cols.keys()];
  if (!keys.length || Math.random() < 0.16) {
    const gx = ((Math.random() * 44) | 0) - 22;
    const gy = ((Math.random() * 44) | 0) - 22;
    const k = key(gx, gy);
    if (!cols.has(k) && cols.size < MAXCOLS) {
      cols.set(k, { gx, gy, ht: 1, hc: 0 });
    }
    return;
  }
  const pk = keys[(Math.random() * keys.length) | 0];
  const parts = pk.split(",");
  const gx = +parts[0];
  const gy = +parts[1];
  const dirs: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const o = dirs[(Math.random() * 4) | 0];
  const ngx = gx + o[0];
  const ngy = gy + o[1];
  const nk = key(ngx, ngy);
  if (!cols.has(nk) && cols.size < MAXCOLS) {
    cols.set(nk, { gx: ngx, gy: ngy, ht: 1, hc: 0 });
  }
}

function isFresh(v: Cell, now: number) {
  return v.lastPaintedAt !== undefined && now - v.lastPaintedAt < PAINT_GRACE_MS;
}

function del(cols: Map<string, Cell>, coh: number, now: number) {
  const keys = [...cols.keys()];
  if (!keys.length) return;
  if (coh > 0.12 && Math.random() < coh) {
    for (let t = 0; t < 16; t++) {
      const kk = keys[(Math.random() * keys.length) | 0];
      if (STAR_SET.has(kk)) continue;
      const v = cols.get(kk)!;
      if (isFresh(v, now)) continue;
      v.ht = Math.max(0, v.ht - 1);
      return;
    }
    return;
  }
  for (let t = 0; t < 16; t++) {
    const kk = keys[(Math.random() * keys.length) | 0];
    const v = cols.get(kk)!;
    if (isFresh(v, now)) continue;
    v.ht = Math.max(0, v.ht - 1);
    return;
  }
}

function heightEv(cols: Map<string, Cell>, coh: number, now: number) {
  const keys = [...cols.keys()];
  if (!keys.length) return;
  const kk = keys[(Math.random() * keys.length) | 0];
  const v = cols.get(kk)!;
  const fresh = isFresh(v, now);
  if (coh > 0.12 && Math.random() < coh) {
    if (STAR_SET.has(kk)) {
      if (v.ht < STAR_H) v.ht++;
    } else if (v.ht > 0 && !fresh) {
      v.ht--;
    }
    return;
  }
  if (Math.random() < 0.55) {
    v.ht = Math.min(3, v.ht + 1);
  } else if (!fresh) {
    v.ht = Math.max(0, v.ht - 1);
  }
}

function ease(cols: Map<string, Cell>, now: number, alpha: number) {
  for (const [k, v] of cols) {
    v.hc += (v.ht - v.hc) * alpha;
    if (v.ht === 0 && v.hc < 0.03 && !isFresh(v, now)) {
      cols.delete(k);
    }
  }
}

export const advance = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db
      .query("worldState")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
    if (!world) return;

    const cols = new Map<string, Cell>();
    for (const c of world.cells) cols.set(key(c.gx, c.gy), { ...c });

    const now = Date.now();
    const tSec = now / 1000;
    const { coh, phase } = coherence(tSec);

    let gAcc = world.gAcc + (TICK_MS / 1000) * (6 + 0.05 * cols.size + coh * 24);
    while (gAcc >= 1) {
      spread(cols, coh);
      gAcc -= 1;
    }

    let dAcc = world.dAcc + (TICK_MS / 1000) * (0.0009 * Math.pow(cols.size, 1.9) + coh * 16);
    while (dAcc >= 1) {
      del(cols, coh, now);
      dAcc -= 1;
    }

    let hAcc = world.hAcc + (TICK_MS / 1000) * (H_RATE + coh * 22);
    while (hAcc >= 1) {
      heightEv(cols, coh, now);
      hAcc -= 1;
    }

    // Demo's ease runs in every RAF frame (~16ms). Repeated alpha=0.05 steps
    // collapse to one equivalent pass: final = target - delta * 0.95 ** n.
    const easeIter = Math.max(1, Math.round(TICK_MS / 16));
    ease(cols, now, 1 - Math.pow(0.95, easeIter));

    if (cols.size > MAXCOLS) {
      const overflow = cols.size - MAXCOLS;
      const oldKeys = [...cols.keys()].slice(0, overflow);
      for (const k of oldKeys) cols.delete(k);
    }

    const nextCells: Cell[] = [...cols.values()];

    await ctx.db.patch(world._id, {
      tickSeq: world.tickSeq + 1,
      lastTickAt: now,
      coherence: coh,
      cyclePhase: phase,
      gAcc,
      dAcc,
      hAcc,
      cells: nextCells,
    });

    // Snapshot tape: append-only history. The client pages metadata and loads
    // one full snapshot payload at a time, so old rows can remain queryable.
    await ctx.db.insert("snapshots", {
      t: now,
      tickSeq: world.tickSeq + 1,
      coherence: coh,
      cells: nextCells,
    });

    await ctx.scheduler.runAfter(TICK_MS, internal.tick.advance, {});
  },
});

export const bootstrap = internalMutation({
  args: {},
  handler: async (ctx) => {
    let world = await ctx.db
      .query("worldState")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
    const now = Date.now();
    if (!world) {
      const id = await ctx.db.insert("worldState", {
        key: "singleton",
        tickSeq: 0,
        lastTickAt: now,
        coherence: 0,
        cyclePhase: 0,
        gAcc: 0,
        dAcc: 0,
        hAcc: 0,
        cells: [],
      });
      world = (await ctx.db.get(id))!;
    } else {
      // Reset accumulators on bootstrap.
      await ctx.db.patch(world._id, { gAcc: 0, dAcc: 0, hAcc: 0 });
    }
    await ctx.scheduler.runAfter(0, internal.tick.advance, {});
    return { tickSeq: world.tickSeq, lastTickAt: world.lastTickAt };
  },
});

export const watchdog = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db
      .query("worldState")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
    const now = Date.now();
    if (!world) {
      await ctx.scheduler.runAfter(0, internal.tick.bootstrap, {});
      return { restarted: true };
    }
    if (now - world.lastTickAt > 10_000) {
      await ctx.scheduler.runAfter(0, internal.tick.advance, {});
      return { restarted: true };
    }
    return { restarted: false };
  },
});

export const peek = internalQuery({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db
      .query("worldState")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
    return (
      world && {
        tickSeq: world.tickSeq,
        lastTickAt: world.lastTickAt,
        cellsCount: world.cells.length,
        coherence: world.coherence,
      }
    );
  },
});
