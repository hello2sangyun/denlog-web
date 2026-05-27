"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Share2, Trash2, Play, RotateCw, CheckCircle2, Circle, ChevronRight, Users, Clock, AlertCircle, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { transcribeAudio, analyzeWithGPT, saveToSupabase } from '../lib/meetingService';
import { supabase } from '../lib/supabase';


// ── 타입 ─────────────────────────────────────────────────────────────────────
interface RecordingTask {
  id: string;
  title: string;
  memo: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: 'high' | 'medium' | 'low';
  assignee_ids: string[];
  accepted: boolean;
  todo_id: string | null;
}

interface RecordingParticipant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'host' | 'participant';
}

// ── 우선순위 배지 ─────────────────────────────────────────────────────────────
const PRIORITY_COLORS = {
  high: 'bg-red-500/15 text-red-500',
  medium: 'bg-amber-500/15 text-amber-600',
  low: 'bg-emerald-500/15 text-emerald-600',
};

export function RecordingDetail() {
  const { recordings, selectedRecordingId, setSelectedRecording, loadData, user } = useStore();
  const [activeTab, setActiveTab] = useState<'tasks' | 'summary' | 'transcript'>('tasks');
  const [isRetrying, setIsRetrying] = useState(false);
  const [tasks, setTasks] = useState<RecordingTask[]>([]);
  const [participants, setParticipants] = useState<RecordingParticipant[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const recording = recordings.find(r => r.id === selectedRecordingId);

  // ── 태스크 + 참가자 로드 ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedRecordingId) return;
    setTasks([]);
    setParticipants([]);
    setLoadingTasks(true);

    Promise.all([
      supabase
        .from('recording_tasks')
        .select('id, title, memo, due_date, due_time, priority, assignee_ids, accepted, todo_id')
        .eq('recording_id', selectedRecordingId)
        .order('priority', { ascending: false }),
      supabase
        .from('recording_participants')
        .select('user_id, display_name, avatar_url, role')
        .eq('recording_id', selectedRecordingId),
    ]).then(([tasksRes, partsRes]) => {
      if (tasksRes.data) setTasks(tasksRes.data as RecordingTask[]);
      if (partsRes.data) setParticipants(partsRes.data as RecordingParticipant[]);
    }).finally(() => setLoadingTasks(false));
  }, [selectedRecordingId]);

  // ── 태스크 수락 → todos 테이블에 실제 할 일 생성 ─────────────────────────
  const handleAcceptTask = async (task: RecordingTask) => {
    if (!user || task.accepted) return;
    setAcceptingId(task.id);
    try {
      // 1. todos 테이블에 삽입
      const { data: todo, error: todoErr } = await supabase.from('todos').insert({
        user_id: user.id,
        title: task.title,
        memo: task.memo,
        due_date: task.due_date,
        due_time: task.due_time,
        priority: task.priority,
        is_completed: false,
        source: 'meeting',
        source_excerpt: recording?.title ?? null,
      }).select('id').single();

      if (todoErr) throw todoErr;

      // 2. recording_tasks accepted + todo_id 업데이트
      await supabase.from('recording_tasks').update({
        accepted: true,
        todo_id: todo?.id ?? null,
      }).eq('id', task.id);

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, accepted: true, todo_id: todo?.id ?? null } : t));
      await loadData(); // 할 일 목록 갱신
    } catch (e: any) {
      console.error('Accept task failed:', e);
    } finally {
      setAcceptingId(null);
    }
  };

  // ── AI 재분석 ─────────────────────────────────────────────────────────────
  const handleRetryAI = async () => {
    if (!recording?.audio_url) return;
    if (!window.confirm('AI 재분석을 진행하면 기존 요약과 태스크가 덮어쓰입니다. 계속할까요?')) return;
    setIsRetrying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(recording.audio_url);
      const audioBlob = await response.blob();
      const transcript = await transcribeAudio(audioBlob, 'ko');
      const aiResult = await analyzeWithGPT(transcript, 'ko', 'ko');

      await saveToSupabase(session.user.id, recording.id, recording.durationSec, transcript, recording.audio_url, aiResult, {
        mode: recording.mode,
        language: 'ko',
      });

      // 태스크 다시 로드
      const { data } = await supabase.from('recording_tasks').select('*').eq('recording_id', recording.id);
      if (data) setTasks(data as RecordingTask[]);
      await loadData();
      alert('AI 분석이 완료되었습니다!');
    } catch (e: any) {
      alert('AI 분석 실패: ' + e.message);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!recording) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
        <Mic className="w-12 h-12 mb-4 text-muted-foreground/30" />
        <p className="text-sm font-medium">녹음을 선택하면 상세 내용이 표시됩니다</p>
      </div>
    );
  }

  // ── Summary 파싱 ──────────────────────────────────────────────────────────
  let shortSummary = '';
  let meetingMinutes = '';
  try {
    if (recording.summary?.startsWith('{')) {
      const parsed = JSON.parse(recording.summary);
      shortSummary = parsed.short ?? '';
      meetingMinutes = parsed.minutes ?? '';
    } else {
      shortSummary = recording.summary ?? '';
    }
  } catch {
    shortSummary = recording.summary ?? '';
  }

  const pendingCount = tasks.filter(t => !t.accepted).length;
  const acceptedCount = tasks.filter(t => t.accepted).length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border/40 flex items-center justify-between px-5 shrink-0 bg-background z-10">
        <button
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          onClick={() => setSelectedRecording(null)}
        >
          <X className="w-4 h-4 stroke-[2]" />
          <span className="text-[13px] font-semibold">닫기</span>
        </button>
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full border border-border/50 hover:border-border transition-all"
          onClick={handleRetryAI}
          disabled={isRetrying}
        >
          <RotateCw className={cn("w-3 h-3", isRetrying && "animate-spin")} />
          {isRetrying ? 'AI 분석 중...' : 'AI 재분석'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 pt-6 pb-2">
          {/* 메타 + 제목 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wide uppercase">
              {recording.mode === 'team' ? '팀 미팅' : recording.mode === 'call' ? '통화 녹음' : '솔로 녹음'}
            </span>
            <span className="text-xs text-muted-foreground">
              {recording.createdAt.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground leading-snug mb-4">{recording.title}</h2>

          {/* 참가자 (Team 모드) */}
          {participants.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="flex -space-x-2">
                {participants.map(p => (
                  <Avatar key={p.user_id} className="w-7 h-7 border-2 border-background">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                      {p.display_name?.[0]?.toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{participants.length}명 참가</span>
            </div>
          )}

          {/* 오디오 플레이어 */}
          {recording.audio_url && (
            <div className="bg-muted/30 rounded-xl p-3 mb-4 border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Play className="w-3 h-3" /> 원본 녹음
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.floor(recording.durationSec / 60).toString().padStart(2,'0')}:{(recording.durationSec % 60).toString().padStart(2,'0')}
                </span>
              </div>
              <audio controls src={recording.audio_url} className="w-full h-8" />
            </div>
          )}

          {/* 탭 */}
          <div className="flex items-center gap-1 border-b border-border/50 mb-4">
            {([
              { id: 'tasks', label: `할 일 ${tasks.length > 0 ? `(${tasks.length})` : ''}` },
              { id: 'summary', label: '요약' },
              { id: 'transcript', label: '녹취록' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-2.5 px-1 mr-4 text-sm font-bold transition-all border-b-2 relative top-[1px]",
                  activeTab === tab.id
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 내용 */}
        <div className="px-6 pb-8">

          {/* ── Tasks 탭 ─────────────────────────────────────────────────── */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {loadingTasks ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">AI가 추출한 할 일이 없습니다</p>
                  <p className="text-xs text-muted-foreground mt-1">AI 재분석을 시도해보세요</p>
                </div>
              ) : (
                <>
                  {pendingCount > 0 && (
                    <p className="text-xs text-muted-foreground font-medium">
                      {pendingCount}개 대기 중 · {acceptedCount}개 수락됨
                    </p>
                  )}
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        task.accepted
                          ? "bg-primary/5 border-primary/20 opacity-70"
                          : "bg-card border-border/50 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          className="mt-0.5 shrink-0"
                          onClick={() => !task.accepted && handleAcceptTask(task)}
                          disabled={task.accepted || acceptingId === task.id}
                        >
                          {task.accepted ? (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          ) : acceptingId === task.id ? (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold leading-snug", task.accepted && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          {task.memo && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{task.memo}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", PRIORITY_COLORS[task.priority])}>
                              {task.priority === 'high' ? '높음' : task.priority === 'medium' ? '중간' : '낮음'}
                            </span>
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {task.due_date}
                              </span>
                            )}
                          </div>
                        </div>
                        {!task.accepted && (
                          <Button
                            size="sm"
                            className="shrink-0 h-7 text-xs font-bold rounded-full px-3"
                            onClick={() => handleAcceptTask(task)}
                            disabled={acceptingId === task.id}
                          >
                            수락
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Summary 탭 ───────────────────────────────────────────────── */}
          {activeTab === 'summary' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {shortSummary && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">✨ 핵심 요약</h3>
                  <p className="text-sm text-foreground/90 leading-relaxed">{shortSummary}</p>
                </div>
              )}
              {meetingMinutes && (
                <div className="bg-muted/30 border border-border/40 rounded-xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">📋 회의록</h3>
                  <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-sm prose-p:leading-relaxed prose-li:leading-relaxed">
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{meetingMinutes}</p>
                  </div>
                </div>
              )}
              {!shortSummary && !meetingMinutes && (
                <div className="text-center py-10 opacity-50">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">요약이 없습니다</p>
                  <p className="text-xs text-muted-foreground mt-1">AI 재분석으로 요약을 생성하세요</p>
                </div>
              )}
            </div>
          )}

          {/* ── Transcript 탭 ────────────────────────────────────────────── */}
          {activeTab === 'transcript' && (
            <div className="animate-in fade-in duration-200">
              {recording.transcript ? (
                <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{recording.transcript}</p>
                </div>
              ) : (
                <div className="text-center py-10 opacity-50">
                  <Mic className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">녹취록이 없습니다</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
