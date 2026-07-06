"use client";
import React from 'react';
import { useStore } from '../store/useStore';
import { format, isToday } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AlertCircle, Tag, CalendarClock, MoreVertical, Check, CheckCircle2, MessageSquare, Paperclip, Plus, CheckCheck, Trash2, FolderInput, ArrowUpDown } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import type { Todo } from '../types';

// ── Confetti ──────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#E8574A','#34D399','#F59E0B','#8B5CF6','#06B6D4','#F472B6','#A3E635'];

function ConfettiBurst({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const particles = React.useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x: (Math.random() - 0.5) * 160,
      y: -(Math.random() * 160 + 60),
      rotate: Math.random() * 720 - 360,
      scale: 0.4 + Math.random() * 0.8,
      isRect: i % 3 !== 0,
      delay: Math.random() * 120,
    })), []);

  React.useEffect(() => {
    if (visible) {
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center"
      aria-hidden
    >
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width:  p.isRect ? 7 : 8,
            height: p.isRect ? 14 : 8,
            borderRadius: p.isRect ? 2 : '50%',
            backgroundColor: p.color,
            top: '50%', left: '50%',
            animationName: 'confetti-burst',
            animationDuration: `${700 + p.delay}ms`,
            animationTimingFunction: 'cubic-bezier(0.22,0.61,0.36,1)',
            animationFillMode: 'forwards',
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg) scale(${p.scale})`,
            opacity: 0,
            // inject CSS vars for the keyframe
            ['--tx' as any]: `${p.x}px`,
            ['--ty' as any]: `${p.y}px`,
            ['--rot' as any]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}

export function TodoList({ customTodos }: { customTodos?: Todo[] }) {
  const { todos: storeTodos, folders, selectedTodoId, setSelectedTodo, currentView, searchQuery, usersMap, updateTodo, selectedTodoIds, toggleTodoSelection, unreadCommentCounts, todoSort, setTodoSort, comments } = useStore();
  const { t } = useTranslation();
  const [animatingIds, setAnimatingIds] = React.useState<string[]>([]);
  const [flashingIds,   setFlashingIds]  = React.useState<string[]>([]);
  const [confettiVisible, setConfettiVisible] = React.useState(false);

  const baseTodos = customTodos || storeTodos;

  const filteredTodos = baseTodos.filter(todo => {
    // Hide tasks that are waiting for AI Review or were dismissed
    if (todo.aiDeckPending || todo.aiDeckDismissedAt) {
      return false;
    }
    
    // Hide orphaned tasks (tasks that belong to a folder that no longer exists)
    if (todo.folderId && todo.folderId !== 'inbox' && todo.folderId !== 'none' && !folders.some(f => f.id === todo.folderId)) {
      return false;
    }

    let matchesView = true;
    if (currentView === 'all') {
      matchesView = !todo.isCompleted;
    } else if (currentView === 'unfiled' || currentView === 'inbox') {
      matchesView = !todo.isCompleted && (!todo.folderId || todo.folderId === 'inbox' || todo.folderId === 'none');
    } else if (currentView === 'cabinet' || currentView === 'completed') {
      matchesView = !!todo.isCompleted;
    } else if (currentView === 'today') {
      const isDueToday = todo.dueDate ? isToday(todo.dueDate) : false;
      const isOverdue = todo.dueDate ? (new Date(todo.dueDate).getTime() < new Date(new Date().setHours(0,0,0,0)).getTime()) : false;
      matchesView = !todo.isCompleted && (isDueToday || isOverdue);
    } else if (currentView === 'upcoming') {
      matchesView = !todo.isCompleted; // Placeholder for upcoming logic
    } else if (currentView === 'people' || currentView === 'meetings') {
      matchesView = !todo.isCompleted; // Placeholder logic
    } else {
      matchesView = todo.folderId === currentView && !todo.isCompleted;
    }

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      todo.title.toLowerCase().includes(searchLower) || 
      (todo.memo?.toLowerCase().includes(searchLower));

    return matchesView && matchesSearch;
  });

  filteredTodos.sort((a, b) => {
    if (todoSort === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (todoSort === 'priority') {
      const pMap: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
      const pA = pMap[a.priority || 'none'] ?? 3;
      const pB = pMap[b.priority || 'none'] ?? 3;
      if (pA !== pB) return pA - pB;
    }
    // Default: sortOrder(수동 정렬) 우선, 없으면 createdAt 역순
    const aOrder = a.sortOrder ?? null;
    const bOrder = b.sortOrder ?? null;
    if (aOrder !== null && bOrder !== null) return aOrder - bOrder;
    if (aOrder !== null) return -1;
    if (bOrder !== null) return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <div className="h-full overflow-y-auto bg-card">
      <Droppable droppableId="todolist-container" isDropDisabled={false}>
        {(provided) => (
          <div 
            className="flex flex-col min-h-full pb-8"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {filteredTodos.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center h-[40vh] text-center max-w-sm mx-auto mt-10">
                <CheckCircle2 className="w-14 h-14 mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-bold mb-2 text-foreground">{t('empty.allCaughtUp')}</h3>
                <p className="text-sm font-medium text-muted-foreground/60 mb-5">{t('empty.allCaughtUpDesc')}</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-create-todo'))}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t('action.addTask') || '+ 할일 추가'}
                </button>
              </div>
            )}
        
        {filteredTodos.length > 0 && (
          <div className="flex items-center justify-between px-6 py-2 border-b border-border/20">
            {/* 정렬 드롭다운 */}
            <DropdownMenu>
              {/* @ts-ignore */}
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 text-[12px] font-medium transition-colors",
                  todoSort !== 'default'
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {todoSort === 'dueDate'
                    ? (t('sort.dueDate') || '마감일 순')
                    : todoSort === 'priority'
                    ? (t('sort.priority') || '우선순위 순')
                    : (t('sort.label') || '정렬')}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem
                  onClick={() => useStore.getState().setTodoSort('default')}
                  className="justify-between text-[13px]"
                >
                  {t('sort.manual') || '직접 정렬'}
                  {todoSort === 'default' && <Check className="w-3.5 h-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => useStore.getState().setTodoSort('dueDate')}
                  className="justify-between text-[13px]"
                >
                  {t('sort.dueDate') || '마감일 순'}
                  {todoSort === 'dueDate' && <Check className="w-3.5 h-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => useStore.getState().setTodoSort('priority')}
                  className="justify-between text-[13px]"
                >
                  {t('sort.priority') || '우선순위 순'}
                  {todoSort === 'priority' && <Check className="w-3.5 h-3.5" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 전체 선택 */}
            <button
              onClick={() => {
                const allIds = filteredTodos.map(t => t.id);
                const allSelected = allIds.every(id => selectedTodoIds.includes(id));
                if (allSelected) {
                  useStore.getState().clearTodoSelection();
                } else {
                  useStore.getState().selectAllTodos(allIds);
                }
              }}
              className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {filteredTodos.every(t => selectedTodoIds.includes(t.id)) ? (t('todo.deselectAll') || '선택 해제') : (t('todo.selectAll') || '전체 선택')}
            </button>
          </div>
        )}

        {filteredTodos.map((todo, index) => {
          const isTaskToday = todo.dueDate ? isToday(todo.dueDate) : false;
          const hasRedHighlight = todo.priority === 'high' || isTaskToday || todo.isOverdue;
          
          const priorityBorder = todo.priority === 'high' ? 'border-l-[#ef4444]' : 
                                 todo.priority === 'medium' ? 'border-l-[#f59e0b]' : 
                                 'border-l-transparent';

          const isVisuallyCompleted = todo.isCompleted || animatingIds.includes(todo.id);
          const circleColor = isVisuallyCompleted ? "bg-primary border-primary" : 
                              todo.priority === 'high' ? "border-[#ef4444]" : 
                              todo.priority === 'medium' ? "border-[#f59e0b]" : 
                              hasRedHighlight ? "border-primary text-primary" : "border-border";

          return (
            <Draggable key={todo.id} draggableId={todo.id} index={index}>
              {(provided, snapshot) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={provided.draggableProps.style}
                  onClick={() => setSelectedTodo(todo.id)}
                  className={cn(
                    "group flex items-start gap-3 px-6 py-3.5 border-b border-border/40 hover:bg-muted/30 cursor-grab active:cursor-grabbing transition-all border-l-[3px] relative overflow-hidden",
                    priorityBorder,
                    selectedTodoId === todo.id || selectedTodoIds.includes(todo.id) ? "bg-muted/30" : "",
                    snapshot.isDragging && "shadow-2xl border-primary/70 opacity-95 scale-[1.02] z-50 bg-card rounded-lg rotate-1 ring-2 ring-primary/30",
                    flashingIds.includes(todo.id) && "animate-flash-green"
                  )}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTodoSelection(todo.id);
                    }}
                    className={cn(
                      "mt-1 flex-shrink-0 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer",
                      selectedTodoIds.includes(todo.id) ? "bg-primary border-primary text-primary-foreground opacity-100" : "border-border/60 bg-background/50 hover:border-foreground/50",
                      selectedTodoIds.length > 0 || selectedTodoIds.includes(todo.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      "mr-1 -ml-2"
                    )}
                  >
                    {selectedTodoIds.includes(todo.id) && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!todo.isCompleted) {
                        setAnimatingIds(prev => [...prev, todo.id]);
                        setFlashingIds(prev => [...prev, todo.id]);
                        setConfettiVisible(true);
                        setTimeout(() => {
                          updateTodo(todo.id, { isCompleted: true });
                          setAnimatingIds(prev => prev.filter(id => id !== todo.id));
                        }, 400);
                        setTimeout(() => {
                          setFlashingIds(prev => prev.filter(id => id !== todo.id));
                        }, 600);
                      } else {
                        updateTodo(todo.id, { isCompleted: false });
                      }
                    }}
                    className={cn(
                      "mt-0.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex-shrink-0 transition-all flex items-center justify-center",
                      circleColor,
                      "hover:opacity-70"
                    )}
                  >
                    {isVisuallyCompleted && <div className="w-2 h-2 bg-white rounded-full" />}
                  </button>

                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={cn(
                          "text-[14px] font-bold leading-tight relative inline-block transition-colors duration-300 truncate", 
                          isVisuallyCompleted ? "text-muted-foreground" : "text-foreground",
                          "after:absolute after:left-0 after:top-1/2 after:h-[1.5px] after:bg-current after:transition-[width] after:duration-300 after:ease-out",
                          isVisuallyCompleted ? "after:w-full" : "after:w-0"
                        )}>
                          {todo.title}
                        </span>
                        {/* Comment count (N) inline */}
                        {(() => {
                          const loaded = comments?.[todo.id];
                          const n = loaded ? loaded.length : (todo as any).commentCount ?? 0;
                          return n > 0 ? (
                            <span className="text-[11px] font-semibold text-muted-foreground/50 shrink-0">({n})</span>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Attachment badge */}
                        {(todo.attachments?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-muted-foreground/50 text-[11px] font-medium">
                            <Paperclip className="w-3 h-3" />
                            {todo.attachments!.length}
                          </span>
                        )}
                        {/* Unread comment badge */}
                        {(unreadCommentCounts[todo.id] ?? 0) > 0 && (
                          <span
                            className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-white font-bold"
                            style={{
                              fontSize: 10,
                              background: 'var(--primary)',
                              lineHeight: 1.4,
                              minWidth: 18,
                              justifyContent: 'center',
                            }}
                          >
                            <MessageSquare style={{ width: 9, height: 9, flexShrink: 0 }} />
                            {unreadCommentCounts[todo.id]}
                          </span>
                        )}
                        <button
                          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity relative"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            useStore.getState().setTodoMenu({ id: todo.id, x: rect.right, y: rect.bottom });
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {todo.memo && (
                      <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5 pr-6">
                        {todo.memo}
                      </p>
                    )}

                    {(todo.dueDate || todo.dueTime) && (
                      <div className={cn("flex items-center gap-1.5 mt-1.5 text-[12px] font-medium", hasRedHighlight ? "text-primary" : "text-muted-foreground")}>
                        <CalendarClock className="w-3.5 h-3.5 stroke-[2]" />
                        <span>
                          {isTaskToday ? 'Today' : todo.dueDate && format(todo.dueDate, 'MMM d')}
                          {todo.dueTime && (
                            <span className="ml-1.5 opacity-80">
                              {todo.dueTime.includes('T') ? format(new Date(todo.dueTime), 'HH:mm') : todo.dueTime.substring(0, 5)}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    
                    {(() => {
                      const participants = Array.from(new Set([...(todo.assigneeIds || []), ...(todo.viewerIds || [])]));
                      if (participants.length === 0) return null;
                      return (
                        <div className="flex -space-x-1.5 mt-3">
                          {participants.slice(0, 3).map((pId, idx) => {
                            const user = usersMap[pId];
                            const initial = user?.name ? user.name[0].toUpperCase() : pId.substring(0, 2).toUpperCase();
                            const zClass = idx === 0 ? 'z-30' : idx === 1 ? 'z-20' : 'z-10';
                            const avatarUrl = user?.avatarUrl || undefined;
                            return (
                              <Avatar key={pId} className={cn("h-6 w-6 ring-2 ring-background bg-primary/10", zClass)}>
                                {avatarUrl && <AvatarImage src={avatarUrl} />}
                                <AvatarFallback className="text-[10px] text-primary font-bold">{initial}</AvatarFallback>
                              </Avatar>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </Draggable>
          );
        })}
        {provided.placeholder}
        </div>
        )}
      </Droppable>
      {/* Confetti overlay */}
      <ConfettiBurst visible={confettiVisible} onDone={() => setConfettiVisible(false)} />
    </div>
  );
}
