# Convex Architecture Migration - Summary

## ✅ What Was Done

### 1. **Restructured Convex for Real-Time Only**

**Removed Files** (duplicated database functionality):

- ❌ `convex/users.ts` - Users now in main database
- ❌ `convex/events.ts` - Events now in main database
- ❌ `convex/stripeConnect.ts` - Stripe operations now via tRPC
- ❌ `convex/payments.ts` - Payments now via tRPC
- ❌ `convex/notifications.ts` - Replaced with `webhookEvents`

**New Files** (real-time focused):

- ✅ `convex/schema.ts` - Simplified schema with only:
  - `queuePositions` - Real-time queue state
  - `webhookEvents` - Real-time notifications (Stripe updates, etc.)
- ✅ `convex/queue.ts` - Real-time queue management
- ✅ `convex/webhooks.ts` - Webhook event emission & subscription
- ✅ `convex/crons.ts` - Auto-cleanup of expired events

### 2. **Updated Stripe Webhook Handler**

**File**: `apps/nextjs/src/app/api/webhooks/stripe-connect/route.ts`

**Changes**:

- Added Convex HTTP client
- After updating database, now emits Convex event
- Clients subscribed to webhook events get instant updates

**Flow**:

```
Stripe → Webhook API → Update DB → Emit Convex Event → Client gets real-time notification
```

### 3. **Added Convex to Next.js**

**File**: `apps/nextjs/package.json`

Added `convex` dependency so webhooks can emit real-time events.

## 🏗️ New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Expo App)                        │
│  - Subscribe to Convex for real-time updates                │
│  - Main DB operations via tRPC                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├──► tRPC ───► Main Database
                            │              (Users, Events, Stripe, Payments)
                            │
                            └──► Convex WebSocket
                                 (Queue Positions, Notifications)
                                            ▲
                                            │
┌─────────────────────────────────────────┼───────────────────┐
│                 STRIPE WEBHOOKS         │                    │
│                                         │                    │
│  Stripe → Next.js API → Main DB ───────┘                    │
│                    └──► Convex Event Emission                │
└──────────────────────────────────────────────────────────────┘
```

## 📋 Next Steps

### 1. Install Dependencies

```bash
cd apps/nextjs
pnpm install

cd ../expo
pnpm install
```

### 2. Set Environment Variables

**`.env` (root)**:

```bash
# Convex (get from https://dashboard.convex.dev)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Deploy Convex Schema

```bash
cd apps/expo
npx convex dev  # For development
# OR
npx convex deploy  # For production
```

This will:

- Create the new simplified schema
- Set up the webhook event system
- Configure the cron for cleanup

### 4. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe-connect`
3. Select events:
   - `account.updated` ✅
   - `payment_intent.succeeded` ✅
   - `payment_intent.payment_failed` ✅
4. Copy webhook secret to `.env`

### 5. Update Client Code (Expo)

**Subscribe to Real-Time Stripe Updates**:

```tsx
import { useQuery } from "convex/react";

import { api } from "~/convex/_generated/api";

function StripeStatusWatcher() {
  const userId = "user_123"; // From your auth

  // Automatically re-renders when Stripe webhook received!
  const events = useQuery(api.webhooks.getUserWebhookEvents, {
    userId,
    since: Date.now() - 60000, // Last minute
  });

  useEffect(() => {
    events?.forEach((event) => {
      if (event.type === "stripe.account.updated") {
        // Show toast notification
        Alert.alert("Stripe Update", event.data.message);

        // Refetch user data to get updated status
        refetchUser();
      }
    });
  }, [events]);
}
```

**Watch Queue Position (Real-Time)**:

```tsx
function QueueViewer({ userId }) {
  // This updates automatically as people join/leave!
  const queue = useQuery(api.queue.getUserQueue, { userId });

  return (
    <View>
      {queue?.map((entry) => (
        <View key={entry._id}>
          <Text>Position: #{entry.position}</Text>
          <Text>ETA: {new Date(entry.estimatedTime).toLocaleTimeString()}</Text>
        </View>
      ))}
    </View>
  );
}
```

## 🎯 Benefits of New Architecture

✅ **No Polling**: WebSocket gives instant updates
✅ **No Duplication**: Single source of truth in main DB
✅ **Real-Time**: Queue updates, Stripe notifications instantly
✅ **Clean Separation**: Persistent vs. ephemeral data
✅ **Scalable**: Convex handles real-time connections
✅ **Simple**: No Redis, Socket.io, or custom WebSocket server needed

## 📚 Documentation

See `CONVEX_REALTIME_ARCHITECTURE.md` for detailed usage examples and patterns.

## 🔧 What's Different for Development

**Before**:

- Had to query Convex for everything (users, events, etc.)
- Data duplicated between Convex and main DB
- Confusing which system was source of truth

**Now**:

- **Main DB (via tRPC)**: All persistent data and operations
- **Convex**: Only subscribe to for real-time updates
- Clear separation of concerns
- No data duplication

**Example - Stripe Connect Button**:

Before:

```tsx
// Had to check both systems 😵‍💫
const convexUser = useQuery(api.users.getUser, { userId });
const dbUser = trpc.auth.getCurrentUser.useQuery();
```

Now:

```tsx
// Single source of truth ✅
const user = trpc.auth.getCurrentUser.useQuery();

// Subscribe to real-time updates
const updates = useQuery(api.webhooks.getUserWebhookEvents, { userId });
```

## 🚀 Test the Real-Time Flow

1. **Open app on device/simulator**
2. **Click "Connect Stripe Account"**
3. **Complete Stripe onboarding in WebView**
4. **Watch for instant notification** when webhook arrives! 🎉

No need to manually refresh - the app updates automatically when Stripe confirms onboarding!

## ❓ Questions?

See the full architecture document: `CONVEX_REALTIME_ARCHITECTURE.md`
