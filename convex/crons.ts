import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Restart the tick loop if it's been silent for >10s.
crons.interval("tick watchdog", { seconds: 30 }, internal.tick.watchdog, {});

export default crons;
