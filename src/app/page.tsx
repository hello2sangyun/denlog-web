"use client";
import React from 'react';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { TodoList } from '@/components/TodoList';
import { KanbanBoard } from '@/components/KanbanBoard';
import { UpcomingView } from '@/components/UpcomingView';
import { PeopleView } from '@/components/PeopleView';
import { CabinetView } from '@/components/CabinetView';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { DirectMessagePanel } from '@/components/DirectMessagePanel';
import { TodoDetail } from '@/components/TodoDetail';
import { RecordingDetail } from '@/components/RecordingDetail';
import { CreateTodoDialog } from '@/components/CreateTodoDialog';
import { useTranslation } from '@/lib/i18n';
import { DeckViewer } from '@/components/DeckViewer';
import { SettingsDialog } from '@/components/SettingsDialog';
import { VoiceRecordingOverlay } from '@/components/VoiceRecordingOverlay';
import { LoginOverlay } from '@/components/LoginOverlay';
import { AiReviewBanner } from '@/components/AiReviewBanner';
import EventPopupModal from '@/components/EventPopupModal';
import { TodayBlockView } from '@/components/TodayBlockView';
import { Bell, Search, Settings, LayoutList, KanbanSquare, Mic, Sun, Moon, Menu, X, Folder, ArrowDownUp, Check, FolderKanban, FolderOpen, CheckCheck, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { useTheme } from 'next-themes';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { NotificationPanel } from '@/components/NotificationPanel';
import { isToday } from 'date-fns';

// ── Window width hook ─────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  React.useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function Home() {
  const { user, isLoading, isInitialLoadCompleted, currentView, searchQuery, setSearchQuery, folders, viewMode, setViewMode, todoSort, setTodoSort, loadData, notifications, selectedTodoId, selectedRecordingId, activeChatUser, selectedTodoIds, clearTodoSelection, deleteTodos, completeTodos, updateTodo, markNotificationRead, markAllNotificationsRead, todoMenu, setTodoMenu, todos, reorderTodos, reorderFolders } = useStore();
  const { theme, setTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [dragToast, setDragToast] = React.useState<string | null>(null);
  const [isShaking, setIsShaking] = React.useState(false);
  const [isBlockMode, setIsBlockMode] = React.useState(true);
  const [avatarMenuOpen, setAvatarMenuOpen] = React.useState(false);
  const dragToastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);
  const avatarMenuRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // ── Responsive breakpoints ─────────────────────────────────────────────
  const windowWidth = useWindowWidth();
  const sidebarCollapsed = windowWidth < 960 && windowWidth >= 640; // icon-only
  const sidebarHidden    = windowWidth < 640;                       // hamburger only
  const rightOverlay     = windowWidth < 1100;                      // right panel floats over center

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
    // Today 븷으로 이동 시 Block 모드 자동 전환
    if (currentView === 'today') {
      setIsBlockMode(true);
    }
  }, [currentView]);

  const [rightSidebarWidth, setRightSidebarWidth] = React.useState(540);
  const [leftSidebarWidth, setLeftSidebarWidth] = React.useState(253);
  const [isLeftDragging, setIsLeftDragging] = React.useState(false);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      setRightSidebarWidth(Math.min(Math.max(startWidth + delta, 280), 800));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [rightSidebarWidth]);

  const handleLeftMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;
    setIsLeftDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setLeftSidebarWidth(Math.min(Math.max(startWidth + delta, 180), 400));
    };

    const handleMouseUp = () => {
      setIsLeftDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [leftSidebarWidth]);

  React.useEffect(() => {
    loadData();
    
    // Listen for auth state changes (e.g. when OAuth redirect completes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadData]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    if (isNotifOpen || avatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen, avatarMenuOpen]);

  // ── 키보드 단욵키 ──
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Cmd+N → 할일 생성 (이미 CreateTodoDialog에서 처리 중 — 충돌 방지용)
      if (mod && e.key === 'n') { e.preventDefault(); return; }

      // Cmd+K → 검색 포커스
      if (mod && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      // Escape → 다양한 패널 닫기
      if (e.key === 'Escape') {
        if (todoMenu) { setTodoMenu(null); return; }
        if (avatarMenuOpen) { setAvatarMenuOpen(false); return; }
        if (isNotifOpen) { setIsNotifOpen(false); return; }
        // 선택된 할일 상세 패널 닫기
        const { selectedTodoId, setSelectedTodo } = useStore.getState();
        if (selectedTodoId) { setSelectedTodo(null); return; }
        return;
      }

      // Space → 멀티선택 할일 일괄 완료
      if (e.key === ' ' && selectedTodoIds.length > 0) {
        const target = e.target as HTMLElement;
        const isInput = ['INPUT','TEXTAREA'].includes(target.tagName) || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          completeTodos(selectedTodoIds, true);
          clearTodoSelection();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [todoMenu, avatarMenuOpen, isNotifOpen, selectedTodoIds, completeTodos, clearTodoSelection, setTodoMenu]);

  // ── Shake event listener ──────────────────────────────────────────────────
  React.useEffect(() => {
    const handler = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 800);
    };
    window.addEventListener('denlog:shake', handler);
    return () => window.removeEventListener('denlog:shake', handler);
  }, []);

  const { t } = useTranslation();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getHeaderTitle = () => {
    if (currentView === 'all') return t('nav.allTasks');
    if (currentView === 'unfiled' || currentView === 'inbox') return t('nav.unfiled');
    if (currentView === 'today') return t('nav.today');
    if (currentView === 'upcoming') return t('nav.upcoming');
    if (currentView === 'people') return t('nav.people');
    if (currentView === 'completed') return t('nav.completed');
    if (currentView === 'meetings' || currentView === 'cabinet') return t('nav.cabinet');
    const folder = folders.find(f => f.id === currentView);
    return folder ? folder.name : t('nav.inbox');
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const srcId = source.droppableId;
    const dstId = destination.droppableId;

    // ── 같은 리스트 내 순서 변경 (재정렬) ──
    if (srcId === dstId) {
      if (srcId === 'todolist-container') {
        const { todos: allTodos, currentView } = useStore.getState();

        // TodoList와 동일한 필터 적용
        const visibleTodos = allTodos.filter(t => {
          if (t.isCompleted) return false;
          if ((t as any).aiDeckPending || (t as any).aiDeckDismissedAt) return false;
          if (currentView === 'all') return true;
          if (currentView === 'unfiled' || currentView === 'inbox') {
            return !t.folderId || t.folderId === 'inbox' || t.folderId === 'none';
          }
          if (currentView === 'today') {
            const due = t.dueDate ? new Date(t.dueDate) : null;
            const isDueToday = due ? isToday(due) : false;
            const isOverdue = due ? due < new Date(new Date().setHours(0, 0, 0, 0)) : false;
            return isDueToday || isOverdue;
          }
          if (currentView === 'upcoming') return true;
          return t.folderId === currentView;
        }).sort((a, b) => (a.sortOrder ?? 99999) - (b.sortOrder ?? 99999));

        const visibleIds = visibleTodos.map(t => t.id);
        const newOrder = [...visibleIds];
        const [moved] = newOrder.splice(source.index, 1);
        newOrder.splice(destination.index, 0, moved);
        reorderTodos(newOrder);
      } else if (srcId === 'sidebar-folders') {
        const currentFolders = useStore.getState().folders;
        const folderIds = currentFolders
          .sort((a, b) => (a.sortOrder ?? 99999) - (b.sortOrder ?? 99999))
          .map(f => f.id);
        const [moved] = folderIds.splice(source.index, 1);
        folderIds.splice(destination.index, 0, moved);
        reorderFolders(folderIds);
      }
      return;
    }

    // ── TodayBlockView: TOP3 배정 ──
    if (dstId.startsWith('top3-')) {
      const rank = parseInt(dstId.split('-')[1]) as 1|2|3;
      const allTodos = useStore.getState().todos;
      const existing = allTodos.find(t => t.top3Rank === rank && t.id !== draggableId);
      if (existing) {
        const current = allTodos.find(t => t.id === draggableId);
        await updateTodo(existing.id, { top3Rank: current?.top3Rank ?? null } as any);
      }
      await updateTodo(draggableId, { top3Rank: rank, timeBlockSlot: null } as any);
      return;
    }

    // ── TodayBlockView: 타임블록 배정 ──
    if (dstId.startsWith('block-')) {
      const slot = parseInt(dstId.split('-')[1]);
      await updateTodo(draggableId, { timeBlockSlot: slot, top3Rank: null } as any);
      return;
    }

    // ── TodayBlockView: 미배정/오버듀로 이동 ──
    if (dstId === 'unassigned' || dstId === 'overdue') {
      await updateTodo(draggableId, { timeBlockSlot: null, top3Rank: null } as any);
      return;
    }

    // ── CalendarView: 주간/월간 날짜 셀 드롭 ──
    if (dstId.startsWith('week-') || dstId.startsWith('cal-')) {
      // CalendarView 내부에서 처리 (날짜 데이터 필요) — 무시
      return;
    }

    // ── 다른 리스트 간 이동 ──
    if (dstId.startsWith('priority-')) {
      const colId = dstId.replace('priority-', '');
      const upcomingCols = ['today', 'tomorrow', 'thisWeek', 'nextWeek', 'later'];
      if (upcomingCols.includes(colId)) {
        const { language } = useStore.getState();
        const msg = language === 'ko'
          ? '📅 할일의 날짜를 직접 변경하면 해당 섹션으로 이동됩니다.'
          : '📅 Change the due date directly to move this task to another section.';
        if (dragToastTimer.current) clearTimeout(dragToastTimer.current);
        setDragToast(msg);
        dragToastTimer.current = setTimeout(() => setDragToast(null), 4000);
        return;
      } else {
        const newPriority = colId === 'none' ? null : colId as any;
        updateTodo(draggableId, { priority: newPriority });
      }
    } else if (dstId.startsWith('folder-')) {
      const folderIdStr = dstId.replace('folder-', '');
      const newFolderId = (folderIdStr === 'unfiled' || folderIdStr === 'inbox') ? null : folderIdStr;
      updateTodo(draggableId, { folderId: newFolderId });
    }
  };

  if (!isInitialLoadCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-background">
        <img 
          src="/logo_new.png?v=2" 
          alt="Denlog" 
          className="h-12 mb-6 object-contain mix-blend-multiply dark:hidden"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = '<span class="text-4xl font-bold tracking-tight text-foreground mb-6">den<span class="text-primary">log</span></span>' + e.currentTarget.parentElement!.innerHTML;
          }}
        />
        <img 
          src="/logo_dark.png?v=2" 
          alt="Denlog" 
          className="h-12 mb-6 object-contain hidden dark:block"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-medium">{t('action.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Drag Info Toast */}
      {dragToast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-center gap-3 bg-foreground text-background rounded-2xl shadow-2xl px-5 py-3.5 text-sm font-semibold max-w-md whitespace-nowrap">
            <span>{dragToast}</span>
            <div
              className="ml-1 w-4 h-4 rounded-full border-2 border-background/30 border-t-transparent animate-spin"
              style={{ animationDuration: '1s' }}
            />
          </div>
        </div>
      )}
      <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">

        {/* ── Left Sidebar ── */}
        {!sidebarHidden && (
          <>
            <Sidebar
              collapsed={sidebarCollapsed}
              style={!sidebarCollapsed ? { width: `${leftSidebarWidth}px` } : undefined}
              className={cn(
                "flex-shrink-0 border-r",
                !isLeftDragging && "transition-all duration-300",
                sidebarCollapsed && "w-[56px]"
              )}
            />
            {!sidebarCollapsed && (
              <div
                className="w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors bg-border/40 shrink-0 z-30"
                onMouseDown={handleLeftMouseDown}
              />
            )}
          </>
        )}

      <main className="flex-1 min-w-0 flex flex-col relative" style={{ minWidth: 340 }}>
        <header className="h-[80px] border-b border-border/40 flex items-center justify-between px-4 md:px-8 shrink-0 bg-background z-40">
          <div className="flex items-center gap-3 md:gap-6">
            
            {/* Mobile Hamburger Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger className="md:hidden shrink-0 -ml-2 p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none">
                <Menu className="h-6 w-6 stroke-[2]" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r-0">
                <Sidebar className="w-full h-full border-r-0" />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3">
              <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight capitalize text-foreground leading-none">{getHeaderTitle()}</h1>
              <span className="text-xs md:text-sm text-muted-foreground font-medium leading-none hidden sm:inline-block">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {/* 폴더 뷰일 때: 프로젝트 전환 버튼 */}
              {(() => {
                const af = folders.find(f => f.id === currentView);
                if (!af) return null;
                const { updateFolder } = useStore.getState();
                const isProj = af.workspaceType === 'project';
                return (
                  <button
                    onClick={() => updateFolder(af.id, { workspaceType: isProj ? 'personal' : 'project' })}
                    title={isProj ? '개인 폴더로 전환' : '프로젝트로 전환'}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all border hover:shadow-sm ml-1"
                    style={{
                      color: isProj ? '#6366F1' : '#94A3B8',
                      borderColor: isProj ? '#6366F1' + '40' : '#94A3B8' + '30',
                      backgroundColor: isProj ? '#6366F1' + '10' : 'transparent',
                    }}
                  >
                    {isProj
                      ? <><FolderKanban className="w-3.5 h-3.5" /> PROJECT</>
                      : <><FolderOpen className="w-3.5 h-3.5" /> 폴더로 전환</>}
                  </button>
                );
              })()}
            </div>
            
            {/* View Mode & Sort Toggle */}
            {'upcoming' !== currentView && (
              <div className="hidden md:flex items-center bg-muted/80 p-1 rounded-lg border border-border/50 ml-4 gap-1">
                <div className="flex items-center">
                  {currentView === 'today' ? (
                    // Today: List | Block
                    <>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setViewMode('list'); setIsBlockMode(false); }}
                        className={cn("h-8 px-4 text-sm font-semibold rounded-md transition-all", !isBlockMode ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-transparent")}
                      >
                        <LayoutList className="w-4 h-4 mr-2 stroke-[2]" /> List
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setIsBlockMode(true)}
                        className={cn("h-8 px-4 text-sm font-semibold rounded-md transition-all", isBlockMode ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-transparent")}
                      >
                        <KanbanSquare className="w-4 h-4 mr-2 stroke-[2]" /> Block
                      </Button>
                    </>
                  ) : (
                    // Other views: List | Board
                    <>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setViewMode('list')}
                        className={cn("h-8 px-4 text-sm font-semibold rounded-md transition-all", viewMode === 'list' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-transparent")}
                      >
                        <LayoutList className="w-4 h-4 mr-2 stroke-[2]" /> List
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setViewMode('board')}
                        className={cn("h-8 px-4 text-sm font-semibold rounded-md transition-all", viewMode === 'board' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-transparent")}
                      >
                        <KanbanSquare className="w-4 h-4 mr-2 stroke-[2]" /> Board
                      </Button>
                    </>
                  )}
                </div>

              <div className="w-px h-4 bg-border mx-1" />

              <DropdownMenu>
                {/* @ts-ignore */}
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
                    <ArrowDownUp className="w-4 h-4 mr-2" />
                    {t('todo.sort') || 'Sort'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setTodoSort('default')} className="justify-between">
                    {t('todo.sortDefault') || 'Default'} {todoSort === 'default' && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTodoSort('dueDate')} className="justify-between">
                    {t('todo.sortDueDate') || 'By Due Date'} {todoSort === 'dueDate' && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTodoSort('priority')} className="justify-between">
                    {t('todo.sortPriority') || 'By Priority'} {todoSort === 'priority' && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            )}

            {/* Search — Cmd+K to focus */}
            {!selectedTodoId && (
              <div className="relative ml-auto hidden md:block w-64 mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  type="search"
                  placeholder="Search tasks... (⌘K)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/40 border border-border/40 pl-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background h-9 rounded-full text-sm transition-colors"
                />
              </div>
            )}

            {(() => {
              const currentFolder = folders.find(f => f.id === currentView);
              if (currentFolder && currentFolder.collaborators && currentFolder.collaborators.length > 0) {
                return (
                  <div className="flex -space-x-1.5 ml-2">
                    {currentFolder.collaborators.slice(0, 3).map((collab, idx) => {
                      const zClass = idx === 0 ? 'z-30' : idx === 1 ? 'z-20' : 'z-10';
                      return (
                        <Avatar key={collab.id} className={cn("h-7 w-7 ring-2 ring-background", zClass)}>
                          <AvatarImage src={collab.avatarUrl || ''} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{collab.initial}</AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}
          </div>
          
          {!(selectedTodoId || selectedRecordingId || activeChatUser) && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative" ref={notifRef}>
                <Button 
                  variant="ghost"  
                  size="icon" 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative rounded-full hover:bg-muted"
                >
                  <Bell className="h-[18px] w-[18px] stroke-[2] text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[16px] h-[16px] text-[9px] font-bold text-white bg-[#D3411A] rounded-full px-1 ring-2 ring-background transform translate-x-1/4 -translate-y-1/4">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                {isNotifOpen && (
                  <NotificationPanel onClose={() => setIsNotifOpen(false)} anchorRef={notifRef} />
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full hover:bg-muted"
              >
                <Sun className="h-[18px] w-[18px] hidden dark:block stroke-[2] text-muted-foreground" />
                <Moon className="h-[18px] w-[18px] block dark:hidden stroke-[2] text-[#586069]" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => useStore.getState().setIsSettingsOpen(true)}
                className="rounded-full hover:bg-muted"
              >
                <Settings className="h-[18px] w-[18px] stroke-[2] text-muted-foreground" />
              </Button>
              {/* 클릭 가능한 사용자 아바타 */}
              <div className="relative" ref={avatarMenuRef}>
                <button
                  onClick={() => setAvatarMenuOpen(v => !v)}
                  className="block rounded-full ring-2 ring-border hover:ring-primary transition-all"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id || 'dummy'}`} />
                    <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </button>
                {avatarMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-popover border border-border rounded-2xl shadow-xl py-2 z-[200] animate-in fade-in zoom-in-95 duration-150">
                    {/* 사용자 정보 */}
                    <div className="px-4 py-2 border-b border-border/40 mb-1">
                      <p className="text-[13px] font-bold text-foreground truncate">{user?.displayName || 'User'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user?.email || ''}</p>
                    </div>
                    <button
                      className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-muted/60 transition-colors text-foreground"
                      onClick={() => { setAvatarMenuOpen(false); useStore.getState().setIsSettingsOpen(true); }}
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      설정
                    </button>
                    <div className="border-t border-border/30 my-1" />
                    <button
                      className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-red-500/10 transition-colors text-red-500"
                      onClick={async () => {
                        setAvatarMenuOpen(false);
                        await supabase.auth.signOut();
                        window.location.reload();
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* ── 글로벌 할일 컨텍스트 메뉴 (⋮ 버튼) ── */}
        {todoMenu && (() => {
          const t2 = todos.find(t => t.id === todoMenu.id);
          if (!t2) return null;
          return (
            <>
              <div className="fixed inset-0 z-[300]" onClick={() => setTodoMenu(null)} />
              <div
                className="fixed z-[301] min-w-[180px] bg-popover border border-border rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
                style={{ top: todoMenu.y + 4, left: Math.min(todoMenu.x - 180, window.innerWidth - 200) }}
              >
                <button
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted/60 transition-colors text-foreground"
                  onClick={() => { completeTodos([t2.id], !t2.isCompleted); setTodoMenu(null); }}
                >
                  {t2.isCompleted
                    ? <><X className="w-3.5 h-3.5 text-muted-foreground" /> 완료 취소</>
                    : <><CheckCheck className="w-3.5 h-3.5 text-green-500" /> 완료 표시</>}
                </button>
                <div className="h-px bg-border/40 mx-2 my-1" />
                {folders.map(f => (
                  <button
                    key={f.id}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-[12px] hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => { updateTodo(t2.id, { folderId: f.id }); setTodoMenu(null); }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.color || '#64748b' }} />
                    {f.name}
                  </button>
                ))}
                <div className="h-px bg-border/40 mx-2 my-1" />
                <button
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-red-500/10 transition-colors text-red-500"
                  onClick={() => { deleteTodos([t2.id]); setTodoMenu(null); }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>
            </>
          );
        })()}

        <AiReviewBanner />
        <div className={cn("flex-1 overflow-hidden bg-card flex flex-col relative", isShaking && "animate-shake")}>
          {currentView === 'today' ? (
            // TodayBlockView has its own DragDropContext — render outside main context
            isBlockMode ? <TodayBlockView /> : <DragDropContext onDragEnd={onDragEnd}><TodoList /></DragDropContext>
          ) : currentView === 'upcoming' ? (
            <DragDropContext onDragEnd={onDragEnd}>
              {viewMode === 'board' ? <KanbanBoard /> : <UpcomingView />}
            </DragDropContext>
          ) : currentView === 'people' ? (
            <PeopleView />
          ) : currentView === 'cabinet' || currentView === 'meetings' ? (
            <CabinetView />
          ) : (() => {
            const activeFolder = folders.find(f => f.id === currentView);
            if (activeFolder?.workspaceType === 'project') {
              return <ProjectDashboard folder={activeFolder} />;
            }
            return <DragDropContext onDragEnd={onDragEnd}>{viewMode === 'board' ? <KanbanBoard /> : <TodoList />}</DragDropContext>;
          })()
          }
        </div>

        {/* Floating Action Bar */}
        {selectedTodoIds.length > 0 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white dark:bg-muted border border-border shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-full px-4 py-2.5 flex items-center gap-3 z-[100] animate-in fade-in slide-in-from-bottom-8">
            <span className="text-sm font-bold px-3 text-foreground whitespace-nowrap">{selectedTodoIds.length}{t('action.selected')}</span>
            <div className="w-[1px] h-4 bg-border/50 shrink-0"></div>
            
            <DropdownMenu>
              {/* @ts-ignore */}
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                  {t('action.move')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                {folders.map(folder => (
                  <DropdownMenuItem 
                    key={folder.id} 
                    onClick={() => {
                      selectedTodoIds.forEach(id => updateTodo(id, { folderId: folder.id }));
                      clearTodoSelection();
                    }}
                  >
                    <div className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: folder.color || '#64748b' }} />
                    <span className="truncate">{folder.name}</span>
                  </DropdownMenuItem>
                ))}
                {folders.length > 0 && <div className="h-px bg-border my-1" />}
                <DropdownMenuItem 
                  onClick={() => {
                    selectedTodoIds.forEach(id => updateTodo(id, { folderId: null }));
                    clearTodoSelection();
                  }}
                >
                  <Folder className="w-4 h-4 mr-2 opacity-50 shrink-0" />
                  <span className="truncate">{t('nav.unfiled')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={() => completeTodos(selectedTodoIds, true)} className="h-8 text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
              {t('action.complete')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => deleteTodos(selectedTodoIds)} className="h-8 hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors">
              {t('action.delete')}
            </Button>
            <div className="w-[1px] h-4 bg-border/50 shrink-0"></div>
            <Button variant="ghost" size="icon" onClick={clearTodoSelection} className="h-8 w-8 rounded-xl hover:bg-muted text-muted-foreground shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>



      {(selectedTodoId || selectedRecordingId || activeChatUser) && (
        rightOverlay ? (
          /* ── Overlay mode (< 1100px): float over center, don't push ── */
          <div
            className="fixed inset-0 z-50 flex"
            style={{ pointerEvents: 'none' }}
          >
            {/* Backdrop — tap to close */}
            <div
              className="flex-1"
              style={{ pointerEvents: 'auto' }}
              onClick={() => {
                useStore.getState().setSelectedTodo(null);
                useStore.getState().setActiveChatUser(null);
              }}
            />
            {/* Panel */}
            <aside
              style={{
                width: windowWidth < 640 ? '100%' : `${Math.min(rightSidebarWidth, windowWidth * 0.85)}px`,
                pointerEvents: 'auto',
                animation: 'slideInRight 0.22s cubic-bezier(0.32,0.72,0,1)',
              }}
              className="h-full bg-card border-l border-border shadow-2xl overflow-hidden flex-shrink-0 z-50"
            >
              {activeChatUser ? <DirectMessagePanel /> :
               selectedRecordingId ? <RecordingDetail /> :
               <TodoDetail />}
            </aside>
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
              }
            `}</style>
          </div>
        ) : (
          /* ── Push mode (≥ 1100px): normal 3-panel layout ── */
          <>
            <div
              className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors bg-border/40 shrink-0 z-30"
              onMouseDown={handleMouseDown}
            />
            <aside
              style={{ width: `${rightSidebarWidth}px` }}
              className="flex-shrink-0 bg-card shadow-sm z-20 overflow-hidden"
            >
              {activeChatUser ? <DirectMessagePanel /> :
               selectedRecordingId ? <RecordingDetail /> :
               <TodoDetail />}
            </aside>
          </>
        )
      )}
      
      {/* Modals and Overlays */}
      <CreateTodoDialog />
      <DeckViewer />
      <SettingsDialog />
      <VoiceRecordingOverlay />
      {(!user && !isLoading) && <LoginOverlay />}
      <EventPopupModal />
      </div>
    </>
  );
}
