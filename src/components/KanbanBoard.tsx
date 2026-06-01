"use client";
import React from 'react';
import { useStore } from '../store/useStore';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { isToday, format, isAfter, startOfDay, addDays, isSameDay, endOfWeek, isBefore } from 'date-fns';
import { CalendarClock, AlertCircle } from 'lucide-react';
import type { Todo } from '../types';
import { useTranslation } from '@/lib/i18n';

export function KanbanBoard({ customTodos }: { customTodos?: Todo[] }) {
  const { todos: storeTodos, currentView, searchQuery, selectedTodoId, setSelectedTodo, updateTodo, usersMap, todoSort } = useStore();

  const baseTodos = customTodos || storeTodos;

  const filteredTodos = baseTodos.filter(todo => {
    // Hide tasks that are waiting for AI Review or were dismissed
    if (todo.aiDeckPending || todo.aiDeckDismissedAt) {
      return false;
    }

    // View filtering
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
      matchesView = !todo.isCompleted;
    } else if (currentView === 'people' || currentView === 'meetings') {
      matchesView = !todo.isCompleted;
    } else {
      matchesView = todo.folderId === currentView && !todo.isCompleted;
    }

    // Search filtering
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      todo.title.toLowerCase().includes(searchLower) || 
      (todo.memo?.toLowerCase().includes(searchLower));

    return matchesView && matchesSearch;
  });

  const { t } = useTranslation();
  const isUpcoming = currentView === 'upcoming';

  const columns: { id: string; title: string; color: string; items: Todo[] }[] = isUpcoming 
    ? [
        { id: 'tomorrow', title: t('filter.tomorrow'), color: 'bg-green-500', items: [] },
        { id: 'thisWeek', title: t('filter.thisWeek'), color: 'bg-blue-500', items: [] },
        { id: 'nextWeek', title: t('filter.nextWeek'), color: 'bg-purple-500', items: [] },
        { id: 'later', title: t('filter.later'), color: 'bg-slate-400', items: [] },
      ]
    : [
        { id: 'high', title: 'High Priority', color: 'bg-red-500', items: [] },
        { id: 'medium', title: 'Medium Priority', color: 'bg-amber-500', items: [] },
        { id: 'low', title: 'Low Priority', color: 'bg-blue-500', items: [] },
        { id: 'none', title: 'No Priority', color: 'bg-slate-400', items: [] },
      ];

  const now = startOfDay(new Date());
  const tomorrow = addDays(now, 1);
  const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
  const endOfNextWk = endOfWeek(addDays(endOfThisWeek, 1), { weekStartsOn: 1 });

  filteredTodos.forEach(todo => {
    if (isUpcoming) {
      if (todo.dueDate) {
        const due = startOfDay(todo.dueDate);
        if (isBefore(due, tomorrow)) {
          // Skip today and overdue tasks in upcoming view (they belong in Today view)
        }
        else if (isSameDay(due, tomorrow)) columns[0].items.push(todo);
        else if (isAfter(due, tomorrow) && !isAfter(due, endOfThisWeek)) columns[1].items.push(todo);
        else if (isAfter(due, endOfThisWeek) && !isAfter(due, endOfNextWk)) columns[2].items.push(todo);
        else if (isAfter(due, endOfNextWk)) columns[3].items.push(todo);
      }
    } else {
      if (todo.priority === 'high') columns[0].items.push(todo);
      else if (todo.priority === 'medium') columns[1].items.push(todo);
      else if (todo.priority === 'low') columns[2].items.push(todo);
      else columns[3].items.push(todo);
    }
  });

  // Sort columns based on todoSort
  columns.forEach(col => {
    col.items.sort((a, b) => {
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
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  });

  // Remove empty columns if desired, but standard Kanban keeps them.
  // We will keep them.

  return (
    <ScrollArea className="h-full w-full bg-muted/10">
        <div className="flex items-start p-6 gap-6 min-h-[calc(100vh-100px)]">
        {columns.map(col => (
          <div key={col.id} className="flex flex-col w-[320px] shrink-0 bg-muted/40 rounded-2xl">
            {/* Column Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", col.color)} />
                <h3 className="font-bold text-[13px] uppercase tracking-wide text-foreground/80">{col.title}</h3>
              </div>
              <span className="text-xs font-bold bg-background/60 shadow-sm px-2 py-0.5 rounded text-muted-foreground">
                {col.items.length}
              </span>
            </div>

            {/* Column Body */}
            <Droppable droppableId={`priority-${col.id}`}>
              {(provided) => (
                <div 
                  className="flex-1 p-3 pb-4 h-full"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="flex flex-col gap-3 min-h-[100px]">
                    {col.items.map((todo, index) => {
                      const hasRedHighlight = todo.priority === 'high' || !!todo.dueDate || todo.isOverdue;
                      
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
                                "group flex flex-col p-4 bg-card rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-black/5 dark:border-white/5",
                                selectedTodoId === todo.id ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:border-primary/20",
                                snapshot.isDragging && "shadow-xl border-primary/50 opacity-90 scale-105 z-50 rotate-2"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!todo.isCompleted) {
                                      updateTodo(todo.id, { isCompleted: true });
                                    } else {
                                      updateTodo(todo.id, { isCompleted: false });
                                    }
                                  }}
                                  className={cn(
                                    "mt-0.5 w-[20px] h-[20px] rounded-full border-[1.5px] flex-shrink-0 transition-all duration-200 flex items-center justify-center",
                                    todo.isCompleted ? "bg-primary border-primary scale-95" : 
                                    hasRedHighlight ? "border-primary" : "border-muted-foreground/40",
                                    "hover:bg-primary/10 hover:border-primary/60"
                                  )}
                                />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className={cn("text-sm font-medium leading-snug mb-1", todo.isCompleted && "line-through text-muted-foreground")}>
                                    {todo.title}
                                  </span>
                                  
                                  {todo.memo && (
                                    <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                                      {todo.memo}
                                    </span>
                                  )}

                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-medium text-muted-foreground">
                                      {todo.source}
                                    </span>
                                    
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const participants = Array.from(new Set([...(todo.assigneeIds || []), ...(todo.viewerIds || [])]));
                                        if (participants.length === 0) return null;
                                        return (
                                          <div className="flex -space-x-1.5">
                                            {participants.slice(0, 3).map((pId, idx) => {
                                              const u = usersMap[pId];
                                              const avatarUrl = u?.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${pId}`;
                                              const fallback = u?.name?.charAt(0)?.toUpperCase() || 'U';
                                              return (
                                                <Avatar key={pId} className={cn("h-4 w-4 ring-1 ring-background", `z-[${10-idx}]`)}>
                                                  <AvatarImage src={avatarUrl} />
                                                  <AvatarFallback className="text-[6px]">{fallback}</AvatarFallback>
                                                </Avatar>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()}
                                      
                                      {(todo.dueDate || todo.dueTime) && (
                                        <div className={cn("flex items-center gap-1 text-[11px] font-medium", todo.isCompleted ? "text-muted-foreground" : "text-primary/90")}>
                                          <CalendarClock className="w-3 h-3" />
                                          <span>
                                            {todo.dueDate && format(todo.dueDate, 'MMM d')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {col.items.length === 0 && (
                      <div className="p-8 border-2 border-dashed border-border/40 rounded-xl flex flex-col items-center justify-center gap-2 text-center bg-transparent transition-colors hover:bg-muted/30">
                        <div className="w-10 h-10 rounded-full bg-background/50 shadow-sm flex items-center justify-center mb-1">
                          <AlertCircle className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">No tasks</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
