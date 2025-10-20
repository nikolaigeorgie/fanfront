# Convex Real-Time Architecture

## Overview

This project uses a **hybrid architecture** where:

- **Main Database (Drizzle + Postgres)**: Persistent data (users, events, Stripe accounts, payments)
- **Convex**: Real-time WebSocket communication for live updates (queue positions, webhook notifications)

## Why This Architecture?

- **No Polling**: Clients get instant updates via WebSocket
- **Separation of Concerns**: Persistent data in SQL, ephemeral real-time data in Convex
- **Scalability**: Convex handles real-time connections, your DB handles persistence
- **Clean**: No data duplication between systems

## Data Flow

### 1. Stripe Webhook → Real-Time Notification

```
Stripe → Next.js Webhook API → Update Main DB → Emit Convex Event → Client receives update instantly
```

**Example: User completes Stripe onboarding**

1. Stripe sends `account.updated` webhook to Next.js API
2. Next.js updates user's Stripe status in main database
3. Next.js emits Convex event: `webhooks:emitWebhookEvent`
4. Client subscribed to `webhooks:getUserWebhookEvents` receives update instantly
5. Client shows toast notification: "Your Stripe account is now active!"

### 2. Queue Management (Real-Time)

```
User joins queue → Update Convex → All clients watching queue get instant position updates
```

**Example: User joins queue**

1. Client calls `queue:joinQueue` mutation
2. Convex calculates position and estimated time
3. Convex emits position update event
4. Creator's dashboard auto-updates with new person in queue
5. User's app shows their position updating in real-time

## Convex Schema

### `queuePositions` (Real-Time Queue State)

- `eventId`: External event ID from main DB
- `userId`: External user ID from main DB
- `position`: Current position in queue
- `estimatedTime`: When they'll be called
- `status`: waiting | called | completed | cancelled

### `webhookEvents` (Real-Time Notifications)

- `type`: Event type (Stripe updates, queue updates, etc.)
- `userId`: Who this notification is for
- `data`: Event payload
- `expiresAt`: Auto-cleanup after 24 hours

## Usage Examples

### 1. Subscribe to Real-Time Updates (Client)

```tsx
import { useQuery } from "convex/react";

import { api } from "~/convex/_generated/api";

function MyComponent() {
  const userId = "user_123"; // From your auth system

  // This automatically re-renders when new events arrive!
  const events = useQuery(api.webhooks.getUserWebhookEvents, {
    userId,
    since: Date.now() - 60000, // Last minute
  });

  useEffect(() => {
    events?.forEach((event) => {
      if (event.type === "stripe.account.updated") {
        toast.success(event.data.message);
      }
    });
  }, [events]);
}
```

### 2. Watch Queue Position (Real-Time)

```tsx
function QueueStatus({ userId }) {
  // This updates automatically as queue moves!
  const myQueue = useQuery(api.queue.getUserQueue, { userId });

  return (
    <div>
      {myQueue?.map((entry) => (
        <div key={entry._id}>
          Position: #{entry.position}
          <br />
          Estimated time: {new Date(entry.estimatedTime).toLocaleTimeString()}
        </div>
      ))}
    </div>
  );
}
```

### 3. Creator Dashboard (Real-Time Queue)

```tsx
function CreatorDashboard({ eventId }) {
  // Automatically updates when people join/leave!
  const queue = useQuery(api.queue.getEventQueue, { eventId });

  const callNext = useMutation(api.queue.callNext);

  return (
    <div>
      <h2>Queue ({queue?.length || 0} waiting)</h2>
      {queue?.map((entry) => (
        <div key={entry._id}>
          Position #{entry.position} - User {entry.userId}
        </div>
      ))}
      <button onClick={() => callNext({ eventId })}>Call Next Person</button>
    </div>
  );
}
```

## Webhook Setup

### Stripe Webhook Configuration

1. In Stripe Dashboard, add webhook endpoint:

   ```
   https://yourdomain.com/api/webhooks/stripe-connect
   ```

2. Select events:
   - `account.updated` - For Stripe Connect onboarding updates
   - `payment_intent.succeeded` - For payment confirmations
   - `payment_intent.payment_failed` - For payment failures

3. Get webhook secret and add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Next.js Webhook Handler

The webhook handler (`apps/nextjs/src/app/api/webhooks/stripe-connect/route.ts`):

1. Verifies Stripe signature
2. Updates main database
3. Emits Convex event for real-time notification

## Environment Variables

### Next.js (`.env`)

```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Expo (`.env`)

```bash
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## Files Structure

```
apps/expo/convex/
├── schema.ts           # Convex schema (queuePositions, webhookEvents)
├── queue.ts            # Queue management functions
├── webhooks.ts         # Webhook event emission & subscription
└── crons.ts            # Cleanup expired events

apps/nextjs/src/app/api/webhooks/
└── stripe-connect/
    └── route.ts        # Stripe webhook handler (emits Convex events)
```

## Cleanup & Maintenance

Convex automatically:

- Cleans up expired webhook events after 24 hours (via cron)
- Handles WebSocket reconnection
- Scales to handle many concurrent connections

## Benefits

✅ **No Polling**: Clients get instant updates via WebSocket
✅ **Efficient**: Only send updates to affected users  
✅ **Scalable**: Convex handles connection management
✅ **Simple**: No need to set up Redis, Socket.io, etc.
✅ **Type-Safe**: Full TypeScript support
✅ **Automatic**: Convex handles subscriptions, reconnection, etc.

## Migration from Old Architecture

**Removed Files** (duplicated functionality now in main DB):

- ❌ `convex/users.ts` - Users in main DB
- ❌ `convex/events.ts` - Events in main DB
- ❌ `convex/stripeConnect.ts` - Stripe via tRPC
- ❌ `convex/payments.ts` - Payments via tRPC
- ❌ `convex/notifications.ts` - Now `webhookEvents`

**What Changed**:

- Convex now only stores ephemeral real-time data
- Main database stores all persistent data
- Webhooks trigger Convex events for instant client updates
- No more data duplication between systems
