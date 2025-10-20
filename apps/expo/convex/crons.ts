import { cronJobs } from "convex/server";

import { api } from "./_generated/api";

const crons = cronJobs();

// Clean up expired webhook events every hour
crons.hourly(
  "cleanup expired events",
  { hourUTC: 0 }, // Run at midnight UTC, but actually runs every hour
  api.webhooks.cleanupExpiredEvents,
);

export default crons;
