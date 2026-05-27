import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Mic, Users, Phone, Search, Archive, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '../lib/utils';
import type { MeetingRecording } from '../types';
import { MeetingStartModal } from './MeetingStartModal';

export function CabinetView() {
  const { recordings, selectedRecordingIds, toggleRecordingSelection, selectAllRecordings, clearRecordingSelection, deleteRecordings } = useStore();
  const { t } = useTranslation();
  const [filterTab, setFilterTab] = useState<'all' | 'solo' | 'team' | 'call' | 'shared'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);

  const filteredRecordings = recordings.filter(r => {
    // Basic text search
    if (searchQuery.trim() && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Tab filter
    if (filterTab === 'all') return true;
    if (filterTab === 'shared') return r.isShared;
    if (filterTab === 'solo') return r.mode === 'solo' && !r.isShared;
    if (filterTab === 'team') return r.mode === 'team' && !r.isShared;
    if (filterTab === 'call') return r.mode === 'call' && !r.isShared;
    return true;
  });

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getIcon = (mode: 'solo' | 'team' | 'call') => {
    if (mode === 'call') return <Phone className="w-4 h-4" />;
    if (mode === 'team') return <Users className="w-4 h-4" />;
    return <Mic className="w-4 h-4" />;
  };

  const getLabel = (mode: 'solo' | 'team' | 'call') => {
    if (mode === 'call') return 'Call Recording';
    if (mode === 'team') return 'Team Meeting';
    return 'Solo Recording';
  };

  return (
    <div className="flex-1 flex flex-col bg-background/50 relative min-h-0">
      <div className="px-8 py-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-1.5">
          {(['all', 'solo', 'team', 'call', 'shared'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={cn(
                "px-5 py-2 rounded-full text-[13px] font-semibold transition-all",
                filterTab === tab 
                  ? "bg-foreground text-background shadow-sm" 
                  : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t(`filter.${tab}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-64 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('header.searchRecordings')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/40 border border-border/50 rounded-full pl-11 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-background transition-all placeholder:text-muted-foreground/60"
            />
          </div>
          
          <button 
            onClick={() => setIsStartModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>{t('action.record')}</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {filteredRecordings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center h-[40vh] text-center max-w-sm mx-auto opacity-50 mt-10">
            <Archive className="w-16 h-16 mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">{t('empty.noRecordings')}</h3>
            <p className="text-sm font-medium mb-6">
              {searchQuery ? `${t('empty.noResultsFor')} "${searchQuery}"` : t('empty.noRecordingsDesc')}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setIsStartModalOpen(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Start First Recording
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredRecordings.map(recording => {
              const isSelected = useStore.getState().selectedRecordingId === recording.id;
              return (
              <div 
                key={recording.id} 
                onClick={() => {
                  if (selectedRecordingIds.length > 0) {
                    toggleRecordingSelection(recording.id);
                  } else {
                    const store = useStore.getState() as any;
                    if (store.setSelectedRecording) {
                      store.setSelectedRecording(recording.id);
                    } else if (store.setSelectedRecordingId) {
                      store.setSelectedRecordingId(recording.id);
                    }
                  }
                }}
                className={cn(
                  "group flex items-start gap-3 px-6 py-3.5 border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-all border-l-[3px]",
                  isSelected ? "bg-muted/30 border-l-primary" : "border-l-transparent",
                  selectedRecordingIds.includes(recording.id) && "bg-primary/5"
                )}
              >
                <div className="relative mt-0.5 w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center">
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center text-muted-foreground transition-all duration-200",
                    (selectedRecordingIds.length > 0 || selectedRecordingIds.includes(recording.id)) ? "opacity-0 scale-50" : "opacity-100 group-hover:opacity-0 group-hover:scale-50"
                  )}>
                    {getIcon(recording.mode)}
                  </div>
                  <div 
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-all duration-200 cursor-pointer z-10",
                      selectedRecordingIds.includes(recording.id) ? "opacity-100 scale-100 text-primary" : "opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 text-muted-foreground"
                    )}
                    onClick={(e) => { e.stopPropagation(); toggleRecordingSelection(recording.id); }}
                  >
                    {selectedRecordingIds.includes(recording.id) ? (
                      <CheckSquare className="w-[18px] h-[18px]" />
                    ) : (
                      <Square className="w-[18px] h-[18px]" />
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold leading-tight text-foreground">
                      {recording.title}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1.5 text-[12px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      {getLabel(recording.mode)}
                    </span>
                    <span>•</span>
                    <span>{formatDuration(recording.durationSec)}</span>
                    {recording.taskCount ? (
                      <>
                        <span>•</span>
                        <span className="text-primary">{recording.taskCount} tasks generated</span>
                      </>
                    ) : null}
                    {recording.isShared && (
                      <>
                        <span>•</span>
                        <span className="bg-primary/10 text-primary px-1.5 py-0 rounded font-bold uppercase tracking-wider" style={{ fontSize: 9 }}>Shared</span>
                      </>
                    )}
                    <span className="ml-auto text-[11px] opacity-70">
                      {recording.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selection Action Bar */}
      {selectedRecordingIds.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 z-50">
          <div className="flex items-center gap-2">
            <span className="font-bold">{selectedRecordingIds.length}</span>
            <span className="text-muted text-sm">selected</span>
          </div>
          <div className="w-px h-4 bg-background/20" />
          <button 
            className="flex items-center gap-2 hover:text-red-400 transition-colors"
            onClick={() => deleteRecordings(selectedRecordingIds)}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-bold">Delete</span>
          </button>
          <div className="w-px h-4 bg-background/20" />
          <button 
            className="p-1 hover:bg-background/20 rounded-full transition-colors"
            onClick={clearRecordingSelection}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isStartModalOpen && (
        <MeetingStartModal isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} />
      )}
    </div>
  );
}
