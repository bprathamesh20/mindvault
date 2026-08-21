import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sweep stale pending items",
  { hours: 1 },
  internal.pipeline.sweepStale,
  {},
);

export default crons;
