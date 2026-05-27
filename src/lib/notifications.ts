import { supabase } from '@/lib/supabase';
import type { NotificationType } from '@/types';

interface SendNotificationOptions {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  senderId?: string;
  todoId?: string;
  folderId?: string;
  meetingId?: string;
  meta?: Record<string, any>;
}

/**
 * Helper function to send both in-app notification (DB insert) and mobile push notification (Edge Function).
 */
export async function sendAppNotification(options: SendNotificationOptions) {
  try {
    // 1. Insert into notifications table for in-app bell
    const { error: dbError } = await supabase.from('notifications').insert({
      user_id: options.recipientId,
      type: options.type,
      title: options.title,
      body: options.body,
      sender_id: options.senderId,
      todo_id: options.todoId,
      folder_id: options.folderId,
      meeting_id: options.meetingId,
      meta: options.meta,
      is_read: false
    });

    if (dbError) {
      console.error('Error inserting notification to DB:', dbError);
    }

    // 2. Invoke push notification Edge Function
    const { error: pushError } = await supabase.functions.invoke('send-push', {
      body: {
        recipientId: options.recipientId,
        title: options.title,
        body: options.body,
        data: {
          type: options.type,
          todoId: options.todoId,
          senderId: options.senderId,
          ...options.meta
        }
      }
    });

    if (pushError) {
      console.error('Error sending push via Edge Function:', pushError);
    }
  } catch (error) {
    console.error('Failed to send app notification:', error);
  }
}
