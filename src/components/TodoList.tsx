"use client";
import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { useStore } from '../store/useStore';
import { format, isToday } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AlertCircle, Tag, CalendarClock, MoreVertical, Check, CheckCircle2, MessageSquare } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { Todo } from '../types';

export function TodoList({ customTodos }: { customTodos?: Todo[] }) {
  const { todos: storeTodos, selectedTodoId, setSelectedTodo, currentView, searchQuery, usersMap, updateTodo, selectedTodoIds, toggleTodoSelection, unreadCommentCounts, todoSort } = useStore();
  const { t } = useTranslation();
  const [animatingIds, setAnimatingIds] = React.useState<string[]>([]);

  const baseTodos = customTodos || storeTodos;

  const filteredTodos = baseTodos.filter(todo => {
    // Hide tasks that are waiting for AI Review or were dismissed
    if (todo.aiDeckPending || todo.aiDeckDismissedAt) {
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
    // Default
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <ScrollArea className="h-full bg-card">
      <Droppable droppableId="todolist-container" isDropDisabled={false}>
        {(provided) => (
          <div 
            className="flex flex-col min-h-full pb-8"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {filteredTodos.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center h-[40vh] text-center max-w-sm mx-auto opacity-50 mt-10">
                <CheckCircle2 className="w-16 h-16 mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">{t('empty.allCaughtUp')}</h3>
                <p className="text-sm font-medium">{t('empty.allCaughtUpDesc')}</p>
              </div>
            )}
        
        {filteredTodos.length > 0 && (
          <div className="flex justify-end px-6 py-2 border-b border-border/20">
            <button 
              onClick={() => {
                const allIds = filteredTodos.map(t => t.id);
                // If everything currently filtered is selected, deselect them
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
              {filteredTodos.length > 0 && filteredTodos.every(t => selectedTodoIds.includes(t.id)) ? t('todo.deselectAll') : t('todo.selectAll')}
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
                    "group flex items-start gap-3 px-6 py-3.5 border-b border-border/40 hover:bg-muted/30 cursor-grab active:cursor-grabbing transition-all border-l-[3px]",
                    priorityBorder,
                    selectedTodoId === todo.id || selectedTodoIds.includes(todo.id) ? "bg-muted/30" : "",
                    snapshot.isDragging && "shadow-2xl border-primary/70 opacity-95 scale-[1.02] z-50 bg-card rounded-lg rotate-1 ring-2 ring-primary/30"
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
                        setTimeout(() => {
                          updateTodo(todo.id, { isCompleted: true });
                          setAnimatingIds(prev => prev.filter(id => id !== todo.id));
                        }, 400);
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
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-[14px] font-bold leading-tight relative inline-block transition-colors duration-300", 
                        isVisuallyCompleted ? "text-muted-foreground" : "text-foreground",
                        "after:absolute after:left-0 after:top-1/2 after:h-[1.5px] after:bg-current after:transition-[width] after:duration-300 after:ease-out",
                        isVisuallyCompleted ? "after:w-full" : "after:w-0"
                      )}>
                        {todo.title}
                      </span>
                      <div className="flex items-center gap-2">
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
                        <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
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
                            const initial = user?.name ? user.name[0] : pId.substring(0, 2).toUpperCase();
                            const zClass = idx === 0 ? 'z-30' : idx === 1 ? 'z-20' : 'z-10';
                            return (
                              <Avatar key={pId} className={cn("h-6 w-6 ring-2 ring-background", zClass)}>
                                <AvatarImage src={user?.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${pId}`} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">{initial}</AvatarFallback>
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
    </ScrollArea>
  );
}
