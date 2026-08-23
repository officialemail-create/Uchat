import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { socketService } from '@/services/socket';
import type { AuthUser } from '@/lib/auth';

export function mapSupabaseUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fallbackName = user.email?.split('@')[0] ?? 'User';
  const username = String(metadata.username ?? metadata.user_name ?? fallbackName);
  const displayName = String(metadata.display_name ?? metadata.name ?? username);

  return {
    id: user.id,
    email: user.email ?? '',
    username,
    displayName,
    profilePicture: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
    hideLastSeen: typeof metadata.hide_last_seen === 'boolean' ? metadata.hide_last_seen : undefined,
    showOnlineStatus: typeof metadata.show_online_status === 'boolean' ? metadata.show_online_status : undefined,
    lastSeen: typeof metadata.last_seen === 'string' ? metadata.last_seen : null,
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabaseClient = supabase;
    if (!supabaseClient) {
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data, error } = await supabaseClient.auth.getSession();
      if (!isMounted) return;

      if (error) {
        console.warn('[useAuth] getSession error', error.message);
      }

      const nextSession = data.session ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsAuthenticated(Boolean(nextSession));
    };

    void syncSession();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsAuthenticated(Boolean(nextSession));

      if (!nextSession) {
        socketService.disconnect();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const nextSession = data.session ?? null;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setIsAuthenticated(Boolean(nextSession));

    return data;
  };

  const signOut = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setSession(null);
    setUser(null);
    setIsAuthenticated(false);
    socketService.disconnect();
  };

  return {
    user,
    session,
    isAuthenticated,
    signInWithPassword,
    signOut,
  };
}
