import React, { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { usePeople } from '@/hooks/usePeople';
import { useStore } from '@/store/useStore';
import { MessageSquare, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';
import { useUnreadDmCounts } from '@/hooks/useUnreadDmCounts';

export function PeopleView() {
  const { friends, isLoading, removeFriend } = usePeople();
  const { setActiveChatUser, searchQuery, markNotificationRead, notifications } = useStore();
  const { t } = useTranslation();
  const unreadCounts = useUnreadDmCounts();

  const filteredFriends = friends.filter(f => {
    const searchLower = searchQuery.toLowerCase();
    return !searchQuery ||
      f.friend.displayName.toLowerCase().includes(searchLower) ||
      (f.friend.username && f.friend.username.toLowerCase().includes(searchLower));
  });

  // 읽지 않은 DM 있는 친구를 최상단으로 정렬
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aCount = unreadCounts[a.friend.id] ?? 0;
    const bCount = unreadCounts[b.friend.id] ?? 0;
    if (bCount !== aCount) return bCount - aCount; // 많은 쪽 먼저
    return a.friend.displayName.localeCompare(b.friend.displayName);
  });

  const handleOpenChat = (friend: typeof friends[0]['friend']) => {
    setActiveChatUser({ id: friend.id, name: friend.displayName, avatarUrl: friend.avatarUrl });
    // 해당 친구의 unread DM 알림 모두 읽음 처리
    notifications
      .filter(n => !n.isRead && n.senderId === friend.id && (n.type === 'dm' || n.type === 'message'))
      .forEach(n => markNotificationRead(n.id));
  };

  return (
    <ScrollArea className="h-full bg-card">
      <div className="flex flex-col">

        {isLoading ? (
          <div className="flex justify-center p-8 text-muted-foreground">Loading people...</div>
        ) : sortedFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[30vh] text-muted-foreground">
            <p>No people found.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {sortedFriends.map(f => {
              const unread = unreadCounts[f.friend.id] ?? 0;
              const hasUnread = unread > 0;

              return (
                <div
                  key={f.id}
                  onClick={() => handleOpenChat(f.friend)}
                  className="group flex flex-col gap-2 px-6 py-4 border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-all"
                  style={{
                    borderLeft: hasUnread ? '3px solid var(--primary)' : '3px solid transparent',
                    backgroundColor: hasUnread ? 'var(--primary-foreground, rgba(99,102,241,0.04))' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar with unread ring */}
                      <div className="relative">
                        <Avatar
                          className="h-9 w-9"
                          style={{
                            boxShadow: hasUnread ? '0 0 0 2px var(--primary)' : '0 0 0 2px var(--border)',
                          }}
                        >
                          <AvatarImage src={f.friend.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${f.friend.id}`} />
                          <AvatarFallback>{f.friend.displayName[0]}</AvatarFallback>
                        </Avatar>
                        {/* Unread badge on avatar */}
                        {hasUnread && (
                          <span
                            className="absolute -top-1 -right-1 flex items-center justify-center text-white font-bold rounded-full ring-2 ring-background"
                            style={{
                              minWidth: 16, height: 16,
                              fontSize: 9,
                              background: 'var(--primary)',
                              padding: '0 3px',
                              lineHeight: 1,
                            }}
                          >
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-[14px] leading-tight truncate"
                          style={{ fontWeight: hasUnread ? 800 : 600, color: 'var(--foreground)' }}
                        >
                          {f.friend.displayName}
                        </span>
                        <span className="text-[12px] text-muted-foreground font-medium truncate mt-0.5">
                          {f.friend.username ? `@${f.friend.username}` : 'No username'}
                        </span>
                      </div>
                    </div>

                    {f.friend.statusMessage && (
                      <div className="hidden md:block flex-1 min-w-0 text-[13px] text-muted-foreground px-4 truncate">
                        {f.friend.statusMessage}
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Message button (shows on hover, always visible if unread) */}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1.5 transition-opacity"
                        style={{ opacity: hasUnread ? 1 : undefined }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {hasUnread ? (
                          <span>
                            {t('people.newMessages') ?? 'New DM'}
                          </span>
                        ) : 'Message'}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground group-hover:text-foreground hover:bg-accent"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40" onClick={e => e.stopPropagation()}>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('정말 친구를 삭제하시겠습니까? / Are you sure you want to delete this friend?')) {
                                removeFriend(f.id);
                              }
                            }}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('action.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
