"use client";
import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { X, Share2, Trash2, Calendar, Folder, Tag as TagIcon, User, Send, CheckCircle2, PlayCircle, Wand2, Paperclip, Eye, Clock, Bell, Briefcase, UserCheck, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '@/lib/i18n';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '../lib/supabase';

export function TodoDetail() {
  const { user, todos, folders, selectedTodoId, setSelectedTodo, updateTodo, comments, fetchComments, addComment, deleteComment, setViewingDeckTodo, usersMap, deleteTodos } = useStore();
  const { t } = useTranslation();
  const [commentText, setCommentText] = React.useState('');
  const [localMemo, setLocalMemo] = React.useState('');
  const [tagInput, setTagInput] = React.useState('');
  const [assigneeSearch, setAssigneeSearch] = React.useState('');
  const [viewerSearch, setViewerSearch] = React.useState('');
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = React.useState(0);
  // ── 인라인 제목 편집 ──
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [localTitle, setLocalTitle] = React.useState('');
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  // ── 커스텀 토스트 ──
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  // ── 삭제 확인 ──
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  // ── 첨부파일 업로드 ──
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // ── 고급 설정 접기/펼치기 ──
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !todo) return;
    const uploaded = await Promise.all(files.map(async (file) => {
      const ext = file.name.split('.').pop();
      const path = `attachments/${todo.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('attachments').upload(path, file, { upsert: true });
      if (error) return null;
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      return { name: file.name, url: urlData.publicUrl, type: file.type };
    }));
    const valid = uploaded.filter(Boolean) as { name: string; url: string; type: string }[];
    if (valid.length > 0) {
      const existing = todo.attachments || [];
      updateTodo(todo.id, { attachments: [...existing, ...valid] });
      showToast(`📎 ${valid.length}개 파일 쳊부됨`);
    }
    e.target.value = '';
  };
  const commentInputRef = React.useRef<HTMLInputElement>(null);
  const memoRef = React.useRef<HTMLTextAreaElement>(null);
  
  const todo = todos.find(t => t.id === selectedTodoId);

  const renderComment = (
    id: string,
    authorId: string,
    authorName: string,
    authorInitial: string,
    avatarUrl: string | undefined,
    createdAt: Date | null | undefined,
    content: string,
    inDialog = false
  ) => {
    const isMe = user?.id === authorId;
    // Render @mentions highlighted
    const renderContent = (text: string) => {
      const parts = text.split(/(@\S+)/g);
      return parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className={cn("font-bold", isMe ? "text-primary-foreground" : "text-primary")}>{part}</span>
        ) : part
      );
    };
    return (
      <div key={inDialog ? id + '-dialog' : id} className={cn("group flex gap-3 animate-in fade-in slide-in-from-bottom-2", isMe ? "flex-row-reverse" : "flex-row")}>
        <Avatar className="h-7 w-7 shadow-sm shrink-0">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className={cn(isMe ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
            {authorInitial}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "relative flex flex-col gap-1 w-fit max-w-[85%] p-3 rounded-2xl",
          isMe 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted/50 border border-border/30 rounded-tl-sm"
        )}>
          <div className={cn("flex items-center gap-2", isMe ? "justify-end flex-row-reverse" : "justify-start")}>
            <span className={cn("text-xs font-bold", isMe ? "text-primary-foreground/90" : "text-foreground")}>{isMe ? "You" : authorName}</span>
            <span className={cn("text-[10px] font-medium", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {createdAt ? format(new Date(createdAt), 'MMM d, h:mm a') : 'Just now'}
            </span>
          </div>
          <p className={cn("text-[13px] leading-snug whitespace-pre-wrap break-words", isMe ? "text-primary-foreground" : "text-foreground")}>
            {renderContent(content)}
          </p>
          {/* Delete button — only for own comments, hover */}
          {isMe && todo && (
            <button
              onClick={() => deleteComment(todo.id, id)}
              className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-full p-0.5 text-muted-foreground hover:text-destructive shadow-sm"
              title="Delete comment"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    if (todo) {
      fetchComments(todo.id);
      setLocalMemo(todo.memo || '');
    }
    setCommentText('');
    setTagInput('');
  }, [selectedTodoId, todo?.id, todo?.memo]);

  React.useEffect(() => {
    if (todo) {
      const channel = supabase
        .channel(`web_comments_${todo.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'todo_comments', 
            filter: `todo_id=eq.${todo.id}` 
          }, 
          () => {
            fetchComments(todo.id);
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [todo?.id, fetchComments]);

  React.useEffect(() => {
    if (memoRef.current) {
      memoRef.current.style.height = 'auto';
      memoRef.current.style.height = `${memoRef.current.scrollHeight}px`;
    }
  }, [localMemo]);

  if (!todo) {
    // selectedTodoId가 있는데 todos에 없음 → 삭제된 할일
    if (selectedTodoId) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--destructive, #EF4444)18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 className="w-7 h-7" style={{ color: 'var(--destructive, #EF4444)', opacity: 0.7 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p className="text-foreground" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
              {t('todoDetail.deletedTitle') ?? '이 할일은 삭제되었습니다'}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              {t('todoDetail.deletedDesc') ?? '연결된 할일을 찾을 수 없어요.\n이미 삭제되었거나 접근 권한이 없습니다.'}
            </p>
          </div>
          <button
            onClick={() => setSelectedTodo(null)}
            className="text-primary hover:text-primary/80"
            style={{ fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          >
            {t('todoDetail.close') ?? '닫기'}
          </button>
        </div>
      );
    }
    // selectedTodoId 없음 → 아무것도 선택 안 됨
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
        <CheckCircle2 className="w-12 h-12 mb-4 text-muted-foreground/30" />
        <p>Select a task to view details</p>
      </div>
    );
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = commentText.trim();
    if (!textToSubmit) return;
    setCommentText('');
    setMentionQuery(null);
    try {
      await addComment(todo.id, textToSubmit);
    } catch (err) {
      setCommentText(textToSubmit);
    }
  };

  // @멘션 처리
  const handleCommentChange = (val: string) => {
    setCommentText(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setMentionQuery('');
      setMentionAnchor(lastAt);
    } else if (lastAt !== -1 && val.slice(lastAt + 1).match(/^\S*$/)) {
      setMentionQuery(val.slice(lastAt + 1));
      setMentionAnchor(lastAt);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (username: string) => {
    const before = commentText.slice(0, mentionAnchor);
    const after  = commentText.slice(mentionAnchor + 1 + (mentionQuery?.length ?? 0));
    setCommentText(`${before}@${username} ${after}`);
    setMentionQuery(null);
    commentInputRef.current?.focus();
  };

  // 브라우저 알림 (Reminder)
  const handleReminderChange = async (checked: boolean) => {
    updateTodo(todo.id, { hasReminder: checked });
    if (checked && todo.dueDate && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const dueMs = new Date(todo.dueDate).getTime();
        const now   = Date.now();
        const delay = dueMs - now - 30 * 60 * 1000; // 30분 전
        if (delay > 0) {
          setTimeout(() => {
            new Notification(`⏰ ${todo.title}`, {
              body: `마감 30분 전입니다.`,
              icon: '/favicon.ico',
            });
          }, delay);
        }
      }
    }
  };

  const handleMemoBlur = () => {
    if (localMemo !== (todo.memo || '')) {
      updateTodo(todo.id, { memo: localMemo });
    }
  };

  const cyclePriority = () => {
    const priorities = [null, 'low', 'medium', 'high'] as const;
    const currentIndex = priorities.indexOf(todo.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    updateTodo(todo.id, { priority: priorities[nextIndex] });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTodo(todo.id, { dueDate: e.target.value ? new Date(e.target.value) : null });
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateTodo(todo.id, { folderId: e.target.value === 'none' ? null : e.target.value });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = todo.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        updateTodo(todo.id, { tags: [...currentTags, tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const currentComments = todo ? (comments[todo.id] || []) : [];

  return (
    <div className="h-full flex flex-col bg-background shadow-xl border-l border-border/30">
      {/* ── 커스텀 토스트 ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 bg-foreground text-background rounded-2xl shadow-2xl px-5 py-3 text-sm font-semibold">
            <span>{toast}</span>
          </div>
        </div>
      )}
      {/* ── 삭제 확인 모달 ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 w-80 animate-in zoom-in-95 duration-200">
            <h3 className="text-[16px] font-bold text-foreground mb-1">{t('action.delete')} 할일</h3>
            <p className="text-[13px] text-muted-foreground mb-5">"이 할일을 삭제할까요? 이 작업은 되돌릴 수 없습니다."</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-[13px] font-semibold rounded-lg border border-border hover:bg-muted transition-colors">
                취소
              </button>
              <button
                onClick={async () => {
                  setConfirmDelete(false);
                  await deleteTodos([todo.id]);
                  setSelectedTodo(null);
                }}
                className="px-4 py-2 text-[13px] font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t('action.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="h-14 flex items-center justify-between px-6 shrink-0 bg-transparent z-10 border-b border-border/20">
        <div className="flex items-center gap-2 text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors" onClick={() => setSelectedTodo(null)}>
          <X className="w-4 h-4 stroke-[2]" />
          <span className="text-[12px] font-semibold tracking-wide">{t('detail.taskDetails') || 'Task Details'}</span>
        </div>
        <div className="flex gap-3 text-muted-foreground/60">
          <button
            title="링크 복사"
            onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('🔗 링크가 클립보드에 복사되었습니다'); }}
            className="hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
          >
            <Share2 className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            title="할일 삭제"
            onClick={() => setConfirmDelete(true)}
            className="hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </header>
      
      <div className="flex-1 px-6 py-6 overflow-y-auto min-h-0">
        <div className="space-y-6">
          
          {/* Title Area */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <Select value={todo.priority || 'none'} onValueChange={val => updateTodo(todo.id, { priority: val === 'none' ? null : val as any })}>
                <SelectTrigger className={cn("h-6 w-auto px-2.5 py-0 border-0 focus:ring-0 shadow-none text-[10px] font-bold uppercase tracking-wider rounded-full",
                  todo.priority === 'high' ? "bg-primary/10 text-primary" : 
                  todo.priority === 'medium' ? "bg-yellow-500/10 text-yellow-600" :
                  todo.priority === 'low' ? "bg-blue-500/10 text-blue-600" :
                  "bg-muted/50 text-muted-foreground"
                )}>
                  <SelectValue placeholder="PRIORITY" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg shadow-black/5 border-border/30">
                  <SelectItem value="none" className="text-[11px] font-bold cursor-pointer">PRIORITY</SelectItem>
                  <SelectItem value="high" className="text-[11px] font-bold text-primary cursor-pointer">HIGH</SelectItem>
                  <SelectItem value="medium" className="text-[11px] font-bold text-yellow-600 cursor-pointer">MEDIUM</SelectItem>
                  <SelectItem value="low" className="text-[11px] font-bold text-blue-600 cursor-pointer">LOW</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 인라인 편집 가능한 제목 */}
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={localTitle}
                onChange={e => setLocalTitle(e.target.value)}
                onBlur={() => {
                  if (localTitle.trim() && localTitle.trim() !== todo.title) {
                    updateTodo(todo.id, { title: localTitle.trim() });
                  }
                  setEditingTitle(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.currentTarget.blur(); }
                  if (e.key === 'Escape') { setLocalTitle(todo.title); setEditingTitle(false); }
                }}
                className={cn(
                  "w-full text-[28px] font-extrabold tracking-tight leading-tight mb-6",
                  "bg-transparent border-0 border-b-2 border-primary outline-none px-0 py-0",
                  todo.isCompleted && "line-through text-muted-foreground/60"
                )}
                autoFocus
              />
            ) : (
              <h2
                onClick={() => { setLocalTitle(todo.title); setEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 0); }}
                title="클릭하여 편집"
                className={cn(
                  "text-[28px] font-extrabold tracking-tight leading-tight mb-6 cursor-text",
                  "hover:bg-muted/30 rounded-lg px-1 -mx-1 transition-colors",
                  todo.isCompleted && "line-through text-muted-foreground/60"
                )}
              >
                {todo.title}
              </h2>
            )}
          </div>

          {/* Properties */}
          <div className="flex flex-col gap-3.5 pb-8 border-b border-border/20 pt-2">
            
            {/* Folder */}
            <div className="flex items-center min-h-[28px] group">
              <div className="w-[120px] shrink-0 flex items-center gap-2 text-muted-foreground/70 text-[12px] font-medium">
                <Folder className="w-3.5 h-3.5" /> Folder
              </div>
              <div className="flex-1">
                {(() => {
                  const currentFolder = folders.find(f => f.id === todo.folderId);
                  const displayName = currentFolder?.name ?? (todo.folderId ? '...' : null);
                  return (
                    <Select value={todo.folderId || 'none'} onValueChange={val => updateTodo(todo.id, { folderId: val === 'none' ? null : val })}>
                      <SelectTrigger className="h-7 w-auto px-2 -ml-2 bg-transparent border-0 focus:ring-0 shadow-none text-[13px] font-medium text-foreground hover:bg-muted/50 rounded-md transition-colors flex items-center gap-2">
                        <span className={displayName ? 'text-foreground' : 'text-muted-foreground/50'}>
                          {displayName ?? t('detail.empty')}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-lg shadow-black/5 border-border/30">
                        <SelectItem value="none" className="text-[13px] cursor-pointer">No Folder</SelectItem>
                        {folders.map(f => (
                          <SelectItem key={f.id} value={f.id} className="text-[13px] cursor-pointer">
                            <span className="flex items-center gap-2">
                              {f.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />}
                              {f.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center min-h-[28px] group">
              <div className="w-[120px] shrink-0 flex items-center gap-2 text-muted-foreground/70 text-[12px] font-medium">
                <Calendar className="w-3.5 h-3.5" /> Due Date
              </div>
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger className="h-7 px-2 -ml-2 bg-transparent hover:bg-muted/50 rounded-md transition-colors text-[13px] font-medium text-foreground flex items-center gap-1.5 focus:outline-none">
                    {todo.dueDate ? format(todo.dueDate, 'MMM d, yyyy') : <span className="text-muted-foreground/50">Empty</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-lg shadow-black/5 border-border/30" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={todo.dueDate || undefined}
                      onSelect={(date) => updateTodo(todo.id, { dueDate: date })}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Due Time */}
            <div className="flex items-center min-h-[28px] group">
              <div className="w-[120px] shrink-0 flex items-center gap-2 text-muted-foreground/70 text-[12px] font-medium">
                <Clock className="w-3.5 h-3.5" /> Time
              </div>
              <div className="flex-1">
                <input
                  type="time"
                  value={todo.dueTime || ''}
                  onChange={e => updateTodo(todo.id, { dueTime: e.target.value || null })}
                  className="bg-transparent border-0 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors p-0 focus:ring-0 rounded-md px-2 py-0.5 -ml-2 outline-none h-7 flex items-center"
                />
              </div>
            </div>

            {/* Reminder */}
            <div className="flex items-center min-h-[28px] group">
              <div className="w-[120px] shrink-0 flex items-center gap-2 text-muted-foreground/70 text-[12px] font-medium">
                <Bell className="w-3.5 h-3.5" /> Reminder
              </div>
              <div className="flex-1 flex items-center h-7 px-2 -ml-2">
                <label className="flex items-center gap-2 cursor-pointer group/label">
                  <input
                    type="checkbox"
                    checked={!!todo.hasReminder}
                    onChange={e => handleReminderChange(e.target.checked)}
                    className="rounded-sm border-muted-foreground/30 text-primary focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                  />
                  <span className="text-[13px] font-medium text-muted-foreground group-hover/label:text-foreground transition-colors">
                    {todo.hasReminder ? 'On' : 'Off'}
                  </span>
                </label>
              </div>
            </div>
            {/* ── 고급 설정 (Role, Assignee, Viewers) ─ 접글 수 있음 ── */}
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors pt-1"
            >
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
              {showAdvanced ? '고급 설정 접기' : '고급 설정 (Role, Assignee, Viewers)'}
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-3.5 border-t border-border/10 pt-3">

                {/* Todo Role */}
                <div className="flex items-center min-h-[28px] group">
                  <div className="w-[120px] shrink-0 flex items-center gap-2 text-muted-foreground/70 text-[12px] font-medium">
                    <UserCheck className="w-3.5 h-3.5" /> Role
                  </div>
                  <div className="flex-1">
                    <Select
                      value={(todo as any).todoRole || 'own'}
                      onValueChange={val => updateTodo(todo.id, { ...(todo as any), todoRole: val })}
                    >
                      <SelectTrigger className="h-7 w-auto px-2 -ml-2 bg-transparent border-0 focus:ring-0 shadow-none text-[13px] font-medium text-foreground hover:bg-muted/50 rounded-md transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-lg shadow-black/5 border-border/30">
                        <SelectItem value="own" className="text-[13px] cursor-pointer">My Task</SelectItem>
                        <SelectItem value="client_request" className="text-[13px] cursor-pointer">Client Request</SelectItem>
                        <SelectItem value="delegated" className="text-[13px] cursor-pointer">Delegated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assignee */}
                <div className="flex items-center min-h-[28px] group">
                  <div className="w-[120px] shrink-0 flex items-center gap-2 text-muted-foreground/70 text-[12px] font-medium">
                    <User className="w-3.5 h-3.5" /> Assignee
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 flex-wrap px-1 -ml-1">
                {(todo.assigneeIds || []).map(id => {
                  const user = usersMap[id];
                  const initial = user?.name ? user.name[0] : id.substring(0, 2).toUpperCase();
                  return (
                    <div key={id} className="flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full bg-muted/60 border border-border/40 group/badge">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={user?.avatarUrl || undefined} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{initial}</AvatarFallback>
                      </Avatar>
                      <span className="text-[12px] font-medium text-foreground">{user?.name || 'User'}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateTodo(todo.id, { assigneeIds: todo.assigneeIds?.filter(a => a !== id) }); }}
                        className="opacity-0 group-hover/badge:opacity-100 text-muted-foreground hover:text-foreground transition-opacity ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none flex items-center">
                    <div className="text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium">
                      + Add
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto rounded-xl shadow-lg shadow-black/5 border-border/30">
                    <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                      <Input 
                        placeholder={t('detail.search')} 
                        className="h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1"
                        value={assigneeSearch}
                        onChange={e => setAssigneeSearch(e.target.value)}
                        onKeyDown={e => e.stopPropagation()}
                      />
                    </div>
                    {Object.values(usersMap)
                      .filter(user => user.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                      .map(user => (
                      <DropdownMenuCheckboxItem 
                        key={user.id}
                        checked={todo.assigneeIds?.includes(user.id)}
                        onCheckedChange={(checked) => {
                          const current = todo.assigneeIds || [];
                          const next = checked ? [...current, user.id] : current.filter(id => id !== user.id);
                          updateTodo(todo.id, { assigneeIds: next });
                        }}
                        onSelect={(e) => e.preventDefault()}
                        className="text-[13px] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{user.name[0]}</AvatarFallback>
                          </Avatar>
                          {user.name}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                  </div>
                </div>

                {/* Viewers */}
                <div className="flex items-center min-h-[28px] group">
                  <div className="w-[120px] shrink-0 flex items-center gap-2 text-muted-foreground/70 text-[12px] font-medium">
                    <Eye className="w-3.5 h-3.5" /> Viewers
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 flex-wrap px-1 -ml-1">
                {(todo.viewerIds || []).map(id => {
                  const user = usersMap[id];
                  const initial = user?.name ? user.name[0] : id.substring(0, 2).toUpperCase();
                  return (
                    <div key={id} className="flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full bg-muted/60 border border-border/40 group/badge">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={user?.avatarUrl || undefined} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{initial}</AvatarFallback>
                      </Avatar>
                      <span className="text-[12px] font-medium text-foreground">{user?.name || 'User'}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateTodo(todo.id, { viewerIds: todo.viewerIds?.filter(a => a !== id) }); }}
                        className="opacity-0 group-hover/badge:opacity-100 text-muted-foreground hover:text-foreground transition-opacity ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none flex items-center">
                    <div className="text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium">
                      + Add
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto rounded-xl shadow-lg shadow-black/5 border-border/30">
                    <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                      <Input 
                        placeholder={t('detail.search')} 
                        className="h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1"
                        value={viewerSearch}
                        onChange={e => setViewerSearch(e.target.value)}
                        onKeyDown={e => e.stopPropagation()}
                      />
                    </div>
                    {Object.values(usersMap)
                      .filter(user => user.name.toLowerCase().includes(viewerSearch.toLowerCase()))
                      .map(user => (
                      <DropdownMenuCheckboxItem 
                        key={user.id}
                        checked={todo.viewerIds?.includes(user.id)}
                        onCheckedChange={(checked) => {
                          const current = todo.viewerIds || [];
                          const next = checked ? [...current, user.id] : current.filter(id => id !== user.id);
                          updateTodo(todo.id, { viewerIds: next });
                        }}
                        onSelect={(e) => e.preventDefault()}
                        className="text-[13px] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{user.name[0]}</AvatarFallback>
                          </Avatar>
                          {user.name}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                  </div>
                </div>

              </div>
            )}{/* end showAdvanced */}

            {/* Tags */}
            <div className="flex items-center min-h-[28px] group">
              <div className="w-[120px] shrink-0 flex items-center gap-2 text-muted-foreground/70 text-[12px] font-medium">
                <TagIcon className="w-3.5 h-3.5" /> Tags
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-1.5 px-1 py-1 -ml-1">
                {(todo.tags || []).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded text-foreground text-[11px] font-medium flex items-center gap-1 bg-muted/60 border border-border/40">
                    {tag}
                    <button 
                      onClick={() => updateTodo(todo.id, { tags: todo.tags.filter(t => t !== tag) })}
                      className="text-muted-foreground hover:text-foreground ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={(!todo.tags || todo.tags.length === 0) ? t('detail.empty') : "+ Add tag"}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className={cn("bg-transparent border-0 text-[13px] p-0 focus:ring-0 w-24 outline-none placeholder:transition-colors transition-colors h-7",
                    (!todo.tags || todo.tags.length === 0) ? "placeholder:text-muted-foreground/50 hover:bg-muted/50 rounded-md px-1" : "text-[12px] placeholder:text-muted-foreground/50 ml-1"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2">
            <textarea
              ref={memoRef}
              value={localMemo}
              onChange={e => setLocalMemo(e.target.value)}
              onBlur={handleMemoBlur}
              placeholder={t('detail.addDesc')}
              className="w-full text-[14px] text-foreground bg-transparent border-none p-0 focus:ring-0 resize-none min-h-[100px] outline-none overflow-hidden placeholder:text-muted-foreground/40 leading-relaxed"
            />
          </div>
          {/* Attachments — 업로드 버튼 포함 */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">Attachments</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <Paperclip className="w-3 h-3" /> + 첨부
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
            </div>
            {todo.attachments && todo.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {todo.attachments.map((file, idx) => {
                  const isImage = file.type?.startsWith('image/') || file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                  return isImage ? (
                    <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="block w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-border/50 hover:ring-2 hover:ring-primary/50 transition-all bg-muted/20 shadow-sm">
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    </a>
                  ) : (
                    <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 h-14 bg-muted/40 hover:bg-muted border border-border/50 rounded-lg text-xs transition-colors shadow-sm">
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="max-w-[140px] truncate font-medium">{file.name}</span>
                    </a>
                  );
                })}
              </div>
            )}
            {(!todo.attachments || todo.attachments.length === 0) && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border/40 rounded-lg py-3 text-[12px] text-muted-foreground/60 hover:border-primary/40 hover:text-primary/60 transition-colors"
              >
                + 파일 첨부
              </button>
            )}
          </div>

          {/* ── CLIENT APPROVAL 카드 (todoRole==='client_request'일 때) ──────────── */}
          {todo.todoRole === 'client_request' && (() => {
            const status = todo.approvalStatus;
            const statusColor = status === 'approved' ? '#22C55E'
              : status === 'rejected' ? '#EF4444'
              : status === 'revision_requested' ? '#6366F1'
              : '#F59E0B';
            const statusLabel = status === 'approved' ? '✔️ Approved'
              : status === 'rejected' ? '❌ Rejected'
              : status === 'revision_requested' ? '↩️ Revision Requested'
              : '⏳ Pending Approval';
            const canRequest = !status || status === 'revision_requested';

            return (
              <div className="rounded-xl border p-4 space-y-3" style={{
                borderColor: statusColor + '40',
                background: statusColor + '06'
              }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500">
                    CLIENT APPROVAL
                  </span>
                  {status && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                      style={{ backgroundColor: statusColor + '18', color: statusColor }}>
                      {statusLabel}
                    </span>
                  )}
                </div>
                {canRequest && (
                  <button
                    onClick={async () => {
                      updateTodo(todo.id, { approvalStatus: 'pending' });
                    }}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ backgroundColor: '#F59E0B18', color: '#F59E0B', border: '1px solid #F59E0B40' }}
                  >
                    {status === 'revision_requested' ? 'Re-request Approval' : 'Request Approval'}
                  </button>
                )}
              </div>
            );
          })()}

          {/* ── PARTNER STATUS 카드 (todoRole==='delegated'일 때) ──────────────── */}
          {todo.todoRole === 'delegated' && (
            <div className="rounded-xl border border-violet-500/25 p-4 space-y-3" style={{ background: '#8B5CF608' }}>
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-500">
                PARTNER STATUS
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {(['not_started', 'in_progress', 'blocked', 'completed'] as const).map(status => {
                  const isActive = (todo.delegateStatus ?? 'not_started') === status;
                  const color = status === 'completed' ? '#22C55E'
                    : status === 'blocked' ? '#EF4444'
                    : status === 'in_progress' ? '#0EA5E9'
                    : '#94A3B8';
                  const label = status === 'completed' ? '✔ Done'
                    : status === 'blocked' ? '⛔ Blocked'
                    : status === 'in_progress' ? '🔄 In Progress'
                    : '⏳ Not Started';
                  return (
                    <button
                      key={status}
                      onClick={() => updateTodo(todo.id, { delegateStatus: status })}
                      className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
                      style={{
                        borderWidth: isActive ? 2 : 1,
                        borderStyle: 'solid',
                        borderColor: isActive ? color : '#e2e8f040',
                        backgroundColor: isActive ? color + '18' : 'transparent',
                        color: isActive ? color : '#64748b',
                        fontWeight: isActive ? 700 : 400,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity */}
          <div className="space-y-4 pt-2">
            <Dialog>
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">Activity</h3>
                <DialogTrigger className="text-[12px] font-medium text-primary hover:opacity-80 transition-opacity outline-none cursor-pointer">
                  View all
                </DialogTrigger>
              </div>
              
              <div className="space-y-3 pb-2 flex flex-col">
                {currentComments.map(c => renderComment(
                  c.id, c.userId, c.authorName, c.authorInitial,
                  c.avatarUrl || undefined, c.createdAt, c.content
                ))}
              </div>

              <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                <DialogHeader className="px-4 py-3 border-b bg-muted/20 shrink-0">
                  <DialogTitle>Chat & Activity</DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="flex-1 p-4 flex flex-col bg-muted/5">
                  <div className="space-y-4 max-w-3xl mx-auto w-full pb-4">
                    {currentComments.map(c => renderComment(
                      c.id, c.userId, c.authorName, c.authorInitial,
                      c.avatarUrl || undefined, c.createdAt, c.content, true
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                  <form onSubmit={handleCommentSubmit} className="relative max-w-3xl mx-auto">
                    <Input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder={t('detail.addComment')}
                      className="w-full pr-10 rounded-full h-11 bg-muted/30 border-border/50 focus-visible:ring-primary/20"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-primary/10 rounded-full disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Comment Input */}
      <div className="p-4 bg-background shrink-0 border-t border-border/20 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] relative">
        {/* @멘션 팝업 */}
        {mentionQuery !== null && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-border/40 rounded-xl shadow-lg overflow-hidden z-20">
            <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30">
              Mention a friend
            </div>
            {Object.values(usersMap)
              .filter(u => !mentionQuery || u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
              .slice(0, 6)
              .map(u => (
                <button
                  key={u.id}
                  onMouseDown={e => { e.preventDefault(); insertMention(u.name.replace(/\s+/g, '')); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={u.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{u.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-[13px] font-medium">{u.name}</span>
                </button>
              ))
            }
            {Object.values(usersMap).filter(u => !mentionQuery || u.name.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
              <div className="px-3 py-2 text-[12px] text-muted-foreground">No matches</div>
            )}
          </div>
        )}
        <form className="flex items-center gap-2 relative" onSubmit={handleCommentSubmit}>
          <Input 
            ref={commentInputRef}
            value={commentText}
            onChange={e => handleCommentChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setMentionQuery(null); }}
            placeholder={t('detail.addComment')} 
            className="flex-1 bg-muted/30 border border-border/60 focus-visible:ring-0 focus-visible:border-primary/50 rounded-full h-11 px-5 text-[13px]" 
          />
          <button type="submit" className="absolute right-4 text-primary hover:opacity-80 transition-opacity">
            <Send className="h-4 w-4 stroke-[2]" />
          </button>
        </form>
      </div>
    </div>
  );
}
