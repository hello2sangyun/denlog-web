"use client";
import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useStore } from '../store/useStore';
import { joinMeetingRoom } from '../lib/meetingService';

interface Props {
  initialCode?: string;
  onJoined: (roomCode: string, title: string) => void;
  onClose: () => void;
}

export function MeetingJoinModal({ initialCode = '', onJoined, onClose }: Props) {
  const { user, language } = useStore();
  const isEn = language === 'en';
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!user || code.trim().length < 4) return;
    setIsJoining(true);
    setError(null);
    try {
      const { title } = await joinMeetingRoom(user.id, code.trim());
      onJoined(code.trim().toUpperCase(), title);
    } catch (e: any) {
      setError(e.message || '참가에 실패했습니다. 코드를 확인해주세요.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">{isEn ? 'Join Team Meeting' : '팀 회의 참가'}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {isEn ? 'Enter the 6-digit code you received from the host.' : '호스트에게 받은 6자리 코드를 입력하세요'}
          </p>
          <input
            autoFocus
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase().slice(0, 6));
              setError(null);
            }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="XXXXXX"
            maxLength={6}
            className="w-full bg-muted/40 border border-border/60 rounded-xl px-4 py-3 text-2xl font-black tracking-[0.4em] text-center outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all uppercase"
          />
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          <Button
            className="w-full h-12 text-base font-bold rounded-xl"
            onClick={handleJoin}
            disabled={code.trim().length < 4 || isJoining}
          >
            {isJoining ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {isEn ? 'Joining...' : '참가 중...'}</>
            ) : (isEn ? 'Join' : '참가하기')}
          </Button>
        </div>
      </div>
    </div>
  );
}
