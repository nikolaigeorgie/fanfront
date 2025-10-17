import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run queue notifications every 5 minutes
crons.interval(
  "queue-notifications",
  { minutes: 5 },
  internal.notifications.sendQueueUpdateNotifications
);

export default crons;
