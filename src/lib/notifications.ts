import { query } from './db';

interface PushSubscription {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

/**
 * Send push notifications to all group members except the sender
 */
export async function notifyGroupMembers(
  groupId: string,
  excludeUserId: string,
  notification: {
    title: string;
    body: string;
    data?: any;
  }
): Promise<void> {
  try {
    // Get all push subscriptions for group members (except the sender)
    const subscriptionsResult = await query(
      `SELECT ps.endpoint, ps.p256dh_key, ps.auth_key
       FROM push_subscriptions ps
       INNER JOIN group_members gm ON ps.user_id = gm.user_id
       WHERE gm.group_id = $1 AND ps.user_id != $2`,
      [groupId, excludeUserId]
    );

    if (subscriptionsResult.rows.length === 0) {
      return; // No subscriptions to notify
    }

    const subscriptions: PushSubscription[] = subscriptionsResult.rows.map(row => ({
      endpoint: row.endpoint,
      p256dh_key: row.p256dh_key,
      auth_key: row.auth_key,
    }));

    // Send notifications to all subscriptions
    // Note: This requires VAPID keys to be configured
    // For now, we'll just log - actual push sending would require web-push library
    console.log(`Would send ${subscriptions.length} push notifications for group ${groupId}`);
    console.log('Notification:', notification);

    // TODO: Implement actual push notification sending using web-push library
    // This requires:
    // 1. VAPID keys (public and private)
    // 2. web-push npm package
    // 3. Proper error handling for expired/invalid subscriptions
  } catch (error) {
    console.error('Error sending push notifications:', error);
    // Don't throw - notification failure shouldn't break the main operation
  }
}

