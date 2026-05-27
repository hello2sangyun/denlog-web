import { useMemo } from 'react';
import { useStore } from '@/store/useStore';

/**
 * senderId별 읽지 않은 DM 알림 카운트를 반환합니다.
 * { [senderId]: count }
 */
export function useUnreadDmCounts(): Record<string, number> {
  const notifications = useStore(s => s.notifications);

  return useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.forEach(n => {
      if (n.isRead) return;
      if (!n.senderId) return;
      // DM 타입이거나, dm 타입이면서 shake가 아닌 경우만 카운트
      const isDm =
        n.type === 'dm' ||
        n.type === 'message';
      const isShakeDm =
        typeof n.body === 'string' &&
        (n.body.includes('[SHAKE:') || n.body.includes('[SHAKE]'));
      if (isDm && !isShakeDm) {
        counts[n.senderId] = (counts[n.senderId] ?? 0) + 1;
      }
    });
    return counts;
  }, [notifications]);
}

/**
 * 전체 읽지 않은 DM 총 개수
 */
export function useTotalUnreadDmCount(): number {
  const counts = useUnreadDmCounts();
  return Object.values(counts).reduce((sum, c) => sum + c, 0);
}
