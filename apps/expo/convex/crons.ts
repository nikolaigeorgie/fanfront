import { cronJobs } from "convex/server";

import { api } from "./_generated/api";

const crons = cronJobs();

// Clean up expired webhook events every hour at the top of the hour
crons.hourly(
  "cleanup expired events",
  { minuteUTC: 0 }, // Run at the 0th minute of every hour
  api.webhooks.cleanupExpiredEvents,
);

export default crons;
