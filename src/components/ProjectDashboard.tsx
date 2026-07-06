"use client";
import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useExternalLinks } from '@/hooks/useExternalLinks';
import type { Folder, Todo } from '@/types';
import { cn } from '@/lib/utils';
import {
  Layers, Link2, Copy, Trash2, Plus, CheckCircle2,
  Clock, AlertCircle, User, Wrench, ExternalLink, RefreshCw
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-border/30 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }} />
    </div>
  );
}

function StatusBadge({ todo }: { todo: Todo }) {
  if (todo.approvalStatus === 'pending')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">⏳ 승인 대기</span>;
  if (todo.approvalStatus === 'approved')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 border border-green-500/30">✔ 승인됨</span>;
  if (todo.approvalStatus === 'rejected')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30">✗ 거절됨</span>;
  if (todo.approvalStatus === 'revision_requested')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">↩ 수정 요청</span>;
  if (todo.delegateStatus === 'in_progress')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-500 border border-sky-500/30">🔄 진행중</span>;
  if (todo.delegateStatus === 'blocked')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30">⛔ 막힘</span>;
  if (todo.delegateStatus === 'completed')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 border border-green-500/30">✔ 완료</span>;
  if (todo.isCompleted)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 border border-green-500/30">✔ 완료</span>;
  return null;
}

function TodoRow({ todo, onClick }: { todo: Todo; onClick: () => void }) {
  const due = todo.dueDate
    ? `~${(todo.dueDate instanceof Date ? todo.dueDate : new Date(todo.dueDate)).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`
    : null;
  return (
    <div className="flex items-center gap-2 py-2 px-3 border-b border-border/20 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={onClick}>
      <div className={cn("w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
        todo.isCompleted ? "bg-green-500 border-green-500" : "border-muted-foreground/30")}>
        {todo.isCompleted && <span className="text-white text-[8px] font-bold">✓</span>}
      </div>
      <span className={cn("flex-1 text-[13px] font-medium truncate",
        todo.isCompleted ? "line-through text-muted-foreground/50" : "text-foreground")}>
        {todo.title}
      </span>
      <StatusBadge todo={todo} />
      {due && <span className="text-[10px] text-muted-foreground/60 shrink-0">{due}</span>}
    </div>
  );
}

function Section({ icon, title, subtitle, todos, accentColor, setSelectedTodo }: {
  icon: React.ReactNode; title: string; subtitle: string;
  todos: Todo[]; accentColor: string; setSelectedTodo: (id: string) => void;
}) {
  if (todos.length === 0) return null;
  const completed = todos.filter(t => t.isCompleted).length;
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 pl-4"
        style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}>
        <span className="shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-[11px] font-bold shrink-0" style={{ color: accentColor }}>{completed}/{todos.length}</span>
      </div>
      {todos.map(todo => <TodoRow key={todo.id} todo={todo} onClick={() => setSelectedTodo(todo.id)} />)}
    </div>
  );
}

function LinkCard({ link, onRevoke }: { link: any; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const isClient = link.linkType === 'client_view';
  const color = isClient ? '#6366F1' : '#F59E0B';
  const label = isClient ? '👤 Client View' : '🔧 Delegate Work';
  const handleCopy = async () => {
    await navigator.clipboard.writeText(link.portalUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>{label}</span>
        {link.targetName && <span className="text-[12px] font-medium text-foreground">{link.targetName}</span>}
        {link.targetEmail && <span className="text-[11px] text-muted-foreground">({link.targetEmail})</span>}
        <button onClick={onRevoke} className="ml-auto text-muted-foreground/50 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2 py-1.5">
        <Link2 className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        <span className="text-[11px] text-muted-foreground truncate flex-1 font-mono">{link.portalUrl}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] font-bold shrink-0 transition-colors"
          style={{ color: copied ? '#22C55E' : '#6366F1' }}>
          <Copy className="w-3 h-3" />{copied ? '복사됨!' : '복사'}
        </button>
        <a href={link.portalUrl} target="_blank" rel="noopener noreferrer"
          className="text-muted-foreground/60 hover:text-foreground transition-colors ml-1">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function CreateLinkForm({ folderId, onCreated }: { folderId: string; onCreated: () => void }) {
  const { createLink } = useExternalLinks();
  const [linkType, setLinkType] = useState<'client_view' | 'delegate_work'>('client_view');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  if (!show) return (
    <button onClick={() => setShow(true)}
      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold text-muted-foreground border border-dashed border-border/50 hover:border-primary/50 hover:text-primary transition-colors">
      <Plus className="w-3.5 h-3.5" /> 새 링크 생성
    </button>
  );
  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createLink(linkType, { folderId, targetName: name.trim(), targetEmail: email.trim() || undefined });
      setName(''); setEmail(''); setShow(false); onCreated();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex gap-1.5">
        {(['client_view', 'delegate_work'] as const).map(t => (
          <button key={t} onClick={() => setLinkType(t)}
            className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all",
              linkType === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {t === 'client_view' ? '👤 Client View' : '🔧 Delegate Work'}
          </button>
        ))}
      </div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="이름 (예: John Smith)"
        className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary/50" />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일 (선택)"
        className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-primary/50" />
      <div className="flex gap-2">
        <button onClick={() => setShow(false)}
          className="flex-1 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground border border-border/50 hover:bg-muted/50">취소</button>
        <button onClick={handleCreate} disabled={loading || !name.trim()}
          className="flex-1 py-1.5 rounded-lg text-[12px] font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-opacity">
          {loading ? '생성 중…' : '생성'}
        </button>
      </div>
    </div>
  );
}

export function ProjectDashboard({ folder }: { folder: Folder }) {
  const { todos, setSelectedTodo } = useStore();
  const { clientLinks, partnerLinks, isLoading: linksLoading, revokeLink, fetchLinks } = useExternalLinks();

  const folderTodos     = todos.filter(t => t.folderId === folder.id);
  const myTodos         = folderTodos.filter(t => !t.todoRole || t.todoRole === 'own');
  const clientTodos     = folderTodos.filter(t => t.todoRole === 'client_request');
  const delegateTodos   = folderTodos.filter(t => t.todoRole === 'delegated');
  const total           = folderTodos.length;
  const completedCount  = folderTodos.filter(t => t.isCompleted).length;
  const progress        = total > 0 ? completedCount / total : 0;
  const pendingApproval = folderTodos.filter(t => t.approvalStatus === 'pending');
  const folderLinks     = [...clientLinks, ...partnerLinks].filter(l => l.folderId === folder.id);
  const progressColor   = progress >= 0.8 ? '#22C55E' : progress >= 0.4 ? '#0EA5E9' : '#6366F1';

  const handleRevoke = async (id: string) => {
    if (!confirm('이 링크를 비활성화하시겠습니까?')) return;
    await revokeLink(id);
    await fetchLinks();
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-6 space-y-6">

        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: (folder.color ?? '#6366F1') + '20' }}>
            <Layers className="w-5 h-5" style={{ color: folder.color ?? '#6366F1' }} />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{folder.name}</h1>
            {folder.description && <p className="text-[12px] text-muted-foreground mt-0.5">{folder.description}</p>}
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            🗂 PROJECT
          </span>
        </div>

        {/* 진행률 */}
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">전체 진행률</span>
            <span className="text-[13px] font-bold" style={{ color: progressColor }}>{Math.round(progress * 100)}%</span>
          </div>
          <ProgressBar value={progress} color={progressColor} />
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />완료 {completedCount}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-muted-foreground/60" />남은 {total - completedCount}</span>
            <span className="ml-auto">전체 {total}</span>
          </div>
        </div>

        {/* 승인 대기 경고 */}
        {pendingApproval.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">
              클라이언트 승인 대기 {pendingApproval.length}건
            </span>
          </div>
        )}

        {/* 할일 섹션 */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">할일</p>
          <Section icon={<User className="w-3.5 h-3.5 text-indigo-500" />} title="내 작업" subtitle="My Tasks"
            todos={myTodos} accentColor="#6366F1" setSelectedTodo={setSelectedTodo} />
          <Section icon={<AlertCircle className="w-3.5 h-3.5 text-amber-500" />} title="클라이언트 요청" subtitle="Client Requests · 승인 필요"
            todos={clientTodos} accentColor="#F59E0B" setSelectedTodo={setSelectedTodo} />
          <Section icon={<Wrench className="w-3.5 h-3.5 text-sky-500" />} title="위임 작업" subtitle="Delegated · 파트너 진행 중"
            todos={delegateTodos} accentColor="#0EA5E9" setSelectedTodo={setSelectedTodo} />
          {folderTodos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/50 text-[13px]">
              이 프로젝트에 할일이 없습니다.<br/>
              <span className="text-[11px]">할일을 이 폴더로 이동하거나 새로 추가하세요.</span>
            </div>
          )}
        </div>

        {/* 포털 링크 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex-1">포털 링크</p>
            <button onClick={() => fetchLinks()} className="text-muted-foreground/50 hover:text-foreground transition-colors">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          {linksLoading ? (
            <p className="text-[12px] text-muted-foreground/50 text-center py-3">링크 로딩 중…</p>
          ) : folderLinks.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/50 text-center py-3">아직 생성된 포털 링크가 없습니다.</p>
          ) : (
            folderLinks.map(link => <LinkCard key={link.id} link={link} onRevoke={() => handleRevoke(link.id)} />)
          )}
          <CreateLinkForm folderId={folder.id} onCreated={() => fetchLinks()} />
        </div>

        {/* 협업자 */}
        {folder.collaborators.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">협업자</p>
            <div className="flex flex-wrap gap-2">
              {folder.collaborators.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 border border-border/40">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={c.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px]">{c.initial}</AvatarFallback>
                  </Avatar>
                  <span className="text-[12px] font-medium text-foreground">{c.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
