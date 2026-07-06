"use client";
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Inbox, Calendar, Archive, Folder, Plus, Trash2, CalendarDays, Users, Video, ChevronDown, ChevronRight, CheckCircle, Layers, FolderKanban, FolderOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useStore } from '../store/useStore';
import { Droppable, Draggable } from '@hello-pangea/dnd';

const CabinetIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <line x1="7" y1="9.5" x2="17" y2="9.5" />
    <line x1="7" y1="14.5" x2="17" y2="14.5" />
    <path d="M10.5 17.5 h 3" />
  </svg>
);

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
}

export function Sidebar({ className, collapsed = false, ...props }: SidebarProps) {
  const { currentView, setCurrentView, folders, todos, loadData, createFolder, deleteFolder, updateFolder } = useStore();
  const { t } = useTranslation();
  const [isAddingFolder, setIsAddingFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [isFoldersExpanded, setIsFoldersExpanded] = React.useState(true);
  // 우클릭 컨텍스트 메뉴 상태
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number; folderId: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navItems = [
    { id: 'all', label: t('nav.allTasks'), icon: Layers },
    { id: 'unfiled', label: t('nav.unfiled'), icon: Inbox, color: 'text-primary' },
    { id: 'today', label: t('nav.today'), icon: Calendar },
    { id: 'upcoming', label: t('nav.upcoming'), icon: CalendarDays },
    { id: 'people', label: t('nav.people'), icon: Users },
    { id: 'meetings', label: t('nav.cabinet'), icon: CabinetIcon },
    { id: 'completed', label: t('nav.completed'), icon: CheckCircle },
  ] as const;

  const handleCreateFolder = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    } else if (e.key === 'Escape') {
      setIsAddingFolder(false);
      setNewFolderName('');
    }
  };

  return (
    <>
    <div
      className={cn(
        "pb-12 h-full flex flex-col border-r border-border/40 bg-muted",
        className
      )}
      {...props}
    >
      <div className="space-y-4 py-4 flex-1 overflow-hidden">
        <div className={cn("py-2", collapsed ? "px-0" : "px-2")}>

          {/* Logo */}
          <div className={cn("mb-8 mt-2 flex items-center", collapsed ? "px-0 justify-center" : "px-4")}>
            {collapsed ? (
              // Collapsed: small logo mark only
              <img
                src="/logo_new.png?v=2"
                alt="Denlog"
                className="h-6 w-6 object-contain mix-blend-multiply dark:hidden"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <>
                <img
                  src="/logo_new.png?v=2"
                  alt="Denlog"
                  className="h-8 max-w-full object-contain mix-blend-multiply dark:hidden"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-2xl font-bold tracking-tight text-foreground">den<span class="text-primary">log</span></span>';
                  }}
                />
                <img
                  src="/logo_dark.png?v=2"
                  alt="Denlog"
                  className="h-8 max-w-full object-contain hidden dark:block"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </>
            )}
          </div>

          {/* New Task Button */}
          <div className={cn("mb-6", collapsed ? "px-1" : "px-3")}>
            {collapsed ? (
              // Collapsed: icon-only button
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-create-todo'))}
                title={t('nav.newTask')}
                className="w-full flex items-center justify-center h-10 rounded-lg bg-primary hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5 text-primary-foreground" />
              </button>
            ) : (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg h-10 shadow-sm justify-start px-4"
                onClick={() => window.dispatchEvent(new CustomEvent('open-create-todo'))}
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('nav.newTask')}
              </Button>
            )}
          </div>

          {/* Nav Items */}
          <div className="space-y-0.5">
            {navItems.map(item => (
              <div key={item.id} className="space-y-1">
                <Droppable droppableId={`folder-${item.id}`} isDropDisabled={item.id !== 'unfiled'}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "rounded-lg transition-colors mb-1",
                        snapshot.isDraggingOver ? "bg-primary/10 ring-1 ring-primary/50" : ""
                      )}
                    >
                      {collapsed ? (
                        // Collapsed: icon-only nav button with tooltip
                        <button
                          title={item.label}
                          onClick={() => setCurrentView(item.id)}
                          className={cn(
                            "w-full flex items-center justify-center h-10 rounded-lg transition-colors relative group",
                            currentView === item.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                          )}
                        >
                          <item.icon className={cn("h-5 w-5 stroke-[2]", (item as any).color && currentView !== item.id ? (item as any).color : "")} />
                          {/* Tooltip */}
                          <span className="absolute left-full ml-2 px-2 py-1 text-xs font-semibold bg-popover text-popover-foreground border border-border rounded-md shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                            {item.label}
                          </span>
                          {/* Active dot */}
                          {currentView === item.id && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary" />
                          )}
                        </button>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => setCurrentView(item.id)}
                          className={cn(
                            "w-full justify-start transition-colors group px-4 h-10 hover:bg-transparent",
                            currentView === item.id
                              ? "font-bold text-foreground"
                              : "font-medium text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <item.icon className={cn("mr-4 h-5 w-5 stroke-[2]", (item as any).color || "text-muted-foreground")} />
                          <span className="text-[14px]">{item.label}</span>
                          {item.id === 'unfiled' && (
                            <div className="ml-auto flex items-center gap-1">
                              <div
                                role="button"
                                onClick={(e) => { e.stopPropagation(); setIsAddingFolder(true); }}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity p-1"
                              >
                                <Plus className="w-4 h-4" />
                              </div>
                              <div
                                role="button"
                                onClick={(e) => { e.stopPropagation(); setIsFoldersExpanded(!isFoldersExpanded); }}
                                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
                              >
                                {isFoldersExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </div>
                            </div>
                          )}
                        </Button>
                      )}
                      <div className="hidden">{provided.placeholder}</div>
                    </div>
                  )}
                </Droppable>

                {/* Folder list — hidden in collapsed mode */}
                {!collapsed && item.id === 'unfiled' && isFoldersExpanded && (
                  <div className="ml-6 pl-2 space-y-0.5">
                    {isAddingFolder && (
                      <div className="py-1">
                        <input
                          autoFocus
                          type="text"
                          value={newFolderName}
                          onChange={e => setNewFolderName(e.target.value)}
                          onKeyDown={handleCreateFolder}
                          onBlur={() => { setIsAddingFolder(false); setNewFolderName(''); }}
                          placeholder="Folder name..."
                          className="w-full bg-background border rounded-md text-sm px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    )}
                    {/* 폴더 목록: sidebar-folders Droppable — 순서 변경 + 할일 이동 */}
                    <Droppable droppableId="sidebar-folders">
                      {(sidebarProvided) => (
                        <div ref={sidebarProvided.innerRef} {...sidebarProvided.droppableProps}>
                          {[...folders]
                            .sort((a, b) => (a.sortOrder ?? 99999) - (b.sortOrder ?? 99999))
                            .map((folder, folderIdx) => {
                              const isActive = currentView === folder.id;
                              return (
                                <Draggable key={folder.id} draggableId={`folder-drag-${folder.id}`} index={folderIdx}>
                                  {(drag, dragSnap) => (
                                    <div
                                      ref={drag.innerRef}
                                      {...drag.draggableProps}
                                      className={cn(
                                        "rounded-lg transition-colors mb-0.5",
                                        dragSnap.isDragging && "opacity-80 shadow-lg ring-1 ring-primary/30 bg-card"
                                      )}
                                    >
                                      {/* 드래그 핸들: 폴더 아이콘 부분에만 */}
                                      <Droppable droppableId={`folder-${folder.id}`}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={cn(
                                              "rounded-lg transition-colors",
                                              snapshot.isDraggingOver ? "bg-primary/20 ring-1 ring-primary/50" : ""
                                            )}
                                          >
                                            <Button
                                              variant="ghost"
                                              onClick={() => setCurrentView(folder.id)}
                                              onContextMenu={(e) => {
                                                e.preventDefault();
                                                setCtxMenu({ x: e.clientX, y: e.clientY, folderId: folder.id });
                                              }}
                                              className={cn(
                                                "w-full justify-start transition-colors group px-4 h-9 hover:bg-muted/50 rounded-lg",
                                                isActive ? "font-bold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                                              )}
                                            >
                                              {/* 드래그 핸들 표시역 (= 다이아모드 아이콘) */}
                                              <span
                                                {...drag.dragHandleProps}
                                                className="mr-2 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
                                                onClick={e => e.stopPropagation()}
                                                title="드래그하여 순서 변경"
                                              >
                                                ⠿
                                              </span>
                                              <Folder
                                                className={cn("mr-2 h-4 w-4 stroke-[2]", !folder.color && (isActive ? "text-foreground" : "text-muted-foreground"))}
                                                style={folder.color ? { color: folder.color } : undefined}
                                              />
                                              <span className="text-[13px] truncate">{folder.name}</span>
                                              {folder.workspaceType === 'project' && (
                                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-indigo-500/15 text-indigo-400 shrink-0 ml-1">🗂</span>
                                              )}
                                              {(() => {
                                                const liveCount = todos.filter(t => t.folderId === folder.id && !t.isCompleted).length;
                                                return liveCount > 0 ? (
                                                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-border/40 text-foreground">
                                                    {liveCount}
                                                  </span>
                                                ) : null;
                                              })()}
                                              <div
                                                role="button"
                                                onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                                                className="ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </div>
                                            </Button>
                                            <div className="hidden">{provided.placeholder}</div>
                                          </div>
                                        )}
                                      </Droppable>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          {sidebarProvided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

      {ctxMenu && (() => {
        const f = folders.find(f => f.id === ctxMenu.folderId);
        if (!f) return null;
        const isProject = f.workspaceType === 'project';
        return (
          <>
            {/* 배경 클릭 시 닫기 */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setCtxMenu(null)}
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}
            />
            <div
              className="fixed z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-xl py-1 overflow-hidden"
              style={{ top: ctxMenu.y, left: ctxMenu.x }}
            >
              {/* 폴더 이름 헤더 */}
              <div className="px-3 py-1.5 border-b border-border/50 mb-1">
                <p className="text-[11px] font-bold text-foreground truncate">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isProject ? '🗂 프로젝트 폴더' : '📁 개인 폴더'}
                </p>
              </div>

              {/* 프로젝트 전환 / 개인 전환 */}
              {isProject ? (
                <button
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    updateFolder(f.id, { workspaceType: 'personal' });
                    setCtxMenu(null);
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  개인 폴더로 전환
                </button>
              ) : (
                <button
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-muted/60 transition-colors text-indigo-500 hover:text-indigo-400"
                  onClick={() => {
                    updateFolder(f.id, { workspaceType: 'project' });
                    setCtxMenu(null);
                  }}
                >
                  <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                  프로젝트로 전환
                </button>
              )}

              {/* 구분선 */}
              <div className="border-t border-border/40 my-1" />

              {/* 폴더 삭제 */}
              <button
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-red-500/10 transition-colors text-red-500"
                onClick={() => {
                  deleteFolder(f.id);
                  setCtxMenu(null);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                폴더 삭제
              </button>
            </div>
          </>
        );
      })()}
    </>
  );
}
