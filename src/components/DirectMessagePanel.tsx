import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useMessages } from '@/hooks/useMessages';
import { X, Send, User, Plus, Image as ImageIcon, Video, FileText, CheckSquare, Contact, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type StagedAttachment = 
  | { type: 'file' | 'image' | 'video', file: File }
  | { type: 'task', taskId: string, taskSnapshot: any }
  | { type: 'contact', userId: string, userName: string, avatarUrl: string | null };

export function DirectMessagePanel() {
  const { activeChatUser, setActiveChatUser, user, todos, usersMap, setSelectedTodo } = useStore();
  const { messages, isLoading, sendMessage } = useMessages(activeChatUser?.id || null);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  if (!activeChatUser || !user) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
        <User className="w-12 h-12 mb-4 text-muted-foreground/30" />
        <p>Select a person to start chatting</p>
      </div>
    );
  }

  const handleSend = async () => {
    if (!inputText.trim() && !stagedAttachment) return;
    if (isUploading || !user) return;

    if (stagedAttachment) {
      if (stagedAttachment.type === 'file' || stagedAttachment.type === 'image' || stagedAttachment.type === 'video') {
        const file = stagedAttachment.file;
        setIsUploading(true);
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('dm-attachments-public')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data } = supabase.storage
            .from('dm-attachments-public')
            .getPublicUrl(filePath);
            
          sendMessage(inputText.trim() || ' ', {
            messageType: 'text',
            attachments: [{
              name: file.name,
              url: data.publicUrl,
              type: stagedAttachment.type,
              size: file.size
            }]
          });
        } catch (error: any) {
          alert(`파일 업로드 실패: ${error.message}`);
        } finally {
          setIsUploading(false);
          setStagedAttachment(null);
          setInputText('');
        }
      } else if (stagedAttachment.type === 'task') {
        sendMessage(inputText.trim() || ' ', {
          messageType: 'task',
          taskId: stagedAttachment.taskId,
          taskSnapshot: stagedAttachment.taskSnapshot
        } as any);
        setStagedAttachment(null);
        setInputText('');
      } else if (stagedAttachment.type === 'contact') {
        sendMessage(inputText.trim() || ' ', {
          messageType: 'text',
          attachments: [{
            type: 'contact',
            contactId: stagedAttachment.userId,
            contactName: stagedAttachment.userName,
            contactAvatarUrl: stagedAttachment.avatarUrl
          }]
        });
        setStagedAttachment(null);
        setInputText('');
      }
    } else {
      sendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    alert('해당 첨부 기능은 현재 버전에서는 지원되지 않습니다.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    let type: 'file' | 'image' | 'video' = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    
    setStagedAttachment({ type, file });
    setIsPopoverOpen(false);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleTaskClick = () => {
    setIsPopoverOpen(false);
    setIsTaskPickerOpen(true);
  };

  const handleTaskSelect = (taskId: string) => {
    const task = todos.find(t => t.id === taskId);
    setStagedAttachment({ type: 'task', taskId, taskSnapshot: task });
    setIsTaskPickerOpen(false);
  };

  const handleContactClick = () => {
    setIsPopoverOpen(false);
    setIsContactPickerOpen(true);
    setContactSearch('');
  };

  const handleContactSelect = (contactUser: {id: string, name: string, avatarUrl: string | null}) => {
    setStagedAttachment({ type: 'contact', userId: contactUser.id, userName: contactUser.name, avatarUrl: contactUser.avatarUrl });
    setIsContactPickerOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-background backdrop-blur-sm">
      <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleFileChange} />
      <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={handleFileChange} />

      {/* Header */}
      <header className="h-14 border-b border-border/40 flex items-center justify-between px-6 shrink-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-2 ring-background">
            <AvatarImage src={activeChatUser.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${activeChatUser.id}`} />
            <AvatarFallback>{activeChatUser.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">{activeChatUser.name}</span>
            <span className="text-[10px] text-green-500 font-medium mt-1">Online</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => setActiveChatUser(null)}>
          <X className="h-4 w-4 stroke-[2]" />
        </Button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-auto p-6 bg-muted/5 flex flex-col gap-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground gap-3">
            <User className="h-12 w-12 opacity-20" />
            <span className="text-sm">Say hi to {activeChatUser.name}!</span>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === user.id;
            const showTime = i === messages.length - 1 || messages[i+1].senderId !== msg.senderId;
            const avatarUrl = isMe ? user.avatarUrl : activeChatUser.avatarUrl;
            return (
              <div key={msg.id} className={cn("flex gap-2 max-w-[85%]", isMe ? "self-end flex-row-reverse" : "self-start flex-row")}>
                <div className="flex flex-col justify-end pb-[22px]">
                  {showTime ? (
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarImage src={avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${msg.senderId}`} />
                      <AvatarFallback><User className="w-4 h-4 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-7 shrink-0" />
                  )}
                </div>
                <div className={cn("flex flex-col flex-1 max-w-[calc(100%-36px)]", isMe ? "items-end" : "items-start")}>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed relative overflow-hidden break-words w-fit max-w-full",
                    isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border/50 rounded-bl-sm"
                  )}>
                  {(msg.messageType === 'media' || (msg.attachments && msg.attachments.length > 0)) ? (
                    <div className="flex flex-col gap-2">
                      {msg.attachments?.map((att: any, idx: number) => (
                        <div key={idx} className="flex flex-col gap-1">
                          {att.type === 'image' && (
                            <img src={att.url} alt={att.name} className="max-w-[240px] max-h-[240px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(att.url, '_blank')} />
                          )}
                          {att.type === 'video' && (
                            <video src={att.url} controls className="max-w-[240px] max-h-[240px] rounded-lg bg-black/5" />
                          )}
                          {(att.type === 'file' || !att.type) && (
                            <a href={att.url} target="_blank" rel="noreferrer" className={cn("flex items-center gap-2 underline underline-offset-4", isMe ? "decoration-primary-foreground/50 hover:decoration-primary-foreground" : "decoration-muted-foreground/50 hover:decoration-foreground")}>
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate max-w-[200px] break-all">{att.name}</span>
                            </a>
                          )}
                          {att.type === 'contact' && (
                            <div 
                              className="flex items-center gap-3 p-3 bg-background/20 rounded-xl border border-border/10 cursor-pointer hover:bg-background/30 transition-colors"
                              onClick={async () => {
                                const targetContactId = att.contactId || att.userId || att.id || att.url;
                                if (!targetContactId) return;
                                try {
                                  const { error } = await supabase.from('friends').insert({
                                    user_id: user?.id,
                                    friend_id: targetContactId,
                                    status: 'pending'
                                  });
                                  if (error) {
                                    if (error.code === '23505') alert('Already requested or friends.');
                                    else alert(`Failed to request friend: ${error.message}`);
                                  } else {
                                    alert('Friend request sent!');
                                  }
                                } catch (e: any) {
                                  alert(e.message);
                                }
                              }}
                            >
                              <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center shrink-0">
                                <Avatar className="h-full w-full">
                                  <AvatarImage src={att.contactAvatarUrl || att.avatarUrl || att.avatar_url || (att.url && att.url.startsWith('http') ? att.url : `https://api.dicebear.com/7.x/notionists/svg?seed=${att.contactId || att.url || att.contactName}`)} />
                                  <AvatarFallback><User className="w-4 h-4 text-muted-foreground" /></AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-[13px]">{att.contactName || att.name}</span>
                                <span className="text-[11px] opacity-70">Tap to request friend</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {msg.content && msg.content.trim() !== '' && <span>{msg.content}</span>}
                    </div>
                  ) : msg.messageType === 'task' ? (
                    <div 
                      className="flex flex-col gap-1 p-1 cursor-pointer hover:opacity-90 transition-opacity min-w-[200px]"
                      onClick={() => {
                        if (msg.taskId) {
                          setSelectedTodo(msg.taskId);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 opacity-80 mb-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium uppercase tracking-wider">Task Shared</span>
                      </div>
                      <span className={cn(
                        "font-bold text-[14px] leading-tight mb-2", 
                        msg.taskSnapshot?.isCompleted && "line-through opacity-50"
                      )}>
                        {msg.taskSnapshot?.title || "Unknown Task"}
                      </span>
                      
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {msg.taskSnapshot?.isCompleted && (
                          <div className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold", isMe ? "bg-background/20 text-primary-foreground" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}>
                            ✓ Done
                          </div>
                        )}
                        {msg.taskSnapshot?.priority && (
                          <div className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold",
                            isMe ? "bg-background/20 text-primary-foreground" :
                            msg.taskSnapshot.priority === 'high' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                            msg.taskSnapshot.priority === 'medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          )}>
                            {msg.taskSnapshot.priority === 'high' ? 'High' : msg.taskSnapshot.priority === 'medium' ? 'Med' : 'Low'}
                          </div>
                        )}
                        {msg.taskSnapshot?.folderName && (
                          <div className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold", isMe ? "bg-background/20 text-primary-foreground" : "bg-foreground/5 text-foreground/70")}>
                            📁 {msg.taskSnapshot.folderName}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] opacity-60 mt-1">Tap to open details →</span>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {showTime && (
                  <span className="text-[11px] text-muted-foreground mt-1.5 px-1 font-medium">
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </span>
                )}
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border/40 shrink-0 flex flex-col gap-3">
        {stagedAttachment && (
          <div className="flex items-center justify-between bg-muted/30 border border-border/50 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0 border border-border/50">
                {stagedAttachment.type === 'image' && <ImageIcon className="w-5 h-5 text-primary" />}
                {stagedAttachment.type === 'video' && <Video className="w-5 h-5 text-primary" />}
                {stagedAttachment.type === 'file' && <FileText className="w-5 h-5 text-primary" />}
                {stagedAttachment.type === 'task' && <CheckSquare className="w-5 h-5 text-primary" />}
                {stagedAttachment.type === 'contact' && <Contact className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">
                  {stagedAttachment.type === 'file' || stagedAttachment.type === 'image' || stagedAttachment.type === 'video'
                    ? stagedAttachment.file.name
                    : stagedAttachment.type === 'task'
                      ? 'Task Attached'
                      : stagedAttachment.type === 'contact' 
                        ? stagedAttachment.userName 
                        : ''}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Ready to send
                </span>
              </div>
            </div>
            <button 
              onClick={() => setStagedAttachment(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 relative">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full bg-muted/40 hover:bg-muted/60 border border-border/60 transition-colors text-muted-foreground outline-none cursor-pointer">
              <Plus className="h-5 w-5" />
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-64 p-2 rounded-xl mb-2">
              <div className="px-3 py-2 border-b border-border/40 mb-1 flex items-center justify-between">
                <span className="font-semibold text-sm">Attach</span>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg transition-colors text-left group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-border/50 bg-background group-hover:bg-muted transition-colors">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Image</span>
                    <span className="text-[11px] text-muted-foreground">Share a photo</span>
                  </div>
                </button>
                <button onClick={() => videoInputRef.current?.click()} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg transition-colors text-left group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-border/50 bg-background group-hover:bg-muted transition-colors">
                    <Video className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Video</span>
                    <span className="text-[11px] text-muted-foreground">Share a video</span>
                  </div>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg transition-colors text-left group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-border/50 bg-background group-hover:bg-muted transition-colors">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">File</span>
                    <span className="text-[11px] text-muted-foreground">Attach a file</span>
                  </div>
                </button>
                <button onClick={handleTaskClick} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg transition-colors text-left group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-border/50 bg-background group-hover:bg-muted transition-colors">
                    <CheckSquare className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Task</span>
                    <span className="text-[11px] text-muted-foreground">Share a task</span>
                  </div>
                </button>
                <button onClick={handleContactClick} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg transition-colors text-left group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-border/50 bg-background group-hover:bg-muted transition-colors">
                    <Contact className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Contact</span>
                    <span className="text-[11px] text-muted-foreground">Share a contact</span>
                  </div>
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex-1 flex items-center gap-2 bg-muted/40 border border-border/60 rounded-full h-11 px-4 focus-within:ring-1 focus-within:ring-primary/50 focus-within:bg-background transition-colors">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isUploading}
              placeholder={isUploading ? "Uploading..." : "Type a message..."}
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/60 min-w-0"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSend}
              disabled={(!inputText.trim() && !stagedAttachment) || isUploading}
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isTaskPickerOpen} onOpenChange={setIsTaskPickerOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background">
          <DialogHeader>
            <DialogTitle>Select a Task to Share</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mt-2">
            {todos.filter(t => !t.isCompleted).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active tasks to share.
              </div>
            ) : (
              todos.filter(t => !t.isCompleted).map(todo => (
                <button
                  key={todo.id}
                  onClick={() => handleTaskSelect(todo.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center shrink-0 border border-border/40">
                    <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate">{todo.title}</span>
                    {todo.memo && <span className="text-[11px] text-muted-foreground truncate">{todo.memo}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isContactPickerOpen} onOpenChange={setIsContactPickerOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background">
          <DialogHeader>
            <DialogTitle>Share a Contact</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <input
              type="text"
              placeholder="Search friends..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="w-full bg-muted/40 border border-border/60 focus:ring-1 focus:ring-primary/50 rounded-xl h-10 px-4 text-sm outline-none transition-all mb-3"
            />
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {Object.values(usersMap)
                .filter(u => u.id !== user?.id && u.id !== activeChatUser?.id)
                .filter(u => u.name.toLowerCase().includes(contactSearch.toLowerCase()))
                .length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No contacts found.
                </div>
              ) : (
                Object.values(usersMap)
                  .filter(u => u.id !== user?.id && u.id !== activeChatUser?.id)
                  .filter(u => u.name.toLowerCase().includes(contactSearch.toLowerCase()))
                  .map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleContactSelect(u)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={u.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${u.id}`} />
                        <AvatarFallback>{u.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate">{u.name}</span>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
