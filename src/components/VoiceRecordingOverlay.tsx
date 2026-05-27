"use client";
import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Mic, X, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { transcribeAudio, analyzeWithGPT, uploadAudio, saveToSupabase } from '../lib/meetingService';
import { cn } from '@/lib/utils';
import { supabase } from '../lib/supabase';

type ProcessStep = 'uploading' | 'transcribing' | 'analyzing' | 'saving' | 'done';

const STEP_LABELS: Record<ProcessStep, string> = {
  uploading:    '📤 오디오 저장 중...',
  transcribing: '🎙️ 음성 → 텍스트 변환 중...',
  analyzing:    '🤖 AI 회의 분석 중...',
  saving:       '💾 결과 저장 중...',
  done:         '✅ 완료!',
};

export function VoiceRecordingOverlay() {
  const { isRecordingVoice, setIsRecordingVoice, recordingMode, recordingLang, loadData, user } = useStore();
  const { isListening, transcript: liveTranscript, startListening, stopListening } = useSpeechRecognition();
  const { startRecording, stopRecording, cancelRecording, durationSec } = useAudioRecorder();
  const [isSaving, setIsSaving] = React.useState(false);
  const [processStep, setProcessStep] = React.useState<ProcessStep>('uploading');
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (isRecordingVoice) {
      setError(null);
      startListening();
      startRecording();
    } else {
      stopListening();
    }
  }, [isRecordingVoice, startListening, stopListening, startRecording]);

  if (!isRecordingVoice) return null;

  const handleComplete = async () => {
    stopListening();
    const { blob, durationSec: finalDuration } = await stopRecording();

    if (finalDuration < 1 && !liveTranscript.trim()) {
      setIsRecordingVoice(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다.');

      const userId = session.user.id;
      const newRecordingId = crypto.randomUUID();
      const lang = recordingLang || 'ko';
      const outputLang = lang === 'en' ? 'en' : 'ko';

      // Step 1: 오디오 업로드
      setProcessStep('uploading');
      const audioUrl = await uploadAudio(userId, newRecordingId, blob);

      // Step 2: Whisper STT
      setProcessStep('transcribing');
      let finalTranscript = liveTranscript.trim();
      try {
        finalTranscript = await transcribeAudio(blob, lang);
      } catch (sttErr) {
        console.warn('Whisper STT failed, using Web Speech API fallback:', sttErr);
        if (!finalTranscript) throw sttErr; // 둘 다 실패 시 에러
      }

      // Step 3: AI 분석
      setProcessStep('analyzing');
      const aiResult = await analyzeWithGPT(finalTranscript, outputLang as 'ko' | 'en', lang);

      // Step 4: DB 저장
      setProcessStep('saving');
      const savedId = await saveToSupabase(userId, newRecordingId, finalDuration, finalTranscript, audioUrl, aiResult, {
        mode: recordingMode || 'solo',
        language: outputLang as 'ko' | 'en',
      });

      // 나에게도 meeting_result 알림 삽입
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'meeting_result',
        title: outputLang === 'en' ? '✨ Call Analysis Complete' : '✨ 통화 AI 분석 완료',
        body: outputLang === 'en'
          ? 'Your meeting has been transcribed and tasks have been extracted.'
          : '회의 내용이 기록되고 할 일이 추출되었습니다.',
        meeting_id: savedId,
        is_read: false,
      });

      setProcessStep('done');
      await loadData();

      // 잠깐 완료 표시 후 닫기
      setTimeout(() => {
        setIsRecordingVoice(false);
        setIsSaving(false);
      }, 1200);

    } catch (e: any) {
      console.error('[VoiceRecordingOverlay] Failed:', e);
      setError(e?.message || 'Unknown error');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    stopListening();
    cancelRecording();
    setIsRecordingVoice(false);
  };

  const minutes = Math.floor(durationSec / 60).toString().padStart(2, '0');
  const seconds = (durationSec % 60).toString().padStart(2, '0');

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-300"
    >
      <div className="flex flex-col items-center w-full max-w-2xl px-6">

        {/* 닫기 버튼 */}
        {!isSaving && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="absolute top-8 right-8 rounded-full bg-muted/50 hover:bg-muted w-12 h-12"
          >
            <X className="w-6 h-6" />
          </Button>
        )}

        {/* 마이크 비주얼 */}
        <div className="relative flex items-center justify-center mb-12">
          <div className={cn(
            "absolute inset-0 bg-primary/20 rounded-full blur-xl transition-all duration-700",
            isListening && !isSaving ? "animate-pulse scale-150" : "scale-100"
          )} />
          <div className="relative w-32 h-32 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 ring-8 ring-primary/20">
            {processStep === 'done' ? (
              <CheckCircle className="w-16 h-16 text-primary-foreground" />
            ) : isSaving ? (
              <Loader2 className="w-16 h-16 text-primary-foreground animate-spin" />
            ) : isListening ? (
              <Mic className="w-16 h-16 text-primary-foreground animate-bounce" />
            ) : (
              <Loader2 className="w-16 h-16 text-primary-foreground animate-spin" />
            )}
          </div>
        </div>

        {/* 처리 중 상태 */}
        {isSaving ? (
          <div className="flex flex-col items-center gap-3 mb-8">
            <p className="text-xl font-bold text-foreground">{STEP_LABELS[processStep]}</p>
            <div className="flex items-center gap-2 mt-2">
              {(['uploading', 'transcribing', 'analyzing', 'saving'] as ProcessStep[]).map((step, i) => (
                <div
                  key={step}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    processStep === step ? "w-8 bg-primary" :
                    (['uploading', 'transcribing', 'analyzing', 'saving'] as ProcessStep[]).indexOf(processStep) > i ? "w-4 bg-primary/60" : "w-4 bg-muted"
                  )}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">잠시만 기다려 주세요...</p>
          </div>
        ) : (
          <>
            {/* 모드 + 언어 */}
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
              {recordingMode === 'team' ? 'Team Meeting' : 'Solo Recording'} • {recordingLang?.toUpperCase() || 'KO'}
            </span>

            {/* 실시간 transcript */}
            <div className="min-h-[100px] flex flex-col items-center justify-center text-center mb-4">
              {liveTranscript ? (
                <p className="text-3xl font-medium tracking-tight text-foreground leading-tight animate-in slide-in-from-bottom-4 line-clamp-3">
                  <span className="text-2xl animate-pulse">🎙️</span> {liveTranscript}
                </p>
              ) : (
                <p className="text-2xl font-medium text-muted-foreground/60 animate-pulse">
                  {isListening ? "Listening..." : "마이크 초기화 중..."}
                </p>
              )}
            </div>

            {/* 타이머 */}
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-12">
              {minutes}:{seconds}
            </p>
          </>
        )}

        {/* 에러 */}
        {error && (
          <div className="mb-6 px-5 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center max-w-md">
            <p className="font-bold mb-1">⚠️ 처리 중 오류가 발생했습니다</p>
            <p className="text-xs opacity-80 break-all">{error}</p>
          </div>
        )}

        {/* 버튼 */}
        {!isSaving && (
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-14 text-lg"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              className="rounded-full px-8 h-14 text-lg gap-2 bg-red-500 hover:bg-red-600 text-white border-0"
              onClick={handleComplete}
            >
              Complete
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
