// ── Source Types ─────────────────────────────────────────────────────────────
export type SourceType = 'gmail' | 'slack' | 'teams' | 'kakao' | 'meeting' | 'call' | 'manual' | 'android_notif' | 'android_call';

// ── Priority ──────────────────────────────────────────────────────────────────
export type Priority = 'high' | 'medium' | 'low' | null;

// ── Todo ──────────────────────────────────────────────────────────────────────
export interface Todo {
  id: string;
  userId: string;
  title: string;
  memo?: string;
  source: SourceType;
  sourceExcerpt?: string;
  dueDate?: Date | null;
  dueTime?: string | null;  // "09:00" 형식 문자열
  hasReminder?: boolean;
  priority: Priority;
  folderId?: string | null;
  assigneeId?: string | null;   // legacy single (keep for backward compat)
  assigneeIds?: string[];       // NEW: multiple assignees (Supabase user IDs)
  viewerIds?: string[];         // NEW: viewers / shared-with
  tags: string[];
  attachments?: { name: string; url: string; size?: number; type?: string }[];
  isCompleted: boolean;
  completedAt?: Date | null;
  isOverdue?: boolean;
  aiConfidenceLow?: boolean;
  aiDeckPending?: boolean;
  aiDeck?: {
    summary: string;
    transcript: string;
    slides: { id: string; title: string; content: string[] }[];
  };
  aiDeckDismissedAt?: string | null; // dismiss 시 timestamp 기록, fingerprint 보존용
  timeBlockSlot?: number | null;     // 1~4: Block1~Block4 (Today Block View)
  top3Rank?: number | null;          // 1~3: 오늘의 Top3 순위
  estimatedMinutes?: number | null;  // 예상 소요 시간(분)
  sortOrder?: number | null;         // 수동 정렬 순서
  // ── 역할 / 클라이언트 / 파트너 ───────────────────────────────────────────────
  todoRole?: 'own' | 'client_request' | 'delegated' | null;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'revision_requested' | null;
  delegateStatus?: 'not_started' | 'in_progress' | 'blocked' | 'completed' | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── TodoComment ────────────────────────────────────────────────────────
export interface TodoComment {
  id: string;
  todoId: string;
  userId: string;
  authorName: string;    // display_name from users table
  authorInitial: string;
  avatarColor: string;   // deterministic color from userId hash
  avatarUrl?: string | null;
  content: string;
  createdAt: Date;
}

// ── Folder ────────────────────────────────────────────────────────────────────
export interface Collaborator {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  initial: string;   // first char of displayName
}

export interface Folder {
  id: string;
  ownerId: string;     // owner's user ID (for permission checks)
  name: string;
  color?: string;
  collaborators: Collaborator[];
  todoCount: number;
  createdAt: Date;
  sortOrder?: number | null;          // 수동 정렬
  // ── Project Workspace 확장 필드 (모바일앱 동일 DB) ────────────────────────────────
  workspaceType?: 'personal' | 'project'; // DB: workspace_type
  description?: string | null;            // DB: description
  clientEmail?: string | null;            // DB: client_email
  inviteToken?: string | null;            // DB: invite_token
}

// ── User Profile ──────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  statusMessage?: string;
  username?: string;
  birthday?: string;
  phone?: string;
  isPro: boolean;
  isTrialing: boolean;
  trialDaysLeft?: number;
}

// ── Notification ──────────────────────────────────────────────────────────────
export type NotificationType =
  | 'comment' | 'mention' | 'meeting_result'
  | 'reminder' | 'overdue' | 'folder_invite'
  | 'deck' | 'qr_join' | 'friend_request'
  | 'friend_accepted' | 'todo_assigned'
  | 'todo_completed' | 'todo_deleted' | 'shake' | 'dm' | 'message';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  todoId?: string;
  folderId?: string;
  meetingId?: string;
  senderId?: string;
  meta?: Record<string, any>; // 딥링크 데이터 (todoId, folderId 등)
  createdAt: Date;
}

// ── Friend & Message ─────────────────────────────────────────────────────────
export interface FriendProfile {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  statusMessage: string | null;
  isOnline: boolean;
}

export interface FriendWithUser {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  friend: FriendProfile;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  todoId: string | null;
  createdAt: Date;
  messageType?: 'text' | 'task' | 'media';
  attachments?: { name: string, url: string, type: string, size?: number }[];
  taskId?: string | null;
  taskSnapshot?: any;
}

// ── Meeting Recording ────────────────────────────────────────────────────────
export interface MeetingRecording {
  id: string;
  title: string;
  mode: 'solo' | 'team' | 'call';
  durationSec: number;
  summary?: string;
  transcript?: string;
  audio_url?: string;
  taskCount?: number;
  isShared?: boolean;
  createdAt: Date;
}

