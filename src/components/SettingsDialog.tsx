"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { IntegrationProvider } from '../store/useStore';
import { useTheme } from 'next-themes';
import { useTranslation } from '../lib/i18n';
import { X, User, Palette, Bell, Monitor, CheckCircle2, Settings, Clock, HelpCircle, Check, Loader2, Camera, ArrowLeft, ChevronRight, CreditCard, Link2, Link2Off } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

export function SettingsDialog() {
  const { 
    isSettingsOpen, setIsSettingsOpen, user,
    language, aiSensitivity, accentColor, startWeek, reminders, notificationSettings,
    setLanguage, setAiSensitivity, setAccentColor, setStartWeek, setReminders, setNotificationSettings,
    updateUserProfile, uploadAvatar, deleteAccount,
    integrations, integrationsLoading, fetchIntegrations, toggleIntegration,
  } = useStore();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'account' | 'subscription' | 'general' | 'appearance' | 'notifications' | 'reminders' | 'integrations' | 'support'>('account');
  const [supportPage, setSupportPage] = useState<'main' | 'help' | 'whatsnew' | 'about'>('main');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEditName(user.displayName);
      setEditStatus(user.statusMessage || '');
      setEditUsername(user.username || '');
      setEditBirthday(user.birthday || '');
      setEditPhone(user.phone || '');
    }
  }, [user, isSettingsOpen]);

  const formatBirthday = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
  };

  useEffect(() => setMounted(true), []);
  useEffect(() => { setSupportPage('main'); }, [activeTab]);
  useEffect(() => {
    if (isSettingsOpen && activeTab === 'integrations') {
      fetchIntegrations();
    }
  }, [isSettingsOpen, activeTab]);

  if (!isSettingsOpen) return null;

  const tabs = [
    { id: 'account', label: t('settings.account'), icon: User },
    { id: 'general', label: t('settings.general'), icon: Settings },
    { id: 'subscription', label: language === 'ko' ? '구독' : 'Subscription', icon: CreditCard },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'reminders', label: t('settings.reminders'), icon: Clock },
    { id: 'integrations', label: t('settings.integrations'), icon: Monitor },
    { id: 'support', label: t('settings.support'), icon: HelpCircle },
  ] as const;

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setIsSettingsOpen(false)}
    >
      <div
        className="bg-background w-[800px] h-[550px] rounded-2xl shadow-2xl ring-1 ring-border/20 flex overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-64 bg-muted/10 border-r border-border/30 flex flex-col">
          <div className="p-6">
            <h2 className="text-xl font-bold">{t('settings.title')}</h2>
          </div>
          <div className="flex flex-col px-3 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-95",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-background relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-muted/50 hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col px-8 py-5">

              {/* ── SUBSCRIPTION ── */}
              {activeTab === 'subscription' && mounted && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full gap-3">
                  <h3 className="text-lg font-bold shrink-0">{language === 'ko' ? '구독' : 'Subscription'}</h3>
                  <div className={cn(
                    "rounded-xl border px-4 py-3 flex items-center justify-between shrink-0",
                    user?.isPro ? "bg-primary/10 border-primary/30" : "bg-muted/20 border-border"
                  )}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                        {language === 'ko' ? '현재 플랜' : 'CURRENT PLAN'}
                      </p>
                      <h4 className="text-lg font-bold text-foreground leading-tight">
                        {user?.isTrialing
                          ? (language === 'ko' ? 'Pro (체험 중)' : 'Pro (Trial)')
                          : user?.isPro ? 'Denlog Pro'
                          : (language === 'ko' ? 'Free 플랜' : 'Free Plan')}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user?.isTrialing && user?.trialDaysLeft != null
                          ? (language === 'ko' ? `${user.trialDaysLeft}일 체험 남음` : `${user.trialDaysLeft} trial days left`)
                          : user?.isPro
                          ? (language === 'ko' ? '모든 기능 무제한 이용 중' : 'All features, unlimited')
                          : (language === 'ko' ? '기본 Todo 관리 + 월 3회 회의녹음' : 'Basic tasks + 3 recordings/month')}
                      </p>
                    </div>
                    {user?.isPro && (
                      <span className="text-xs font-extrabold bg-primary text-white px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 ml-3">PRO</span>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 min-h-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 shrink-0">
                      {language === 'ko' ? 'FREE VS PRO 비교' : 'FREE VS PRO'}
                    </p>
                    <div className="rounded-xl border border-border overflow-hidden flex flex-col flex-1">
                      <div className="flex bg-muted/30 shrink-0">
                        <div className="flex-1 py-2 px-3" />
                        <div className="w-20 py-2 text-center border-l border-border">
                          <span className="text-xs font-semibold text-muted-foreground">Free</span>
                        </div>
                        <div className="w-20 py-2 text-center border-l-2 border-primary bg-primary/10">
                          <span className="text-[10px] font-extrabold bg-primary text-white px-2 py-0.5 rounded-full">Pro</span>
                        </div>
                      </div>
                      {(language === 'ko' ? [
                        { label: '할 일 생성·관리', free: '무제한', pro: '무제한' as string | boolean },
                        { label: '회의 녹음 & AI 할 일', free: '월 3회', pro: '무제한' as string | boolean },
                        { label: 'AI 이메일→Task 자동 생성', free: false as string | boolean, pro: true as string | boolean },
                        { label: '팀 초대 & 공유', free: false as string | boolean, pro: true as string | boolean },
                        { label: '음성·알림→AI 할 일 변환', free: false as string | boolean, pro: true as string | boolean },
                      ] : [
                        { label: 'Task Creation & Management', free: 'Unlimited', pro: 'Unlimited' as string | boolean },
                        { label: 'Meeting Recording & AI Tasks', free: '3 / month', pro: 'Unlimited' as string | boolean },
                        { label: 'AI emails & messages → auto-tasks', free: false as string | boolean, pro: true as string | boolean },
                        { label: 'Team Invite & Sharing', free: false as string | boolean, pro: true as string | boolean },
                        { label: 'Voice & Alert → AI Tasks', free: false as string | boolean, pro: true as string | boolean },
                      ]).map((row, i) => (
                        <div key={i} className="flex border-t border-border flex-1 min-h-0">
                          <div className="flex-1 px-3 flex items-center">
                            <span className="text-xs text-foreground leading-tight">{row.label}</span>
                          </div>
                          <div className="w-20 flex items-center justify-center border-l border-border">
                            {typeof row.free === 'boolean' ? (
                              <span className="text-muted-foreground/40 text-sm">—</span>
                            ) : (
                              <span className="text-xs font-semibold text-foreground text-center">{row.free}</span>
                            )}
                          </div>
                          <div className="w-20 flex items-center justify-center border-l-2 border-primary bg-primary/5">
                            {typeof row.pro === 'boolean' ? (
                              <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-primary" />
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-foreground text-center">{row.pro}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/20 shrink-0">
                    <Monitor className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground leading-snug">
                      {language === 'ko'
                        ? '결제는 모바일 버전에서만 가능합니다. iOS 또는 Android 앱에서 구독을 시작하세요.'
                        : 'Payments are only available on the mobile app — subscribe via iOS or Android.'}
                    </p>
                  </div>
                </div>
              )}

              {/* ── APPEARANCE ── */}
              {activeTab === 'appearance' && mounted && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full gap-4">
                  <h3 className="text-lg font-bold shrink-0">{language === 'ko' ? '외관' : 'Appearance'}</h3>
                  <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border overflow-hidden shrink-0">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium">{language === 'ko' ? '테마' : 'Theme'}</span>
                      <Select value={theme} onValueChange={(value) => setTheme(value || 'system')}>
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                          <SelectValue placeholder="Theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">{language === 'ko' ? '라이트' : 'Light'}</SelectItem>
                          <SelectItem value="dark">{language === 'ko' ? '다크' : 'Dark'}</SelectItem>
                          <SelectItem value="system">{language === 'ko' ? '시스템' : 'System'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{language === 'ko' ? '키 색상' : 'KEY COLOR'}</p>
                    <div className="flex flex-wrap gap-3 px-1">
                      {[
                        { color: '#E8574A', label: 'Coral' },
                        { color: '#6366F1', label: 'Indigo' },
                        { color: '#0EA5E9', label: 'Sky' },
                        { color: '#10B981', label: 'Emerald' },
                        { color: '#F59E0B', label: 'Amber' },
                        { color: '#F43F5E', label: 'Rose' },
                        { color: '#8B5CF6', label: 'Violet' },
                        { color: '#64748B', label: 'Slate' },
                      ].map((preset) => (
                        <div
                          key={preset.label}
                          onClick={() => setAccentColor(preset.color)}
                          className={cn(
                            "cursor-pointer w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95",
                            accentColor === preset.color ? "ring-2 ring-offset-2 ring-foreground" : ""
                          )}
                          style={{ backgroundColor: preset.color }}
                        >
                          {accentColor === preset.color && <Check className="w-4 h-4 text-white" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── REMINDERS ── */}
              {activeTab === 'reminders' && mounted && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full gap-4">
                  <h3 className="text-lg font-bold shrink-0">{language === 'ko' ? '알림 설정' : 'Reminder Settings'}</h3>
                  <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border overflow-hidden shrink-0">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{language === 'ko' ? '알림 활성화' : 'Enable Reminders'}</p>
                        <p className="text-xs text-muted-foreground">{language === 'ko' ? '할 일에 대한 푸시 및 이메일 알림' : 'Push & email notifications for tasks'}</p>
                      </div>
                      <button
                        onClick={() => setReminders({ enabled: !reminders.enabled })}
                        className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", reminders.enabled ? "bg-primary" : "bg-muted")}
                      >
                        <span className={cn("absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform", reminders.enabled ? "translate-x-4" : "translate-x-0")} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{language === 'ko' ? '과도 알림' : 'Overdue Alerts'}</p>
                        <p className="text-xs text-muted-foreground">{language === 'ko' ? '마감일 지난 할 일 알림' : 'Notify when task passes due date'}</p>
                      </div>
                      <button
                        onClick={() => setReminders({ overdue: !reminders.overdue })}
                        className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", reminders.overdue ? "bg-primary" : "bg-muted")}
                      >
                        <span className={cn("absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform", reminders.overdue ? "translate-x-4" : "translate-x-0")} />
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{language === 'ko' ? '우선순위별 기본 알림' : 'DEFAULT OFFSETS'}</p>
                    <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border overflow-hidden">
                      {[
                        { label: language === 'ko' ? '높음' : 'High Priority', key: 'high' as const },
                        { label: language === 'ko' ? '중간' : 'Medium Priority', key: 'mid' as const },
                        { label: language === 'ko' ? '낮음' : 'Low Priority', key: 'low' as const },
                      ].map(({ label, key }) => (
                        <div key={key} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm font-medium">{label}</span>
                          <Select value={reminders[key]} onValueChange={(value) => setReminders({ [key]: value })}>
                            <SelectTrigger className="w-[120px] h-7 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">{language === 'ko' ? '없음' : 'None'}</SelectItem>
                              <SelectItem value="On time">{language === 'ko' ? '정시' : 'On time'}</SelectItem>
                              <SelectItem value="5m before">5{language === 'ko' ? '분 전' : 'm before'}</SelectItem>
                              <SelectItem value="15m before">15{language === 'ko' ? '분 전' : 'm before'}</SelectItem>
                              <SelectItem value="30m before">30{language === 'ko' ? '분 전' : 'm before'}</SelectItem>
                              <SelectItem value="1h before">1{language === 'ko' ? '시간 전' : 'h before'}</SelectItem>
                              <SelectItem value="1d before">1{language === 'ko' ? '일 전' : 'd before'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── GENERAL ── */}
              {activeTab === 'general' && mounted && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full gap-4">
                  <h3 className="text-lg font-bold shrink-0">{t('settings.general')}</h3>
                  <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border overflow-hidden shrink-0">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium">{t('settings.displayLanguage')}</span>
                      <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ko">🇰🇷 한국어</SelectItem>
                          <SelectItem value="en">🇺🇸 English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{t('settings.aiSensitivity')}</p>
                        <p className="text-xs text-muted-foreground">{t('settings.aiSensitivity.desc')}</p>
                      </div>
                      <Select value={aiSensitivity} onValueChange={(val: any) => setAiSensitivity(val)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                          <SelectValue placeholder="Medium" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t('settings.aiSensitivity.low')}</SelectItem>
                          <SelectItem value="medium">{t('settings.aiSensitivity.medium')}</SelectItem>
                          <SelectItem value="high">{t('settings.aiSensitivity.high')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium">{t('settings.startWeekOn')}</span>
                      <Select value={startWeek} onValueChange={(val) => { if (val) setStartWeek(val as 'monday' | 'sunday') }}>
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                          <SelectValue placeholder="Monday" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">{t('settings.startWeekOn.monday')}</SelectItem>
                          <SelectItem value="sunday">{t('settings.startWeekOn.sunday')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACCOUNT ── */}
              {activeTab === 'account' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full gap-3">
                  <h3 className="text-lg font-bold shrink-0">{language === 'ko' ? '프로필' : 'Profile'}</h3>

                  <div className="rounded-xl border border-border bg-muted/5 px-4 py-3 flex items-center gap-4 shrink-0">
                    <div className="relative group cursor-pointer shrink-0" onClick={() => !isUploading && fileInputRef.current?.click()}>
                      <Avatar className="h-14 w-14 ring-2 ring-border">
                        <AvatarImage src={user?.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id || 'dummy'}`} />
                        <AvatarFallback className="text-lg">{user?.displayName?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        {isUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsUploading(true);
                            const url = await uploadAvatar(file);
                            if (url) { await updateUserProfile({ avatarUrl: url }); } else { alert('Failed to upload photo.'); }
                            setIsUploading(false);
                          }
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{user?.displayName || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      {user?.isPro && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">
                          <CheckCircle2 className="w-3 h-3" /> PRO
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0" onClick={() => !isUploading && fileInputRef.current?.click()}>
                      <Camera className="w-3.5 h-3.5 mr-1" />{language === 'ko' ? '사진 변경' : 'Change'}
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border overflow-hidden flex-1 min-h-0">
                    <div className="flex items-center px-4 py-2.5">
                      <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">{language === 'ko' ? '이름' : 'Name'}</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto text-sm font-medium"
                        placeholder={language === 'ko' ? '이름 입력' : 'Your Name'} />
                    </div>
                    <div className="flex items-center px-4 py-2.5 bg-muted/10">
                      <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">Email</label>
                      <span className="text-sm text-muted-foreground">{user?.email}</span>
                    </div>
                    <div className="flex items-center px-4 py-2.5">
                      <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">@ID</label>
                      <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                        className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto text-sm font-medium"
                        placeholder="username" />
                    </div>
                    <div className="flex items-center px-4 py-2.5 bg-muted/10">
                      <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">Bio</label>
                      <Input value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                        className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto text-sm"
                        placeholder={language === 'ko' ? '상태메시지 또는 소개' : 'Status or bio'} />
                    </div>
                  </div>

                  <div className="shrink-0 space-y-2">
                    <Button
                      className="w-full font-semibold rounded-xl h-9 text-sm"
                      disabled={isSaving || (editName === user?.displayName && editStatus === (user?.statusMessage || '') && editUsername === (user?.username || ''))}
                      onClick={async () => {
                        setIsSaving(true);
                        await updateUserProfile({ displayName: editName, statusMessage: editStatus, username: editUsername });
                        setIsSaving(false);
                      }}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {isSaving ? (language === 'ko' ? '저장 중...' : 'Saving...') : (language === 'ko' ? '프로필 저장' : 'Save Profile')}
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={async () => { import('../lib/supabase').then(async ({ supabase }) => { await supabase.auth.signOut(); window.location.reload(); }); }}>
                        {language === 'ko' ? '로그아웃' : 'Sign Out'}
                      </Button>
                      <Button variant="ghost" className="flex-1 h-8 text-xs text-destructive hover:bg-destructive/10"
                        disabled={isDeleting}
                        onClick={async () => {
                          const msg = language === 'ko'
                            ? '⚠️ 계정 삭제\n\n모든 데이터가 영구 삭제됩니다. 계속하시겠습니까?'
                            : '⚠️ Delete Account\n\nAll data will be permanently deleted. Continue?';
                          if (window.confirm(msg)) { setIsDeleting(true); await deleteAccount(); setIsDeleting(false); }
                        }}>
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (language === 'ko' ? '계정 삭제' : 'Delete Account')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS ── */}
              {activeTab === 'notifications' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full gap-4">
                  <h3 className="text-lg font-bold shrink-0">{language === 'ko' ? '알림' : 'Notifications'}</h3>
                  <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border overflow-hidden flex-1 min-h-0">
                    {[
                      { id: 'comments', title: language === 'ko' ? '댓글' : 'Comments', desc: language === 'ko' ? '공유 할 일에 새 댓글' : 'New comments on shared tasks/folders' },
                      { id: 'mentions', title: language === 'ko' ? '@멘션' : '@Mentions', desc: language === 'ko' ? '댓글에서 멘션됨' : 'When you are mentioned in a comment' },
                      { id: 'dueToday', title: language === 'ko' ? '오늘 마감' : 'Due Today', desc: language === 'ko' ? '오전 9시 알림' : 'Reminder at 9:00 AM' },
                      { id: 'dueSoon', title: language === 'ko' ? '마감 임박' : 'Due Soon', desc: language === 'ko' ? '마감 1시간 전' : '1 hour before deadline' },
                      { id: 'overdue', title: language === 'ko' ? '기한 초과' : 'Overdue', desc: language === 'ko' ? '미완료 지난 할 일' : 'Incomplete items past deadline' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => setNotificationSettings({ [item.id]: !notificationSettings[item.id as keyof typeof notificationSettings] })}
                          className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", notificationSettings[item.id as keyof typeof notificationSettings] ? "bg-primary" : "bg-muted")}
                        >
                          <span className={cn("absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform", notificationSettings[item.id as keyof typeof notificationSettings] ? "translate-x-4" : "translate-x-0")} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── INTEGRATIONS ── */}
              {activeTab === 'integrations' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full gap-3">
                  <div className="shrink-0">
                    <h3 className="text-lg font-bold">{language === 'ko' ? '연동' : 'Integrations'}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{language === 'ko' ? '타 서비스와 연동하여 할 일을 자동 수집하세요.' : 'Connect tools to auto-extract tasks.'}</p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-muted/5 divide-y divide-border">
                    {integrationsLoading ? (
                      <div className="flex items-center justify-center h-24">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      (() => {
                        const INTEGRATION_DEFS: Array<{
                          provider: IntegrationProvider;
                          name: string;
                          icon: string;
                          desc: { ko: string; en: string };
                        }> = [
                          {
                            provider: 'gmail',
                            name: 'Gmail',
                            icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968534.png',
                            desc: { ko: '이메일에서 할 일 자동 추출', en: 'Auto-extract tasks from emails' },
                          },
                          {
                            provider: 'slack',
                            name: 'Slack',
                            icon: 'https://cdn-icons-png.flaticon.com/512/3800/3800024.png',
                            desc: { ko: '채널 메시지에서 할 일 감지', en: 'Detect tasks from channel messages' },
                          },
                          {
                            provider: 'notion',
                            name: 'Notion',
                            icon: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png',
                            desc: { ko: '노션 페이지 변동 감지', en: 'Detect Notion page changes' },
                          },
                          {
                            provider: 'call_recording',
                            name: language === 'ko' ? '통화 녹음' : 'Call Recording',
                            icon: 'https://cdn-icons-png.flaticon.com/512/455/455705.png',
                            desc: { ko: '통화 녹음에서 할 일 추출', en: 'Extract tasks from call recordings' },
                          },
                          {
                            provider: 'android_notifications',
                            name: language === 'ko' ? '안드로이드 알림' : 'Android Notifications',
                            icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
                            desc: { ko: '앱 알림에서 할 일 감지', en: 'Detect tasks from app notifications' },
                          },
                        ];

                        // 연결된 항목을 위로 정렬
                        const sortedDefs = [...INTEGRATION_DEFS].sort((a, b) => {
                          const aStatus = integrations.find(i => i.provider === a.provider)?.status;
                          const bStatus = integrations.find(i => i.provider === b.provider)?.status;
                          const aScore = aStatus === 'active' ? 0 : (aStatus === 'error' || aStatus === 'warning') ? 1 : 2;
                          const bScore = bStatus === 'active' ? 0 : (bStatus === 'error' || bStatus === 'warning') ? 1 : 2;
                          return aScore - bScore;
                        });

                        const COMING_SOON = [
                          { name: 'Outlook', icon: 'https://cdn-icons-png.flaticon.com/512/732/732221.png' },
                          { name: 'Google Calendar', icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968506.png' },
                          { name: 'Telegram', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png' },
                          { name: 'GitHub', icon: 'https://cdn-icons-png.flaticon.com/512/733/733553.png' },
                          { name: 'LINE', icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111499.png' },
                        ];

                        const getIntegrationStatus = (provider: IntegrationProvider) =>
                          integrations.find(i => i.provider === provider);

                        return (
                          <>
                            {sortedDefs.map((tool) => {
                              const record = getIntegrationStatus(tool.provider);
                              const status = record?.status ?? null;
                              const isActive = status === 'active';
                              const isError = status === 'error' || status === 'warning';
                              const isDisconnected = status === 'disconnected';
                              const updatedAt = record?.updatedAt;
                              const failCount = record?.metadata?.token_fail_count || 0;

                              return (
                                <div key={tool.provider} className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="relative shrink-0">
                                      <img src={tool.icon} alt={tool.name} className="w-8 h-8 object-contain rounded-lg" referrerPolicy="no-referrer" />
                                      {isActive && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                                      )}
                                      {isError && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-background" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium">{tool.name}</p>
                                        {isActive && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                            <Check className="w-2.5 h-2.5" />
                                            {language === 'ko' ? '연결됨' : 'Active'}
                                          </span>
                                        )}
                                        {status === 'error' && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full">
                                            {language === 'ko' ? '오류' : 'Error'}
                                            {failCount > 0 && ` (${failCount}회)`}
                                          </span>
                                        )}
                                        {status === 'warning' && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">
                                            {language === 'ko' ? '재연결 필요' : 'Reconnect'}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {isActive && updatedAt
                                          ? (language === 'ko'
                                              ? `${new Date(updatedAt).toLocaleDateString('ko-KR')} 연결됨`
                                              : `Connected ${new Date(updatedAt).toLocaleDateString('en-US')}`)
                                          : isError
                                          ? (language === 'ko' ? '재연결이 필요합니다' : 'Reconnection required')
                                          : (language === 'ko' ? tool.desc.ko : tool.desc.en)}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant={(isActive || isError) ? 'outline' : 'ghost'}
                                    size="sm"
                                    className={cn(
                                      "text-xs h-7 px-3 shrink-0 ml-3 transition-all",
                                      isActive
                                        ? "border-primary/40 text-primary hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                        : isError
                                        ? "border-amber-500/40 text-amber-600 hover:border-primary/40 hover:text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                    )}
                                    onClick={() => setShowMobileModal(true)}
                                  >
                                    {isActive
                                      ? <><Link2Off className="w-3 h-3 mr-1" />{language === 'ko' ? '연결 해제' : 'Disconnect'}</>
                                      : isError
                                      ? <><Link2 className="w-3 h-3 mr-1" />{language === 'ko' ? '재연결' : 'Reconnect'}</>
                                      : <><Link2 className="w-3 h-3 mr-1" />{language === 'ko' ? '연동하기' : 'Connect'}</>
                                    }
                                  </Button>
                                </div>
                              );
                            })}
                            <div className="px-4 py-2 bg-muted/10">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{language === 'ko' ? '준비중' : 'Coming Soon'}</p>
                            </div>
                            {COMING_SOON.map((tool) => (
                              <div key={tool.name} className="flex items-center justify-between px-4 py-2.5 opacity-50">
                                <div className="flex items-center gap-3">
                                  <img src={tool.icon} alt={tool.name} className="w-8 h-8 object-contain rounded-lg" referrerPolicy="no-referrer" />
                                  <div>
                                    <p className="text-sm font-medium">{tool.name}</p>
                                    <p className="text-xs text-muted-foreground">{language === 'ko' ? '준비중' : 'Coming soon'}</p>
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">{language === 'ko' ? '준비중' : 'Soon'}</span>
                              </div>
                            ))}
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* ── SUPPORT ── */}
              {activeTab === 'support' && mounted && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
                  {supportPage === 'main' ? (
                    <div className="flex flex-col h-full gap-4">
                      <h3 className="text-lg font-bold shrink-0">{language === 'ko' ? '지원' : 'Help & Feedback'}</h3>
                      <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border overflow-hidden shrink-0">
                        {[
                          { page: 'help' as const, title: language === 'ko' ? '피드백 보내기' : 'Send Feedback', desc: language === 'ko' ? '의견을 보내주세요.' : 'Share your thoughts with us.' },
                          { page: 'whatsnew' as const, title: language === 'ko' ? '업데이트 내역' : "What's New", desc: language === 'ko' ? '최신 업데이트 확인' : 'See the latest updates.' },
                          { page: 'about' as const, title: language === 'ko' ? '앱 정보' : 'About', desc: language === 'ko' ? '앱 버전, 법적 정보' : 'App version, legal, and privacy.' },
                        ].map((item) => (
                          <div key={item.page} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setSupportPage(item.page)}>
                            <div>
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : supportPage === 'help' ? (
                    <div className="animate-in slide-in-from-right-2 duration-200 flex flex-col h-full gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setSupportPage('main')} className="shrink-0 -ml-2 w-8 h-8 text-muted-foreground hover:text-foreground">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <h3 className="text-lg font-bold">{language === 'ko' ? '피드백 보내기' : 'Send Feedback'}</h3>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/5 p-4 flex-1 min-h-0 flex flex-col">
                        <p className="text-xs text-muted-foreground mb-3">{language === 'ko' ? 'Denlog를 더 잘 만들기 위한 의견을 보내주세요!' : "We'd love to hear how we can improve Denlog!"}</p>
                        {feedbackSuccess ? (
                          <div className="flex flex-col items-center justify-center flex-1 text-center">
                            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                              <Check className="w-5 h-5 text-primary" />
                            </div>
                            <p className="font-medium text-sm">{language === 'ko' ? '감사합니다!' : 'Thank You!'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{language === 'ko' ? '피드백이 제출되었습니다.' : 'Feedback submitted successfully.'}</p>
                            <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => setFeedbackSuccess(false)}>{language === 'ko' ? '다시 보내기' : 'Send Another'}</Button>
                          </div>
                        ) : (
                          <>
                            <textarea
                              className="w-full flex-1 p-3 text-sm rounded-lg border border-border bg-background mb-3 focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-0"
                              placeholder={language === 'ko' ? '의견을 입력하세요...' : 'Tell us what you think...'}
                              value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                            />
                            <Button className="w-full h-9 text-sm" disabled={!feedbackText.trim() || isSubmittingFeedback}
                              onClick={async () => {
                                setIsSubmittingFeedback(true);
                                try {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  const { error } = await supabase.from('feedback').insert({
                                    user_id: user?.id ?? null,
                                    user_email: user?.email ?? null,
                                    message: feedbackText.trim(),
                                    status: 'unread',
                                  });
                                  if (error) throw error;
                                  setFeedbackSuccess(true);
                                  setFeedbackText('');
                                } catch (e) {
                                  console.error('[Feedback] insert error:', e);
                                  alert(language === 'ko' ? '피드백 전송에 실패했습니다. 다시 시도해주세요.' : 'Could not send feedback. Please try again.');
                                } finally {
                                  setIsSubmittingFeedback(false);
                                }
                              }}>
                              {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'ko' ? '피드백 보내기' : 'Submit Feedback')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : supportPage === 'whatsnew' ? (
                    <div className="animate-in slide-in-from-right-2 duration-200 flex flex-col h-full gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setSupportPage('main')} className="shrink-0 -ml-2 w-8 h-8 text-muted-foreground hover:text-foreground">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <h3 className="text-lg font-bold">{language === 'ko' ? '업데이트 내역' : "What's New"}</h3>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                        <div className="relative pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-0 before:w-px before:bg-border">
                          <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
                          <p className="font-bold text-sm">v1.0.0 (Web)</p>
                          <p className="text-xs text-primary font-medium mb-1">{language === 'ko' ? '오늘' : 'Today'}</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>• {language === 'ko' ? '모바일 앱과 프로필 동기화' : 'Profile sync with mobile app.'}</p>
                            <p>• {language === 'ko' ? '설정 메뉴 인터랙티브 업데이트' : 'Interactive settings menus added.'}</p>
                            <p>• {language === 'ko' ? '성능 개선 및 버그 픽스' : 'Performance improvements & bug fixes.'}</p>
                          </div>
                        </div>
                        <div className="relative pl-5">
                          <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-muted-foreground ring-2 ring-background" />
                          <p className="font-bold text-sm">{language === 'ko' ? '베타 출시' : 'Beta Release'}</p>
                          <p className="text-xs text-muted-foreground font-medium mb-1">{language === 'ko' ? '지난달' : 'Last Month'}</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>• {language === 'ko' ? 'Denlog Web 최초 베타 출시' : 'Initial beta launch for Denlog Web.'}</p>
                            <p>• {language === 'ko' ? '실시간 채팅 및 할 일 동기화' : 'Real-time chat and task syncing.'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-right-2 duration-200 flex flex-col h-full gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setSupportPage('main')} className="shrink-0 -ml-2 w-8 h-8 text-muted-foreground hover:text-foreground">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <h3 className="text-lg font-bold">{language === 'ko' ? '앱 정보' : 'About'}</h3>
                      </div>
                      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/5 px-4 py-3 shrink-0">
                        <img src="/logo_new.png" alt="Denlog Logo" className="w-12 h-12 rounded-xl object-contain bg-white border border-border p-0.5 shrink-0" />
                        <div>
                          <p className="font-bold text-base">Denlog</p>
                          <p className="text-xs text-muted-foreground">Version 1.0.0 (Web)</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/5 divide-y divide-border overflow-hidden shrink-0">
                        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setShowTerms(true)}>
                          <span className="text-sm font-medium">{language === 'ko' ? '이용약관' : 'Terms of Service'}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setShowPrivacy(true)}>
                          <span className="text-sm font-medium">{language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-center text-xs text-muted-foreground shrink-0">© 2026 Denlog Inc. All rights reserved.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowTerms(false)}>
          <div className="bg-background w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex justify-between items-center shrink-0">
              <h2 className="text-base font-bold">{language === 'ko' ? '이용약관' : 'Terms of Service'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTerms(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-sm text-muted-foreground">
              {language === 'ko' ? (
                <>
                  <h3 className="text-foreground font-semibold mt-1 mb-1 text-sm">1. 서비스 이용 동의</h3>
                  <p>Denlog 앱(&quot;서비스&quot;)을 사용함으로써 본 이용약관에 동의하는 것으로 간주됩니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">2. 서비스 설명</h3>
                  <p>Denlog는 회의 녹음, AI 분석, 할 일 관리 및 팀 협업 기능을 제공하는 생산성 앱입니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">3. 계정 및 보안</h3>
                  <p>Google 계정으로 로그인해야 하며, 계정의 보안 유지에 책임이 있습니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">4. 사용자 데이터</h3>
                  <p>업로드한 데이터는 귀하의 소유입니다. Denlog는 서비스 제공 목적으로만 처리합니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">5. 금지 행위</h3>
                  <p>서비스를 이용한 불법 활동, 타인 개인정보 무단 수집, 해킹, 스팸 배포 등은 금지됩니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">6. 구독 및 결제</h3>
                  <p>Denlog Pro 구독은 Google Play 또는 App Store를 통해 이루어집니다. 환불 정책은 각 스토어 정책을 따릅니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">7. 서비스 변경 및 중단</h3>
                  <p>Denlog는 사전 통지 없이 서비스를 변경, 일시 중단 또는 종료할 권리를 보유합니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">8. 면책 조항</h3>
                  <p>서비스는 &quot;있는 그대로&quot; 제공됩니다. Denlog는 간접적·부수적 손해에 대해 책임을 지지 않습니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">9. 문의</h3>
                  <p>본 약관에 대한 문의는 <span className="text-foreground font-medium">hello@dovie.online</span>으로 연락해 주십시오.</p>
                </>
              ) : (
                <>
                  <h3 className="text-foreground font-semibold mt-1 mb-1 text-sm">1. Acceptance of Terms</h3>
                  <p>By using Denlog (&quot;Service&quot;), you agree to these Terms. If you do not agree, please do not use the Service.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">2. Service Description</h3>
                  <p>Denlog is a productivity app offering meeting recording, AI analysis, task management, and team collaboration.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">3. Account &amp; Security</h3>
                  <p>You must sign in with a Google account and are responsible for maintaining your account security.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">4. User Data</h3>
                  <p>Data you upload belongs to you. Denlog processes it solely to provide the Service.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">5. Prohibited Activities</h3>
                  <p>Illegal activities, unauthorized data collection, hacking, and spam distribution are strictly prohibited.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">6. Subscription &amp; Payments</h3>
                  <p>Subscriptions are processed via Google Play or the App Store. Refund policies follow each platform&apos;s policy.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">7. Service Changes</h3>
                  <p>Denlog reserves the right to modify, suspend, or terminate the Service without prior notice.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">8. Disclaimer</h3>
                  <p>The Service is provided &quot;as is.&quot; Denlog is not liable for indirect or incidental damages.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">9. Contact</h3>
                  <p>For inquiries, contact <span className="text-foreground font-medium">hello@dovie.online</span>.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPrivacy(false)}>
          <div className="bg-background w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex justify-between items-center shrink-0">
              <h2 className="text-base font-bold">{language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowPrivacy(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-sm text-muted-foreground">
              {language === 'ko' ? (
                <>
                  <h3 className="text-foreground font-semibold mt-1 mb-1 text-sm">1. 수집하는 개인정보</h3>
                  <p>Google 이메일, 이름, 프로필 사진 등 Google API를 통해 제공되는 데이터를 수집합니다. Gmail 연동 시 읽기 전용 이메일 접근 권한을 요청합니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">2. 개인정보의 이용</h3>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>서비스 제공 및 운영</li>
                    <li>AI를 활용한 이메일 할 일 자동 추출 (Gmail 읽기 전용)</li>
                    <li>회의 음성 AI 텍스트 변환 (OpenAI Whisper)</li>
                    <li>할 일 및 일정 관리, 푸시 알림, 서비스 개선</li>
                  </ul>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">3. 제3자 제공</h3>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><span className="font-medium text-foreground">OpenAI</span>: 음성 텍스트 변환 (데이터 보관 및 AI 학습 금지)</li>
                    <li><span className="font-medium text-foreground">Supabase</span>: 데이터 저장 (EU 서버)</li>
                    <li><span className="font-medium text-foreground">RevenueCat</span>: 구독 결제</li>
                    <li><span className="font-medium text-foreground">Firebase</span>: 앱 분석 및 알림</li>
                  </ul>
                  <p>Google 사용자 데이터는 제3자에게 절대 판매하지 않으며, 광고나 AI 학습에 사용되지 않습니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">4. 데이터 보안</h3>
                  <p>모든 데이터는 HTTPS로 암호화되며 Supabase RLS 정책이 적용됩니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">5. 사용자의 권리</h3>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>개인정보 열람 및 수정</li>
                    <li>계정 및 데이터 삭제 요청</li>
                    <li>데이터 처리 동의 철회</li>
                  </ul>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">6. Google API 정책 준수</h3>
                  <p>Google API에서 수신한 정보의 사용은 제한적 사용 요건(Limited Use)을 포함한 Google API 서비스 사용자 데이터 정책을 준수합니다.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">7. 문의</h3>
                  <p>개인정보 관련 문의는 <span className="text-foreground font-medium">hello@dovie.online</span>으로 연락해 주십시오.</p>
                </>
              ) : (
                <>
                  <h3 className="text-foreground font-semibold mt-1 mb-1 text-sm">1. Information We Collect</h3>
                  <p>We collect data provided via Google APIs (email, name, profile photo) for authentication. Gmail integration requires read-only email access.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">2. How We Use Your Information</h3>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Providing and operating the Service</li>
                    <li>AI-powered task extraction from emails (Gmail read-only)</li>
                    <li>Meeting audio transcription (OpenAI Whisper)</li>
                    <li>Task management, push notifications, service improvement</li>
                  </ul>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">3. Third-Party Services</h3>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><span className="font-medium text-foreground">OpenAI</span>: Audio transcription (no unauthorized storage or training)</li>
                    <li><span className="font-medium text-foreground">Supabase</span>: Data storage (EU servers)</li>
                    <li><span className="font-medium text-foreground">RevenueCat</span>: Subscription billing</li>
                    <li><span className="font-medium text-foreground">Firebase</span>: Analytics and notifications</li>
                  </ul>
                  <p>We never sell Google user data to third parties or use it for targeted ads or AI training.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">4. Data Security</h3>
                  <p>All data is encrypted via HTTPS and protected by Supabase row-level security (RLS) policies.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">5. Your Rights</h3>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Access and edit your personal information</li>
                    <li>Request account and data deletion</li>
                    <li>Withdraw consent for data processing</li>
                  </ul>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">6. Google API Compliance</h3>
                  <p>Our use of Google API data complies with the Google API Services User Data Policy, including Limited Use requirements.</p>
                  <h3 className="text-foreground font-semibold mt-3 mb-1 text-sm">7. Contact</h3>
                  <p>For privacy inquiries, contact <span className="text-foreground font-medium">hello@dovie.online</span>.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
      {/* Mobile Only Modal */}
      {showMobileModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={() => setShowMobileModal(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-background border border-border rounded-2xl shadow-2xl w-[320px] p-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
              </svg>
            </div>
            {/* Text */}
            <div className="text-center">
              <p className="font-bold text-base mb-1">
                {language === 'ko' ? '모바일 앱에서 연동하세요' : 'Connect via Mobile App'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {language === 'ko'
                  ? '연동 설정은 Denlog 모바일 앱(iOS/Android)에서만 가능합니다.'
                  : 'Integration settings are only available on the Denlog mobile app (iOS/Android).'}
              </p>
            </div>
            {/* Close Button */}
            <Button
              className="w-full"
              onClick={() => setShowMobileModal(false)}
            >
              {language === 'ko' ? '확인' : 'Got it'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
