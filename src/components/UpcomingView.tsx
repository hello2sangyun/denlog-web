"use client";
import React from 'react';
import { useStore } from '../store/useStore';
import { ScrollArea } from './ui/scroll-area';
import { isAfter, startOfDay, addDays, isBefore, isSameDay, endOfWeek, differenceInCalendarDays } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Mail, Video, CheckCircle, Smartphone, Tag, MoreVertical, CalendarClock, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { Todo } from '../types';

export function UpcomingView() {
  const { todos, updateTodo, selectedTodoId, setSelectedTodo, selectedTodoIds, toggleTodoSelection, usersMap } = useStore();
  const { t } = useTranslation();

  const now = startOfDay(new Date());
  const tomorrow = addDays(now, 1);
  const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 }); // Assuming Monday start
  const endOfNextWk = endOfWeek(addDays(endOfThisWeek, 1), { weekStartsOn: 1 });
  
  // Upcoming = Due date is tomorrow or later, AND not completed
  const upcomingTodos = todos.filter(t => 
    !t.isCompleted && 
    t.dueDate && 
    isAfter(startOfDay(t.dueDate), now)
  );
  
  // Sort by due date
  upcomingTodos.sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return 0;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const tomorrowTodos = upcomingTodos.filter(t => t.dueDate && isSameDay(startOfDay(t.dueDate), tomorrow));
  const thisWeekTodos = upcomingTodos.filter(t => t.dueDate && isAfter(startOfDay(t.dueDate), tomorrow) && !isAfter(startOfDay(t.dueDate), endOfThisWeek));
  const nextWeekTodos = upcomingTodos.filter(t => t.dueDate && isAfter(startOfDay(t.dueDate), endOfThisWeek) && !isAfter(startOfDay(t.dueDate), endOfNextWk));
  const laterTodos = upcomingTodos.filter(t => t.dueDate && isAfter(startOfDay(t.dueDate), endOfNextWk));

  const formatDueDiff = (date: Date) => {
    const diff = differenceInCalendarDays(startOfDay(date), now);
    if (diff === 1) return 'Tomorrow';
    return `in ${diff}d`;
  };

  const scrollToGroup = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderGroup = (id: string, title: string, count: number, groupTodos: Todo[], dotColor: string = "bg-primary") => {
    if (groupTodos.length === 0) return null;
    return (
      <div id={id} className="mb-8 relative px-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 relative -left-1">
          <div className={cn("w-[7px] h-[7px] rounded-full", dotColor)} />
          <h3 className="font-bold text-[15px]">{title}</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold leading-tight">{count}</span>
        </div>
        
        {/* Task List container to form continuous block */}
        <div className="bg-card flex flex-col">
          {groupTodos.map((todo, idx) => {
             const priorityBorder = todo.priority === 'high' ? 'border-l-[#ef4444]' : 
                                    todo.priority === 'medium' ? 'border-l-[#f59e0b]' : 
                                    'border-l-transparent';
             
             const circleColor = todo.isCompleted ? "bg-primary border-primary" : 
                                 todo.priority === 'high' ? "border-[#ef4444]" : 
                                 todo.priority === 'medium' ? "border-[#f59e0b]" : 
                                 "border-border";

             return (
               <Draggable key={todo.id} draggableId={todo.id} index={idx}>
                 {(provided, snapshot) => (
                   <div 
                     ref={provided.innerRef}
                     {...provided.draggableProps}
                     {...provided.dragHandleProps}
                     style={provided.draggableProps.style}
                     onClick={() => setSelectedTodo(todo.id)}
                     className={cn(
                       "group flex items-start gap-3 px-0 py-3.5 border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-all border-l-[3px]",
                       priorityBorder,
                       selectedTodoId === todo.id || selectedTodoIds.includes(todo.id) ? "bg-muted/30" : "",
                       snapshot.isDragging && "shadow-xl border-primary/50 opacity-90 scale-[1.02] z-50 bg-card rounded-md rotate-1 px-4"
                     )}
                   >
                     <div
                       onClick={(e) => {
                         e.stopPropagation();
                         toggleTodoSelection(todo.id);
                       }}
                       className={cn(
                         "ml-4 mt-1 flex-shrink-0 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer",
                         selectedTodoIds.includes(todo.id) ? "bg-primary border-primary text-primary-foreground opacity-100" : "border-border/60 bg-background/50 hover:border-foreground/50",
                         selectedTodoIds.length > 0 || selectedTodoIds.includes(todo.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                         "mr-1"
                       )}
                     >
                       {selectedTodoIds.includes(todo.id) && <Check className="w-3 h-3 stroke-[3]" />}
                     </div>
                     
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         updateTodo(todo.id, { isCompleted: !todo.isCompleted });
                       }}
                       className={cn(
                         "mt-0.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex-shrink-0 transition-all flex items-center justify-center",
                         circleColor,
                         "hover:opacity-70"
                       )}
                     >
                       {todo.isCompleted && <div className="w-2 h-2 bg-white rounded-full" />}
                     </button>

                     <div className="flex flex-col gap-1 flex-1 min-w-0 pr-4">
                       <div className="flex items-center justify-between">
                         <span className={cn(
                           "text-[14px] font-bold leading-tight", 
                           todo.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                         )}>
                           {todo.title}
                         </span>
                         <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                           <MoreVertical className="w-4 h-4" />
                         </button>
                       </div>
                       
                       {todo.memo && (
                         <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5 pr-6">
                           {todo.memo}
                         </p>
                       )}

                       {(todo.dueDate || todo.dueTime) && (
                         <div className={cn("flex items-center gap-1.5 mt-1.5 text-[12px] font-medium text-muted-foreground")}>
                           <CalendarClock className="w-3.5 h-3.5 stroke-[2]" />
                           <span>
                             {todo.dueDate && formatDueDiff(todo.dueDate)}
                             {todo.dueTime && ` • ${todo.dueTime}`}
                           </span>
                         </div>
                       )}
                       
                       {(() => {
                         const participants = Array.from(new Set([...(todo.assigneeIds || []), ...(todo.viewerIds || [])]));
                         if (participants.length === 0) return null;
                         return (
                           <div className="flex -space-x-1.5 mt-3">
                             {participants.slice(0, 3).map((pId, pIdx) => {
                               const user = usersMap[pId];
                               const initial = user?.name ? user.name[0] : pId.substring(0, 2).toUpperCase();
                               const zClass = pIdx === 0 ? 'z-30' : pIdx === 1 ? 'z-20' : 'z-10';
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
             )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative min-h-0">
      {/* Modern Toolbar Header */}
      <div className="px-8 py-5 flex items-center gap-2 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => scrollToGroup('group-tomorrow')}
          className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all bg-muted text-foreground hover:bg-muted/80 flex items-center gap-2 border border-transparent hover:border-border/50 shrink-0"
        >
          {t('filter.tomorrow')} 
          {tomorrowTodos.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{tomorrowTodos.length}</span>}
        </button>
        <button
          onClick={() => scrollToGroup('group-this-week')}
          className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all bg-muted text-foreground hover:bg-muted/80 flex items-center gap-2 border border-transparent hover:border-border/50 shrink-0"
        >
          {t('filter.thisWeek')} 
          {thisWeekTodos.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{thisWeekTodos.length}</span>}
        </button>
        <button
          onClick={() => scrollToGroup('group-next-week')}
          className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all bg-muted text-foreground hover:bg-muted/80 flex items-center gap-2 border border-transparent hover:border-border/50 shrink-0"
        >
          {t('filter.nextWeek')} 
          {nextWeekTodos.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{nextWeekTodos.length}</span>}
        </button>
        <button
          onClick={() => scrollToGroup('group-later')}
          className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all bg-muted text-foreground hover:bg-muted/80 flex items-center gap-2 border border-transparent hover:border-border/50 shrink-0"
        >
          {t('filter.later')} 
          {laterTodos.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{laterTodos.length}</span>}
        </button>
        
        {upcomingTodos.length > 0 && (
          <div className="ml-auto flex items-center">
            <button 
              onClick={() => {
                const allIds = upcomingTodos.map(t => t.id);
                const allSelected = allIds.every(id => selectedTodoIds.includes(id));
                if (allSelected) {
                  useStore.getState().clearTodoSelection();
                } else {
                  useStore.getState().selectAllTodos(allIds);
                }
              }}
              className="px-2 text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {upcomingTodos.length > 0 && upcomingTodos.every(t => selectedTodoIds.includes(t.id)) ? t('todo.deselectAll') : t('todo.selectAll')}
            </button>
          </div>
        )}
      </div>

      <Droppable droppableId="upcoming-container" isDropDisabled={true}>
        {(provided) => (
          <div 
            className="flex-1 overflow-y-auto bg-card"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            <div className="flex flex-col pt-8 pb-20">
              {renderGroup("group-tomorrow", t('filter.tomorrow'), tomorrowTodos.length, tomorrowTodos, "bg-primary")}
              {renderGroup("group-this-week", t('filter.thisWeek'), thisWeekTodos.length, thisWeekTodos, "bg-primary")}
              {renderGroup("group-next-week", t('filter.nextWeek'), nextWeekTodos.length, nextWeekTodos, "bg-primary")}
              {renderGroup("group-later", t('filter.later'), laterTodos.length, laterTodos, "bg-primary")}
              
              {upcomingTodos.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center h-[40vh] text-center max-w-sm mx-auto opacity-50 mt-10">
                  <CalendarClock className="w-16 h-16 mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold mb-2">{t('empty.noUpcoming')}</h3>
                  <p className="text-sm font-medium">{t('empty.noUpcomingDesc')}</p>
                </div>
              )}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
}
