import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user notifications
export const getUserNotifications = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    // Get event details for each notification
    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notification) => {
        const event = await ctx.db.get(notification.eventId);
        const celebrity = event ? await ctx.db.get(event.celebrityId) : null;
        
        return {
          ...notification,
          event,
          celebrity,
        };
      })
    );

    return notificationsWithDetails;
  },
});

// Get unread notifications count
export const getUnreadNotificationsCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => 
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== args.userId) {
      throw new Error("Notification not found or unauthorized");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return args.notificationId;
  },
});

// Mark all notifications as read
export const markAllNotificationsAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => 
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    await Promise.all(
      unreadNotifications.map(notification =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );

    return unreadNotifications.length;
  },
});

// Send queue update notifications (called by cron job)
export const sendQueueUpdateNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const fifteenMinutesFromNow = now + (15 * 60 * 1000);
    const fiveMinutesFromNow = now + (5 * 60 * 1000);

    // Get all waiting queue entries
    const waitingEntries = await ctx.db
      .query("queueEntries")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    for (const entry of waitingEntries) {
      const event = await ctx.db.get(entry.eventId);
      if (!event || !event.isActive) continue;

      // Check if it's time for 15-minute warning
      if (entry.estimatedTime <= fifteenMinutesFromNow && 
          entry.estimatedTime > fiveMinutesFromNow &&
          !entry.notificationsSent.includes("coming_up")) {
        
        await ctx.db.insert("notifications", {
          userId: entry.userId,
          eventId: entry.eventId,
          queueEntryId: entry._id,
          type: "coming_up",
          message: `You're coming up! Your turn for ${event.title} is in about 15 minutes.`,
          isRead: false,
          createdAt: now,
        });

        // Update notifications sent
        await ctx.db.patch(entry._id, {
          notificationsSent: [...entry.notificationsSent, "coming_up"],
        });
      }

      // Check if it's time for 5-minute warning
      if (entry.estimatedTime <= fiveMinutesFromNow &&
          entry.estimatedTime > now &&
          !entry.notificationsSent.includes("next_up")) {
        
        await ctx.db.insert("notifications", {
          userId: entry.userId,
          eventId: entry.eventId,
          queueEntryId: entry._id,
          type: "next_up",
          message: `You're next! Your turn for ${event.title} is in about 5 minutes. Please head to ${event.location}.`,
          isRead: false,
          createdAt: now,
        });

        // Update notifications sent
        await ctx.db.patch(entry._id, {
          notificationsSent: [...entry.notificationsSent, "next_up"],
        });
      }

      // Check if they missed their turn (5 minutes past estimated time)
      if (entry.estimatedTime < (now - 5 * 60 * 1000) &&
          !entry.notificationsSent.includes("missed_turn")) {
        
        await ctx.db.patch(entry._id, {
          status: "missed",
        });

        await ctx.db.insert("notifications", {
          userId: entry.userId,
          eventId: entry.eventId,
          queueEntryId: entry._id,
          type: "missed_turn",
          message: `You missed your turn for ${event.title}. Please contact staff if you're still interested.`,
          isRead: false,
          createdAt: now,
        });

        // Update notifications sent
        await ctx.db.patch(entry._id, {
          notificationsSent: [...entry.notificationsSent, "missed_turn"],
        });
      }
    }

    return { processed: waitingEntries.length };
  },
});
