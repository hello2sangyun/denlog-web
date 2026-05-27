import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import type { FriendWithUser, Message } from '@/types';

export function usePeople() {
  const { user } = useStore();
  const [friends, setFriends] = useState<FriendWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: sent } = await supabase
      .from('friends')
      .select('*, friend_profile:users!friend_id (id, display_name, username, avatar_url, status_message)')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const { data: received } = await supabase
      .from('friends')
      .select('*, friend_profile:users!user_id (id, display_name, username, avatar_url, status_message)')
      .eq('friend_id', user.id)
      .eq('status', 'accepted');

    const all = [
      ...(sent ?? []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        friendId: row.friend_id,
        status: row.status,
        createdAt: new Date(row.created_at),
        friend: {
          id: row.friend_profile?.id ?? row.friend_id,
          displayName: row.friend_profile?.display_name ?? '사용자',
          username: row.friend_profile?.username ?? null,
          avatarUrl: row.friend_profile?.avatar_url ?? null,
          statusMessage: row.friend_profile?.status_message ?? null,
          isOnline: false,
        }
      })),
      ...(received ?? []).map((row: any) => ({
        id: row.id,
        userId: row.friend_id, // inverted
        friendId: row.user_id, // inverted
        status: row.status,
        createdAt: new Date(row.created_at),
        friend: {
          id: row.friend_profile?.id ?? row.user_id,
          displayName: row.friend_profile?.display_name ?? '사용자',
          username: row.friend_profile?.username ?? null,
          avatarUrl: row.friend_profile?.avatar_url ?? null,
          statusMessage: row.friend_profile?.status_message ?? null,
          isOnline: false,
        }
      })),
    ];
    setFriends(all);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const removeFriend = useCallback(async (friendRowId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendRowId);
    if (!error) {
      setFriends(prev => prev.filter(f => f.id !== friendRowId));
    }
  }, []);

  return { friends, isLoading, refetch: fetchFriends, removeFriend };
}
