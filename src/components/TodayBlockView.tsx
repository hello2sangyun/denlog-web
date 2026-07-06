"use client";
import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useStore } from '../store/useStore';
import { cn } from '@/lib/utils';
import { Star, GripVertical, ChevronDown, ChevronRight, LayoutGrid, Calendar } from 'lucide-react';
import type { Todo } from '../types';
import { isToday } from 'date-fns';
import { CalendarView } from './CalendarView';

// ── Time Block definitions (from release bundle) ──────────────────────────
const TIME_BLOCKS = [
  { slot: 1, label: 'Block 1', time: '09:00–10:30', color: '#6366F1', startH: 9,  startM: 0,  endH: 10, endM: 30 },
  { slot: 2, label: 'Block 2', time: '10:30–12:00', color: '#8B5CF6', startH: 10, startM: 30, endH: 12, endM: 0  },
  { slot: 3, label: 'Block 3', time: '14:00–15:30', color: '#0EA5E9', startH: 14, startM: 0,  endH: 15, endM: 30 },
  { slot: 4, label: 'Block 4', time: '15:30–17:00', color: '#22C55E', startH: 15, startM: 30, endH: 17, endM: 0  },
];

const TOP3_COLORS = ['#F59E0B', '#94A3B8', '#CD7C33'];

// 시간을 분 단위로 변환
const toMins = (h: number, m: number) => h * 60 + m;

// 현재 블록 내 진행률 (0~1)
function blockProgress(slot: number, now: Date): number | null {
  const b = TIME_BLOCKS.find(x => x.slot === slot);
  if (!b) return null;
  const nowM = toMins(now.getHours(), now.getMinutes());
  const startM = toMins(b.startH, b.startM);
  const endM   = toMins(b.endH,   b.endM);
  if (nowM < startM || nowM >= endM) return null;
  return (nowM - startM) / (endM - startM);
}

// 현재 시각이 베로 지점(before=1)/이후(after=2)/간겪(gap=3)끼를 판단
function nowPosition(now: Date): { type: 'before' | 'gap' | 'after'; beforeSlot?: number; afterSlot?: number } {
  const nowM = toMins(now.getHours(), now.getMinutes());
  const first = TIME_BLOCKS[0];
  const last  = TIME_BLOCKS[TIME_BLOCKS.length - 1];
  if (nowM < toMins(first.startH, first.startM)) return { type: 'before' };
  if (nowM >= toMins(last.endH, last.endM))       return { type: 'after' };
  for (let i = 0; i < TIME_BLOCKS.length - 1; i++) {
    const cur  = TIME_BLOCKS[i];
    const next = TIME_BLOCKS[i + 1];
    const curEnd  = toMins(cur.endH,  cur.endM);
    const nextStart = toMins(next.startH, next.startM);
    if (nowM >= curEnd && nowM < nextStart) {
      return { type: 'gap', afterSlot: cur.slot, beforeSlot: next.slot };
    }
  }
  return { type: 'after' };
}

function isCurrentBlock(slot: number, now: Date): boolean {
  return blockProgress(slot, now) !== null;
}

function sortByPriority(todos: Todo[]): Todo[] {
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...todos].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    if (!a.isCompleted) {
      const ra = rank[a.priority ?? 'none'] ?? 3;
      const rb = rank[b.priority ?? 'none'] ?? 3;
      if (ra !== rb) return ra - rb;
    }
    return 0;
  });
}

function dotColor(todo: Todo): string {
  if (todo.isCompleted) return '#22C55E';
  if (todo.priority === 'high')   return '#EF4444';
  if (todo.priority === 'medium') return '#F59E0B';
  if (todo.priority === 'low')    return '#3B82F6';
  return 'transparent';
}

// ── TodoRow (exact release bundle structure) ──────────────────────────────
function TodoRow({
  todo, index, color, selectedTodoId, onSelect, onRemove, rankLabel,
}: {
  todo: Todo; index: number; color: string;
  selectedTodoId: string | null; onSelect: (id: string) => void;
  onRemove?: (id: string) => void; rankLabel?: number;
}) {
  const { updateTodo } = useStore();

  return (
    <Draggable draggableId={todo.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors",
            snapshot.isDragging
              ? "shadow-lg bg-background ring-1 ring-primary/30 opacity-95"
              : "hover:bg-muted/40",
            selectedTodoId === todo.id && "bg-primary/5",
            todo.isCompleted && "opacity-65",
          )}
          onClick={() => onSelect(todo.id)}
        >
          <span
            {...provided.dragHandleProps}
            className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </span>

          {rankLabel != null && (
            <span
              className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ backgroundColor: color + '22', color }}
            >
              {rankLabel}
            </span>
          )}

          <button
            onClick={e => { e.stopPropagation(); updateTodo(todo.id, { isCompleted: !todo.isCompleted }); }}
            className={cn(
              "shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all duration-150 border-[1.5px] group/cb",
              todo.isCompleted
                ? "bg-primary border-primary"
                : "border-muted-foreground/35 bg-transparent hover:border-primary/60 hover:bg-primary/5"
            )}
          >
            <svg className={cn("w-2.5 h-2.5 transition-opacity", todo.isCompleted ? "opacity-100" : "opacity-0 group-hover/cb:opacity-50")}
              viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,6 5,9 10,3" />
            </svg>
          </button>

          {todo.isCompleted ? (
            <span className="w-1.5 h-1.5 shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          )}

          <span className={cn(
            "flex-1 truncate font-medium text-foreground/90",
            todo.isCompleted && "line-through text-muted-foreground/80"
          )}>
            {todo.title}
          </span>

          {todo.estimatedMinutes && (
            <span className="text-[10px] text-muted-foreground shrink-0">~{todo.estimatedMinutes}m</span>
          )}

          {onRemove && (
            <button
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground text-xs shrink-0 transition-opacity ml-1"
              onClick={e => { e.stopPropagation(); onRemove(todo.id); }}
            >✕</button>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ── TodayBlockView ────────────────────────────────────────────────────────
export function TodayBlockView() {
  const { todos, selectedTodoId, setSelectedTodo, updateTodo, language } = useStore();
  const isEn = language === 'en';
  const [now, setNow] = React.useState(() => new Date());
  const [showCompletedUnassigned, setShowCompletedUnassigned] = React.useState(false);
  const [showCompletedOverdue, setShowCompletedOverdue] = React.useState(false);
  // Blocks / Calendar 토글 (릴리즈 번들과 동일)
  const [plannerMode, setPlannerMode] = React.useState<'blocks' | 'calendar'>('blocks');

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── 릴리즈 번들 pi 컴포넌트와 동일한 pre-filter ─────────────────────────────
  // todo가 Block 뷰에 표시될 자격이 있는지 판단
  const todayMs = React.useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime();
  }, [now]);

  const blockViewTodos = React.useMemo(() => {
    return todos.filter(t => {
      const dueDateMs = t.dueDate
        ? new Date(t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate)).setHours(0, 0, 0, 0)
        : null;

      // 1) 오늘 이전에 완료된 항목 → 제외 (오늘 완료는 유지)
      if (t.isCompleted && t.completedAt && new Date(t.completedAt).setHours(0, 0, 0, 0) < todayMs) return false;

      // 2) 블록 또는 Top3 배정된 항목 → 항상 포함
      if (t.timeBlockSlot != null || t.top3Rank != null) return true;

      // 3) AI Review 대기/해제 항목 → 제외
      if (t.aiDeckPending || t.aiDeckDismissedAt) return false;

      // 4) 완료된 항목 → 오늘 완료됐거나 마감일이 오늘인 것만
      if (t.isCompleted) {
        const completedToday = !!t.completedAt && isToday(t.completedAt instanceof Date ? t.completedAt : new Date(t.completedAt));
        const dueToday = !!t.dueDate && isToday(t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate));
        return completedToday || dueToday;
      }

      // 5) 미완료: 마감일 있으면 오늘 이하(today + overdue)만, 마감일 없으면 제외
      if (t.dueDate) {
        return dueDateMs !== null && dueDateMs <= todayMs;
      }
      return false; // 마감일 없는 미완료 → Block 뷰에서 제외
    });
  }, [todos, todayMs]);

  // blockAssigned: 블록에 배정된 항목
  const blockAssigned = React.useMemo(() =>
    blockViewTodos.filter(t => t.timeBlockSlot != null),
    [blockViewTodos]
  );

  // Unassigned Block: 마감일이 오늘인 미완료 (블록 미배정)
  const unassignedAll = React.useMemo(() => {
    return blockViewTodos.filter(t => {
      if (t.timeBlockSlot != null) return false;
      if (t.isCompleted) return false;
      if (!t.dueDate) return false; // 마감일 없는 항목 제외
      const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
      return isToday(d);
    });
  }, [blockViewTodos]);

  const unassignedActive    = unassignedAll; // 이미 미완료만 포함
  const unassignedCompleted = blockViewTodos.filter(t => {
    // 오늘 완료 + 블록 미배정 + 마감일이 오늘이거나 없음 → 완료 섹션
    if (!t.isCompleted || t.timeBlockSlot != null) return false;
    if (!t.dueDate) return !!t.completedAt && isToday(t.completedAt instanceof Date ? t.completedAt : new Date(t.completedAt));
    const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
    return isToday(d);
  });

  // Overdue: 마감일이 오늘 이전인 미완료 (블록 미배정)
  const overdueAll = React.useMemo(() => {
    return blockViewTodos.filter(t => {
      if (t.timeBlockSlot != null) return false;
      if (t.isCompleted) return false; // 미완료만
      if (!t.dueDate) return false;
      const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
      return d.setHours(0, 0, 0, 0) < todayMs;
    });
  }, [blockViewTodos, todayMs]);

  const overdueActive    = overdueAll; // 이미 미완료만
  const overdueCompleted = blockViewTodos.filter(t => {
    // 오늘 완료됐지만 마감일이 과거인 항목 → overdue completed
    if (!t.isCompleted || t.timeBlockSlot != null) return false;
    if (!t.dueDate) return false;
    const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
    return d.setHours(0, 0, 0, 0) < todayMs;
  });

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const dest = destination.droppableId;

    if (dest.startsWith('top3-')) {
      const rank = parseInt(dest.split('-')[1]);
      const existing = todos.find(t => t.top3Rank === rank && t.id !== draggableId);
      if (existing) {
        const current = todos.find(t => t.id === draggableId);
        await updateTodo(existing.id, { top3Rank: current?.top3Rank ?? null } as any);
      }
      await updateTodo(draggableId, { top3Rank: rank, timeBlockSlot: null } as any);
    } else if (dest.startsWith('block-')) {
      const slot = parseInt(dest.split('-')[1]);
      await updateTodo(draggableId, { timeBlockSlot: slot, top3Rank: null } as any);
    } else if (dest === 'unassigned' || dest === 'overdue') {
      await updateTodo(draggableId, { timeBlockSlot: null, top3Rank: null } as any);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Blocks / Calendar 토글 헤더 (릴리즈 번들 pi 컴포넌트 동일) ── */}
      <div className="px-4 pt-3 pb-2.5 border-b border-border/30 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold tracking-tight text-foreground">
              {isEn ? "Today's Plan" : '오늘의 계획'}
            </span>
            <div className="flex items-center p-0.5 bg-muted/50 rounded-lg border border-border/40">
              <button
                onClick={() => setPlannerMode('blocks')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all',
                  plannerMode === 'blocks'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {isEn ? 'Blocks' : '블록'}
              </button>
              <button
                onClick={() => setPlannerMode('calendar')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all',
                  plannerMode === 'calendar'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {isEn ? 'Calendar' : '달력'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Calendar 모드 ── */}
      {plannerMode === 'calendar' && (
        <CalendarView todos={blockViewTodos} defaultSub="week" />
      )}

      {plannerMode === 'blocks' && (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* ── Main layout: mobile=vertical, desktop=horizontal 2-column ── */}
      <div className="flex flex-col md:flex-row gap-3 h-full overflow-hidden overflow-y-auto md:overflow-y-hidden">

        {/* ── LEFT PANEL: TOP3 + Time Blocks ─────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-2 md:overflow-y-auto min-w-0 py-3 pl-3 pr-1">

          {/* TODAY'S TOP 3 */}
          <div className="rounded-xl overflow-hidden shrink-0 relative border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.03] via-card to-card/50 shadow-sm shadow-amber-500/5">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-amber-500/80" />
            <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-500/10 bg-amber-500/[0.04]">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15">
                <Star className="w-3 h-3 text-amber-500/90" />
              </div>
              <span className="text-xs font-bold tracking-wide text-amber-600/90 dark:text-amber-500/95">
                {isEn ? "TODAY'S TOP 3" : '오늘의 Top 3'}
              </span>
            </div>
            {[1, 2, 3].map(rank => {
              const todo = todos.find(t => t.top3Rank === rank);
              return (
                <Droppable key={rank} droppableId={`top3-${rank}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "border-b border-border/30 last:border-0 min-h-[40px] transition-colors",
                        snapshot.isDraggingOver && "bg-amber-500/10"
                      )}
                    >
                      {todo ? (
                        <TodoRow
                          todo={todo} index={0}
                          color={TOP3_COLORS[rank - 1]}
                          selectedTodoId={selectedTodoId}
                          onSelect={setSelectedTodo}
                          onRemove={id => updateTodo(id, { top3Rank: null } as any)}
                          rankLabel={rank}
                        />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 min-h-[40px]">
                          <div className="w-3 shrink-0" />
                          <div
                            className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0"
                            style={{ backgroundColor: TOP3_COLORS[rank - 1] + '20', color: TOP3_COLORS[rank - 1] }}
                          >{rank}</div>
                          <div className="w-[18px] shrink-0" />
                          <span className="text-xs text-muted-foreground/60 italic">
                            {snapshot.isDraggingOver
                              ? (isEn ? 'Drop here' : '여기에 놓기')
                              : (isEn ? 'drag a task here' : '할 일을 여기로 드래그')}
                          </span>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>

          {/* TIME BLOCKS label */}
          <div className="mt-2 mb-1 px-1 flex items-center gap-2 shrink-0 select-none">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
              {isEn ? 'Time Blocks' : '시간별 계획'}
            </span>
            <div className="h-px bg-border/40 flex-1" />
          </div>

          {/* 4 Time Blocks + current time indicator */}
          {(() => {
            const nowPos = nowPosition(now);
            const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

            // 'before' (첫 블록 전): 위에 NOW 라인
            const beforeLine = nowPos.type === 'before' ? (
              <div className="flex items-center gap-2 mb-2 select-none">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 h-px bg-red-500/60" />
                <span className="text-[10px] font-bold text-red-500 shrink-0 tabular-nums">{timeStr}</span>
              </div>
            ) : null;

            return (
              <>
                {beforeLine}
                {TIME_BLOCKS.map((block, idx) => {
                  const blockTodos = sortByPriority(
                    todos.filter(t => {
                      if (t.timeBlockSlot !== block.slot) return false;
                      if (t.isCompleted) {
                        if (!t.dueDate) return false;
                        const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
                        return isToday(d);
                      }
                      return true;
                    })
                  );
                  const completed  = blockTodos.filter(t => t.isCompleted).length;
                  const isCurrent  = isCurrentBlock(block.slot, now);
                  const progress   = blockProgress(block.slot, now);  // null or 0~1

                  // 이 블록 다음에 NOW 라인 넣을지 판단 (gap 사이)
                  const isAfterGap = nowPos.type === 'gap' && nowPos.afterSlot === block.slot;

                  return (
                    <React.Fragment key={block.slot}>
                      <div
                        className={cn(
                          "rounded-xl border bg-card overflow-hidden shrink-0 transition-all relative pl-3",
                          isCurrent ? "border-border shadow-sm" : "border-border/60"
                        )}
                      >
                        {isCurrent && (
                          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: block.color }} />
                        )}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
                          <span className="text-xs font-semibold text-foreground/90">{block.label}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">{block.time}</span>
                          {isCurrent && (
                            <span className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded ml-1">
                              <span className="flex h-1.5 w-1.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                              </span>
                              <span className="text-[9px] font-bold text-primary">{isEn ? 'NOW' : '진행 중'}</span>
                            </span>
                          )}
                          {blockTodos.length > 0 && (
                            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {completed}/{blockTodos.length}
                            </span>
                          )}
                        </div>

                        {/* ── 현재 블록 진행 progress bar ──────────────────────── */}
                        {progress !== null && (
                          <div className="relative">
                            {/* progress track */}
                            <div className="h-[2px] bg-border/30 w-full">
                              <div
                                className="h-full transition-all duration-60000"
                                style={{ width: `${progress * 100}%`, backgroundColor: block.color }}
                              />
                            </div>
                            {/* current time label on the progress line */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 flex items-center"
                              style={{ left: `${Math.max(2, Math.min(progress * 100, 94))}%` }}
                            >
                              <div className="w-[6px] h-[6px] rounded-full bg-red-500 -ml-[3px] shrink-0 shadow-sm" />
                              <span
                                className="ml-1 text-[9px] font-bold text-red-500 bg-background/90 px-1 rounded shadow-sm whitespace-nowrap select-none"
                                style={{ fontSize: 9 }}
                              >
                                {timeStr}
                              </span>
                            </div>
                          </div>
                        )}

                        <Droppable droppableId={`block-${block.slot}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn("min-h-[36px] px-2 py-1 transition-colors", snapshot.isDraggingOver && "bg-muted/30")}
                            >
                              {blockTodos.map((todo, idx2) => (
                                <TodoRow
                                  key={todo.id} todo={todo} index={idx2}
                                  color={dotColor(todo)}
                                  selectedTodoId={selectedTodoId}
                                  onSelect={setSelectedTodo}
                                  onRemove={id => updateTodo(id, { timeBlockSlot: null } as any)}
                                />
                              ))}
                              {provided.placeholder}
                              {blockTodos.length === 0 && !snapshot.isDraggingOver && (
                                <p className="text-[10px] text-muted-foreground/40 text-center py-1">
                                  {isEn ? 'drag tasks here' : '할 일을 여기로 드래그'}
                                </p>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>

                      {/* ── 블록 사이 gap에 현재 시각 라인 ───────────────── */}
                      {isAfterGap && (
                        <div className="flex items-center gap-2 my-2 select-none">
                          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          <div className="flex-1 h-px bg-red-500/60" />
                          <span className="text-[10px] font-bold text-red-500 shrink-0 tabular-nums">{timeStr}</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* after last block */}
                {nowPos.type === 'after' && (
                  <div className="flex items-center gap-2 mt-2 select-none">
                    <div className="w-2 h-2 rounded-full bg-red-500/50 shrink-0" />
                    <div className="flex-1 h-px bg-red-500/30" />
                    <span className="text-[10px] font-bold text-red-500/60 shrink-0 tabular-nums">{timeStr}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* ── RIGHT PANEL: Unassigned + Overdue (flex-1 — exact release ratio) ── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 py-3 pr-3 pl-1 h-full overflow-hidden">

          {/* Unassigned Block section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 px-1 shrink-0">
              <span className="text-xs font-bold text-foreground">
                {isEn ? 'Unassigned Block' : '미배정 블록'}
              </span>
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60">
                {unassignedActive.length}
              </span>
            </div>
            <Droppable droppableId="unassigned">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex-1 rounded-xl border border-dashed border-border/50 overflow-y-auto p-2 transition-colors bg-card/50",
                    snapshot.isDraggingOver ? "border-primary/50 bg-primary/5" : "bg-card/50"
                  )}
                >
                  {unassignedActive.length === 0 && !snapshot.isDraggingOver && unassignedCompleted.length === 0 && (
                    <p className="text-xs text-muted-foreground/50 text-center py-8">
                      {isEn ? 'No tasks due today without a block!' : '오늘 마감이지만 블록 미배정 없음!'}
                    </p>
                  )}
                  {sortByPriority(unassignedActive).map((todo, idx) => (
                    <TodoRow
                      key={todo.id} todo={todo} index={idx}
                      color={dotColor(todo)}
                      selectedTodoId={selectedTodoId}
                      onSelect={setSelectedTodo}
                    />
                  ))}
                  {/* Completed toggle */}
                  {unassignedCompleted.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-border/30">
                      <button
                        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2 w-full text-left"
                        onClick={() => setShowCompletedUnassigned(v => !v)}
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center rounded-sm bg-muted/60">
                          {showCompletedUnassigned
                            ? <ChevronDown className="w-3 h-3" />
                            : <ChevronRight className="w-3 h-3" />}
                        </span>
                        {isEn ? 'Completed' : '완료됨'} ({unassignedCompleted.length})
                      </button>
                      {showCompletedUnassigned && sortByPriority(unassignedCompleted).map((todo, idx) => (
                        <TodoRow
                          key={todo.id} todo={todo}
                          index={unassignedActive.length + idx}
                          color={dotColor(todo)}
                          selectedTodoId={selectedTodoId}
                          onSelect={setSelectedTodo}
                        />
                      ))}
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Overdue section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 px-1 shrink-0">
              <span className="text-xs font-bold text-red-500">
                {isEn ? 'Overdue' : '기한초과'}
              </span>
              <span className="text-[10px] text-red-500 font-bold px-2 py-0.5 rounded-full bg-red-500/10">
                {overdueActive.length}
              </span>
            </div>
            <Droppable droppableId="overdue">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex-1 rounded-xl border border-dashed border-red-500/25 overflow-y-auto p-2 transition-colors",
                    snapshot.isDraggingOver ? "border-red-500/50 bg-red-500/5" : "bg-red-500/[0.01]"
                  )}
                >
                  {overdueActive.length === 0 && !snapshot.isDraggingOver && overdueCompleted.length === 0 && (
                    <p className="text-xs text-muted-foreground/55 text-center py-8">
                      {isEn ? 'No overdue tasks!' : '기한 초과된 할 일이 없어요!'}
                    </p>
                  )}
                  {sortByPriority(overdueActive).map((todo, idx) => (
                    <TodoRow
                      key={todo.id} todo={todo} index={idx}
                      color={dotColor(todo)}
                      selectedTodoId={selectedTodoId}
                      onSelect={setSelectedTodo}
                    />
                  ))}
                  {overdueCompleted.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-border/30">
                      <button
                        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2 w-full text-left"
                        onClick={() => setShowCompletedOverdue(v => !v)}
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center rounded-sm bg-muted/60">
                          {showCompletedOverdue
                            ? <ChevronDown className="w-3 h-3" />
                            : <ChevronRight className="w-3 h-3" />}
                        </span>
                        {isEn ? 'Completed' : '완료됨'} ({overdueCompleted.length})
                      </button>
                      {showCompletedOverdue && sortByPriority(overdueCompleted).map((todo, idx) => (
                        <TodoRow
                          key={todo.id} todo={todo}
                          index={overdueActive.length + idx}
                          color={dotColor(todo)}
                          selectedTodoId={selectedTodoId}
                          onSelect={setSelectedTodo}
                        />
                      ))}
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

        </div>
      </div>
    </DragDropContext>
      )}
    </div>
  );
}
