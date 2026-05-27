"use client";
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { AppNotification } from '../types';
import { supabase } from '../lib/supabase';

// ── Social types that show profile image ───────────────────────────────────
const SOCIAL_TYPES = new Set(['dm', 'message', 'shake', 'friend_request', 'friend_accepted', 'comment', 'mention', 'todo_assigned', 'todo_completed']);

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  comment:        { label: '💬', color: '#6366F1' },
  mention:        { label: '@',  color: '#8B5CF6' },
  meeting_result: { label: '🎙', color: '#22C55E' },
  reminder:       { label: '📌', color: '#F59E0B' },
  overdue:        { label: '⏰', color: '#EF4444' },
  folder_invite:  { label: '📂', color: '#6366F1' },
  deck:           { label: '✦', color: '#6366F1' },
  qr_join:        { label: '⬛', color: '#6B7280' },
  friend_request: { label: '👋', color: '#EC4899' },
  friend_accepted:{ label: '🎉', color: '#EC4899' },
  shake:          { label: '👋', color: '#06B6D4' },
  dm:             { label: '💬', color: '#06B6D4' },
  message:        { label: '💬', color: '#06B6D4' },
  todo_assigned:  { label: '✅', color: '#22C55E' },
  todo_completed: { label: '✓',  color: '#22C55E' },
  todo_deleted:   { label: '🗑', color: '#EF4444' },
};

function getNotifText(n: AppNotification, isEn: boolean): { title: string; body: string } {
  const m = (n.meta ?? {}) as Record<string, any>;
  const name = m.senderName ?? '';
  const folderName = m.folderName ?? (isEn ? 'a folder' : '폴더');
  const todoTitle = m.todoTitle ?? '';
  const count = m.count ?? 1;

  switch (n.type) {
    case 'friend_request':   return { title: isEn ? '👋 Friend Request' : '👋 친구 요청', body: isEn ? `${name} sent you a friend request.` : `${name}님이 친구 요청을 보냈습니다.` };
    case 'friend_accepted':  return { title: isEn ? '🎉 Friend Added' : '🎉 친구 수락', body: isEn ? `You and ${name} are now friends!` : `${name}님과 친구가 되었어요!` };
    case 'comment':          return { title: isEn ? '💬 New Comment' : '💬 새 댓글', body: todoTitle ? (isEn ? `${name} commented on '${todoTitle}'` : `${name}님이 '${todoTitle}'에 댓글을 남겼어요`) : n.body };
    case 'folder_invite':    return { title: isEn ? '📂 Folder Invite' : '📂 폴더 초대', body: isEn ? `You've been invited to '${folderName}'.` : `'${folderName}' 폴더에 초대받았어요.` };
    case 'reminder':         return { title: isEn ? '📌 Deadline Reminder' : '📌 마감 리마인더', body: todoTitle ? (isEn ? `'${todoTitle}' is due!` : `'${todoTitle}' 마감시간이 되었습니다!`) : n.body };
    case 'overdue':          return { title: isEn ? '⏰ Overdue Tasks' : '⏰ 기한 초과 알림', body: isEn ? (count === 1 ? 'A task is past due.' : `${count} tasks are past due.`) : (count === 1 ? '마감일이 지난 할 일이 있어요.' : `마감일이 지난 할 일이 ${count}개 있어요.`) };
    case 'deck':             return { title: isEn ? '✨ New AI Recommendations' : '✨ 새로운 AI 추천', body: isEn ? 'New tasks were added to your inbox.' : '새 할 일이 인박스에 추가됐어요.' };
    case 'meeting_result':   return { title: isEn ? '✨ Call Analysis Complete' : '✨ 통화 AI 분석 완료', body: isEn ? 'Your call has been transcribed and tasks extracted.' : '통화 내용이 기록되고 할 일이 추출되었습니다.' };
    case 'mention':          return { title: isEn ? '🔔 Mention' : '🔔 멘션', body: todoTitle ? (isEn ? `${name} mentioned you in '${todoTitle}'` : `${name}님이 '${todoTitle}'에서 언급했어요`) : n.body };
    case 'shake':            return { title: isEn ? '👋 Nudge!' : '👋 흔들기!', body: todoTitle ? (isEn ? `${name} nudged you about '${todoTitle}'` : `${name}님이 '${todoTitle}' 관련해서 흔들었어요!`) : n.body };
    case 'todo_assigned':    return { title: isEn ? '✅ Task Assigned' : '✅ 할일 배정', body: todoTitle ? (isEn ? `${name} assigned '${todoTitle}' to you.` : `${name}님이 '${todoTitle}'을 배정했어요.`) : n.body };
    case 'todo_completed':   return { title: isEn ? '✓ Task Completed' : '✓ 할일 완료', body: todoTitle ? (isEn ? `'${todoTitle}' was completed.` : `'${todoTitle}'이 완료되었어요.`) : n.body };
    case 'dm': case 'message': return { title: name || (isEn ? 'New Message' : '새 메시지'), body: n.body };
    default: return { title: n.title, body: n.body };
  }
}

// ── Icon / Avatar ───────────────────────────────────────────────────────────
function NotifIcon({ notif, isRead, profileUrl }: { notif: AppNotification; isRead: boolean; profileUrl?: string | null }) {
  const m = (notif.meta ?? {}) as Record<string, any>;
  const senderName: string = m.senderName ?? '';
  const conf = TYPE_CONFIG[notif.type] ?? { label: '•', color: '#6B7280' };
  const color = isRead ? '#9CA3AF' : conf.color;
  const isSocial = SOCIAL_TYPES.has(notif.type);
  const avatarSrc = profileUrl ?? m.avatarUrl;
  const initial = senderName?.charAt(0).toUpperCase() || '?';

  if (isSocial) {
    return (
      <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: color + '20', border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: isRead ? 0.55 : 1 }}>
          {avatarSrc ? (
            <img src={avatarSrc} alt={senderName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 800, color }}>{initial}</span>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: color, border: '2px solid var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, lineHeight: 1 }}>
          {conf.label}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: color + '18', border: `1px solid ${color}30`, fontSize: 18, lineHeight: 1, opacity: isRead ? 0.55 : 1 }}>
      <span>{conf.label}</span>
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────
function NotifRow({ notif, isEn, profileUrl, onClick, extraContent }: {
  notif: AppNotification; isEn: boolean;
  profileUrl?: string | null;
  onClick?: () => void;
  extraContent?: React.ReactNode;
}) {
  const { title, body } = getNotifText(notif, isEn);
  const accentColor = TYPE_CONFIG[notif.type]?.color ?? '#6366F1';
  const isRead = notif.isRead;

  return (
    <div
      onMouseDown={e => { e.stopPropagation(); }}   // ← prevent click-outside from firing
      onClick={onClick}
      style={{
        position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 16px 12px 18px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: isRead ? 'transparent' : `${accentColor}09`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.backgroundColor = isRead ? 'var(--muted)' : `${accentColor}16`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isRead ? 'transparent' : `${accentColor}09`; }}
    >
      {!isRead && <div style={{ position: 'absolute', left: 6, top: 20, width: 5, height: 5, borderRadius: '50%', backgroundColor: accentColor }} />}
      <NotifIcon notif={notif} isRead={isRead} profileUrl={profileUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: isRead ? 400 : 700, margin: '0 0 2px', lineHeight: 1.35, color: isRead ? 'var(--muted-foreground)' : 'var(--foreground)' }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', opacity: isRead ? 0.6 : 0.8, margin: '0 0 4px', lineHeight: 1.5 }}>{body}</p>
        <p style={{ fontSize: 10, color: 'var(--muted-foreground)', opacity: 0.5, margin: 0 }}>
          {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: isEn ? enUS : ko })}
        </p>
        {extraContent}
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ padding: '7px 16px 5px', fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--muted-foreground)', background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
      {label}
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────
interface NotificationPanelProps {
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}

export function NotificationPanel({ onClose, anchorRef }: NotificationPanelProps) {
  const { notifications, markAllNotificationsRead, language, user } = useStore();
  const isEn = language === 'en';
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 60, right: 16 });
  const [profileCache, setProfileCache] = useState<Record<string, string | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [anchorRef]);

  // Fetch sender profile images
  useEffect(() => {
    const senderIds = notifications
      .filter(n => SOCIAL_TYPES.has(n.type) && n.senderId)
      .map(n => n.senderId!)
      .filter((id, i, arr) => arr.indexOf(id) === i && !(id in profileCache));
    if (senderIds.length === 0) return;
    supabase.from('users').select('id, avatar_url').in('id', senderIds).then(({ data }) => {
      if (!data) return;
      const updates: Record<string, string | null> = {};
      data.forEach(u => { updates[u.id] = u.avatar_url ?? null; });
      setProfileCache(prev => ({ ...prev, ...updates }));
    });
  }, [notifications]);

  // Click-outside: attach to document mousedown, stop propagation inside panel
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (anchorRef?.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  const getProfileUrl = (n: AppNotification) => {
    if (!n.senderId) return null;
    const store = useStore.getState();
    return store.usersMap[n.senderId]?.avatarUrl ?? profileCache[n.senderId] ?? null;
  };

  // ── NAVIGATION: always use useStore.getState() to get live store actions ──
  const navigate = (n: AppNotification) => {
    const store = useStore.getState();
    const m = (n.meta ?? {}) as Record<string, any>;
    const todoId    = n.todoId    ?? m.todoId;
    const folderId  = n.folderId  ?? m.folderId;
    const meetingId = n.meetingId ?? m.meetingId ?? m.recordingId;
    const senderName = m.senderName ?? '';

    // 1. Mark read (fire-and-forget)
    if (!n.isRead) store.markNotificationRead(n.id);

    // 2. Close panel
    onClose();

    // 3. Navigate (use requestAnimationFrame so React flush from onClose completes first)
    requestAnimationFrame(() => {
      const s = useStore.getState(); // Always fresh reference
      switch (n.type) {
        case 'dm':
        case 'message': {
          // 흔들기 DM 감지: body에 [SHAKE: 또는 [SHAKE] 포함 시 할일 상세로 이동
          const isShakeDM =
            typeof n.body === 'string' &&
            (n.body.includes('[SHAKE:') || n.body.includes('[SHAKE]'));

          if (isShakeDM) {
            if (todoId) {
              s.setSelectedTodo(todoId);
            }
            window.dispatchEvent(new CustomEvent('denlog:shake', { detail: { todoId } }));
          } else {
            // 일반 DM → 채팅방으로
            s.setCurrentView('people');
            if (n.senderId) {
              s.setActiveChatUser({
                id: n.senderId,
                name: senderName || 'User',
                avatarUrl: profileCache[n.senderId] ?? null,
              });
            }
          }
          break;
        }

        case 'shake':
          if (todoId) {
            // 흔들기 대상 할일 상세 열기
            s.setSelectedTodo(todoId);
            // 흔들기 애니메이션도 함께 트리거
            window.dispatchEvent(new CustomEvent('denlog:shake', { detail: { todoId } }));
          } else if (n.senderId) {
            // todoId 없으면 보낸 사람 채팅으로 fallback
            s.setCurrentView('people');
            s.setActiveChatUser({
              id: n.senderId,
              name: senderName || 'User',
              avatarUrl: profileCache[n.senderId] ?? null,
            });
          }
          break;

        case 'friend_request':
        case 'friend_accepted':
          s.setCurrentView('people');
          break;

        case 'folder_invite':
          if (folderId) s.setCurrentView(folderId);
          else s.setCurrentView('inbox');
          break;

        case 'comment':
        case 'mention':
        case 'todo_assigned':
        case 'todo_completed':
          if (todoId) s.setSelectedTodo(todoId);
          break;

        case 'reminder':
        case 'overdue':
          if (todoId) s.setSelectedTodo(todoId);
          break;

        case 'deck':
          s.setCurrentView('inbox');
          break;

        case 'meeting_result':
          s.setCurrentView('meetings');
          if (meetingId) {
            // 캐비넷 뷰로 이동 후 해당 녹음 상세 바로 열기
            s.setSelectedRecording(meetingId);
          }
          break;

        default:
          if (todoId) s.setSelectedTodo(todoId);
          break;
      }
    });
  };

  const sorted = [...notifications].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const unreadItems = sorted.filter(n => !n.isRead);
  const readItems   = sorted.filter(n =>  n.isRead);
  const unreadCount = unreadItems.length;

  const renderRow = (n: AppNotification) => {
    const profileUrl = getProfileUrl(n);

    if (n.type === 'friend_request') {
      return (
        <NotifRow key={n.id} notif={n} isEn={isEn} profileUrl={profileUrl}
          onClick={() => navigate(n)}
          extraContent={!n.isRead ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onMouseDown={e => e.stopPropagation()} onClick={async e => {
                e.stopPropagation();
                if (!n.senderId || !user?.id) return;
                const { data: row } = await supabase.from('friends').select('id').eq('user_id', n.senderId).eq('friend_id', user.id).eq('status', 'pending').maybeSingle();
                if (row) await supabase.from('friends').delete().eq('id', row.id);
                useStore.getState().markNotificationRead(n.id);
              }} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                {isEn ? 'Decline' : '거절'}
              </button>
              <button onMouseDown={e => e.stopPropagation()} onClick={async e => {
                e.stopPropagation();
                if (!n.senderId || !user?.id) return;
                const { data: row } = await supabase.from('friends').select('id').eq('user_id', n.senderId).eq('friend_id', user.id).eq('status', 'pending').maybeSingle();
                if (row) await supabase.from('friends').update({ status: 'accepted' }).eq('id', row.id);
                useStore.getState().markNotificationRead(n.id);
              }} style={{ flex: 2, padding: '6px 0', borderRadius: 8, border: 'none', background: '#EC4899', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {isEn ? '✓ Accept' : '✓ 수락'}
              </button>
            </div>
          ) : undefined}
        />
      );
    }

    if (n.type === 'folder_invite') {
      return (
        <NotifRow key={n.id} notif={n} isEn={isEn} profileUrl={profileUrl}
          extraContent={!n.isRead ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); useStore.getState().markNotificationRead(n.id); }}
                style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                {isEn ? 'Dismiss' : '닫기'}
              </button>
              <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); navigate(n); }}
                style={{ flex: 2, padding: '6px 0', borderRadius: 8, border: 'none', background: '#6366F1', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {isEn ? '→ Open Folder' : '→ 폴더 보기'}
              </button>
            </div>
          ) : undefined}
        />
      );
    }

    return (
      <NotifRow key={n.id} notif={n} isEn={isEn} profileUrl={profileUrl}
        onClick={() => navigate(n)}
      />
    );
  };

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div ref={panelRef} onMouseDown={e => e.stopPropagation()}
      style={{ position: 'fixed', top: pos.top, right: pos.right, width: 380, zIndex: 9998, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.18)', overflow: 'hidden', animation: 'notifIn 0.18s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>{isEn ? 'Notifications' : '알림'}</span>
          {unreadCount > 0 && <span style={{ fontSize: 10, fontWeight: 900, background: 'var(--primary)', color: 'white', padding: '2px 7px', borderRadius: 99 }}>{unreadCount}</span>}
        </div>
        {unreadCount > 0 && (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => markAllNotificationsRead()}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {isEn ? 'Mark all read' : '모두 읽음'}
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 10 }}>
            <span style={{ fontSize: 36 }}>🔔</span>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>{isEn ? 'No notifications' : '새 알림이 없어요'}</p>
            <p style={{ fontSize: 12, margin: 0, color: 'var(--muted-foreground)', textAlign: 'center', lineHeight: 1.6 }}>{isEn ? 'Friend requests, comments, and more will appear here' : '친구 요청, 댓글 등 중요한 소식이 여기에 표시됩니다'}</p>
          </div>
        ) : (
          <>
            {unreadItems.length > 0 && <><SectionLabel label={isEn ? `Unread · ${unreadItems.length}` : `읽지 않음 · ${unreadItems.length}개`} />{unreadItems.map(renderRow)}</>}
            {readItems.length > 0 && <><SectionLabel label={isEn ? `Earlier · ${readItems.length}` : `이전 알림 · ${readItems.length}개`} />{readItems.map(renderRow)}</>}
          </>
        )}
      </div>

      <style>{`@keyframes notifIn { from { opacity:0; transform:translateY(-6px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </div>,
    document.body
  );
}
