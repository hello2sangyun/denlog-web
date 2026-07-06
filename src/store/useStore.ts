import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { sendAppNotification } from '../lib/notifications';
import type { Todo, Folder, UserProfile, AppNotification, TodoComment, MeetingRecording } from '../types';

export type IntegrationProvider = 'gmail' | 'slack' | 'notion' | 'call_recording' | 'android_notifications';
// DB에서 사용하는 실제 provider 값 (android_notif, call_recording 등)
export type DBIntegrationProvider = 'gmail' | 'slack' | 'notion' | 'android_notif' | 'call_recording';

export type IntegrationStatus = 'active' | 'error' | 'warning' | 'disconnected';

export interface UserIntegration {
  provider: IntegrationProvider;
  dbProvider: DBIntegrationProvider;
  status: IntegrationStatus | null; // null = DB에 row 없음 (미연결)
  updatedAt?: string | null;
  metadata?: Record<string, any>;
}

export type ViewType = 'inbox' | 'today' | 'upcoming' | 'people' | 'meetings' | string;

// ── reminder_settings JSONB 빌더 (웹 ↔ 앱 공통 포맷) ──────────────────────────
function _buildReminderSettings(s: Pick<any, 'reminders' | 'notificationSettings' | 'startWeek'>) {
  return {
    reminders: s.reminders,
    notificationSettings: s.notificationSettings,
    startWeek: s.startWeek,
  };
}


interface AppState {
  user: UserProfile | null;
  todos: Todo[];
  folders: Folder[];
  comments: Record<string, TodoComment[]>; // todoId -> comments
  unreadCommentCounts: Record<string, number>; // todoId -> unread count
  usersMap: Record<string, { id: string; name: string; avatarUrl: string | null }>;
  notifications: AppNotification[];
  recordings: MeetingRecording[];
  isLoading: boolean;
  isInitialLoadCompleted: boolean;
  selectedTodoId: string | null;
  selectedTodoIds: string[];
  selectedRecordingId: string | null;
  searchQuery: string;
  todoSort: 'default' | 'dueDate' | 'priority';
  currentView: ViewType;
  viewingDeckTodoId: string | null;
  viewMode: 'list' | 'board';
  isSettingsOpen: boolean;
  isRecordingVoice: boolean;
  activeChatUser: { id: string; name: string; avatarUrl: string | null } | null;
  previousChatUser: { id: string; name: string; avatarUrl: string | null } | null;
  realtimeSetupUserId: string | null;
  // ── 할일 컨텍스트 메뉴 ──
  todoMenu: { id: string; x: number; y: number } | null;
  setTodoMenu: (menu: { id: string; x: number; y: number } | null) => void;
  
  setUser: (user: UserProfile | null) => void;
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  setSelectedTodo: (id: string | null) => void;
  toggleTodoSelection: (id: string) => void;
  selectAllTodos: (ids: string[]) => void;
  clearTodoSelection: () => void;
  selectedRecordingIds: string[];
  toggleRecordingSelection: (id: string) => void;
  selectAllRecordings: (ids: string[]) => void;
  clearRecordingSelection: () => void;
  deleteTodos: (ids: string[]) => Promise<void>;
  completeTodos: (ids: string[], isCompleted: boolean) => Promise<void>;
  moveTodos: (ids: string[], folderId: string | null) => Promise<void>;
  reorderTodos: (orderedIds: string[]) => Promise<void>;
  reorderFolders: (orderedIds: string[]) => Promise<void>;
  setSelectedRecording: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTodoSort: (sort: 'default' | 'dueDate' | 'priority') => void;
  setCurrentView: (view: ViewType) => void;
  setViewingDeckTodo: (id: string | null) => void;
  setViewMode: (mode: 'list' | 'board') => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsRecordingVoice: (isRecording: boolean) => void;
  recordingMode: 'solo' | 'team' | null;
  recordingLang: 'ko' | 'en' | 'zh' | 'ja' | 'es' | 'hu' | 'de' | null;
  setRecordingMode: (mode: 'solo' | 'team' | null) => void;
  setRecordingLang: (lang: 'ko' | 'en' | 'zh' | 'ja' | 'es' | 'hu' | 'de' | null) => void;
  setActiveChatUser: (user: { id: string; name: string; avatarUrl: string | null } | null) => void;
  
  loadData: () => Promise<void>;
  setupRealtime: (userId: string) => void;
  fetchComments: (todoId: string) => Promise<void>;
  fetchRecordings: () => Promise<void>;
  addComment: (todoId: string, content: string) => Promise<void>;
  deleteComment: (todoId: string, commentId: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  updateFolder: (folderId: string, updates: { workspaceType?: 'personal' | 'project'; name?: string }) => Promise<void>;
  deleteRecordings: (ids: string[]) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearCommentBadge: (todoId: string) => void;

  // Account / Profile
  updateUserProfile: (patch: { displayName?: string; statusMessage?: string; avatarUrl?: string; username?: string; birthday?: string; phone?: string; }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string | null>;
  deleteAccount: () => Promise<void>;

  // Settings
  language: 'ko' | 'en';
  aiSensitivity: 'low' | 'medium' | 'high';
  accentColor: string;
  startWeek: 'monday' | 'sunday';
  reminders: {
    enabled: boolean;
    high: string;
    mid: string;
    low: string;
    overdue: boolean;
    deckAlert: boolean;
  };
  notificationSettings: {
    comments: boolean;
    mentions: boolean;
    dueToday: boolean;
    dueSoon: boolean;
    overdue: boolean;
  };
  setLanguage: (lang: 'ko' | 'en') => void;
  setAiSensitivity: (val: 'low' | 'medium' | 'high') => void;
  setAccentColor: (color: string) => void;
  setStartWeek: (day: 'monday' | 'sunday') => void;
  setReminders: (reminders: Partial<AppState['reminders']>) => void;
  setNotificationSettings: (settings: Partial<AppState['notificationSettings']>) => void;

  // Integrations
  integrations: UserIntegration[];
  integrationsLoading: boolean;
  fetchIntegrations: () => Promise<void>;
  toggleIntegration: (provider: IntegrationProvider, connected: boolean) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  todos: [],
  folders: [],
  comments: {},
  unreadCommentCounts: {},
  usersMap: {},
  notifications: [],
  recordings: [],
  isLoading: true,
  isInitialLoadCompleted: false,
  selectedTodoId: null,
  selectedTodoIds: [],
  selectedRecordingId: null,
  selectedRecordingIds: [],
  searchQuery: '',
  todoSort: 'default',
  currentView: 'all',
  viewingDeckTodoId: null,
  viewMode: 'list',
  isSettingsOpen: false,
  isRecordingVoice: false,
  activeChatUser: null,
  previousChatUser: null,
  realtimeSetupUserId: null,
  todoMenu: null,
  setTodoMenu: (menu) => set({ todoMenu: menu }),
  
  // Settings Default State
  language: 'ko',
  aiSensitivity: 'medium',
  accentColor: '#E8574A', // Default Coral
  startWeek: 'monday',
  reminders: {
    enabled: true,
    high: 'None',
    mid: 'None',
    low: 'None',
    overdue: true,
    deckAlert: true,
  },

  recordingMode: null,
  recordingLang: 'ko',

  // Integrations
  integrations: [],
  integrationsLoading: false,

  setUser: (user) => set({ user }),
  setTodos: (todos) => set({ todos }),
  setSelectedTodo: (id) => set((state) => {
    if (id !== null) {
      // Opening a task: save current chat user + clear comment badge
      return {
        selectedTodoId: id,
        selectedRecordingId: null,
        activeChatUser: null,
        previousChatUser: state.activeChatUser || state.previousChatUser,
        unreadCommentCounts: { ...state.unreadCommentCounts, [id]: 0 },
      };
    } else {
      // Closing a task: restore previous chat user
      return { selectedTodoId: null, selectedRecordingId: null, activeChatUser: state.previousChatUser, previousChatUser: null };
    }
  }),
  setSelectedRecording: (id: string | null) => set((state) => {
    if (id !== null) {
      return { selectedRecordingId: id, selectedTodoId: null, activeChatUser: null, previousChatUser: state.activeChatUser || state.previousChatUser };
    } else {
      return { selectedRecordingId: null, selectedTodoId: null, activeChatUser: state.previousChatUser, previousChatUser: null };
    }
  }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTodoSort: (sort) => set({ todoSort: sort }),
  setCurrentView: (view) => set({ currentView: view }),
  setViewingDeckTodo: (id) => set({ viewingDeckTodoId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setIsRecordingVoice: (isRecording) => set({ isRecordingVoice: isRecording }),
  setRecordingMode: (mode) => set({ recordingMode: mode }),
  setRecordingLang: (lang) => set({ recordingLang: lang }),
  setActiveChatUser: (user) => set({ activeChatUser: user, selectedTodoId: null, selectedRecordingId: null, previousChatUser: null }),
  
  setLanguage: async (lang) => {
    set({ language: lang });
    // auth.user_metadata 에 저장 → 앱과 동일한 위치
    await supabase.auth.updateUser({ data: { preferred_language: lang } });
    // users 테이블에도 백업 저장
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await supabase.from('users').update({ language: lang }).eq('id', session.user.id);
  },
  setAiSensitivity: async (val) => {
    set({ aiSensitivity: val });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await supabase.from('users').update({ ai_sensitivity: val }).eq('id', session.user.id);
  },
  setAccentColor: async (color) => {
    set({ accentColor: color });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await supabase.from('users').update({ accent_color: color }).eq('id', session.user.id);
  },
  setStartWeek: async (day) => {
    set({ startWeek: day });
    const s = get();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('users').update({
        reminder_settings: _buildReminderSettings({ ...s, startWeek: day })
      }).eq('id', session.user.id);
    }
  },
  setReminders: async (r) => {
    set((state) => ({ reminders: { ...state.reminders, ...r } }));
    const s = get();
    const merged = { ...s.reminders, ...r };
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('users').update({
        reminder_settings: _buildReminderSettings({ ...s, reminders: merged })
      }).eq('id', session.user.id);
    }
  },

  notificationSettings: {
    comments: true,
    mentions: true,
    dueToday: true,
    dueSoon: true,
    overdue: true,
  },
  setNotificationSettings: async (patch) => {
    set((state) => ({ notificationSettings: { ...state.notificationSettings, ...patch } }));
    const s = get();
    const merged = { ...s.notificationSettings, ...patch };
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('users').update({
        reminder_settings: _buildReminderSettings({ ...s, notificationSettings: merged })
      }).eq('id', session.user.id);
    }
  },

  fetchIntegrations: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    set({ integrationsLoading: true });
    // DB provider 값 매핑 (android_notif vs android_notifications)
    const PROVIDER_MAP: Record<string, IntegrationProvider> = {
      gmail: 'gmail',
      slack: 'slack',
      notion: 'notion',
      android_notif: 'android_notifications',
      call_recording: 'call_recording',
    };
    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('provider, status, updated_at, metadata')
        .eq('user_id', session.user.id)
        .in('provider', ['gmail', 'slack', 'notion', 'android_notif', 'call_recording']);
      if (!error && data) {
        const mapped: UserIntegration[] = data.map((r: any) => ({
          provider: PROVIDER_MAP[r.provider] || r.provider,
          dbProvider: r.provider,
          status: r.status as IntegrationStatus,
          updatedAt: r.updated_at,
          metadata: r.metadata,
        }));
        set({ integrations: mapped });
      }
    } catch (e) {
      console.error('Failed to fetch integrations', e);
    } finally {
      set({ integrationsLoading: false });
    }
  },

  toggleIntegration: async (provider, connected) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const DB_PROVIDER_MAP: Record<IntegrationProvider, DBIntegrationProvider> = {
      gmail: 'gmail',
      slack: 'slack',
      notion: 'notion',
      android_notifications: 'android_notif',
      call_recording: 'call_recording',
    };
    const dbProvider = DB_PROVIDER_MAP[provider];
    const newStatus: IntegrationStatus = connected ? 'active' : 'disconnected';
    // Optimistic update
    set((state) => ({
      integrations: state.integrations.some(i => i.provider === provider)
        ? state.integrations.map(i => i.provider === provider ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i)
        : [...state.integrations, { provider, dbProvider, status: newStatus, updatedAt: new Date().toISOString() }]
    }));
    // Upsert to DB
    const { error } = await supabase.from('user_integrations').upsert({
      user_id: session.user.id,
      provider: dbProvider,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });
    if (error) {
      console.error('Failed to toggle integration', error);
      get().fetchIntegrations();
    }
  },
  
  addTodo: async (todo) => {
    // 1. Optimistic local update
    set((state) => ({ todos: [todo, ...state.todos] }));
    
    // 2. Persist to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error: insertError } = await supabase.from('todos').insert({
        id: todo.id,
        user_id: session.user.id,
        title: todo.title,
        memo: todo.memo || null,
        source: todo.source || 'manual',
        is_completed: todo.isCompleted,
        priority: todo.priority || null,
        folder_id: (todo.folderId && !['inbox', 'today', 'cabinet', 'all'].includes(todo.folderId)) ? todo.folderId : null,
        assignee_ids: todo.assigneeIds || [],
        viewer_ids: todo.viewerIds || [],
        due_date: todo.dueDate ? todo.dueDate.toISOString() : null,
        due_time: (todo.dueTime && todo.dueDate) ? (() => {
          const [h, m] = todo.dueTime.split(':').map(Number);
          const d = new Date(todo.dueDate);
          d.setHours(h, m, 0, 0);
          return d.toISOString();
        })() : null,
        has_reminder: todo.hasReminder || false,
        tags: todo.tags || [],
        attachments: todo.attachments || [],
        created_at: todo.createdAt?.toISOString(),
        updated_at: todo.createdAt?.toISOString()
      });
      if (insertError) {
        console.error("DB INSERT ERROR:", insertError);
      }
      
      // Notify assignees for new task
      if (todo.assigneeIds && todo.assigneeIds.length > 0) {
        todo.assigneeIds.forEach(assigneeId => {
          if (assigneeId !== session.user.id) {
            sendAppNotification({
              recipientId: assigneeId,
              type: 'todo_assigned',
              title: '새로운 할 일 할당',
              body: `'${todo.title}' 할 일이 할당되었습니다.`,
              senderId: session.user.id,
              todoId: todo.id,
            });
          }
        });
      }
    }
  },

  toggleTodoSelection: (id) => set((state) => {
    const isSelected = state.selectedTodoIds.includes(id);
    return {
      selectedTodoIds: isSelected 
        ? state.selectedTodoIds.filter(i => i !== id)
        : [...state.selectedTodoIds, id]
    };
  }),
  selectAllTodos: (ids) => set({ selectedTodoIds: ids }),
  clearTodoSelection: () => set({ selectedTodoIds: [] }),
  
  toggleRecordingSelection: (id) => set((state) => {
    const isSelected = state.selectedRecordingIds.includes(id);
    return {
      selectedRecordingIds: isSelected 
        ? state.selectedRecordingIds.filter(x => x !== id)
        : [...state.selectedRecordingIds, id]
    };
  }),
  selectAllRecordings: (ids) => set({ selectedRecordingIds: ids }),
  clearRecordingSelection: () => set({ selectedRecordingIds: [] }),
  
  deleteTodos: async (ids) => {
    const userId = get().user?.id;
    const todos = get().todos;
    
    const ownedIds: string[] = [];
    const sharedIds: string[] = [];
    
    ids.forEach(id => {
      const t = todos.find(x => x.id === id);
      if (!t || t.userId === userId) {
        ownedIds.push(id);
      } else {
        sharedIds.push(id);
      }
    });

    set(state => ({ 
      todos: state.todos.filter(t => !ids.includes(t.id)), 
      selectedTodoIds: [] 
    }));

    if (ownedIds.length > 0) {
      const { error } = await supabase.from('todos').delete().in('id', ownedIds);
      if (error) console.error('Error deleting todos', error);
    }
    
    for (const id of sharedIds) {
      const { error } = await supabase.rpc('leave_todo', { p_todo_id: id });
      if (error) console.error('Error leaving todo', error);
    }
  },

  completeTodos: async (ids, isCompleted) => {
    set(state => ({
      todos: state.todos.map(t => ids.includes(t.id) ? { ...t, isCompleted } : t),
      selectedTodoIds: []
    }));
    const { error } = await supabase.from('todos').update({ is_completed: isCompleted }).in('id', ids);
    if (error) console.error('Error completing todos', error);
  },

  moveTodos: async (ids, folderId) => {
    set(state => ({
      todos: state.todos.map(t => ids.includes(t.id) ? { ...t, folderId } : t),
      selectedTodoIds: []
    }));
    const { error } = await supabase.from('todos').update({ folder_id: folderId }).in('id', ids);
    if (error) console.error('Error moving todos', error);
  },

  reorderTodos: async (orderedIds) => {
    // 낙관적 업데이트: orderedIds에 있는 항목만 sortOrder 재할당, 나머지 유지
    set(state => ({
      todos: state.todos.map(t => {
        const idx = orderedIds.indexOf(t.id);
        return idx !== -1 ? { ...t, sortOrder: idx } : t;
      }),
    }));
    // Supabase 배치 저장
    const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
    for (const u of updates) {
      supabase.from('todos').update({ sort_order: u.sort_order }).eq('id', u.id).then();
    }
  },

  reorderFolders: async (orderedIds) => {
    // 낙관적 업데이트
    set(state => {
      const idxMap = new Map(orderedIds.map((id, i) => [id, i]));
      return {
        folders: [...state.folders].sort((a, b) => {
          const ai = idxMap.has(a.id) ? idxMap.get(a.id)! : 99999;
          const bi = idxMap.has(b.id) ? idxMap.get(b.id)! : 99999;
          return ai - bi;
        }).map((f, i) => idxMap.has(f.id) ? { ...f, sortOrder: i } : f),
      };
    });
    // Supabase 배치 저장 (sort_order 컬럼 없으면 무시됨)
    for (const [i, id] of orderedIds.entries()) {
      supabase.from('folders').update({ sort_order: i } as any).eq('id', id).then();
    }
  },

  updateTodo: async (id, updates) => {
    // 1. Optimistic local update
    set((state) => ({
      todos: state.todos.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    
    // 2. Persist to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.isCompleted !== undefined) {
        dbUpdates.is_completed = updates.isCompleted;
        dbUpdates.completed_at = updates.isCompleted ? new Date().toISOString() : null;
      }
      if (updates.priority !== undefined) {
        dbUpdates.priority = updates.priority || null;
      }
      if (updates.folderId !== undefined) {
        dbUpdates.folder_id = ['inbox', 'today', 'cabinet', 'all'].includes(updates.folderId!) ? null : updates.folderId;
      }
      if (updates.memo !== undefined) dbUpdates.memo = updates.memo;
      if (updates.assigneeIds !== undefined) dbUpdates.assignee_ids = updates.assigneeIds;
      if (updates.viewerIds !== undefined) dbUpdates.viewer_ids = updates.viewerIds;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments;
      if (updates.aiDeckPending !== undefined) dbUpdates.ai_deck_pending = updates.aiDeckPending;
      if (updates.aiDeckDismissedAt !== undefined) dbUpdates.ai_deck_dismissed_at = updates.aiDeckDismissedAt;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate ? updates.dueDate.toISOString() : null;
      if (updates.dueTime !== undefined || updates.dueDate !== undefined) {
        // Find existing or updated dueDate/dueTime
        const oldTodo = get().todos.find(t => t.id === id);
        const finalDate = updates.dueDate !== undefined ? updates.dueDate : oldTodo?.dueDate;
        const finalTime = updates.dueTime !== undefined ? updates.dueTime : oldTodo?.dueTime;
        if (finalTime && finalDate) {
          const [h, m] = finalTime.split(':').map(Number);
          const d = new Date(finalDate);
          d.setHours(h, m, 0, 0);
          dbUpdates.due_time = d.toISOString();
        } else {
          dbUpdates.due_time = null;
        }
      }
      if (updates.hasReminder !== undefined) dbUpdates.has_reminder = updates.hasReminder;
      // ── Time Block / Top3 (mobile app 동일 DB 콜럼) ─────────────────────────────
      if ('top3Rank' in updates)         dbUpdates.top3_rank = updates.top3Rank ?? null;
      if ('timeBlockSlot' in updates)    dbUpdates.time_block_slot = updates.timeBlockSlot ?? null;
      if ('estimatedMinutes' in updates) dbUpdates.estimated_minutes = updates.estimatedMinutes ?? null;
      if ('sortOrder' in updates)        dbUpdates.sort_order = updates.sortOrder ?? null;
      // ── 역할 / 클라이언트 / 파트너 ───────────────────────────────────────────────
      if ('todoRole' in updates)         dbUpdates.todo_role = updates.todoRole ?? null;
      if ('approvalStatus' in updates)   dbUpdates.approval_status = updates.approvalStatus ?? null;
      if ('delegateStatus' in updates)   dbUpdates.delegate_status = updates.delegateStatus ?? null;
      
      await supabase.from('todos').update(dbUpdates).eq('id', id);
      
      // Check if assignees changed to send notifications
      if (updates.assigneeIds !== undefined) {
        const oldTodo = get().todos.find(t => t.id === id);
        const oldAssignees = oldTodo?.assigneeIds || [];
        const newAssignees = updates.assigneeIds.filter(a => !oldAssignees.includes(a) && a !== session.user.id);
        
        newAssignees.forEach(assigneeId => {
          sendAppNotification({
            recipientId: assigneeId,
            type: 'mention', // 'mention' ensures navigation works on older app builds
            title: '새로운 할 일 할당',
            body: `'${oldTodo?.title || '할 일'}'에 담당자로 지정되었습니다.`,
            senderId: session.user.id,
            todoId: id,
            meta: {
              senderName: get().user?.displayName || 'Unknown',
              avatarUrl: get().user?.avatarUrl,
            }
          });
        });
      }
    }
  },

  fetchComments: async (todoId) => {
    const mapComments = (rows: any[]) => {
      const usersMap = get().usersMap;
      return rows.map((c: any) => {
        const joinedName = c.users?.display_name;
        const joinedAvatar = c.users?.avatar_url;
        const mapped = usersMap[c.user_id];
        const name = joinedName || mapped?.name || 'User';
        const avatarUrl = joinedAvatar ?? mapped?.avatarUrl ?? null;
        return {
          id: c.id,
          todoId: c.todo_id,
          userId: c.user_id,
          authorName: name,
          authorInitial: name.charAt(0).toUpperCase(),
          avatarColor: '#ccc',
          avatarUrl,
          content: c.content,
          createdAt: new Date(c.created_at)
        };
      });
    };

    // 1차: users join 포함
    const { data: d1, error: e1 } = await supabase
      .from('todo_comments')
      .select('id, todo_id, user_id, content, created_at, users ( display_name, avatar_url )')
      .eq('todo_id', todoId)
      .order('created_at', { ascending: true });

    if (!e1 && d1) {
      set((state) => ({ comments: { ...state.comments, [todoId]: mapComments(d1) } }));
      return;
    }

    // 2차: join 없이 재시도 (RLS/FK 문제 대응)
    console.warn('[fetchComments] join failed, retrying without join:', e1?.message);
    const { data: d2, error: e2 } = await supabase
      .from('todo_comments')
      .select('id, todo_id, user_id, content, created_at')
      .eq('todo_id', todoId)
      .order('created_at', { ascending: true });

    if (e2) { console.error('[fetchComments] retry failed:', e2); return; }
    if (d2) set((state) => ({ comments: { ...state.comments, [todoId]: mapComments(d2) } }));
  },

  addComment: async (todoId, content) => {
    const { user } = get();
    if (!user) return;
    
    // Optimistic
    const tempId = Math.random().toString();
    const newComment: TodoComment = {
      id: tempId,
      todoId,
      userId: user.id,
      authorName: user.displayName,
      authorInitial: user.displayName.charAt(0).toUpperCase(),
      avatarColor: '#ccc',
      avatarUrl: user.avatarUrl,
      content,
      createdAt: new Date()
    };
    
    set((state) => ({
      comments: { 
        ...state.comments, 
        [todoId]: [...(state.comments[todoId] || []), newComment] 
      }
    }));
    
    const { error } = await supabase.from('todo_comments').insert({
      todo_id: todoId,
      user_id: user.id,
      content
    });

    if (error) {
      console.error('Error adding comment:', error);
    }
    
    // Notify assignees and creator
    const todo = get().todos.find(t => t.id === todoId);
    if (todo) {
      const recipients = new Set<string>();
      if (todo.userId && todo.userId !== user.id) recipients.add(todo.userId);
      todo.assigneeIds?.forEach(id => {
        if (id !== user.id) recipients.add(id);
      });
      
      recipients.forEach(recipientId => {
        sendAppNotification({
          recipientId,
          type: 'comment',
          title: '새로운 댓글',
          body: `${user.displayName}님이 '${todo.title}'에 댓글을 남겼습니다.`,
          senderId: user.id,
          todoId: todo.id,
        });
      });
    }
  },

  deleteComment: async (todoId, commentId) => {
    set(state => ({
      comments: {
        ...state.comments,
        [todoId]: (state.comments[todoId] || []).filter(c => c.id !== commentId),
      }
    }));
    const { error } = await supabase.from('todo_comments').delete().eq('id', commentId);
    if (error) {
      console.error('Error deleting comment:', error);
      get().fetchComments(todoId);
    }
  },

  fetchRecordings: async () => {
    const { user } = get();
    if (!user) return;
    try {
      // 1. 내가 호스트인 녹음
      const { data: ownData, error } = await supabase
        .from('meeting_recordings')
        .select('id, title, mode, duration_sec, summary, transcript, audio_url, created_at, recording_tasks(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recordings:', error);
        return;
      }

      // 2. 내가 참가자로 참여한 녹음 (공유됨)
      const { data: partData } = await supabase
        .from('recording_participants')
        .select('recording_id')
        .eq('user_id', user.id);

      let sharedRecordings: MeetingRecording[] = [];
      if (partData && partData.length > 0) {
        const sharedIds = partData.map((p: any) => p.recording_id);
        const ownIds = (ownData ?? []).map((r: any) => r.id);
        const newSharedIds = sharedIds.filter((id: string) => !ownIds.includes(id));

        if (newSharedIds.length > 0) {
          const { data: sharedData } = await supabase
            .from('meeting_recordings')
            .select('id, title, mode, duration_sec, summary, transcript, audio_url, created_at, recording_tasks(count)')
            .in('id', newSharedIds)
            .order('created_at', { ascending: false });

          if (sharedData) {
            sharedRecordings = sharedData.map((r: any) => ({
              id: r.id,
              title: r.title,
              mode: r.mode,
              durationSec: r.duration_sec,
              summary: r.summary,
              transcript: r.transcript,
              audio_url: r.audio_url,
              createdAt: new Date(r.created_at),
              taskCount: r.recording_tasks?.[0]?.count ?? 0,
              isShared: true,
            }));
          }
        }
      }

      const ownMapped: MeetingRecording[] = (ownData ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        mode: r.mode,
        durationSec: r.duration_sec,
        summary: r.summary,
        transcript: r.transcript,
        audio_url: r.audio_url,
        createdAt: new Date(r.created_at),
        taskCount: r.recording_tasks?.[0]?.count ?? 0,
        isShared: false,
      }));

      // 날짜 내림차순 정렬
      const all = [...ownMapped, ...sharedRecordings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      set({ recordings: all });
    } catch (e) {
      console.error('Failed to load recordings', e);
    }
  },

  createFolder: async (name) => {
    const { user } = get();
    if (!user) return;
    
    const newFolder = {
      owner_id: user.id,
      name,
      color: '#f26353' // default color
    };
    
    await supabase.from('folders').insert(newFolder);
    // Realtime will fetch it
  },

  deleteFolder: async (folderId) => {
    const { currentView } = get();
    if (currentView === folderId) {
      set({ currentView: 'inbox' });
    }
    
    // Optimistic delete
    set(state => ({ folders: state.folders.filter(f => f.id !== folderId) }));
    await supabase.from('folders').delete().eq('id', folderId);
  },

  updateFolder: async (folderId, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.workspaceType !== undefined) dbUpdates.workspace_type = updates.workspaceType;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    // Optimistic update
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId ? { ...f, ...updates } : f
      ),
    }));
    await supabase.from('folders').update(dbUpdates).eq('id', folderId);
  },

  deleteRecordings: async (ids) => {
    set((state) => ({
      recordings: state.recordings.filter(r => !ids.includes(r.id)),
      selectedRecordingIds: [],
      selectedRecordingId: ids.includes(state.selectedRecordingId || '') ? null : state.selectedRecordingId
    }));
    const user = get().user;
    if (user) {
      await supabase.from('meeting_recordings').delete().in('id', ids);
    }
  },

  markNotificationRead: async (id: string) => {
    const { user } = get();
    if (!user) return;
    
    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      )
    }));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  },

  clearCommentBadge: (todoId: string) => {
    set(state => ({
      unreadCommentCounts: { ...state.unreadCommentCounts, [todoId]: 0 }
    }));
  },

  markAllNotificationsRead: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true }))
    }));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  },

  updateUserProfile: async (patch) => {
    const { user } = get();
    if (!user) return;
    
    // Optimistic UI update
    set({
      user: {
        ...user,
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.statusMessage !== undefined ? { statusMessage: patch.statusMessage } : {}),
        ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
        ...(patch.username !== undefined ? { username: patch.username } : {}),
        ...(patch.birthday !== undefined ? { birthday: patch.birthday } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      }
    });

    const updateData: any = {};
    if (patch.displayName !== undefined) updateData.display_name = patch.displayName;
    if (patch.statusMessage !== undefined) updateData.status_message = patch.statusMessage;
    if (patch.avatarUrl !== undefined) updateData.avatar_url = patch.avatarUrl;
    if (patch.username !== undefined) updateData.username = patch.username;
    if (patch.birthday !== undefined) updateData.birthday = patch.birthday || null;
    if (patch.phone !== undefined) updateData.phone = patch.phone || null;

    if (Object.keys(updateData).length > 0) {
      await supabase.from('users').update(updateData).eq('id', user.id);
    }
  },

  uploadAvatar: async (file: File) => {
    const { user } = get();
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  },

  deleteAccount: async () => {
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw new Error(error.message);
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again later.');
    }
  },

  setupRealtime: (userId) => {
    if (get().realtimeSetupUserId === userId) return;
    
    supabase.removeAllChannels();
    set({ realtimeSetupUserId: userId });

    // Subscribe to todos
    supabase.channel('public:todos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          const t = payload.new as any;
          const newTodo: Todo = {
            id: t.id, userId: t.user_id, title: t.title, memo: t.memo, source: t.source,
            sourceExcerpt: t.source_excerpt, dueDate: t.due_date ? new Date(t.due_date) : null,
            dueTime: t.due_time, hasReminder: t.has_reminder, priority: t.priority,
            folderId: t.folder_id, assigneeIds: t.assignee_ids || [], viewerIds: t.viewer_ids || [],
            tags: t.tags || [], isCompleted: t.is_completed, completedAt: t.completed_at ? new Date(t.completed_at) : null,
            aiConfidenceLow: t.ai_confidence_low, aiDeckPending: t.ai_deck_pending, aiDeckDismissedAt: t.ai_deck_dismissed_at,
            top3Rank: (t.top3_rank as 1|2|3|null) ?? null,
            timeBlockSlot: (t.time_block_slot as 1|2|3|4|null) ?? null,
            estimatedMinutes: t.estimated_minutes ?? null,
            sortOrder: t.sort_order ?? null,
            todoRole: t.todo_role ?? null,
            approvalStatus: t.approval_status ?? null,
            delegateStatus: t.delegate_status ?? null,
            createdAt: new Date(t.created_at), updatedAt: new Date(t.updated_at)
          };
          set(state => ({ todos: [newTodo, ...state.todos.filter(x => x.id !== t.id)] }));
        } else if (payload.eventType === 'UPDATE') {
          const t = payload.new as any;
          set(state => ({
            todos: state.todos.map(todo => todo.id === t.id ? {
              ...todo, ...t,
              isCompleted: t.is_completed,
              folderId: t.folder_id,
              priority: t.priority,
              dueDate: t.due_date ? new Date(t.due_date) : null,
              dueTime: t.due_time,
              hasReminder: t.has_reminder,
              assigneeIds: t.assignee_ids || [],
              viewerIds: t.viewer_ids || [],
              tags: t.tags || [],
              completedAt: t.completed_at ? new Date(t.completed_at) : null,
              aiConfidenceLow: t.ai_confidence_low,
              aiDeckPending: t.ai_deck_pending,
              aiDeckDismissedAt: t.ai_deck_dismissed_at,
              sourceExcerpt: t.source_excerpt,
              top3Rank: (t.top3_rank as 1|2|3|null) ?? null,
              timeBlockSlot: (t.time_block_slot as 1|2|3|4|null) ?? null,
              estimatedMinutes: t.estimated_minutes ?? null,
              sortOrder: t.sort_order ?? null,
              todoRole: t.todo_role ?? null,
              approvalStatus: t.approval_status ?? null,
              delegateStatus: t.delegate_status ?? null,
              updatedAt: new Date(t.updated_at),
            } : todo)
          }));
        } else if (payload.eventType === 'DELETE') {
          set(state => ({ todos: state.todos.filter(todo => todo.id !== payload.old.id) }));
        }
      })
      .subscribe();
      
    // Subscribe to folders
    supabase.channel('public:folders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `owner_id=eq.${userId}` }, payload => {
        get().loadData(); // Simplest way to refresh folders
      })
      .subscribe();
      
    // Subscribe to todo_comments — track unread counts for todos I'm not currently viewing
    supabase.channel('public:todo_comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'todo_comments' }, payload => {
        const c = payload.new as any;
        // Ignore comments from myself
        if (c.user_id === userId) return;
        const currentTodoId = get().selectedTodoId;
        // If the todo is currently open, don't badge it (already reading)
        if (c.todo_id === currentTodoId) return;
        // Only badge if this todo belongs to me or I'm assignee/viewer
        const myTodo = get().todos.find(t => t.id === c.todo_id);
        if (!myTodo) return;
        const isMine = myTodo.userId === userId;
        const isAssignee = (myTodo.assigneeIds || []).includes(userId);
        const isViewer = (myTodo.viewerIds || []).includes(userId);
        if (!isMine && !isAssignee && !isViewer) return;
        set(state => ({
          unreadCommentCounts: {
            ...state.unreadCommentCounts,
            [c.todo_id]: (state.unreadCommentCounts[c.todo_id] ?? 0) + 1
          }
        }));
      })
      .subscribe();

    // Removed global comments subscription to handle it dynamically per-todo
      
    // Subscribe to notifications
    supabase.channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new as any;
          const newNotif: AppNotification = {
            id: n.id,
            title: n.title,
            body: n.body ?? n.message ?? '',
            type: n.type,
            isRead: n.is_read,
            todoId: n.todo_id,
            folderId: n.folder_id,
            meetingId: n.meeting_id,
            senderId: n.sender_id,
            createdAt: new Date(n.created_at),
            meta: n.meta ?? { actionUrl: n.action_url },
          };
          set(state => ({
            notifications: [newNotif, ...state.notifications]
          }));

          // ── Shake detection ────────────────────────────────────
          const isShake = n.type === 'shake'
            || (typeof n.body === 'string' && n.body.includes('[SHAKE]'))
            || (n.type === 'dm' && typeof n.body === 'string' && n.body.includes('[SHAKE:'));
          if (isShake) {
            const todoId = n.todo_id ?? n.meta?.todoId ?? null;
            window.dispatchEvent(new CustomEvent('denlog:shake', { detail: { todoId } }));
          }
        } else if (payload.eventType === 'UPDATE') {
          const n = payload.new as any;
          set(state => ({
            notifications: state.notifications.map(notif => notif.id === n.id ? { ...notif, isRead: n.is_read } : notif)
          }));
        }
      })
      .subscribe();
  },

  loadData: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not logged in: Clear state
        set({
          user: null,
          todos: [],
          folders: [],
          notifications: [],
          isLoading: false,
          isInitialLoadCompleted: true
        });
        return;
      }
      
      const userId = session.user.id;
      
      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profile) {
        set({ user: {
          id: profile.id,
          email: profile.email,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          statusMessage: profile.status_message,
          username: profile.username,
          birthday: profile.birthday,
          phone: profile.phone,
          isPro: profile.is_pro || false,
          isTrialing: profile.is_trialing || false,
        } as UserProfile });

        // ── 설정값 동기화: auth.user_metadata → 앱 상태 (앱과 동일한 소스) ──
        const meta = session.user.user_metadata ?? {};
        if (meta.preferred_language === 'ko' || meta.preferred_language === 'en') {
          set({ language: meta.preferred_language });
        } else if (profile?.language) {
          // fallback: users 테이블
          set({ language: profile.language as 'ko' | 'en' });
        }
        if (profile?.accent_color) set({ accentColor: profile.accent_color });
        if (profile?.ai_sensitivity) set({ aiSensitivity: profile.ai_sensitivity as 'low' | 'medium' | 'high' });

        // ── reminder_settings 복원 ──
        if (profile?.reminder_settings) {
          const rs = profile.reminder_settings as any;
          if (rs.reminders) set((state) => ({ reminders: { ...state.reminders, ...rs.reminders } }));
          if (rs.notificationSettings) set((state) => ({ notificationSettings: { ...state.notificationSettings, ...rs.notificationSettings } }));
          if (rs.startWeek === 'monday' || rs.startWeek === 'sunday') set({ startWeek: rs.startWeek });
        }
      }

      // Fetch friends for usersMap (both sent and received)
      const { data: sentFriends } = await supabase
        .from('friends')
        .select('friend_id, friend_profile:users!friend_id(id, display_name, avatar_url)')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      const { data: receivedFriends } = await supabase
        .from('friends')
        .select('user_id, friend_profile:users!user_id(id, display_name, avatar_url)')
        .eq('friend_id', userId)
        .eq('status', 'accepted');
        
      const newUsersMap: Record<string, { id: string; name: string; avatarUrl: string | null }> = {};
      
      if (sentFriends) {
        sentFriends.forEach((f: any) => {
          if (f.friend_profile) {
            newUsersMap[f.friend_id] = {
              id: f.friend_profile.id,
              name: f.friend_profile.display_name || 'Friend',
              avatarUrl: f.friend_profile.avatar_url,
            };
          }
        });
      }
      
      if (receivedFriends) {
        receivedFriends.forEach((f: any) => {
          if (f.friend_profile) {
            newUsersMap[f.user_id] = {
              id: f.friend_profile.id,
              name: f.friend_profile.display_name || 'Friend',
              avatarUrl: f.friend_profile.avatar_url,
            };
          }
        });
      }
      
      // Also ensure current user is added
      if (profile && !newUsersMap[userId]) {
        newUsersMap[userId] = {
          id: userId,
          name: profile.display_name || 'Me',
          avatarUrl: profile.avatar_url,
        };
      }
      set({ usersMap: newUsersMap });

      // Fetch todos — 모바일 앱 DM_FILTER 동일 적용: 🔒[PORTAL_DM 시스템 항목 제외
      const DM_FILTER = '🔒[PORTAL_DM%';
      let { data: todos, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .or(`user_id.eq.${userId},assignee_ids.cs.{"${userId}"}`)
        .not('title', 'ilike', DM_FILTER)
        .order('created_at', { ascending: false });
        
      if (todosError) {
        console.error('Todos fetch error, using fallback:', todosError);
        const { data: allTodos } = await supabase
          .from('todos')
          .select('*')
          .not('title', 'ilike', DM_FILTER)
          .order('created_at', { ascending: false });
          
        if (allTodos) {
          todos = allTodos.filter(t => t.user_id === userId || (t.assignee_ids && t.assignee_ids.includes(userId)));
        }
      }
        
      if (todos) {
        const mappedTodos: Todo[] = todos
          .filter(t => !t.title.includes('필터를 위해 저장용') && !t.title.includes('필터를위해 저장용') && !t.title.startsWith('🔒[PORTAL_DM'))
          .map(t => ({
          id: t.id,
          userId: t.user_id,
          title: t.title,
          memo: t.memo,
          source: t.source,
          sourceExcerpt: t.source_excerpt,
          dueDate: t.due_date ? new Date(t.due_date) : null,
          dueTime: t.due_time,
          hasReminder: t.has_reminder,
          priority: t.priority,
          folderId: t.folder_id,
          assigneeIds: t.assignee_ids || (t.assignee_id ? [t.assignee_id] : []),
          viewerIds: t.viewer_ids || [],
          tags: t.tags || [],
          attachments: t.attachments || [],
          isCompleted: t.is_completed || false,
          completedAt: t.completed_at ? new Date(t.completed_at) : null,
          aiConfidenceLow: t.ai_confidence_low,
          aiDeckPending: t.ai_deck_pending,
          aiDeckDismissedAt: t.ai_deck_dismissed_at,
          // ── Time Block / Top3 필드 (모바일 앱과 동일 DB) ─────────────────────
          top3Rank: (t.top3_rank as 1|2|3|null) ?? null,
          timeBlockSlot: (t.time_block_slot as 1|2|3|4|null) ?? null,
          estimatedMinutes: t.estimated_minutes ?? null,
          sortOrder: t.sort_order ?? null,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
        }));
        set({ todos: mappedTodos });
      }

      // Fetch folders
      const { data: folders, error: folderError } = await supabase
        .from('folders')
        .select('*');
        
      if (folderError) {
        console.error('Error fetching folders:', folderError);
      }
      
      if (folders) {
        const mappedFolders: Folder[] = await Promise.all(folders.map(async f => {
          // Fetch members using RPC to bypass RLS
          const { data: members } = await supabase.rpc('get_folder_members', { p_folder_id: f.id });
          
          return {
            id: f.id,
            ownerId: f.owner_id,
            name: f.name,
            color: f.color,
            collaborators: (members || []).map((m: any) => {
              const fallbackUser = newUsersMap[m.user_id];
              const name = m.display_name || fallbackUser?.name || '사용자';
              return {
                id: m.user_id,
                displayName: name,
                initial: name[0],
                avatarUrl: m.avatar_url || fallbackUser?.avatarUrl,
                role: m.role,
              };
            }),
            todoCount: get().todos.filter(t => t.folderId === f.id && !t.isCompleted).length,
            createdAt: new Date(f.created_at),
            // ── Project Workspace 확장 필드 (모바일앱 동일 DB 컬럼) ──────────────────
            workspaceType: (f.workspace_type ?? 'personal') as 'personal' | 'project',
            description: f.description ?? null,
            clientEmail: f.client_email ?? null,
            inviteToken: f.invite_token ?? null,
          };
        }));
        set({ folders: mappedFolders });
      }

      // Fetch notifications
      const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!notifError && notifs) {
        const mappedNotifs: AppNotification[] = notifs.map(n => ({
          id: n.id,
          title: n.title,
          body: n.body ?? n.message ?? '',
          type: n.type,
          isRead: n.is_read,
          todoId: n.todo_id,
          folderId: n.folder_id,
          meetingId: n.meeting_id,
          senderId: n.sender_id,
          createdAt: new Date(n.created_at),
          meta: n.meta ?? { actionUrl: n.action_url },
        }));
        set({ notifications: mappedNotifs });
      }

      // Fetch recordings
      await get().fetchRecordings();

      // Initialize realtime subscriptions
      get().setupRealtime(userId);

    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      set({ isLoading: false, isInitialLoadCompleted: true });
    }
  }
}));
