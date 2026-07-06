"use client";
import React from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { usePeople } from '@/hooks/usePeople';
import type { UserSearchResult } from '@/hooks/usePeople';
import { useExternalLinks } from '@/hooks/useExternalLinks';
import type { ExternalLink } from '@/hooks/useExternalLinks';
import { useStore } from '@/store/useStore';
import {
  MessageSquare, MoreHorizontal, Trash2, Star, UserPlus, Search,
  Check, X, Link2, Copy, ExternalLink as ExternalLinkIcon, Trash, Users, UserCheck, Building2,
  Plus, ChevronRight, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';
import { useUnreadDmCounts } from '@/hooks/useUnreadDmCounts';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

type Tab = 'friends' | 'clients' | 'partners';

/* ── CreateLinkDialog ────────────────────────────────────────────────────── */
function CreateLinkDialog({
  open, onClose, onCreated, linkType, folders,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (link: ExternalLink) => void;
  linkType: 'client_view' | 'delegate_work';
  folders: { id: string; name: string }[];
}) {
  const { createLink } = useExternalLinks();
  const [targetName, setTargetName] = React.useState('');
  const [targetEmail, setTargetEmail] = React.useState('');
  const [folderId, setFolderId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const folderObj = folders.find(f => f.id === folderId);
    const link = await createLink(linkType, {
      folderId: folderId || null,
      folderName: folderObj?.name,
      targetName: targetName.trim() || undefined,
      targetEmail: targetEmail.trim() || undefined,
    });
    setLoading(false);
    if (link) {
      onCreated(link);
      setTargetName(''); setTargetEmail(''); setFolderId('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold">
            {linkType === 'client_view' ? 'New Client Portal Link' : 'New Partner Delegation Link'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-1">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Name (optional)
            </label>
            <Input
              placeholder={linkType === 'client_view' ? 'e.g. Client Name' : 'e.g. Partner Name'}
              value={targetName}
              onChange={e => setTargetName(e.target.value)}
              className="h-10 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Email (optional)
            </label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={targetEmail}
              onChange={e => setTargetEmail(e.target.value)}
              className="h-10 text-[13px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Project Folder
            </label>
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">No folder</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="h-10 font-bold rounded-xl"
          >
            {loading ? 'Creating…' : 'Create Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── ExternalLinkRow ─────────────────────────────────────────────────────── */
function ExternalLinkRow({ link, onRevoke }: { link: ExternalLink; onRevoke: (id: string) => void }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex items-center gap-3 px-6 py-3.5 border-b border-border/40 hover:bg-muted/20 transition-all">
      {/* Icon */}
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {link.linkType === 'client_view'
          ? <Building2 className="w-4 h-4 text-primary" />
          : <UserCheck className="w-4 h-4 text-primary" />
        }
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[13px] font-bold text-foreground truncate">
          {link.targetName || '(unnamed)'}
        </span>
        <span className="text-[11px] text-muted-foreground truncate">
          {link.folderName ? `📁 ${link.folderName}` : 'No folder'}{link.targetEmail ? ` · ${link.targetEmail}` : ''}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          title="Copy link"
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={link.portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open portal"
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLinkIcon className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onRevoke(link.id)}
          title="Revoke link"
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── FriendsTab ──────────────────────────────────────────────────────────── */
function FriendsTab() {
  const {
    friends, pendingReceived, pendingSent,
    favoriteIds, isLoading,
    removeFriend, acceptRequest, rejectRequest,
    searchUsers, sendFriendRequest, toggleFavorite,
  } = usePeople();
  const { setActiveChatUser, searchQuery, markNotificationRead, notifications } = useStore();
  const unreadCounts = useUnreadDmCounts();
  const { t } = useTranslation();

  const [addMode, setAddMode] = React.useState(false);
  const [addQuery, setAddQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [sentIds, setSentIds] = React.useState<string[]>([]);

  // debounced search
  React.useEffect(() => {
    if (!addMode || !addQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      const res = await searchUsers(addQuery);
      setSearchResults(res);
      setSearchLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [addQuery, addMode, searchUsers]);

  const filteredFriends = friends.filter(f => {
    const q = searchQuery.toLowerCase();
    return !q ||
      f.friend.displayName.toLowerCase().includes(q) ||
      (f.friend.username && f.friend.username.toLowerCase().includes(q));
  });

  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aFav = favoriteIds.includes(a.friend.id) ? -1 : 0;
    const bFav = favoriteIds.includes(b.friend.id) ? -1 : 0;
    if (aFav !== bFav) return aFav - bFav;
    const aCount = unreadCounts[a.friend.id] ?? 0;
    const bCount = unreadCounts[b.friend.id] ?? 0;
    if (bCount !== aCount) return bCount - aCount;
    return a.friend.displayName.localeCompare(b.friend.displayName);
  });

  const handleOpenChat = (friend: typeof friends[0]['friend']) => {
    setActiveChatUser({ id: friend.id, name: friend.displayName, avatarUrl: friend.avatarUrl });
    notifications
      .filter(n => !n.isRead && n.senderId === friend.id && (n.type === 'dm' || n.type === 'message'))
      .forEach(n => markNotificationRead(n.id));
  };

  const handleSendRequest = async (id: string) => {
    const ok = await sendFriendRequest(id);
    if (ok) setSentIds(prev => [...prev, id]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Add friend bar */}
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        {addMode ? (
          <>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={addQuery}
                onChange={e => setAddQuery(e.target.value)}
                placeholder="Search by name, @username or email…"
                className="w-full h-9 pl-9 pr-3 bg-muted/50 border border-border/40 rounded-xl text-[13px] focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => { setAddMode(false); setAddQuery(''); setSearchResults([]); }}
              className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setAddMode(true)}
            className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors w-full h-9 px-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {/* Search results */}
        {addMode && searchResults.length > 0 && (
          <div className="border-b border-border/30">
            <div className="px-6 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Search Results</div>
            {searchResults.map(u => {
              const isSent = sentIds.includes(u.id) || pendingSent.some(p => p.friend.id === u.id);
              const isFriend = friends.some(f => f.friend.id === u.id);
              return (
                <div key={u.id} className="flex items-center gap-3 px-6 py-3 border-b border-border/30 hover:bg-muted/20">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${u.id}`} />
                    <AvatarFallback>{u.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-foreground">{u.displayName}</span>
                    {u.username && <span className="text-[11px] text-muted-foreground">@{u.username}</span>}
                  </div>
                  {isFriend ? (
                    <span className="text-[11px] text-muted-foreground font-medium">Friends</span>
                  ) : isSent ? (
                    <span className="text-[11px] text-muted-foreground font-medium">Requested</span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(u.id)}
                      className="h-7 px-3 rounded-lg bg-primary/10 text-primary text-[12px] font-bold hover:bg-primary/20 transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {addMode && searchLoading && (
          <div className="px-6 py-4 text-[13px] text-muted-foreground">Searching…</div>
        )}

        {/* Pending received */}
        {pendingReceived.length > 0 && (
          <div>
            <div className="px-6 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/20">
              Friend Requests · {pendingReceived.length}
            </div>
            {pendingReceived.map(req => (
              <div key={req.id} className="flex items-center gap-3 px-6 py-3 border-b border-border/30">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={req.friend.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${req.friend.id}`} />
                  <AvatarFallback>{req.friend.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold">{req.friend.displayName}</span>
                  {req.friend.username && <span className="text-[11px] text-muted-foreground">@{req.friend.username}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => acceptRequest(req.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <button
                    onClick={() => rejectRequest(req.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        {isLoading ? (
          <div className="flex justify-center p-8 text-muted-foreground text-[13px]">Loading…</div>
        ) : sortedFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[30vh] text-muted-foreground gap-2">
            <Users className="w-10 h-10 opacity-20" />
            <p className="text-[13px]">No friends yet. Use the search above!</p>
          </div>
        ) : (
          sortedFriends.map(f => {
            const unread = unreadCounts[f.friend.id] ?? 0;
            const hasUnread = unread > 0;
            const isFav = favoriteIds.includes(f.friend.id);

            return (
              <div
                key={f.id}
                onClick={() => handleOpenChat(f.friend)}
                className="group flex items-center gap-3 px-6 py-4 border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-all"
                style={{
                  borderLeft: hasUnread ? '3px solid var(--primary)' : '3px solid transparent',
                  backgroundColor: hasUnread ? 'rgba(99,102,241,0.04)' : undefined,
                }}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar
                    className="h-9 w-9"
                    style={{ boxShadow: hasUnread ? '0 0 0 2px var(--primary)' : '0 0 0 2px var(--border)' }}
                  >
                    <AvatarImage src={f.friend.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${f.friend.id}`} />
                    <AvatarFallback>{f.friend.displayName[0]}</AvatarFallback>
                  </Avatar>
                  {hasUnread && (
                    <span
                      className="absolute -top-1 -right-1 flex items-center justify-center text-white font-bold rounded-full ring-2 ring-background"
                      style={{ minWidth: 16, height: 16, fontSize: 9, background: 'var(--primary)', padding: '0 3px' }}
                    >
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[14px] leading-tight truncate" style={{ fontWeight: hasUnread ? 800 : 600 }}>
                    {f.friend.displayName}
                    {isFav && <Star className="inline w-3 h-3 ml-1.5 text-yellow-400 fill-yellow-400" />}
                  </span>
                  <span className="text-[12px] text-muted-foreground font-medium truncate mt-0.5">
                    {f.friend.username ? `@${f.friend.username}` : 'No username'}
                  </span>
                </div>

                {/* Status message */}
                {f.friend.statusMessage && (
                  <div className="hidden md:block flex-1 min-w-0 text-[13px] text-muted-foreground px-4 truncate">
                    {f.friend.statusMessage}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1.5"
                    style={{ opacity: hasUnread ? 1 : undefined }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {hasUnread ? 'New DM' : 'Message'}
                  </Button>

                  {/* Favorite star */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(f.friend.id); }}
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                      isFav ? "text-yellow-400" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-yellow-400"
                    )}
                    title={isFav ? 'Remove favorite' : 'Add to favorites'}
                  >
                    <Star className={cn("w-4 h-4", isFav && "fill-yellow-400")} />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground group-hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={e => {
                          e.stopPropagation();
                          if (window.confirm('Delete this friend?')) removeFriend(f.id);
                        }}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}

/* ── ExternalTab (Clients or Partners) ───────────────────────────────────── */
function ExternalTab({ linkType }: { linkType: 'client_view' | 'delegate_work' }) {
  const { clientLinks, partnerLinks, isLoading, revokeLink, createLink } = useExternalLinks();
  const { folders } = useStore();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [localLinks, setLocalLinks] = React.useState<ExternalLink[]>([]);
  const [searchQ, setSearchQ] = React.useState('');

  const rawLinks = linkType === 'client_view' ? clientLinks : partnerLinks;

  React.useEffect(() => { setLocalLinks(rawLinks); }, [rawLinks]);

  const filteredLinks = localLinks.filter(l => {
    const q = searchQ.toLowerCase();
    return !q ||
      (l.targetName ?? '').toLowerCase().includes(q) ||
      (l.targetEmail ?? '').toLowerCase().includes(q) ||
      (l.folderName ?? '').toLowerCase().includes(q);
  });

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this link? The recipient will lose access.')) return;
    await revokeLink(id);
    setLocalLinks(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search + New */}
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder={linkType === 'client_view' ? 'Search clients…' : 'Search partners…'}
            className="w-full h-9 pl-9 pr-3 bg-muted/50 border border-border/40 rounded-xl text-[13px] focus:outline-none focus:border-primary/60"
          />
        </div>
        <Button
          size="sm"
          className="h-9 font-bold gap-1.5 shrink-0 rounded-xl"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          New Link
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex justify-center p-8 text-muted-foreground text-[13px]">Loading…</div>
        ) : filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[30vh] gap-3 text-muted-foreground">
            {linkType === 'client_view'
              ? <Building2 className="w-10 h-10 opacity-20" />
              : <UserCheck className="w-10 h-10 opacity-20" />
            }
            <p className="text-[13px]">
              {searchQ ? 'No results.' : `No ${linkType === 'client_view' ? 'clients' : 'partners'} yet.`}
            </p>
            {!searchQ && (
              <button
                onClick={() => setCreateOpen(true)}
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                Create your first link →
              </button>
            )}
          </div>
        ) : (
          filteredLinks.map(link => (
            <ExternalLinkRow key={link.id} link={link} onRevoke={handleRevoke} />
          ))
        )}
      </ScrollArea>

      <CreateLinkDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={newLink => setLocalLinks(prev => [newLink, ...prev])}
        linkType={linkType}
        folders={folders.map(f => ({ id: f.id, name: f.name }))}
      />
    </div>
  );
}

/* ── PeopleView (main) ───────────────────────────────────────────────────── */
export function PeopleView() {
  const [activeTab, setActiveTab] = React.useState<Tab>('friends');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'friends',  label: 'Friends',  icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'clients',  label: 'Clients',  icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'partners', label: 'Partners', icon: <UserCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border/40 px-4 pt-3 gap-1 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-t-lg transition-all",
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'friends'  && <FriendsTab />}
        {activeTab === 'clients'  && <ExternalTab linkType="client_view" />}
        {activeTab === 'partners' && <ExternalTab linkType="delegate_work" />}
      </div>
    </div>
  );
}
