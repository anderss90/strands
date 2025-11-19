import * as webpush from 'web-push';
import { query } from './db';

interface PushSubscription {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:support@strands.app', // Contact email for VAPID
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * Send push notifications to all group members except specified users
 */
export async function notifyGroupMembers(
  groupId: string,
  excludeUserIds: string | string[],
  notification: {
    title: string;
    body: string;
    data?: any;
  }
): Promise<void> {
  try {
    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured. Push notifications disabled.');
      return;
    }

    // Normalize excludeUserIds to array
    const excludeIds = Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds];

    // Get all push subscriptions for group members (except excluded users)
    const subscriptionsResult = await query(
      `SELECT ps.endpoint, ps.p256dh_key, ps.auth_key, ps.user_id
       FROM push_subscriptions ps
       INNER JOIN group_members gm ON ps.user_id = gm.user_id
       WHERE gm.group_id = $1 AND ps.user_id != ALL($2::uuid[])`,
      [groupId, excludeIds]
    );

    if (subscriptionsResult.rows.length === 0) {
      return; // No subscriptions to notify
    }

    const subscriptions: (PushSubscription & { userId: string })[] = subscriptionsResult.rows.map(row => ({
      endpoint: row.endpoint,
      p256dh_key: row.p256dh_key,
      auth_key: row.auth_key,
      userId: row.user_id,
    }));

    // Prepare notification payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: '/icon-192x192.png', // You may want to add an icon
      badge: '/icon-192x192.png',
      tag: `strands-${groupId}`,
      data: notification.data || {},
    });

    // Send notifications to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        console.log(`Push notification sent successfully to user ${subscription.userId}`);
      } catch (error: any) {
        // Handle specific error cases
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or invalid - remove it from database
          console.log(`Removing expired subscription for user ${subscription.userId}`);
          await query(
            `DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`,
            [subscription.endpoint, subscription.userId]
          );
        } else if (error.statusCode === 429) {
          // Rate limit exceeded - log but don't remove subscription
          console.warn(`Rate limit exceeded for user ${subscription.userId}`);
        } else {
          // Other errors - log but continue
          console.error(`Error sending push notification to user ${subscription.userId}:`, error.message);
        }
      }
    });

    // Wait for all notifications to be sent (or fail)
    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error('Error sending push notifications:', error);
    // Don't throw - notification failure shouldn't break the main operation
  }
}

