"use client";
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Button } from './ui/button';
import { X, ChevronLeft, ChevronRight, PlayCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

export function DeckViewer() {
  const { todos, viewingDeckTodoId, setViewingDeckTodo } = useStore();
  const todo = todos.find(t => t.id === viewingDeckTodoId);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (!todo || !todo.aiDeck) return null;

  const deck = todo.aiDeck;
  const slides = deck.slides;

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setViewingDeckTodo(null)}
    >
      <div 
        className="bg-background w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-border/50"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              AI Deck
            </span>
            <h2 className="text-lg font-bold truncate max-w-lg">{todo.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden md:flex">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="ghost" size="icon" onClick={() => {
              setViewingDeckTodo(null);
              setCurrentSlideIndex(0);
            }} className="rounded-full bg-muted/50 hover:bg-muted">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Main Slide Area */}
          <div className="flex-1 flex flex-col bg-muted/10 relative p-6">
            <div className="flex-1 flex items-center justify-center">
              {/* Slide Card */}
              <div className="w-full max-w-3xl aspect-[16/9] bg-card rounded-xl shadow-lg border flex flex-col p-10 relative overflow-hidden transition-all">
                {/* Decorative element for the slide */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px]" />
                
                <h1 className="text-3xl font-extrabold text-primary mb-8 relative z-10">
                  {slides[currentSlideIndex]?.title}
                </h1>
                
                <div className="flex flex-col gap-4 relative z-10 text-lg">
                  {slides[currentSlideIndex]?.content.map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-primary mt-1.5 font-bold text-xl">•</span>
                      <span className="font-medium text-foreground/80 leading-relaxed">{point}</span>
                    </div>
                  ))}
                </div>
                
                <div className="absolute bottom-6 right-8 text-sm font-bold text-muted-foreground/50">
                  {currentSlideIndex + 1} / {slides.length}
                </div>
              </div>
            </div>

            {/* Slide Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button variant="outline" size="icon" onClick={handlePrev} disabled={currentSlideIndex === 0} className="rounded-full shadow-sm">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-bold text-muted-foreground w-16 text-center">
                {currentSlideIndex + 1} of {slides.length}
              </span>
              <Button variant="outline" size="icon" onClick={handleNext} disabled={currentSlideIndex === slides.length - 1} className="rounded-full shadow-sm">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Right Panel: Transcript & Summary */}
          <div className="w-[380px] border-l flex flex-col bg-card shrink-0">
            <div className="px-5 py-4 border-b">
              <h3 className="font-bold text-lg">Meeting Summary</h3>
            </div>
            
            <ScrollArea className="flex-1 p-5">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2 uppercase tracking-wider">
                    ✨ AI Summary
                  </h4>
                  <p className="text-sm text-foreground/80 leading-relaxed p-4 bg-primary/5 rounded-xl border border-primary/10">
                    {deck.summary}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" />
                    Transcript
                  </h4>
                  <div className="space-y-4">
                    {/* Simulated split of transcript for UI purposes */}
                    {deck.transcript.split(/(\[\d+:\d+\])/g).map((chunk, i) => {
                      if (chunk.match(/\[\d+:\d+\]/)) {
                        return (
                          <div key={i} className="text-xs font-mono text-muted-foreground mt-4 mb-1">
                            {chunk}
                          </div>
                        );
                      }
                      if (chunk.trim()) {
                        const parts = chunk.split(':');
                        if (parts.length > 1) {
                          return (
                            <div key={i} className="bg-muted/30 p-3 rounded-lg border text-sm">
                              <span className="font-bold mr-2">{parts[0].trim()}:</span>
                              <span className="text-muted-foreground/90">{parts.slice(1).join(':').trim()}</span>
                            </div>
                          );
                        }
                        return <p key={i} className="text-sm px-1">{chunk}</p>;
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
        
      </div>
    </div>
  );
}
