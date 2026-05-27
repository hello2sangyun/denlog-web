import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import type { Message } from '@/types';

export function useMessages(friendId: string | null) {
  const { user } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const subRef = useRef<any>(null);

  const fetchMessages = useCallback(async () => {
    if (!user || !friendId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch messages:', error);
    }

    if (data) {
      // Filter for this specific conversation
      const conversationData = data.filter(
        (row) => (row.sender_id === user.id && row.receiver_id === friendId) || 
                 (row.sender_id === friendId && row.receiver_id === user.id)
      );
      setMessages(conversationData.map(rowToMessage));
    }
    setIsLoading(false);
  }, [user, friendId]);

  const sendMessage = useCallback(async (content: string, options?: { messageType?: 'text'|'task'|'media', attachments?: any[], taskId?: string | null, taskSnapshot?: any }) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!friendId) {
      alert("친구 정보(friendId)가 유효하지 않습니다.");
      return;
    }

    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      senderId: user.id,
      receiverId: friendId,
      content,
      isRead: false,
      todoId: null,
      createdAt: new Date(),
      messageType: options?.messageType || 'text',
      attachments: options?.attachments || [],
      taskId: options?.taskId || null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data: inserted, error } = await supabase
      .from('direct_messages')
      .insert({ 
        sender_id: user.id, 
        receiver_id: friendId, 
        content,
        message_type: options?.messageType || 'text',
        attachments: options?.attachments || [],
        task_id: options?.taskId || null,
        task_snapshot: options?.taskSnapshot || null
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      alert(`Failed to send message: ${error.message}`);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      return;
    }

    if (inserted) {
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? rowToMessage(inserted) : m));
      
      // 웹에서도 앱과 동일하게 Push 알림(Edge Function) 호출
      try {
        const title = user.displayName || user.email?.split('@')[0] || '알림';
        const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push', {
          body: {
            recipientId: friendId,
            title: title,
            body: content,
            data: { type: 'dm', friendId: user.id, senderId: user.id }
          }
        });
        
        if (pushError) {
          console.error('Push error details:', pushError);
          alert(`푸시 발송 에러: ${pushError.message}`);
        } else {
          console.log('Push success:', pushData);
        }
      } catch (err: any) {
        console.error('Failed to send push notification:', err);
        alert(`푸시 함수 호출 실패: ${err.message}`);
      }
    }
  }, [user, friendId]);

  useEffect(() => {
    fetchMessages();
    if (!user || !friendId) return;

    const channelName = [user.id, friendId].sort().join('-');
    subRef.current = supabase
      .channel(`dm:${channelName}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const msg = rowToMessage(payload.new);
        if (msg.senderId === friendId) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { subRef.current?.unsubscribe(); };
  }, [user, friendId, fetchMessages]);

  return { messages, isLoading, sendMessage };
}

function rowToMessage(row: any): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    isRead: row.is_read,
    todoId: row.todo_id ?? null,
    createdAt: new Date(row.created_at),
    messageType: row.message_type || 'text',
    attachments: row.attachments || [],
    taskId: row.task_id ?? null,
    taskSnapshot: row.task_snapshot ?? null,
  };
}
