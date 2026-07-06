"use client";
/**
 * CalendarView — 릴리즈 번들 pa / pn / po / pr / u1 컴포넌트 정확 복원
 *
 * Day  : 블록 클릭 → 하단 패널(할일목록 + 미배정 추가), 현재시각 레드라인
 * Week : Top3 배너, 블록 pills(오늘만), overdue → 오늘 컬럼 포함
 * Month: Top3 + dot 목록, +N 더보기 → day 뷰 전환
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import type { Todo } from '@/types';
import { isToday } from 'date-fns';

// ── 상수 ─────────────────────────────────────────────────────────────────────
const HOUR_PX   = 64;
const DAY_START = 7;
const HOURS     = Array.from({ length: 14 }, (_, i) => DAY_START + i); // 7 ~ 20

const BLOCK_DEFS = [
  { slot: 1, label: 'Block 1', time: '09:00–10:30', color: '#6366F1', startH: 9,  startM: 0,  endH: 10, endM: 30 },
  { slot: 2, label: 'Block 2', time: '10:30–12:00', color: '#8B5CF6', startH: 10, startM: 30, endH: 12, endM: 0  },
  { slot: 3, label: 'Block 3', time: '14:00–15:30', color: '#0EA5E9', startH: 14, startM: 0,  endH: 15, endM: 30 },
  { slot: 4, label: 'Block 4', time: '15:30–17:00', color: '#22C55E', startH: 15, startM: 30, endH: 17, endM: 0  },
];

const TOP3_COLORS = ['#F59E0B', '#94A3B8', '#CD7C33'];

type CalSub = 'day' | 'week' | 'month';
type BlockDef = typeof BLOCK_DEFS[number];

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
const toY = (h: number, m: number) => (h - DAY_START + m / 60) * HOUR_PX;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const getMonday = (d: Date) => {
  const t = new Date(d);
  const day = t.getDay();
  t.setDate(t.getDate() + (day === 0 ? -6 : 1 - day));
  t.setHours(0, 0, 0, 0);
  return t;
};
const addDays   = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const mStart    = (d: Date)            => new Date(d.getFullYear(), d.getMonth(), 1);

/** dueDate 정규화 — 타임존 버그 수정:
 *  "2026-07-05" 같은 날짜 전용 문자열은 new Date()가 UTC 자정으로 파싱해서
 *  UTC+2 이상 타임존에서 하루 밀림 현상이 발생함.
 *  → 날짜 파트만 추출해 로컬 자정으로 생성.
 */
const getDue = (t: Todo): Date | null => {
  if (!t.dueDate) return null;
  const d = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
  if (isNaN(d.getTime())) return null;
  // 로컬 날짜로 재정규화 (year/month/date 기준)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** 우선순위 dot color (릴리즈 번들 정확 복원) */
const dotColor = (t: Todo) =>
  t.isCompleted          ? '#22C55E'
  : t.priority === 'high'   ? '#EF4444'
  : t.priority === 'medium' ? '#F59E0B'
  : t.priority === 'low'    ? '#3B82F6'
  : 'transparent';

/** 완료된 것을 뒤로 (릴리즈 번들 uK()) */
const sortTodos = (arr: Todo[]) =>
  [...arr].sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));

// ── Top3 미니 렌더러 (릴리즈 번들 pr 컴포넌트) ───────────────────────────────
function Top3Mini({
  top3Todos,
  onSelect,
  compact = false,
}: {
  top3Todos: Todo[];
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  if (top3Todos.length === 0) return null;
  const sorted = [...top3Todos].sort((a, b) => (a.top3Rank ?? 9) - (b.top3Rank ?? 9));
  return (
    <div className={cn(
      'rounded-md border border-amber-500/40 overflow-hidden mb-1',
      compact ? 'bg-amber-500/[0.06]' : 'bg-amber-500/[0.08]',
    )}>
      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border-b border-amber-500/20">
        <span className="text-[8px]">⭐</span>
        <span className="text-[8px] font-extrabold text-amber-600/90 uppercase tracking-wider">Top 3</span>
      </div>
      <div className={cn('space-y-0.5', compact ? 'p-1' : 'p-1.5')}>
        {sorted.map(todo => {
          const color = TOP3_COLORS[(todo.top3Rank ?? 1) - 1] ?? '#F59E0B';
          return (
            <button key={todo.id} onClick={() => onSelect(todo.id)}
              className="w-full text-left flex items-center gap-1 rounded hover:opacity-80 transition-opacity">
              <span
                className={cn(
                  'rounded-full flex items-center justify-center shrink-0 font-black',
                  compact ? 'w-3 h-3 text-[7px]' : 'w-3.5 h-3.5 text-[8px]',
                )}
                style={{ backgroundColor: color + '30', color }}
              >
                {todo.top3Rank}
              </span>
              <span
                className={cn(
                  'truncate font-semibold leading-tight',
                  compact ? 'text-[8px]' : 'text-[10px]',
                  todo.isCompleted && 'line-through opacity-50',
                )}
                style={{ color }}
              >
                {todo.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 미배정 할일 추가 드롭다운 (릴리즈 번들 u5 컴포넌트) ──────────────────────
function UnassignedPicker({
  options,
  onSelect,
  onClose,
  isEn,
}: {
  options: Todo[];
  onSelect: (todo: Todo) => void;
  onClose: () => void;
  isEn: boolean;
}) {
  return (
    <div className="px-4 py-2 max-h-48 overflow-y-auto">
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {isEn ? 'No unassigned tasks for today' : '오늘 미배정 할일 없음'}
        </p>
      ) : (
        <div className="space-y-0.5">
          {options.map(todo => (
            <button key={todo.id} onClick={() => onSelect(todo)}
              className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor(todo) }} />
              <span className="text-xs truncate text-foreground/80">{todo.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Day View (릴리즈 번들 pa 의 day===x 섹션) ────────────────────────────────
function DayView({
  storeTodos,   // aiDeck 제외 전체 (완료 포함)
  unassignedToday, // 오늘 미배정 (블록 추가용)
  onSelect,
  onAssign,
  onUnassign,
  isEn,
}: {
  storeTodos: Todo[];
  unassignedToday: Todo[];
  onSelect: (id: string) => void;
  onAssign: (todoId: string, slot: number) => void;
  onUnassign: (todoId: string) => void;
  isEn: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowY,          setNowY]         = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockDef | null>(null);
  const totalH = HOURS.length * HOUR_PX; // 896 px

  // 현재 시각 레드라인 (60초 갱신)
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const y = toY(now.getHours(), now.getMinutes());
      setNowY(y >= 0 && y <= totalH ? y : null);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [totalH]);

  // day 뷰 진입 시 8시로 스크롤
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = toY(8, 0);
  }, []);

  // Top3 (미완료만)
  const top3 = useMemo(
    () => storeTodos.filter(t => t.top3Rank != null && !t.isCompleted),
    [storeTodos],
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Top3 배너 */}
      {top3.length > 0 && (
        <div className="px-4 pt-2 pb-1 shrink-0">
          <div className="max-w-2xl mx-auto flex">
            <div className="w-14 shrink-0" />
            <div className="flex-1 mr-4">
              <Top3Mini top3Todos={top3} onSelect={onSelect} compact={false} />
            </div>
          </div>
        </div>
      )}

      {/* 타임라인 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4" ref={scrollRef}>
        <div className="max-w-2xl mx-auto">
          <div className="flex" style={{ height: totalH }}>

            {/* 시간 레이블 (좌측) */}
            <div className="w-14 shrink-0 relative select-none">
              {HOURS.map(h => (
                <div key={h} className="absolute w-full flex items-start justify-end pr-2"
                  style={{ top: toY(h, 0) - 9 }}>
                  <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                    {h === 12
                      ? (isEn ? '12 PM' : '오후 12')
                      : h < 12 ? `${h} AM` : `${h - 12} PM`}
                  </span>
                </div>
              ))}
            </div>

            {/* 타임라인 본체 */}
            <div className="flex-1 relative border-l border-border/30 mr-4">
              {/* 정시 선 */}
              {HOURS.map(h => (
                <div key={h} className="absolute w-full border-t border-border/20" style={{ top: toY(h, 0) }} />
              ))}
              {/* 30분 점선 */}
              {HOURS.slice(0, -1).map(h => (
                <div key={h + 0.5} className="absolute w-full border-t border-dashed border-border/10"
                  style={{ top: toY(h, 30) }} />
              ))}

              {/* 블록들 */}
              {BLOCK_DEFS.map(block => {
                const top    = toY(block.startH, block.startM);
                const height = toY(block.endH, block.endM) - top;
                const tasks  = sortTodos(storeTodos.filter(t => t.timeBlockSlot === block.slot));
                const isSelected = selectedBlock?.slot === block.slot;

                return (
                  <div
                    key={block.slot}
                    className="absolute left-0 right-0 rounded-lg overflow-hidden cursor-pointer"
                    style={{
                      top, height,
                      backgroundColor: block.color + '12',
                      borderLeft: `3px solid ${block.color}`,
                    }}
                    onClick={() => setSelectedBlock(isSelected ? null : block)}
                  >
                    {/* 블록 헤더 */}
                    <div className="flex items-center gap-1.5 px-2 pt-1">
                      <span className="text-[10px] font-extrabold" style={{ color: block.color }}>
                        {block.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{block.time}</span>
                    </div>

                    {/* 블록 내 할일 목록 */}
                    <div className="px-2 space-y-0.5 overflow-hidden"
                      style={{ maxHeight: height - 24 }}>
                      {tasks.map(todo => (
                        <div
                          key={todo.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] group cursor-pointer transition-opacity"
                          style={{ backgroundColor: block.color + '20', opacity: todo.isCompleted ? 0.4 : 1 }}
                          onClick={e => { e.stopPropagation(); onSelect(todo.id); }}
                        >
                          {/* 체크 원 */}
                          <div
                            className="w-2.5 h-2.5 rounded-full border shrink-0"
                            style={{
                              borderColor: block.color,
                              backgroundColor: todo.isCompleted ? block.color : 'transparent',
                            }}
                          />
                          <span
                            className={cn('flex-1 truncate font-medium', todo.isCompleted && 'line-through')}
                            style={{ color: block.color }}
                          >
                            {todo.title}
                          </span>
                          {/* ✕ 제거 버튼 (hover 시 표시) */}
                          <button
                            className="opacity-0 group-hover:opacity-70 text-[9px] shrink-0"
                            style={{ color: block.color }}
                            onClick={e => { e.stopPropagation(); onUnassign(todo.id); }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* 현재 시각 레드라인 */}
              {nowY !== null && (
                <div className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
                  style={{ top: nowY }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shrink-0" />
                  <div className="flex-1 h-px bg-red-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 블록 클릭 시 하단 패널 (릴리즈 번들 h && ... 섹션) */}
      {selectedBlock && (
        <div className="border-t border-border/50 shrink-0 bg-background shadow-lg">
          {/* 패널 헤더 */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedBlock.color }} />
            <span className="text-xs font-bold" style={{ color: selectedBlock.color }}>
              {selectedBlock.label} · {selectedBlock.time}
            </span>
            <button className="ml-auto text-xs text-muted-foreground" onClick={() => setSelectedBlock(null)}>
              ✕
            </button>
          </div>
          {/* 미배정 할일 목록 (블록에 추가 가능) */}
          <UnassignedPicker
            options={unassignedToday}
            onSelect={todo => { onAssign(todo.id, selectedBlock.slot); setSelectedBlock(null); }}
            onClose={() => setSelectedBlock(null)}
            isEn={isEn}
          />
        </div>
      )}
    </div>
  );
}

// ── Week View (릴리즈 번들 pn 컴포넌트 정확 복원) ───────────────────────────
function WeekView({
  weekStart,
  storeTodos,
  onSelect,
  isEn,
}: {
  weekStart: Date;
  storeTodos: Todo[];
  onSelect: (id: string) => void;
  isEn: boolean;
}) {
  const { updateTodo } = useStore();
  const today = new Date();
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const DAY_LABELS = isEn
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['월', '화', '수', '목', '금', '토', '일'];

  const handleDragEnd = useCallback(async ({ destination, source, draggableId }: DropResult) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const dayIdx = parseInt(destination.droppableId.replace('week-', ''));
    if (!isNaN(dayIdx)) {
      await updateTodo(draggableId, { dueDate: days[dayIdx], timeBlockSlot: null, top3Rank: null });
    }
  }, [updateTodo, days]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-border/30 shrink-0">
          {days.map((day, i) => {
            const isTod = isSameDay(day, today);
            return (
              <div key={i} className={cn(
                'flex flex-col items-center py-2 border-r border-border/20 last:border-0',
                isTod && 'bg-primary/5',
              )}>
                <span className={cn('text-[10px] font-semibold uppercase',
                  isTod ? 'text-primary' : 'text-muted-foreground')}>
                  {DAY_LABELS[i]}
                </span>
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
                  isTod && 'bg-primary text-primary-foreground')}>
                  <span className={cn('text-xs font-bold', !isTod && 'text-foreground')}>
                    {day.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 셀 그리드 */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto">
          {days.map((day, dayIdx) => {
            const isTod = isSameDay(day, today);

            // 마감일이 정확히 일치하는 할일만 표시 (overdue 허지 안 함)
            const dayTodos = storeTodos.filter(t => {
              const due = getDue(t);
              if (!due) return false;
              return isSameDay(due, day);
            });

            // TOP3: 날짜 무관, 오늘 컬럼에만 표시
            const top3 = isTod
              ? storeTodos
                  .filter(t => t.top3Rank != null)
                  .sort((a, b) => (a.top3Rank ?? 9) - (b.top3Rank ?? 9))
              : [];

            // 블록 pills: 오늘 컬럼에만, TOP3와 겹치지 않게
            const blocks = isTod
              ? BLOCK_DEFS.map(b => ({ ...b, tasks: sortTodos(dayTodos.filter(t => t.timeBlockSlot === b.slot && t.top3Rank == null)) }))
              : [];
            // 미배정: TOP3·블록 제외
            const unblocked = sortTodos(
              isTod
                ? dayTodos.filter(t => !t.timeBlockSlot && t.top3Rank == null)
                : dayTodos.filter(t => t.top3Rank == null),
            );

            return (
              <div key={dayIdx} className={cn(
                'border-r border-b border-border/20 last:border-r-0 p-1.5 min-h-[180px] flex flex-col',
                isTod && 'bg-primary/[0.03]',
              )}>
                {/* Top3 */}
                <Top3Mini top3Todos={top3} onSelect={onSelect} compact />

                {/* 블록 pills (오늘만) */}
                {blocks.filter(b => b.tasks.length > 0).map(b => (
                  <div key={b.slot} className="rounded-md px-1.5 py-1 space-y-0.5 mb-1"
                    style={{ backgroundColor: b.color + '18', borderLeft: `2px solid ${b.color}` }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold" style={{ color: b.color }}>{b.label}</span>
                      <span className="text-[8px] font-medium opacity-60" style={{ color: b.color }}>{b.time}</span>
                    </div>
                    {b.tasks.map(t => (
                      <button key={t.id} onClick={() => onSelect(t.id)}
                        className={cn('w-full text-left text-[10px] truncate block px-1',
                          t.isCompleted ? 'line-through text-foreground/40' : 'text-foreground/80 hover:text-foreground')}>
                        {t.title}
                      </button>
                    ))}
                  </div>
                ))}

                {/* 드래그 존 */}
                <Droppable droppableId={`week-${dayIdx}`}>
                  {(provided, snap) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={cn('space-y-0.5 flex-1 min-h-[60px] transition-colors rounded',
                        snap.isDraggingOver && 'bg-primary/5')}>
                      {unblocked.map((todo, idx) => (
                        <Draggable key={todo.id} draggableId={todo.id} index={idx}>
                          {(drag, dragSnap) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              onClick={() => onSelect(todo.id)}
                              className={cn(
                                'w-full text-left flex items-center gap-1 px-1 py-0.5 rounded transition-colors cursor-grab active:cursor-grabbing select-none',
                                dragSnap.isDragging
                                  ? 'bg-background shadow-md ring-1 ring-primary/20 z-50'
                                  : 'hover:bg-muted/50',
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: dotColor(todo) }} />
                              <span className={cn('text-[10px] truncate',
                                todo.isCompleted ? 'line-through text-muted-foreground/50' : 'text-foreground/80')}>
                                {todo.title}
                              </span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}

// ── Month View (릴리즈 번들 po 컴포넌트 정확 복원) ──────────────────────────
function MonthView({
  month,
  storeTodos,
  onSelect,
  onMoreClick,
  isEn,
}: {
  month: Date;
  storeTodos: Todo[];
  onSelect: (id: string) => void;
  onMoreClick: () => void;
  isEn: boolean;
}) {
  const { updateTodo } = useStore();
  const today    = new Date();
  const gridFrom = getMonday(mStart(month));
  const cells    = Array.from({ length: 42 }, (_, i) => addDays(gridFrom, i));
  const DAY_LABELS = isEn
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['월', '화', '수', '목', '금', '토', '일'];

  const handleDragEnd = useCallback(async ({ destination, source, draggableId }: DropResult) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const cellIdx = parseInt(destination.droppableId.replace('month-', ''));
    if (!isNaN(cellIdx)) {
      await updateTodo(draggableId, { dueDate: cells[cellIdx], timeBlockSlot: null, top3Rank: null });
    }
  }, [updateTodo, cells]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-border/30 shrink-0">
          {DAY_LABELS.map(d => (
            <div key={d}
              className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase border-r border-border/20 last:border-0">
              {d}
            </div>
          ))}
        </div>

        {/* 셀 그리드 */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(80px, 1fr)' }}>
            {cells.map((cell, idx) => {
              const isTod   = isSameDay(cell, today);
              const inMonth = cell.getMonth() === month.getMonth();

              // 마감일이 일치하는 할일만
              const cellTodos = storeTodos.filter(t => {
                const due = getDue(t);
                return !!due && isSameDay(due, cell);
              });

              // TOP3: 날짜 무관, 오늘 셀에만 표시
              const top3 = isTod
                ? storeTodos
                    .filter(t => t.top3Rank != null)
                    .sort((a, b) => (a.top3Rank ?? 9) - (b.top3Rank ?? 9))
                : cellTodos.filter(t => t.top3Rank != null);
              const others  = sortTodos(cellTodos.filter(t => t.top3Rank == null));
              const maxShow = top3.length > 0 ? 2 : 3;
              const overflow = Math.max(0, others.length - maxShow);

              return (
                <div key={idx} className={cn(
                  'border-r border-b border-border/15 p-1 flex flex-col',
                  isTod && 'bg-primary/5',
                  !inMonth && 'opacity-35 bg-muted/10',
                )}>
                  {/* 날짜 숫자 */}
                  <div className={cn(
                    'w-5 h-5 flex items-center justify-center rounded-full mb-0.5',
                    isTod && 'bg-primary text-primary-foreground',
                  )}>
                    <span className={cn('text-[10px] font-bold', !isTod && 'text-foreground/70')}>
                      {cell.getDate()}
                    </span>
                  </div>

                  {/* Top3 */}
                  <Top3Mini top3Todos={top3} onSelect={onSelect} compact />

                  {/* 일반 할일 */}
                  <Droppable droppableId={`month-${idx}`}>
                    {(provided, snap) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={cn('space-y-0.5 flex-1 min-h-[40px] transition-colors rounded',
                          snap.isDraggingOver && 'bg-primary/5')}>
                        {others.slice(0, maxShow).map((todo, i) => (
                          <Draggable key={todo.id} draggableId={todo.id} index={i}>
                            {(drag, dragSnap) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                onClick={() => onSelect(todo.id)}
                                className={cn(
                                  'w-full flex items-center gap-1 px-0.5 py-0.5 rounded cursor-pointer hover:bg-muted/40 transition-colors select-none',
                                  dragSnap.isDragging && 'bg-background shadow-md ring-1 ring-primary/20 z-50',
                                )}
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: dotColor(todo) }} />
                                <span className={cn('text-[9px] truncate leading-tight',
                                  todo.isCompleted
                                    ? 'line-through text-muted-foreground/40'
                                    : 'text-foreground/80')}>
                                  {todo.title}
                                </span>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {overflow > 0 && (
                          <button onClick={onMoreClick}
                            className="text-[9px] font-semibold text-primary/70 hover:text-primary pl-1 hover:underline transition-colors block text-left w-full mt-1">
                            +{overflow} {isEn ? 'more' : '더보기'}
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}

// ── CalendarView (메인 export) ────────────────────────────────────────────────
export function CalendarView({ todos, defaultSub = 'week' }: {
  todos: Todo[];       // blockViewTodos (pre-filtered by TodayBlockView)
  defaultSub?: CalSub;
}) {
  const { setSelectedTodo, updateTodo, language } = useStore();
  const isEn  = language === 'en';
  const today = new Date();

  const [sub,       setSub]       = useState<CalSub>(defaultSub);
  const [weekStart, setWeekStart] = useState(() => getMonday(today));
  const [month,     setMonth]     = useState(() => mStart(today));

  const goToday = () => { setWeekStart(getMonday(today)); setMonth(mStart(today)); };
  const prev    = () => sub === 'week' ? setWeekStart(d => addDays(d, -7)) : setMonth(d => addMonths(d, -1));
  const next    = () => sub === 'week' ? setWeekStart(d => addDays(d,  7)) : setMonth(d => addMonths(d,  1));

  const navLabel = sub === 'week'
    ? (() => {
        const end = addDays(weekStart, 6);
        return isEn
          ? `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : `${weekStart.getMonth()+1}/${weekStart.getDate()} – ${end.getMonth()+1}/${end.getDate()}`;
      })()
    : isEn
      ? month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${month.getFullYear()}년 ${month.getMonth()+1}월`;

  const SUB_TABS: { key: CalSub; label: string; labelKo: string }[] = [
    { key: 'day',   label: 'Day',   labelKo: '하루' },
    { key: 'week',  label: 'Week',  labelKo: '한 주' },
    { key: 'month', label: 'Month', labelKo: '월' },
  ];

  // Day 뷰용: 오늘 미배정 (블록 할당 가능 목록)
  const unassignedToday = useMemo(() =>
    todos.filter(t =>
      !t.isCompleted &&
      !t.timeBlockSlot &&
      !!t.dueDate &&
      isToday(t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate)),
    ),
    [todos],
  );

  const handleAssign   = useCallback(async (id: string, slot: number) => {
    await updateTodo(id, { timeBlockSlot: slot });
  }, [updateTodo]);

  const handleUnassign = useCallback(async (id: string) => {
    await updateTodo(id, { timeBlockSlot: null, top3Rank: null });
  }, [updateTodo]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 서브탭 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20 shrink-0 flex-wrap">
        <div className="flex items-center bg-muted/60 rounded-lg p-0.5 gap-0.5">
          {SUB_TABS.map(t => (
            <button key={t.key} onClick={() => setSub(t.key)}
              className={cn('px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all',
                sub === t.key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground')}>
              {isEn ? t.label : t.labelKo}
            </button>
          ))}
        </div>

        {/* 주/월 네비게이션 */}
        {sub !== 'day' && (
          <div className="flex items-center gap-1">
            <button onClick={prev}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors">
              ‹
            </button>
            <span className="text-[11px] font-semibold text-foreground min-w-[130px] text-center">
              {navLabel}
            </span>
            <button onClick={next}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors">
              ›
            </button>
            <button onClick={goToday}
              className="ml-1 text-[10px] font-semibold text-primary hover:text-primary/80 px-2 py-0.5 rounded border border-primary/30 hover:bg-primary/5 transition-colors">
              {isEn ? 'Today' : '오늘'}
            </button>
          </div>
        )}
      </div>

      {/* 뷰 렌더링 */}
      {sub === 'day' && (
        <DayView
          storeTodos={todos}
          unassignedToday={unassignedToday}
          onSelect={setSelectedTodo}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          isEn={isEn}
        />
      )}
      {sub === 'week' && (
        <WeekView
          weekStart={weekStart}
          storeTodos={todos}
          onSelect={setSelectedTodo}
          isEn={isEn}
        />
      )}
      {sub === 'month' && (
        <MonthView
          month={month}
          storeTodos={todos}
          onSelect={setSelectedTodo}
          onMoreClick={() => setSub('day')}
          isEn={isEn}
        />
      )}
    </div>
  );
}
