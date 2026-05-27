"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Users, Mic, Copy, Check, Loader2, CheckCircle, QrCode, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import {
  createMeetingRoom,
  transcribeAudio,
  analyzeWithGPT,
  uploadAudio,
  saveToSupabase,
} from '../lib/meetingService';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// ── QR 코드 SVG (라이브러리 없이 단순 표현) ─────────────────────────────────
function QRPlaceholder({ value }: { value: string }) {
  // QR 라이브러리 대신: 코드를 크게 표시 + 스타일로 QR 느낌 연출
  return (
    <div className="relative flex items-center justify-center">
      <div className="w-48 h-48 bg-foreground rounded-2xl flex flex-col items-center justify-center gap-2 shadow-xl">
        <div className="grid grid-cols-3 gap-1 opacity-40">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={cn("w-8 h-8 rounded-sm bg-background", i % 2 === 0 ? "opacity-100" : "opacity-30")} />
          ))}
        </div>
        <span className="absolute text-background text-2xl font-black tracking-widest">{value}</span>
      </div>
    </div>
  );
}

// ── 처리 단계 라벨 (동적으로 적용) ─────────────────────────────────────────
type ProcessStep = 'uploading' | 'transcribing' | 'analyzing' | 'saving' | 'done';
function getStepLabels(isEn: boolean): Record<ProcessStep, string> {
  return isEn ? {
    uploading:    '📤 Uploading audio...',
    transcribing: '🎙️ Transcribing speech...',
    analyzing:    '🤖 Analyzing with AI...',
    saving:       '💾 Saving results...',
    done:         '✅ Done!',
  } : {
    uploading:    '📤 오디오 저장 중...',
    transcribing: '🎙️ 음성 → 텍스트 변환 중...',
    analyzing:    '🤖 AI 회의 분석 중...',
    saving:       '💾 결과 저장 중...',
    done:         '✅ 완료!',
  };
}

// ── 타입 ──────────────────────────────────────────────────────────────────────
type Step = 'setup' | 'lobby' | 'recording' | 'processing' | 'done';

interface Participant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'host' | 'participant';
}

type MeetingLang = 'ko' | 'en' | 'zh' | 'ja' | 'es' | 'de';
const LANGUAGES: { code: MeetingLang; label: string; flag: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
}

export function TeamMeetingModal({ onClose }: Props) {
  const { user, loadData, language } = useStore();
  const isEn = language === 'en';
  const [step, setStep] = useState<Step>('setup');
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState<MeetingLang>('ko');
  const [roomCode, setRoomCode] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [processStep, setProcessStep] = useState<ProcessStep>('uploading');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const { startRecording, stopRecording, cancelRecording, durationSec } = useAudioRecorder();
  const { isListening, transcript: liveTranscript, startListening, stopListening } = useSpeechRecognition();

  // ── 참가자 Realtime 구독 ─────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'lobby' || !roomCode) return;

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('meeting_room_participants')
        .select('user_id, display_name, avatar_url, role')
        .eq('room_id', roomCode);
      if (data) setParticipants(data as Participant[]);
    };

    fetchParticipants();

    channelRef.current = supabase
      .channel(`team_lobby_${roomCode}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_room_participants',
        filter: `room_id=eq.${roomCode}`,
      }, () => fetchParticipants())
      .subscribe();

    const poll = setInterval(fetchParticipants, 5000);

    return () => {
      supabase.removeChannel(channelRef.current);
      clearInterval(poll);
    };
  }, [step, roomCode]);

  // ── 녹음 타이머 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step === 'recording') {
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // ── 방 생성 ────────────────────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!title.trim() || !user) return;
    setError(null);
    try {
      const { roomCode: code } = await createMeetingRoom(user.id, title.trim());
      setRoomCode(code);
      setStep('lobby');
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── 코드 복사 ──────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── 녹음 시작 ──────────────────────────────────────────────────────────────
  const handleStartRecording = async () => {
    // meeting_room 상태 → recording
    supabase.from('meeting_rooms').update({ status: 'recording' }).eq('id', roomCode).then(() => {});
    supabase.from('meetings').update({ status: 'recording' }).eq('qr_code', roomCode).then(() => {});
    setStep('recording');
    setElapsed(0);
    startListening();
    startRecording();
  };

  // ── 녹음 완료 ──────────────────────────────────────────────────────────────
  const handleEndRecording = async () => {
    stopListening();
    const { blob, durationSec: finalDuration } = await stopRecording();
    if (!user) return;

    setStep('processing');

    try {
      const userId = user.id;
      const meetingId = crypto.randomUUID();
      const outputLang = lang === 'en' ? 'en' : 'ko';

      setProcessStep('uploading');
      const audioUrl = await uploadAudio(userId, meetingId, blob);

      setProcessStep('transcribing');
      let finalTranscript = liveTranscript.trim();
      try {
        finalTranscript = await transcribeAudio(blob, lang);
      } catch (sttErr) {
        console.warn('Whisper STT failed, using fallback:', sttErr);
        if (!finalTranscript) throw sttErr;
      }

      setProcessStep('analyzing');
      const aiResult = await analyzeWithGPT(finalTranscript, outputLang, lang);

      setProcessStep('saving');
      const savedId = await saveToSupabase(userId, meetingId, finalDuration, finalTranscript, audioUrl, aiResult, {
        mode: 'team',
        roomCode,
        language: outputLang,
      });

      // 호스트 자신에게도 알림
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'meeting_result',
        title: outputLang === 'en' ? '✨ Meeting Analysis Complete' : '✨ 팀 회의 AI 분석 완료',
        body: outputLang === 'en'
          ? 'Your team meeting has been analyzed and tasks assigned.'
          : '팀 회의 내용이 분석되고 할 일이 배분되었습니다.',
        meeting_id: savedId,
        is_read: false,
      });

      setProcessStep('done');
      await loadData();

      setTimeout(() => {
        setStep('done');
      }, 1000);

    } catch (e: any) {
      console.error('[TeamMeeting] Processing failed:', e);
      setError(e.message || '처리 중 오류가 발생했습니다');
      setStep('recording'); // 녹음 화면으로 돌아감
    }
  };

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">{isEn ? 'Team Meeting' : '팀 미팅'}</span>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Step: Setup ────────────────────────────────────────────────── */}
        {step === 'setup' && (
          <div className="px-6 py-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                {isEn ? 'Meeting Title' : '회의 제목'}
              </label>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                placeholder={isEn ? 'e.g. Q3 Strategy Meeting' : '예: 3분기 전략 회의'}
                className="w-full bg-muted/40 border border-border/60 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                {isEn ? 'Meeting Language' : '회의 언어'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                      lang === l.code
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-muted/30 border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              className="w-full h-12 text-base font-bold rounded-xl"
              onClick={handleCreateRoom}
              disabled={!title.trim()}
            >
              {isEn ? 'Create Room → Get Code' : '방 생성 → QR 코드 발급'}
            </Button>
          </div>
        )}

        {/* ── Step: Lobby ────────────────────────────────────────────────── */}
        {step === 'lobby' && (
          <div className="px-6 py-5 space-y-5">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{isEn ? 'Share this code with your team' : '팀원에게 아래 코드를 공유하세요'}</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-4xl font-black tracking-[0.3em] text-foreground">{roomCode}</span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isEn
                  ? 'Team can join: Cabinet → Start Recording → Join by Code'
                  : '팀원은 캐비넷 → 녹음 시작 → 팀 참가 → 코드 입력으로 참가할 수 있습니다'}
              </p>
            </div>

            {/* 참가자 목록 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {isEn ? `Participants (${participants.length})` : `참가자 (${participants.length})`}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-muted-foreground">{isEn ? 'Live' : '실시간'}</span>
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {participants.map(p => (
                  <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                        {p.display_name?.[0]?.toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium flex-1">{p.display_name}</span>
                    {p.role === 'host' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{isEn ? 'Host' : '호스트'}</span>
                    )}
                  </div>
                ))}
                {participants.length === 0 && (
                  <div className="text-center py-3 text-xs text-muted-foreground animate-pulse">
                    {isEn ? 'Waiting for teammates...' : '팀원 대기 중...'}
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full h-12 text-base font-bold rounded-xl gap-2 bg-red-500 hover:bg-red-600 text-white border-0"
              onClick={handleStartRecording}
            >
              <Mic className="w-4 h-4" />
              {isEn ? `Start Recording (${participants.length} joined)` : `녹음 시작 (${participants.length}명 참가)`}
            </Button>
          </div>
        )}

        {/* ── Step: Recording ────────────────────────────────────────────── */}
        {step === 'recording' && (
          <div className="px-6 py-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse scale-150" />
              <div className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-2xl">
                <Mic className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-red-500 uppercase tracking-wider">{isEn ? 'Recording' : '녹음 중'}</span>
              </div>
              <p className="text-3xl font-black tracking-widest">{minutes}:{seconds}</p>
              <p className="text-xs text-muted-foreground mt-1">{isEn ? `${participants.length} joined` : `${participants.length}명 참가 중`}</p>
            </div>
            {liveTranscript && (
              <p className="text-sm text-center text-muted-foreground leading-relaxed max-h-20 overflow-y-auto line-clamp-3 bg-muted/30 rounded-xl px-4 py-2 w-full">
                🎙️ {liveTranscript}
              </p>
            )}
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <Button
              size="lg"
              className="w-full h-12 font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90"
              onClick={handleEndRecording}
            >
              {isEn ? '■ Stop & Analyze with AI' : '■ 녹음 완료 → AI 분석'}
            </Button>
          </div>
        )}

        {/* ── Step: Processing ───────────────────────────────────────────── */}
        {step === 'processing' && (
          <div className="px-6 py-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse scale-150" />
              <div className="relative w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-xl">
                {processStep === 'done'
                  ? <CheckCircle className="w-10 h-10 text-primary-foreground" />
                  : <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
                }
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{getStepLabels(isEn)[processStep]}</p>
              <p className="text-sm text-muted-foreground mt-1">{isEn ? 'Please wait...' : '잠시만 기다려 주세요...'}</p>
            </div>
            <div className="flex items-center gap-2">
              {(['uploading', 'transcribing', 'analyzing', 'saving'] as ProcessStep[]).map((s, i) => (
                <div key={s} className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  processStep === s ? "w-8 bg-primary" :
                  (['uploading', 'transcribing', 'analyzing', 'saving'] as ProcessStep[]).indexOf(processStep) > i
                    ? "w-4 bg-primary/50" : "w-4 bg-muted"
                )} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {isEn ? 'Results will be shared with all participants.' : '팀 회의 결과가 모든 참가자에게 공유됩니다'}
            </p>
          </div>
        )}

        {/* ── Step: Done ─────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{isEn ? 'Meeting Analysis Complete!' : '회의 분석 완료!'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isEn ? 'Check the results in Cabinet\nand accept your action items.' : '캐비넷에서 결과를 확인하고\n할 일을 수락하세요'}
              </p>
            </div>
            <Button className="w-full h-11 font-bold rounded-xl" onClick={onClose}>
              {isEn ? 'View in Cabinet →' : '캐비넷에서 확인 →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
