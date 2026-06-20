import { cronJobs } from "convex/server";

const crons = cronJobs();

// Kill switch: the live world tick loop was too expensive to keep running.
// Leave this empty so production stops restarting the scheduled loop.

export default crons;
