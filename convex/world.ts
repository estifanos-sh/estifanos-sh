import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const HMAX = 10;
const MAXCOLS = 260;
const GRID_HALF = 64;

export const state = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("worldState")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
  },
});

export const snapshotTape = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query("snapshots")
      .withIndex("by_t")
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: result.page.map((r) => ({
        _id: r._id,
        t: r.t,
        tickSeq: r.tickSeq,
        cells: r.cells,
      })),
    };
  },
});

export const snapshotAt = query({
  args: { id: v.id("snapshots") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// One paint = one cell. Convex websocket fires per pointer event; the renderer
// dedupes same-cell repeats per stroke. No rate limit — MAXCOLS + FIFO is the
// real cap, and the canvas itself bounds how fast a user can click.
export const paint = mutation({
  args: { gx: v.number(), gy: v.number() },
  handler: async (ctx, { gx, gy }) => {
    const ix = Math.trunc(gx);
    const iy = Math.trunc(gy);
    if (ix < -GRID_HALF || ix > GRID_HALF) return null;
    if (iy < -GRID_HALF || iy > GRID_HALF) return null;

    const world = await ctx.db
      .query("worldState")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();
    if (!world) return null;

    const now = Date.now();
    type Cell = {
      gx: number;
      gy: number;
      ht: number;
      hc: number;
      lastPaintedAt?: number;
    };
    const cellMap = new Map<string, Cell>();
    for (const cell of world.cells) {
      cellMap.set(`${cell.gx},${cell.gy}`, { ...cell });
    }

    const k = `${ix},${iy}`;
    const existing = cellMap.get(k);
    const baseHt = Math.max(existing?.ht ?? 0, Math.ceil(existing?.hc ?? 0));
    cellMap.set(k, {
      gx: ix,
      gy: iy,
      ht: Math.min(HMAX, baseHt + 1),
      hc: existing?.hc ?? 0,
      lastPaintedAt: now,
    });

    if (cellMap.size > MAXCOLS) {
      const overflow = cellMap.size - MAXCOLS;
      const keys = [...cellMap.keys()].slice(0, overflow);
      for (const oldK of keys) cellMap.delete(oldK);
    }

    await ctx.db.patch(world._id, { cells: [...cellMap.values()] });
    return null;
  },
});
