import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { getSessionToken } from '@/lib/auth';
import { normalizeDmMessage, useDmStore } from '@/store/dmStore';
import { apiUrl } from '@/lib/api-url';

export async function updateLastSeen(userId: string | null | undefined, timestamp = new Date()) {
  if (!userId) return null;

  const iso = timestamp.toISOString();
  try {
    const token = getSessionToken();
    const username = typeof window !== 'undefined' ? localStorage.getItem('uchat_username') : null;
    const response = await fetch(apiUrl('/auth/last-seen'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(username ? { 'x-username': username } : {}),
      },
      body: JSON.stringify({ timestamp: iso }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { lastSeen?: string | null };
    return data.lastSeen ?? iso;
  } catch {
    return null;
  }
}

export function useSupabaseRealtime() {
  const { user, setUser } = useAuthStore();
  const mergeMessages = useDmStore((state) => state.mergeMessages);
  const appToken = getSessionToken();

  useEffect(() => {
    if (!user?.id || !supabase || !appToken) return;

    // Run async setup inside effect
    const subChannels: any[] = [];
    let heartbeatId: number | null = null;

    (async () => {
      try {
        console.log('[useSupabaseRealtime] Supabase client object:', supabase);

        // Authenticate Realtime with the backend JWT; it is not a Supabase Auth session.
        try {
          supabase.realtime.setAuth(appToken);
        } catch (err) {
          console.warn('[useSupabaseRealtime] Supabase Realtime auth failed', err);
        }

        // initial last seen update
        await updateLastSeen(user.id, new Date());

        heartbeatId = window.setInterval(() => {
          void updateLastSeen(user.id, new Date());
        }, 30_000);

        // Prevent duplicate subscriptions: check existing channels
        const existing = (supabase.getChannels ? supabase.getChannels() : []) || [];
        const userTopic = 'public:users';
        const messagesTopic = 'public:messages';
        const userChannel = existing.find((channel: any) => String(channel.topic) === userTopic)
          ?? supabase.channel(userTopic).on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`,
          }, (payload) => {
            const nextUserId = typeof payload.new?.id === 'string' ? payload.new.id : null;
            const nextLastSeen = typeof payload.new?.last_seen === 'string' ? payload.new.last_seen : null;

            console.log(`[useSupabaseRealtime] Received real-time update for user ${nextUserId ?? 'unknown'}`);

            if (!nextUserId || nextUserId !== user.id) return;
            if (user.lastSeen === nextLastSeen) return;

            setUser({ ...user, lastSeen: nextLastSeen });
          });
        const messagesChannel = existing.find((channel: any) => String(channel.topic) === messagesTopic)
          ?? supabase.channel(messagesTopic).on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          }, (payload) => {
            const row = payload.new as Record<string, any> | undefined;
            const chatId = typeof row?.chat_id === 'string' ? row.chat_id : null;
            if (!chatId || typeof row?.id !== 'string') return;

            mergeMessages([normalizeDmMessage({
              ...row,
              chatId,
              senderId: row.sender_id,
              senderUsername: row.sender_id === user.id ? user.username : row.sender_id,
              senderName: row.sender_id === user.id ? user.displayName : row.sender_id,
              timestamp: row.created_at,
              status: row.status ?? 'delivered',
            }, chatId)]);
          });

        for (const channel of [userChannel, messagesChannel]) {
          if (!existing.includes(channel)) {
            channel.subscribe((status: string) => {
              if (status === 'SUBSCRIBED') {
                console.log('[useSupabaseRealtime] Realtime connected');
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.error(`[useSupabaseRealtime] subscription_error for ${channel.topic}: ${status}`);
              } else {
                console.log(`[useSupabaseRealtime] ${channel.topic} subscription status: ${status}`);
              }
            });
          }
          subChannels.push(channel);
        }

        if (subChannels.length > 0) {
          console.log('[useSupabaseRealtime] Realtime channels ready:', subChannels.map((channel) => channel.topic));
        }
      } catch (e) {
        console.error('[useSupabaseRealtime] Error setting up realtime channel', e instanceof Error ? e.message : e);
      }
    })();

    return () => {
      if (heartbeatId) window.clearInterval(heartbeatId);
      try {
        if (supabase) {
          for (const channel of subChannels) {
            console.log('[useSupabaseRealtime] Removing channel', channel);
            supabase.removeChannel(channel);
          }
        }
      } catch (e) {
        console.warn('[useSupabaseRealtime] Error removing channel', e);
      }
    };
  }, [appToken, mergeMessages, setUser, user?.id, user?.username, user?.displayName]);
}
