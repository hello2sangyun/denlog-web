"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { useTranslation } from '@/lib/i18n';

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuItem } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { X, Calendar as CalendarIcon, Tag, Paperclip, Users, Eye, Bell, Clock, Folder, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CreateTodoDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState<string>('');
  const [hasReminder, setHasReminder] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [viewerIds, setViewerIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [viewerSearch, setViewerSearch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // 드래그 상태
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addTodo, currentView, user, usersMap, folders } = useStore();
  const { t } = useTranslation();

  // 폴더 목록 (특수 뷰 제외)
  const folderList = folders.filter(f => f.id && f.name);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleCustomOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsOpen(true);
      if (detail?.folderId) setSelectedFolderId(detail.folderId);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-create-todo', handleCustomOpen as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-create-todo', handleCustomOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setTitle(''); setMemo(''); setPriority(null);
      setDueDate(undefined); setDueTime(''); setHasReminder(false);
      setTags([]); setAssigneeIds([]); setViewerIds([]);
      setAttachments([]); setIsSubmitting(false); setPos(null);
      // currentView 기반으로 기본 폴더 설정
      const specialViews = ['inbox', 'unfiled', 'today', 'upcoming', 'people', 'meetings', 'cabinet', 'completed', 'all'];
      setSelectedFolderId(specialViews.includes(currentView) ? null : currentView);
    }
  }, [isOpen, currentView]);

  // 드래그 핸들러
  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: rect.left, oy: rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
    };
    const onUp = () => { dragStart.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const todoId = generateUUID();
    let uploadedAttachments: { name: string; url: string; size: number; type: string }[] = [];
    let todoAttachmentsRecords: any[] = [];

    if (attachments.length > 0 && user) {
      for (const file of attachments) {
        const ext = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${ext}`;
        const filePath = `${user.id}/${fileName}`;
        const { error } = await supabase.storage.from('todo-attachments').upload(filePath, file);
        if (!error) {
          todoAttachmentsRecords.push({ todo_id: todoId, user_id: user.id, file_name: file.name, file_type: file.type || 'application/octet-stream', file_size: file.size, storage_path: filePath });
          const { data } = await supabase.storage.from('todo-attachments').createSignedUrl(filePath, 60 * 60 * 24 * 365);
          if (data?.signedUrl) uploadedAttachments.push({ name: file.name, url: data.signedUrl, size: file.size, type: file.type });
        }
      }
    }

    await addTodo({
      id: todoId, title, memo: memo.trim() || undefined,
      isCompleted: false, priority, dueDate, dueTime: dueTime || undefined,
      hasReminder, tags, attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      assigneeIds, viewerIds, createdAt: new Date(), updatedAt: new Date(),
      source: 'manual',
      folderId: selectedFolderId || null,
      userId: user?.id || ''
    } as any);

    if (todoAttachmentsRecords.length > 0) await supabase.from('todo_attachments').insert(todoAttachmentsRecords);

    setTitle(''); setMemo(''); setPriority(null); setDueDate(undefined);
    setDueTime(''); setHasReminder(false); setTags([]); setAssigneeIds([]);
    setViewerIds([]); setAttachments([]); setIsOpen(false); setIsSubmitting(false);
  };

  const selectedFolder = folderList.find(f => f.id === selectedFolderId);

  // 모달 위치 스타일
  const modalStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, transform: 'none', margin: 0 }
    : {};

  const iconBtn = (active: boolean) => cn(
    "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl w-9 h-9 flex items-center justify-center bg-transparent border-0 transition-colors cursor-pointer",
    active && "text-primary bg-primary/10"
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200",
        pos && "pointer-events-none"
      )}
      onClick={() => setIsOpen(false)}
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className="bg-background w-full max-w-2xl rounded-2xl shadow-2xl ring-1 ring-border/20 flex flex-col animate-in zoom-in-95 duration-200 pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 — 드래그 핸들 */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b border-border/30 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onHeaderMouseDown}
        >
          <h2 className="text-[19px] font-bold tracking-tight text-foreground">{t('createTodo.title')}</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full w-8 h-8 text-muted-foreground hover:bg-muted/50">
            <X className="w-[18px] h-[18px] stroke-[2]" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            autoFocus
            placeholder={t('createTodo.placeholder')}
            className="text-[17px] font-medium border-0 px-1 shadow-none focus-visible:ring-0 rounded-none bg-transparent placeholder:text-muted-foreground/60 h-auto"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <textarea
            placeholder={t('createTodo.memo')}
            className="w-full text-[15px] bg-transparent border-0 px-1 py-2 focus:ring-0 resize-none text-muted-foreground placeholder:text-muted-foreground/40 h-32 outline-none leading-relaxed"
            value={memo}
            onChange={e => setMemo(e.target.value)}
          />

          <div className="flex items-center gap-2 px-1 mt-2">
            {/* Priority */}
            <div className="flex items-center gap-1 bg-transparent ring-1 ring-border/40 rounded-xl p-1">
              {(['low', 'medium', 'high'] as const).map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setPriority(priority === p ? null : p)}
                  className={cn(
                    "px-4 py-1.5 text-[11px] font-bold uppercase rounded-lg transition-colors tracking-wide",
                    priority === p ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/40 text-muted-foreground/80"
                  )}
                >{p}</button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {/* Folder 선택 */}
              <DropdownMenu>
                {/* @ts-ignore */}
                <DropdownMenuTrigger className={iconBtn(!!selectedFolderId)} title="폴더 선택">
                  <Folder className="w-4 h-4 stroke-[2]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 max-h-72 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => setSelectedFolderId(null)}
                    className="justify-between text-[13px]"
                  >
                    <span className="text-muted-foreground">폴더 없음</span>
                    {!selectedFolderId && <Check className="w-3.5 h-3.5" />}
                  </DropdownMenuItem>
                  {folderList
                    .sort((a, b) => (a.sortOrder ?? 99999) - (b.sortOrder ?? 99999))
                    .map(f => (
                      <DropdownMenuItem
                        key={f.id}
                        onClick={() => setSelectedFolderId(f.id)}
                        className="justify-between text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-3.5 h-3.5 shrink-0" style={f.color ? { color: f.color } : undefined} />
                          <span className="truncate">{f.name}</span>
                        </div>
                        {selectedFolderId === f.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Due Date */}
              <Popover>
                <PopoverTrigger className={iconBtn(!!dueDate)}>
                  <CalendarIcon className="w-4 h-4 stroke-[2]" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single" selected={dueDate} onSelect={setDueDate}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  />
                  <div className={cn("p-3 border-t bg-muted/20 flex flex-col gap-2", !dueDate && "opacity-50 pointer-events-none")}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="h-8 text-xs flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <label className="text-xs font-medium text-muted-foreground flex-1 cursor-pointer flex items-center justify-between">
                        <span>{t('createTodo.setReminder')}</span>
                        <input type="checkbox" checked={hasReminder} onChange={e => setHasReminder(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary w-3.5 h-3.5" />
                      </label>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Attachments */}
              <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => setAttachments(e.target.files ? Array.from(e.target.files) : [])} />
              <button type="button" className={iconBtn(attachments.length > 0)} onClick={() => fileInputRef.current?.click()} title="첨부파일">
                <Paperclip className="w-4 h-4 stroke-[2]" />
              </button>

              {/* Assignees */}
              <DropdownMenu>
                {/* @ts-ignore */}
                <DropdownMenuTrigger className={iconBtn(assigneeIds.length > 0)} title="담당자">
                  <Users className="w-4 h-4 stroke-[2]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                  <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                    <Input placeholder={t('createTodo.searchFriends')} className="h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1" value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} onKeyDown={e => e.stopPropagation()} />
                  </div>
                  {Object.values(usersMap || {}).filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                    <DropdownMenuCheckboxItem key={u.id} checked={assigneeIds.includes(u.id)} onCheckedChange={c => setAssigneeIds(c ? [...assigneeIds, u.id] : assigneeIds.filter(id => id !== u.id))} onSelect={e => e.preventDefault()}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5"><AvatarImage src={u.avatarUrl || undefined} /><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{u.name[0]}</AvatarFallback></Avatar>
                        {u.name}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Viewers */}
              <DropdownMenu>
                {/* @ts-ignore */}
                <DropdownMenuTrigger className={iconBtn(viewerIds.length > 0)} title="열람자">
                  <Eye className="w-4 h-4 stroke-[2]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                  <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                    <Input placeholder={t('createTodo.searchFriends')} className="h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1" value={viewerSearch} onChange={e => setViewerSearch(e.target.value)} onKeyDown={e => e.stopPropagation()} />
                  </div>
                  {Object.values(usersMap || {}).filter(u => u.name.toLowerCase().includes(viewerSearch.toLowerCase())).map(u => (
                    <DropdownMenuCheckboxItem key={u.id} checked={viewerIds.includes(u.id)} onCheckedChange={c => setViewerIds(c ? [...viewerIds, u.id] : viewerIds.filter(id => id !== u.id))} onSelect={e => e.preventDefault()}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5"><AvatarImage src={u.avatarUrl || undefined} /><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{u.name[0]}</AvatarFallback></Avatar>
                        {u.name}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tags */}
              <Popover>
                <PopoverTrigger className={iconBtn(tags.length > 0)} title="태그">
                  <Tag className="w-[18px] h-[18px] stroke-[2] rotate-[-45deg] scale-x-[-1]" />
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">{t('createTodo.tags')}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md text-xs">
                          {tag}
                          <X className="w-3 h-3 cursor-pointer hover:text-primary" onClick={() => setTags(tags.filter(t => t !== tag))} />
                        </span>
                      ))}
                    </div>
                    <Input
                      placeholder={t('createTodo.addTag')} value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = tagInput.trim();
                          if (val && !tags.includes(val)) setTags([...tags, val]);
                          setTagInput('');
                        }
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* 선택된 폴더 표시 */}
          {selectedFolder && (
            <div className="flex items-center gap-1.5 px-1">
              <Folder className="w-3.5 h-3.5 text-muted-foreground" style={selectedFolder.color ? { color: selectedFolder.color } : undefined} />
              <span className="text-[12px] text-muted-foreground font-medium">{selectedFolder.name}</span>
              <button type="button" onClick={() => setSelectedFolderId(null)} className="text-muted-foreground/50 hover:text-muted-foreground ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex justify-end pt-5 border-t border-border/30 mt-6">
            <Button type="submit" disabled={!title.trim() || isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-7 font-bold h-[42px] text-[14px]">
              {isSubmitting ? t('createTodo.creatingBtn') : t('createTodo.createBtn')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
