import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

// ── 실제 DB 스키마 기준 (모바일 앱 dataService.ts 와 동일) ─────────────────────
// external_access_links 테이블 컬럼:
//   id, folder_id, token, access_type ('client_view' | 'delegate_work'),
//   invitee_name, invitee_email, expires_at, last_accessed_at,
//   created_by (user_id), created_at, locale

export interface ExternalLink {
  id: string;
  token: string;
  linkType: 'client_view' | 'delegate_work';
  folderId: string | null;
  folderName: string | null;   // 표시용 (DB에 없으면 null, 컴포넌트에서 folders로 보완)
  targetName: string | null;   // invitee_name
  targetEmail: string | null;  // invitee_email
  isActive: boolean;
  createdAt: Date;
  portalUrl: string;
}

const PORTAL_BASE_URL =
  process.env.NEXT_PUBLIC_PORTAL_BASE_URL || 'https://portal.denlog.space';

function mapRow(row: any): ExternalLink {
  return {
    id:          row.id,
    token:       row.token,
    linkType:    row.access_type,          // ← 실제 컬럼: access_type
    folderId:    row.folder_id ?? null,
    folderName:  row.folder_name ?? null,  // DB에 없으면 null
    targetName:  row.invitee_name ?? null, // ← 실제 컬럼: invitee_name
    targetEmail: row.invitee_email ?? null,// ← 실제 컬럼: invitee_email
    isActive:    true,                     // DB에 is_active 없음, 항상 true
    createdAt:   new Date(row.created_at),
    portalUrl:   `${PORTAL_BASE_URL}/portal/${row.token}`,
  };
}

export function useExternalLinks() {
  const { user } = useStore();
  const [clientLinks,  setClientLinks]  = useState<ExternalLink[]>([]);
  const [partnerLinks, setPartnerLinks] = useState<ExternalLink[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('external_access_links')
        .select('*')
        .eq('created_by', user.id)   // ← 실제 컬럼: created_by (not user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const all = (data ?? []).map(mapRow);
      setClientLinks(all.filter(l => l.linkType === 'client_view'));
      setPartnerLinks(all.filter(l => l.linkType === 'delegate_work'));
    } catch (e) {
      console.error('[useExternalLinks] fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const createLink = useCallback(async (
    linkType: 'client_view' | 'delegate_work',
    opts: { folderId?: string | null; folderName?: string; targetName?: string; targetEmail?: string }
  ) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('external_access_links')
      .insert({
        folder_id:     opts.folderId ?? null,
        created_by:    user.id,              // ← 실제 컬럼: created_by
        access_type:   linkType,             // ← 실제 컬럼: access_type
        invitee_name:  opts.targetName  ?? null, // ← 실제 컬럼: invitee_name
        invitee_email: opts.targetEmail ?? null, // ← 실제 컬럼: invitee_email
        locale:        'ko',
      })
      .select()
      .single();

    if (error) {
      console.error('[useExternalLinks] create error:', error);
      return null;
    }
    const newLink = mapRow(data);
    if (linkType === 'client_view') setClientLinks(prev => [newLink, ...prev]);
    else setPartnerLinks(prev => [newLink, ...prev]);
    return newLink;
  }, [user]);

  const revokeLink = useCallback(async (linkId: string) => {
    const { error } = await supabase
      .from('external_access_links')
      .delete()
      .eq('id', linkId);

    if (!error) {
      setClientLinks(prev  => prev.filter(l => l.id !== linkId));
      setPartnerLinks(prev => prev.filter(l => l.id !== linkId));
    }
  }, []);

  return { clientLinks, partnerLinks, isLoading, fetchLinks, createLink, revokeLink };
}
