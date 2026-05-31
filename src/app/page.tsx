"use client";
import React from 'react';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { TodoList } from '@/components/TodoList';
import { KanbanBoard } from '@/components/KanbanBoard';
import { UpcomingView } from '@/components/UpcomingView';
import { PeopleView } from '@/components/PeopleView';
import { CabinetView } from '@/components/CabinetView';
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
import { Bell, Search, Settings, LayoutList, KanbanSquare, Mic, Sun, Moon, Menu, X, Folder } from 'lucide-react';
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
  const { user, isLoading, isInitialLoadCompleted, currentView, searchQuery, setSearchQuery, folders, viewMode, setViewMode, loadData, notifications, selectedTodoId, selectedRecordingId, activeChatUser, selectedTodoIds, clearTodoSelection, deleteTodos, completeTodos, updateTodo, markNotificationRead, markAllNotificationsRead } = useStore();
  const { theme, setTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [dragToast, setDragToast] = React.useState<string | null>(null);
  const [isShaking, setIsShaking] = React.useState(false);
  const dragToastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);

  // ── Responsive breakpoints ─────────────────────────────────────────────
  const windowWidth = useWindowWidth();
  const sidebarCollapsed = windowWidth < 960 && windowWidth >= 640; // icon-only
  const sidebarHidden    = windowWidth < 640;                       // hamburger only
  const rightOverlay     = windowWidth < 1100;                      // right panel floats over center

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  const [rightSidebarWidth, setRightSidebarWidth] = React.useState(540);
  const [leftSidebarWidth, setLeftSidebarWidth] = React.useState(220);
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
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

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

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    if (destination.droppableId.startsWith('priority-')) {
      const colId = destination.droppableId.replace('priority-', '');
      
      // Upcoming board: date-based columns → block drag, show info toast
      const upcomingCols = ['today', 'tomorrow', 'thisWeek', 'nextWeek', 'later'];
      if (upcomingCols.includes(colId)) {
        const { language } = useStore.getState();
        const msg = language === 'ko'
          ? '📅 할일의 날짜를 직접 변경하면 해당 섹션으로 이동됩니다.'
          : '📅 Change the due date directly to move this task to another section.';
        if (dragToastTimer.current) clearTimeout(dragToastTimer.current);
        setDragToast(msg);
        dragToastTimer.current = setTimeout(() => setDragToast(null), 4000);
        return; // ← block actual move
      } else {
        // Priority board: high/medium/low/none
        const newPriority = colId === 'none' ? null : colId as any;
        updateTodo(draggableId, { priority: newPriority });
      }
    } else if (destination.droppableId.startsWith('folder-')) {
      const folderIdStr = destination.droppableId.replace('folder-', '');
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
    <DragDropContext onDragEnd={onDragEnd}>
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

        {/* ── Left Sidebar: full / collapsed / hidden ── */}
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
                className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors bg-transparent shrink-0 z-30"
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

            <div className="flex items-baseline gap-3">
              <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight capitalize text-foreground leading-none">{getHeaderTitle()}</h1>
              <span className="text-xs md:text-sm text-muted-foreground font-medium leading-none hidden sm:inline-block">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            
            {/* View Mode Toggle */}
            <div className="hidden md:flex items-center bg-muted/80 p-1 rounded-lg border border-border/50 ml-4">
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => setViewMode('list')}
                className={cn("h-8 px-4 text-sm font-semibold rounded-md transition-all", viewMode === 'list' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-transparent")}
              >
                <LayoutList className="w-4 h-4 mr-2 stroke-[2]" /> List
              </Button>
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => setViewMode('board')}
                className={cn("h-8 px-4 text-sm font-semibold rounded-md transition-all", viewMode === 'board' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-transparent")}
              >
                <KanbanSquare className="w-4 h-4 mr-2 stroke-[2]" /> Board
              </Button>
            </div>

            {/* Search */}
            <div className="relative ml-auto hidden md:block w-64 mr-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-muted/40 border border-border/40 pl-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background h-9 rounded-full text-sm transition-colors"
              />
            </div>

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
          
          <div className="flex items-center gap-3">
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
            <Avatar className="h-8 w-8 ring-2 ring-border cursor-pointer hover:ring-primary transition-all">
              <AvatarImage src={user?.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id || 'dummy'}`} />
              <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <AiReviewBanner />
        <div className={cn("flex-1 overflow-hidden bg-card flex flex-col relative", isShaking && "animate-shake")}>
          {currentView === 'today' ? (
            <TodoList />
          ) : currentView === 'upcoming' ? (
            viewMode === 'board' ? <KanbanBoard /> : <UpcomingView />
          ) : currentView === 'people' ? (
            <PeopleView />
          ) : currentView === 'cabinet' || currentView === 'meetings' ? (
            <CabinetView />
          ) : viewMode === 'board' ? (
            <KanbanBoard />
          ) : (
            <TodoList />
          )}
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
    </DragDropContext>
  );
}
