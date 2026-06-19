import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const cellValidator = v.object({
  gx: v.number(),
  gy: v.number(),
  ht: v.number(),
  hc: v.number(),
  // Wall-clock ms when this cell was last touched by paint. The server tick's
  // erosion (`del`) skips cells touched in the last 1500 ms so a freshly drawn
  // stroke can't be eaten before the user sees it stick.
  lastPaintedAt: v.optional(v.number()),
});

export default defineSchema({
  worldState: defineTable({
    key: v.literal("singleton"),
    tickSeq: v.number(),
    lastTickAt: v.number(),
    coherence: v.number(),
    cyclePhase: v.number(),
    gAcc: v.number(),
    dAcc: v.number(),
    hAcc: v.number(),
    cells: v.array(cellValidator),
  }).index("by_key", ["key"]),

  snapshots: defineTable({
    t: v.number(),
    tickSeq: v.number(),
    coherence: v.number(),
    cells: v.array(cellValidator),
  }).index("by_t", ["t"]),
});
