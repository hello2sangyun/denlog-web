'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '@/store/useStore';
import type { Todo } from '@/types';

// ── SVG 아이콘 모음 ─────────────────────────────────────────────────
const Icon = {
  Star: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  ),
  Pencil: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  FileText: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Clock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Flag: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
  Link: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Folder: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Tag: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Quote: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

// ── 스타일 상수 ──────────────────────────────────────────────────────
const C = {
  primary:  'var(--primary)',
  card:     'var(--card)',
  fg:       'var(--foreground)',
  muted:    'var(--muted)',
  mutedFg:  'var(--muted-foreground)',
  border:   'var(--border)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px', borderRadius: 8,
  border: `1px solid color-mix(in srgb, var(--border) 45%, transparent)`,
  background: C.card, color: C.fg,
  fontSize: 14, outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontSize: 11, fontWeight: 700, color: C.mutedFg,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 6,
};

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export function AiReviewBanner() {
  const { todos, folders, updateTodo, deleteTodos, language } = useStore();
  const isEn = language === 'en';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [mounted, setMounted]           = useState(false);

  const [editTitle,    setEditTitle]    = useState('');
  const [editMemo,     setEditMemo]     = useState('');
  const [editDueDate,  setEditDueDate]  = useState('');
  const [editDueTime,  setEditDueTime]  = useState('');
  const [editPriority, setEditPriority] = useState<'low'|'medium'|'high'>('low');
  const [isDirty,      setIsDirty]      = useState(false);
  const memoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const pendingTodos = todos.filter(t => t.aiDeckPending);
  const safeIndex    = Math.min(currentIndex, Math.max(pendingTodos.length - 1, 0));
  const currentTodo  = pendingTodos[safeIndex];

  const resetForm = useCallback((todo: Todo) => {
    setEditTitle(todo.title ?? '');
    setEditMemo(todo.memo ?? '');
    setEditDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : '');
    setEditDueTime(todo.dueTime ?? '');
    setEditPriority((todo.priority as 'low'|'medium'|'high') ?? 'low');
    setIsDirty(false);
  }, []);

  useEffect(() => { if (currentTodo) resetForm(currentTodo); }, [currentTodo?.id, resetForm]);

  // Auto-resize memo textarea
  useEffect(() => {
    const el = memoRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editMemo]);

  if (pendingTodos.length === 0) return null;

  const handleNext = () => setCurrentIndex(p => Math.min(p + 1, pendingTodos.length - 1));
  const handlePrev = () => setCurrentIndex(p => Math.max(p - 1, 0));

  const handleSave = () => {
    updateTodo(currentTodo.id, {
      title:        editTitle.trim() || currentTodo.title,
      memo:         editMemo || undefined,
      dueDate:      editDueDate ? new Date(editDueDate) : null,
      dueTime:      editDueTime || null,
      priority:     editPriority,
      aiDeckPending: false,
    });
    if (safeIndex >= pendingTodos.length - 1 && safeIndex > 0) setCurrentIndex(safeIndex - 1);
    if (pendingTodos.length === 1) setIsModalOpen(false);
  };

  const handleDelete = () => {
    deleteTodos([currentTodo.id]);
    if (safeIndex >= pendingTodos.length - 1 && safeIndex > 0) setCurrentIndex(safeIndex - 1);
    if (pendingTodos.length === 1) setIsModalOpen(false);
  };

  const folder = folders.find(f => f.id === currentTodo.folderId);

  const pOptions: { value: 'high'|'medium'|'low'; label: string; color: string }[] = [
    { value: 'high',   label: isEn ? 'High'   : '높음', color: '#ef4444' },
    { value: 'medium', label: isEn ? 'Medium' : '중간', color: '#f97316' },
    { value: 'low',    label: isEn ? 'Low'    : '낮음', color: '#9ca3af' },
  ];

  const sourceLabel: Record<string, string> = {
    gmail: 'Gmail',
    manual:  isEn ? 'Manual'        : '직접 입력',
    voice:   isEn ? 'Voice'         : '음성 녹음',
    calendar:isEn ? 'Calendar'      : '캘린더',
    ai:      'AI',
    meeting: isEn ? 'Meeting notes' : '회의록',
    slack:   'Slack',
  };

  // ── 모달 ───────────────────────────────────────────────────────
  const modal = mounted && isModalOpen ? ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => setIsModalOpen(false)}
    >
      <div
        style={{
          width: 580, height: 640,
          maxWidth: '95vw', maxHeight: '95vh',
          backgroundColor: C.card, color: C.fg,
          borderRadius: 18,
          boxShadow: '0 30px 80px rgba(0,0,0,0.28)',
          border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'aiPop 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
          background: C.muted,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: C.primary, color: '#fff',
              fontSize: 11, fontWeight: 800,
              padding: '4px 12px', borderRadius: 20,
            }}>
              <Icon.Star /> {isEn ? 'AI Suggested' : 'AI 추천'}
            </span>
            <span style={{ fontSize: 13, color: C.mutedFg, fontWeight: 600 }}>
              {safeIndex + 1} / {pendingTodos.length}
            </span>
            {isDirty && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.primary,
                padding: '2px 8px', borderRadius: 10,
                border: `1px solid ${C.primary}`,
              }}>
                {isEn ? 'Edited' : '수정됨'}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.mutedFg, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.border; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <Icon.Close />
          </button>
        </div>

        {/* ── 바디 (스크롤) ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '20px 22px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {/* 제목 */}
          <div>
            <label style={labelStyle}>
              <span style={{ color: C.mutedFg }}><Icon.Pencil /></span> {isEn ? 'Title' : '제목'}
            </label>
            <input
              style={{ ...inputStyle, fontSize: 17, fontWeight: 700, padding: '10px 14px' }}
              value={editTitle}
              onChange={e => { setEditTitle(e.target.value); setIsDirty(true); }}
              onFocus={e => { e.target.style.borderColor = C.primary; }}
              onBlur={e => { e.target.style.borderColor = 'color-mix(in srgb, var(--border) 45%, transparent)'; }}
              placeholder={isEn ? 'Task title' : '할 일 제목'}
            />
          </div>

          {/* 메모 */}
          <div>
            <label style={labelStyle}>
              <span style={{ color: C.mutedFg }}><Icon.FileText /></span> {isEn ? 'Memo' : '메모'}
            </label>
            <textarea
              ref={memoRef}
              style={{ ...inputStyle, resize: 'none', minHeight: 72, lineHeight: 1.6, overflow: 'hidden' }}
              value={editMemo}
              onChange={e => { setEditMemo(e.target.value); setIsDirty(true); }}
              onFocus={e => { e.target.style.borderColor = C.primary; }}
              onBlur={e => { e.target.style.borderColor = 'color-mix(in srgb, var(--border) 45%, transparent)'; }}
              placeholder={isEn ? 'Additional notes (optional)' : '추가 메모 (선택)'}
            />
          </div>

          {/* 마감일 + 시간 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>
                <span style={{ color: C.mutedFg }}><Icon.Calendar /></span> {isEn ? 'Due Date' : '마감일'}
              </label>
              <input
                type="date" style={inputStyle}
                value={editDueDate}
                onChange={e => { setEditDueDate(e.target.value); setIsDirty(true); }}
                onFocus={e => { e.target.style.borderColor = C.primary; }}
                onBlur={e => { e.target.style.borderColor = 'color-mix(in srgb, var(--border) 45%, transparent)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <span style={{ color: C.mutedFg }}><Icon.Clock /></span> {isEn ? 'Time' : '시간'}
              </label>
              <input
                type="time" style={inputStyle}
                value={editDueTime}
                onChange={e => { setEditDueTime(e.target.value); setIsDirty(true); }}
                onFocus={e => { e.target.style.borderColor = C.primary; }}
                onBlur={e => { e.target.style.borderColor = 'color-mix(in srgb, var(--border) 45%, transparent)'; }}
              />
            </div>
          </div>

          {/* 우선순위 */}
          <div>
            <label style={labelStyle}>
              <span style={{ color: C.mutedFg }}><Icon.Flag /></span> {isEn ? 'Priority' : '우선순위'}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {pOptions.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setEditPriority(p.value); setIsDirty(true); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: editPriority === p.value
                      ? `2px solid ${p.color}`
                      : `1.5px solid ${C.border}`,
                    background: editPriority === p.value
                      ? `${p.color}18`
                      : C.card,
                    color: editPriority === p.value ? p.color : C.mutedFg,
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 출처 (읽기 전용) */}
          {currentTodo.source && (
            <div>
              <label style={labelStyle}>
                <span style={{ color: C.mutedFg }}><Icon.Link /></span> {isEn ? 'Source' : '출처'}
              </label>
              <div style={{
                ...inputStyle,
                background: C.muted,
                color: C.mutedFg,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'default',
                userSelect: 'none',
              }}>
                {sourceLabel[currentTodo.source] ?? currentTodo.source}
              </div>
            </div>
          )}

          {/* 폴더 (읽기 전용) */}
          {folder && (
            <div>
              <label style={labelStyle}>
                <span style={{ color: C.mutedFg }}><Icon.Folder /></span> {isEn ? 'Folder' : '폴더'}
              </label>
              <div style={{
                ...inputStyle,
                background: C.muted, color: C.mutedFg,
                cursor: 'default', userSelect: 'none',
              }}>
                {folder.name}
              </div>
            </div>
          )}

          {/* 태그 (읽기 전용) */}
          {currentTodo.tags && currentTodo.tags.length > 0 && (
            <div>
              <label style={labelStyle}>
                <span style={{ color: C.mutedFg }}><Icon.Tag /></span> {isEn ? 'Tags' : '태그'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {currentTodo.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 12, fontWeight: 600,
                    padding: '3px 12px', borderRadius: 20,
                    border: `1px solid ${C.border}`,
                    background: C.muted, color: C.mutedFg,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 원문 발췌 — Gmail 카드 형식 */}
          {currentTodo.sourceExcerpt && (() => {
            const raw = currentTodo.sourceExcerpt;
            const subjectMatch = raw.match(/^제목:\s*(.+)/m);
            const fromMatch    = raw.match(/^발신자:\s*(.+)/m);
            const dateMatch    = raw.match(/^날짜:\s*(.+)/m);
            const bodyStart    = raw.indexOf('\n\n');
            const body         = bodyStart !== -1 ? raw.slice(bodyStart + 2).trim() : null;
            const isEmail      = !!(subjectMatch || fromMatch);
            if (!isEmail) return null;
            const subject   = subjectMatch?.[1]?.trim() ?? '';
            const from      = fromMatch?.[1]?.trim() ?? '';
            const date      = dateMatch?.[1]?.trim() ?? '';
            const fromName  = from.replace(/<[^>]+>/, '').trim() || from;
            const fromEmail = from.match(/<([^>]+)>/)?.[1] ?? '';
            const dateStr = (() => {
              try {
                const d = new Date(date);
                if (!isNaN(d.getTime())) return d.toLocaleString(isEn ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              } catch (_) {}
              return date;
            })();
            return (
              <div>
                <label style={labelStyle}>
                  <span style={{ color: C.mutedFg }}><Icon.Quote /></span>
                  {isEn ? 'Source Excerpt' : '원문 발췌'}
                </label>
                <div style={{ border: `1px solid color-mix(in srgb, var(--border) 60%, transparent)`, borderRadius: 12, overflow: 'hidden', background: C.card }}>
                  {/* 헤더 */}
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid color-mix(in srgb, var(--border) 40%, transparent)`, background: C.muted }}>
                    {subject && <div style={{ fontSize: 14, fontWeight: 700, color: C.fg, marginBottom: 10, lineHeight: 1.4 }}>{subject}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.fg }}>
                        {fromName}{fromEmail && <span style={{ fontSize: 12, color: C.mutedFg, fontWeight: 400, marginLeft: 6 }}>&lt;{fromEmail}&gt;</span>}
                      </div>
                      {dateStr && <div style={{ fontSize: 11, color: C.mutedFg }}>{dateStr}</div>}
                    </div>
                  </div>
                  {/* 본문 */}
                  {body && (
                    <div style={{ padding: '14px 16px', fontSize: 13, color: C.fg, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {body}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>

        {/* ── 푸터 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 22px', flexShrink: 0,
          borderTop: `1px solid ${C.border}`,
          background: C.muted,
        }}>
          {/* 이전 / 다음 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <NavBtn onClick={handlePrev} disabled={safeIndex === 0}>
              <Icon.ChevronLeft /> {isEn ? 'Prev' : '이전'}
            </NavBtn>
            <NavBtn onClick={handleNext} disabled={safeIndex === pendingTodos.length - 1}>
              {isEn ? 'Next' : '다음'} <Icon.ChevronRight />
            </NavBtn>
          </div>

          {/* 미승인 / 할일로 저장 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDelete}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: 'transparent',
                border: '1.5px solid #ef444455',
                color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ef44441a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon.Trash /> {isEn ? 'Dismiss' : '미승인'}
            </button>
            <button
              onClick={handleSave}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 22px', borderRadius: 10,
                background: C.primary, border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <Icon.Check /> {isEn ? 'Save as Task' : '할일로 저장'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes aiPop {
            from { opacity:0; transform:scale(0.91) translateY(16px); }
            to   { opacity:1; transform:scale(1)    translateY(0);    }
          }
        `}</style>
      </div>
    </div>,
    document.body
  ) : null;

  // ── 배너 ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes aiBannerShimmer {
          0%   { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(300%) skewX(-12deg); }
        }
        @keyframes aiStarPulse {
          0%, 100% { opacity: 1;   transform: scale(1)    rotate(0deg); }
          40%       { opacity: 0.6; transform: scale(1.25) rotate(15deg); }
          70%       { opacity: 1;   transform: scale(0.9)  rotate(-8deg); }
        }
        @keyframes aiGlow {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 0%, transparent),
                                 0 1px 3px rgba(0,0,0,0.08); }
          50%      { box-shadow: 0 0 14px 2px color-mix(in srgb, var(--primary) 22%, transparent),
                                 0 2px 8px rgba(0,0,0,0.12); }
        }
        @keyframes aiBadgePop {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.12); }
        }
        .ai-review-banner {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          flex-shrink: 0;
          cursor: pointer;
          overflow: hidden;
          border-left: 3.5px solid var(--primary);
          border-bottom: 1px solid color-mix(in srgb, var(--primary) 18%, var(--border));
          background: linear-gradient(
            100deg,
            color-mix(in srgb, var(--primary) 12%, transparent) 0%,
            color-mix(in srgb, var(--primary) 5%, transparent)  45%,
            transparent 100%
          );
          animation: aiGlow 2.8s ease-in-out infinite;
          transition: filter 0.15s, transform 0.12s;
        }
        .ai-review-banner:hover {
          filter: brightness(1.04);
          background: linear-gradient(
            100deg,
            color-mix(in srgb, var(--primary) 18%, transparent) 0%,
            color-mix(in srgb, var(--primary) 9%, transparent)  50%,
            transparent 100%
          ) !important;
        }
        .ai-review-banner:active { transform: scaleY(0.97); }
        .ai-banner-shimmer {
          position: absolute;
          top: 0; left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--primary) 10%, white) 50%,
            transparent
          );
          animation: aiBannerShimmer 3s ease-in-out infinite;
          pointer-events: none;
        }
        .ai-star-icon {
          animation: aiStarPulse 2.4s ease-in-out infinite;
          display: inline-flex;
        }
        .ai-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: var(--primary);
          color: white;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: -0.02em;
          animation: aiBadgePop 2.4s ease-in-out infinite;
          flex-shrink: 0;
        }
        .ai-label-text {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--primary);
          flex-shrink: 0;
          letter-spacing: -0.01em;
        }
        .ai-task-preview {
          font-size: 12px;
          color: var(--muted-foreground);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 340px;
        }
        .ai-review-cta {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 12px;
          font-weight: 800;
          color: var(--primary);
          margin-left: 12px;
          flex-shrink: 0;
          padding: 4px 10px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--primary) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
          transition: background 0.15s, border-color 0.15s;
        }
        .ai-review-banner:hover .ai-review-cta {
          background: color-mix(in srgb, var(--primary) 20%, transparent);
          border-color: color-mix(in srgb, var(--primary) 40%, transparent);
        }
      `}</style>

      <div
        className="ai-review-banner"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Shimmer sweep */}
        <div className="ai-banner-shimmer" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, position: 'relative' }}>
          {/* Pulsing star */}
          <span className="ai-star-icon" style={{ color: C.primary }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
          </span>

          {/* Count badge */}
          <span className="ai-badge">{pendingTodos.length}</span>

          {/* Label */}
          <span className="ai-label-text">
            {isEn ? 'AI-suggested tasks to review' : 'AI 추천 할일 검토 필요'}
          </span>

          {/* Task title preview */}
          <span className="ai-task-preview">
            {currentTodo.title}{currentTodo.memo ? ` — ${currentTodo.memo}` : ''}
          </span>
        </div>

        {/* CTA pill */}
        <span className="ai-review-cta">
          {isEn ? 'Review' : '검토하기'}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      </div>
      {modal}
    </>
  );
}

function NavBtn({ onClick, disabled, children }: {
  onClick: () => void; disabled: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '8px 14px', borderRadius: 10,
        background: 'var(--card)', border: '1.5px solid var(--border)',
        color: 'var(--foreground)', fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1, transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--muted)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)'; }}
    >
      {children}
    </button>
  );
}
