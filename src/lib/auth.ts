import { apiUrl } from './api-url';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  profilePicture: string | null;
  hideLastSeen?: boolean;
  showOnlineStatus?: boolean;
  lastSeen?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  token?: string;
  access_token?: string;
  user: AuthUser;
}

const sessionTokenKey = "uchat_session_token";
const supabaseTokenKey = "supabase_access_token";

export const getSessionToken = () => typeof window !== "undefined"
  ? localStorage.getItem(sessionTokenKey)
    ?? localStorage.getItem(supabaseTokenKey)
    ?? sessionStorage.getItem(sessionTokenKey)
    ?? sessionStorage.getItem(supabaseTokenKey)
  : null;
export const clearSessionState = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(sessionTokenKey);
  sessionStorage.removeItem(sessionTokenKey);
  localStorage.removeItem(supabaseTokenKey);
  sessionStorage.removeItem(supabaseTokenKey);
  localStorage.removeItem("uchat_username");
  sessionStorage.removeItem("uchat_username");
};
const setSessionToken = (token: string | null) => {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(supabaseTokenKey, token);
      localStorage.setItem(sessionTokenKey, token);
      sessionStorage.removeItem(supabaseTokenKey);
      sessionStorage.removeItem(sessionTokenKey);
    } else {
      clearSessionState();
    }
  }
};

export class AuthRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
  }
}

let authInterceptor: ((error: string) => void) | null = null;
export const setAuthInterceptor = (fn: (error: string) => void) => {
  authInterceptor = fn;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getSessionToken();
  const username = typeof window !== "undefined" ? localStorage.getItem("uchat_username") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(options?.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(username ? { "x-username": username } : {}),
  };

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      credentials: "include",
      headers,
      ...options,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Failed to fetch") || message.includes("fetch")) {
      throw new AuthRequestError("Unable to connect. Please check your internet connection.", 0);
    }
    throw new AuthRequestError(message, 0);
  }
  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try { json = JSON.parse(text); } catch { /* empty */ }
  }

  if (!res.ok) {
    // Check for AUTH_REQUIRED error code
    const errorPayload = json as { error?: { code: string; message: string } };
    if (errorPayload?.error?.code === 'AUTH_REQUIRED') {
      clearSessionState();
      const errorMessage = errorPayload.error.message || 'Session expired. Please sign in again.';
      if (authInterceptor) {
        authInterceptor(errorMessage);
      }
      throw new Error(errorMessage);
    }
    const errorValue = json.error;
    const message = typeof errorValue === "string"
      ? errorValue
      : errorValue && typeof errorValue === "object" && "message" in errorValue
        ? String((errorValue as { message: unknown }).message)
        : "Something went wrong. Please try again.";
    throw new AuthRequestError(message, res.status);
  }
  return json as T;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  verificationLink?: string;
}

export function resolveAvatarUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized === '') return null;
  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('data:')) {
    return normalized;
  }
  if (normalized.startsWith('/api/')) return normalized;
  if (normalized.startsWith('/uploads/')) return `/api/storage${normalized}`;
  if (normalized.startsWith('uploads/')) return `/api/storage/${normalized}`;
  if (normalized.startsWith('/')) return normalized;
  return normalized;
}

export const authApi = {
  register: (data: { email: string; username: string; displayName: string; password: string; confirmPassword: string }) =>
    request<RegisterResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: async (data: { identifier: string; password: string }) => {
    clearSessionState();
    const res = await request<AuthResponse>("/login", { method: "POST", body: JSON.stringify(data) });
    const payload = res as Partial<AuthResponse> & { access_token?: string; token?: string };
    const token = payload.access_token ?? payload.token;
    if (token) {
      setSessionToken(token);
    }
    return res;
  },

  logout: async () => {
    const result = await request<{ message: string }>("/auth/logout", { method: "POST" });
    setSessionToken(null);
    return result;
  },

  me: () => request<AuthUser>("/auth/me"),

  verifyEmail: (token: string) => request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: (email: string) =>
    request<{ message: string }>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (data: { token: string; password: string; confirmPassword: string }) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),

  updateProfile: (data: Partial<{ displayName: string; username: string; profilePicture: string }>) =>
    request<AuthUser>("/auth/profile", { method: "PATCH", body: JSON.stringify(data) }),

  updateSettings: (data: Partial<{ hideLastSeen: boolean; showOnlineStatus: boolean }>) =>
    request<{ hideLastSeen: boolean; showOnlineStatus: boolean; lastSeen: string | null }>("/user/settings", { method: "PATCH", body: JSON.stringify(data) }),

  updateUserSettings: async (data: Partial<{ hide_last_seen: boolean; hideLastSeen: boolean; show_online_status: boolean; showOnlineStatus: boolean }>) => {
    const payload = {
      ...(typeof data.hide_last_seen === 'boolean' ? { hide_last_seen: data.hide_last_seen } : typeof data.hideLastSeen === 'boolean' ? { hide_last_seen: data.hideLastSeen } : {}),
      ...(typeof data.show_online_status === 'boolean' ? { show_online_status: data.show_online_status } : typeof data.showOnlineStatus === 'boolean' ? { show_online_status: data.showOnlineStatus } : {}),
    };

    const result = await request<{ hide_last_seen: boolean; show_online_status: boolean; last_seen: string | null }>('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return {
      hideLastSeen: Boolean(result.hide_last_seen),
      showOnlineStatus: result.show_online_status !== false,
      lastSeen: result.last_seen ?? null,
    };
  },

  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    request<{ message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),

  deleteAccount: (password: string) =>
    request<{ message: string }>("/auth/account", { method: "DELETE", body: JSON.stringify({ password }) }),
};
