'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const POPUP_VERSION = 'MAIN_POPUP';
const HIDE_POPUP_KEY = '@hide_popup_main_date';

export default function EventPopupModal() {
  const isEn = false;
  const [visible, setVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    checkPopup();
  }, [isEn]);

  async function checkPopup() {
    try {
      // 1. Fetch config from Supabase
      const { data, error } = await supabase
        .from('whats_new_content')
        .select('*')
        .eq('version', POPUP_VERSION)
        .maybeSingle();

      if (error || !data) return;
      if (!data.is_published) return; // Feature is OFF

      // 2. Determine localized content
      const img = isEn ? data.description_en : data.description_ko;
      const link = isEn ? data.title_en : data.title_ko;
      
      if (!img) return; // No image for this language

      // 3. Check if user clicked "Do not show today"
      const hiddenDate = localStorage.getItem(HIDE_POPUP_KEY);
      const today = new Date().toISOString().split('T')[0];

      if (hiddenDate === today) return; // Already hidden today

      setImageUrl(img);
      setLinkUrl(link || '');
      setVisible(true);
    } catch (e) {
      console.error('Failed to load popup config:', e);
    }
  }

  const handleHideToday = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(HIDE_POPUP_KEY, today);
    setVisible(false);
  };

  const handleClose = () => {
    setVisible(false);
  };

  const handleImageClick = () => {
    if (linkUrl) {
      window.open(linkUrl, '_blank');
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
        width: 360, display: 'flex', flexDirection: 'column'
      }}>
        {/* Image (4:5 ratio) */}
        <div 
          onClick={handleImageClick}
          style={{ width: 360, height: 450, cursor: linkUrl ? 'pointer' : 'default', backgroundColor: '#f0f0f0' }}
        >
          {imageUrl && (
            <img src={imageUrl} alt="Popup Event" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', height: 48, borderTop: '1px solid #eee' }}>
          <button 
            onClick={handleHideToday} 
            style={{
              flex: 1, background: 'none', border: 'none', borderRight: '1px solid #eee',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#333'
            }}
          >
            {isEn ? 'Do not show today' : '오늘 하루 보지 않기'}
          </button>
          <button 
            onClick={handleClose} 
            style={{
              flex: 1, background: 'none', border: 'none',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#333'
            }}
          >
            {isEn ? 'Close' : '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
}
