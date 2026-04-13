# Web Push Notifications — setup

The client hook `usePushNotifications` and service worker (`/sw.js`) are shipped, but sending
pushes from the server requires a one-time external setup:

## 1. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

You'll get two keys — public + private. Save both.

## 2. Add to `.env.local`

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:you@domain.com
```

## 3. Run this SQL in Supabase

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);
```

## 4. Install `web-push`

```bash
npm install web-push
npm install -D @types/web-push
```

## 5. Create the send endpoint

Add `src/app/api/push/send/route.ts` that calls `webpush.sendNotification(subscription, payload)`
for each target user's subscriptions. Call this endpoint from `sendMessage` server action
when a new message arrives for offline users.

## Firebase Cloud Messaging (alternative)

FCM is Google's push backbone. To use FCM instead of raw web-push:

1. Create a Firebase project at https://console.firebase.google.com
2. Add a Web app, get the config + VAPID key from Cloud Messaging settings
3. Use `firebase/messaging` on the client to register the service worker
4. Send pushes via Firebase Admin SDK server-side

The service worker at `/public/sw.js` is compatible with both generic Web Push and FCM payloads.
