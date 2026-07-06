import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import type { FriendWithUser } from '@/types';

export interface UserSearchResult {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  statusMessage: string | null;
}

export function usePeople() {
  const { user } = useStore();
  const [friends, setFriends] = useState<FriendWithUser[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendWithUser[]>([]); // 받은 친구 요청
  const [pendingSent, setPendingSent] = useState<FriendWithUser[]>([]);         // 보낸 친구 요청
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('denlog_favorite_friends') || '[]'); }
    catch { return []; }
  });

  const saveFavorites = (ids: string[]) => {
    setFavoriteIds(ids);
    if (typeof window !== 'undefined') localStorage.setItem('denlog_favorite_friends', JSON.stringify(ids));
  };

  const mapFriendRow = (row: any, direction: 'sent' | 'received'): FriendWithUser => {
    const profile = direction === 'sent' ? row.friend_profile : row.sender_profile;
    const friendId = direction === 'sent' ? row.friend_id : row.user_id;
    return {
      id: row.id,
      userId: direction === 'sent' ? row.user_id : row.friend_id,
      friendId,
      status: row.status,
      createdAt: new Date(row.created_at),
      friend: {
        id: profile?.id ?? friendId,
        displayName: profile?.display_name ?? '사용자',
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        statusMessage: profile?.status_message ?? null,
        isOnline: false,
      },
    };
  };

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const [
      { data: sent },
      { data: received },
      { data: pendRec },
      { data: pendSent },
    ] = await Promise.all([
      supabase
        .from('friends')
        .select('*, friend_profile:users!friend_id (id, display_name, username, avatar_url, status_message)')
        .eq('user_id', user.id)
        .eq('status', 'accepted'),
      supabase
        .from('friends')
        .select('*, sender_profile:users!user_id (id, display_name, username, avatar_url, status_message)')
        .eq('friend_id', user.id)
        .eq('status', 'accepted'),
      // 내가 받은 pending 요청
      supabase
        .from('friends')
        .select('*, sender_profile:users!user_id (id, display_name, username, avatar_url, status_message)')
        .eq('friend_id', user.id)
        .eq('status', 'pending'),
      // 내가 보낸 pending 요청
      supabase
        .from('friends')
        .select('*, friend_profile:users!friend_id (id, display_name, username, avatar_url, status_message)')
        .eq('user_id', user.id)
        .eq('status', 'pending'),
    ]);

    const acceptedSent = (sent ?? []).map((r: any) => mapFriendRow(r, 'sent'));
    const acceptedRec  = (received ?? []).map((r: any) => mapFriendRow(r, 'received'));
    setFriends([...acceptedSent, ...acceptedRec]);

    setPendingReceived((pendRec ?? []).map((r: any) => mapFriendRow(r, 'received')));
    setPendingSent((pendSent ?? []).map((r: any) => mapFriendRow(r, 'sent')));

    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const removeFriend = useCallback(async (friendRowId: string) => {
    const { error } = await supabase.from('friends').delete().eq('id', friendRowId);
    if (!error) {
      setFriends(prev => prev.filter(f => f.id !== friendRowId));
    }
  }, []);

  // 친구 요청 수락
  const acceptRequest = useCallback(async (friendRowId: string) => {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendRowId);
    if (!error) {
      const accepted = pendingReceived.find(r => r.id === friendRowId);
      if (accepted) {
        setFriends(prev => [...prev, { ...accepted, status: 'accepted' }]);
        setPendingReceived(prev => prev.filter(r => r.id !== friendRowId));
      }
    }
  }, [pendingReceived]);

  // 친구 요청 거절
  const rejectRequest = useCallback(async (friendRowId: string) => {
    const { error } = await supabase.from('friends').delete().eq('id', friendRowId);
    if (!error) {
      setPendingReceived(prev => prev.filter(r => r.id !== friendRowId));
    }
  }, []);

  // 친구 검색 (이메일 or @username or 이름)
  const searchUsers = useCallback(async (query: string): Promise<UserSearchResult[]> => {
    if (!user || !query.trim()) return [];
    const q = query.trim().replace(/^@/, '');
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_url, status_message')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) return [];
    return (data ?? []).map((u: any) => ({
      id: u.id,
      displayName: u.display_name ?? '사용자',
      username: u.username ?? null,
      avatarUrl: u.avatar_url ?? null,
      statusMessage: u.status_message ?? null,
    }));
  }, [user]);

  // 친구 요청 보내기
  const sendFriendRequest = useCallback(async (targetUserId: string) => {
    if (!user) return false;
    // 이미 친구이거나 pending인지 확인
    const alreadyFriend = friends.some(f => f.friend.id === targetUserId);
    const alreadyPending = pendingSent.some(f => f.friend.id === targetUserId);
    if (alreadyFriend || alreadyPending) return false;

    const { error } = await supabase.from('friends').insert({
      user_id: user.id,
      friend_id: targetUserId,
      status: 'pending',
    });
    if (error) {
      console.error('[sendFriendRequest]', error);
      return false;
    }
    await fetchFriends();
    return true;
  }, [user, friends, pendingSent, fetchFriends]);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback((friendId: string) => {
    const next = favoriteIds.includes(friendId)
      ? favoriteIds.filter(id => id !== friendId)
      : [...favoriteIds, friendId];
    saveFavorites(next);
  }, [favoriteIds]);

  return {
    friends,
    pendingReceived,
    pendingSent,
    favoriteIds,
    isLoading,
    refetch: fetchFriends,
    removeFriend,
    acceptRequest,
    rejectRequest,
    searchUsers,
    sendFriendRequest,
    toggleFavorite,
  };
}
