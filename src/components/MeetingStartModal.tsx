"use client";
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store/useStore';
import { X, Mic, Users, ArrowRight, ChevronLeft, UserPlus } from 'lucide-react';
import { TeamMeetingModal } from './TeamMeetingModal';
import { MeetingJoinModal } from './MeetingJoinModal';

interface MeetingStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJoinCode?: string;
}

const MEETING_LANGUAGES = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const;

export function MeetingStartModal({ isOpen, onClose, initialJoinCode }: MeetingStartModalProps) {
  const { setRecordingMode, setRecordingLang, setIsRecordingVoice, language } = useStore();
  const isEn = language === 'en';
  const [selectedMode, setSelectedMode] = useState<'solo' | 'team' | 'join' | null>(null);
  const [step, setStep] = useState<'mode' | 'lang'>('mode');
  const [mounted, setMounted] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(!!initialJoinCode);


  useEffect(() => { setMounted(true); }, []);

  // URL 파라미터로 join 코드가 있으면 바로 참가 모달 열기
  useEffect(() => {
    if (initialJoinCode && isOpen) setShowJoinModal(true);
  }, [initialJoinCode, isOpen]);

  const handleClose = () => {
    setSelectedMode(null);
    setStep('mode');
    onClose();
  };

  const handleStart = (lang: typeof MEETING_LANGUAGES[number]['code']) => {
    if (selectedMode === 'solo') {
      setRecordingMode('solo');
      setRecordingLang(lang);
      setIsRecordingVoice(true);
      handleClose();
    } else if (selectedMode === 'team') {
      handleClose();
      setShowTeamModal(true);
    }
  };

  const handleModeNext = () => {
    if (!selectedMode) return;
    if (selectedMode === 'team') {
      // Team은 언어 선택 없이 바로 TeamMeetingModal로 (내부에서 언어 선택)
      handleClose();
      setShowTeamModal(true);
    } else if (selectedMode === 'join') {
      // 참가 모달 열기
      handleClose();
      setShowJoinModal(true);
    } else {
      setStep('lang');
    }
  };

  if (!isOpen || !mounted) {
    // 팀/참가 모달은 MeetingStartModal 없이도 표시
    return (
      <>
        {showTeamModal && (
          <TeamMeetingModal onClose={() => { setShowTeamModal(false); onClose(); }} />
        )}
        {showJoinModal && (
          <MeetingJoinModal
            initialCode={initialJoinCode}
            onJoined={(code, title) => {
              setShowJoinModal(false);
              onClose();
            }}
            onClose={() => { setShowJoinModal(false); onClose(); }}
          />
        )}
      </>
    );
  }

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} />

      {/* Modal */}
      <div
        className="bg-card"
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560, borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', animation: 'modalIn 0.2s ease' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          {step === 'lang' ? (
            <button
              onClick={() => setStep('mode')}
              className="text-muted-foreground hover:text-foreground"
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}
            >
              <ChevronLeft style={{ width: 18, height: 18 }} />
              {isEn ? 'Select Language' : '언어 선택'}
            </button>
          ) : (
            <h2 className="text-foreground" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {isEn ? 'Start a Meeting' : '회의 시작'}
            </h2>
          )}
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X style={{ width: 17, height: 17, strokeWidth: 2.5 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 20px' }}>
          {step === 'mode' ? (
            <>
              {/* Mode cards — 3개로 확장 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {/* Solo card */}
                <button
                  onClick={() => setSelectedMode('solo')}
                  className="bg-card"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    padding: '16px 12px', borderRadius: 20, cursor: 'pointer', gap: 10, border: 'none',
                    outline: selectedMode === 'solo' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedMode === 'solo' ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'var(--muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                    <Mic className="text-primary" style={{ width: 26, height: 26 }} />
                  </div>
                  <p className="text-foreground" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{isEn ? 'Solo Recording' : '솔로 녹음'}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 11, margin: 0, lineHeight: 1.4 }}>{isEn ? 'Record alone, AI analyzes' : '혼자 녹음 후 AI 분석'}</p>
                </button>

                {/* Team card */}
                <button
                  onClick={() => setSelectedMode('team')}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    padding: '16px 12px', borderRadius: 20, cursor: 'pointer', gap: 10, border: 'none',
                    outline: selectedMode === 'team' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedMode === 'team' ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'var(--muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                    <Users className="text-primary" style={{ width: 26, height: 26 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <p className="text-foreground" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{isEn ? 'Team Meeting' : '팀 미팅'}</p>
                    <span className="bg-primary text-primary-foreground" style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', padding: '1px 6px', borderRadius: 99 }}>PRO</span>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: 11, margin: 0, lineHeight: 1.4 }}>{isEn ? 'Invite via code + AI tasks' : 'QR로 팀 초대 + AI 자동 배분'}</p>
                </button>

                {/* Join card */}
                <button
                  onClick={() => setSelectedMode('join')}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    padding: '16px 12px', borderRadius: 20, cursor: 'pointer', gap: 10, border: 'none',
                    outline: selectedMode === 'join' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedMode === 'join' ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'var(--muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                    <UserPlus className="text-primary" style={{ width: 26, height: 26 }} />
                  </div>
                  <p className="text-foreground" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{isEn ? 'Join by Code' : '코드로 참가'}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 11, margin: 0, lineHeight: 1.4 }}>{isEn ? 'Enter 6-digit code' : '6자리 코드 입력'}</p>
                </button>
              </div>

              {/* Description */}
              <div style={{ minHeight: 72, marginTop: 14 }}>
                {selectedMode === 'solo' && (
                  <div className="bg-muted border-border" style={{ borderRadius: 14, padding: '12px 16px', border: '1px solid', animation: 'fadeIn 0.2s ease' }}>
                    <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      {isEn
                        ? 'Record your meeting alone. AI extracts key summaries and action items automatically.'
                        : '혼자 회의를 녹음하고 AI가 핵심 요약과 할 일을 자동 추출합니다.'}
                    </p>
                  </div>
                )}
                {selectedMode === 'team' && (
                  <div className="bg-muted border-border" style={{ borderRadius: 14, padding: '12px 16px', border: '1px solid', animation: 'fadeIn 0.2s ease' }}>
                    <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      {isEn
                        ? 'Invite teammates with a code. AI automatically assigns tasks to each member.'
                        : '팀원을 코드로 초대해 함께 회의를 기록합니다. AI가 담당자별 할 일을 자동 배분합니다.'}
                    </p>
                  </div>
                )}
                {selectedMode === 'join' && (
                  <div className="bg-muted border-border" style={{ borderRadius: 14, padding: '12px 16px', border: '1px solid', animation: 'fadeIn 0.2s ease' }}>
                    <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      {isEn
                        ? 'Enter the 6-digit code from the host to join the team meeting.'
                        : '호스트에게 받은 6자리 코드를 입력해 팀 회의에 참가합니다.'}
                    </p>
                  </div>
                )}
                {!selectedMode && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 72, opacity: 0.45 }}>
                    <p className="text-muted-foreground" style={{ fontSize: 14, margin: 0 }}>
                      {isEn ? 'Choose a recording mode' : '원하는 녹음 방식을 선택하세요'}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Language list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p className="text-muted-foreground" style={{ fontSize: 11, textAlign: 'center', margin: '0 0 4px' }}>
                {isEn
                  ? 'Select the spoken language · Tasks output in your app language'
                  : '회의에서 사용하는 언어를 선택하세요 · 할 일은 앱 언어로 생성됩니다'}
              </p>
              {MEETING_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleStart(lang.code)}
                  className="bg-muted hover:bg-primary/5 text-foreground"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.15s', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <span style={{ fontSize: 20 }}>{lang.flag}</span>
                  <span style={{ flex: 1 }}>{lang.label}</span>
                  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" style={{ opacity: 0.4 }}>
                    <path d="M1 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '16px 20px 22px' }}>
          <button
            onClick={handleModeNext}
            disabled={!selectedMode}
            className="text-primary-foreground"
            style={{
              width: '100%', height: 52, borderRadius: 16, border: 'none',
              background: selectedMode ? 'var(--primary)' : 'var(--muted)',
              color: selectedMode ? undefined : 'var(--muted-foreground)',
              fontSize: 16, fontWeight: 700, cursor: selectedMode ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
              opacity: selectedMode ? 1 : 0.5,
            }}
          >
            {selectedMode === 'join'
              ? (isEn ? 'Enter Code' : '코드 입력하기')
              : selectedMode === 'team'
              ? (isEn ? 'Start Team Meeting' : '팀 미팅 시작')
              : (isEn ? 'Next' : '다음')}{' '}
            <ArrowRight style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );

  return (
    <>
      {ReactDOM.createPortal(modal, document.body)}
      {showTeamModal && (
        <TeamMeetingModal onClose={() => { setShowTeamModal(false); onClose(); }} />
      )}
      {showJoinModal && (
        <MeetingJoinModal
          initialCode={initialJoinCode}
          onJoined={(code, title) => {
            setShowJoinModal(false);
            onClose();
          }}
          onClose={() => { setShowJoinModal(false); onClose(); }}
        />
      )}
    </>
  );
}
