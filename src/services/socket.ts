import { io, Socket } from 'socket.io-client';
import { clearSessionState, getSessionToken } from '@/lib/auth';
import { updateLastSeen } from '@/hooks/useSupabaseRealtime';
import { useAuthStore } from '@/store/authStore';

export type AuthStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type RoomStatus = 'PENDING' | 'JOINED' | 'FAILED';
export type AuthState = 'CONNECTING' | 'SUCCESS' | 'FAILED';
export type RoomState = 'IDLE' | 'JOINING' | 'JOINED' | 'FAILED';

export interface SocketServiceState {
  authState: AuthState;
  roomState: RoomState;
  room: string | null;
  error: string | null;
}

type StateListener = (state: SocketServiceState) => void;

class SocketService {
  private socket: Socket | null = null;
  private resolvedUserId: string | null = null;
  private authPromise: Promise<Socket | null> | null = null;
  private authState: AuthState = 'CONNECTING';
  private roomState: RoomState = 'IDLE';
  private joinedRoom: string | null = null;
  private stateError: string | null = null;
  private stateListeners = new Set<StateListener>();
  private errorListeners = new Set<(message: string) => void>();

  private get state(): SocketServiceState {
    return {
      authState: this.authState,
      roomState: this.roomState,
      room: this.joinedRoom,
      error: this.stateError,
    };
  }

  private setState(next: Partial<SocketServiceState>) {
    if (next.authState) this.authState = next.authState;
    if (next.roomState) this.roomState = next.roomState;
    if (next.room !== undefined) this.joinedRoom = next.room;
    if (next.error !== undefined) this.stateError = next.error;
    const state = this.state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  getState() {
    return this.state;
  }

  onStateChange(listener: StateListener) {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  getAuthStatus() {
    return this.authState === 'CONNECTING' ? 'PENDING' : this.authState;
  }

  getRoomStatus() {
    return this.roomState === 'IDLE' || this.roomState === 'JOINING' ? 'PENDING' : this.roomState;
  }

  onError(listener: (message: string) => void) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  markRoomJoinPending() {
    this.setState({ roomState: 'JOINING', room: null, error: null });
  }

  markRoomJoined() {
    this.setState({ roomState: 'JOINED', error: null });
  }

  markRoomJoinFailed(message = 'Unable to join chat') {
    this.setState({ roomState: 'FAILED', error: message });
    this.emitError(message);
  }

  private emitError(message: string) {
    this.stateError = message;
    this.errorListeners.forEach((listener) => listener(message));
    this.stateListeners.forEach((listener) => listener(this.state));
  }

  private forceLogout(message: string) {
    clearSessionState();
    useAuthStore.getState().reset();
    this.disconnect(false);
    this.setState({ authState: 'FAILED', roomState: 'IDLE', room: null, error: message });
    this.emitError(message);
  }

  connect() {
    this.resolvedUserId = useAuthStore.getState().user?.id ?? null;
    if (!this.socket) {
      this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
        path: '/api/socket.io',
        transports: ['websocket', 'polling'],
        autoConnect: false,
        auth: (callback) => {
          const token = getSessionToken();
          callback({ token, userId: this.resolvedUserId });
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        this.setState({ authState: 'SUCCESS', error: null });
        const currentUserId = useAuthStore.getState().user?.id;
        if (currentUserId) {
          void updateLastSeen(currentUserId, new Date());
        }
      });

      this.socket.on('disconnect', () => {
        this.authPromise = null;
        this.joinedRoom = null;
        if (this.authState !== 'FAILED') this.setState({ authState: 'CONNECTING', roomState: 'IDLE', room: null });
      });

      this.socket.on('connect_error', (error) => {
        const errorData = error as Error & { data?: { code?: string; status?: number }; description?: string };
        const message = error.message || 'Socket authentication failed';
        this.authPromise = null;
        if (errorData.data?.status === 401 || errorData.data?.status === 403 || errorData.data?.code === 'INVALID_TOKEN' || errorData.data?.code === 'USER_NOT_FOUND') {
          this.forceLogout(message);
          return;
        }
        this.setState({ authState: 'FAILED', error: message });
        this.emitError(message);
      });
    }
    return this.socket;
  }

  async ensureAuthenticated() {
    if (this.authPromise) return this.authPromise;

    const socket = this.connect();
    if (!socket) return null;

    if (!getSessionToken()) {
      this.forceLogout('Session expired. Please sign in again.');
      return null;
    }

    if (socket.connected) {
      this.setState({ authState: 'SUCCESS', error: null });
      return socket;
    }

    if (!this.authPromise) {
      this.authPromise = new Promise<Socket | null>((resolve) => {
        const finish = (ok: boolean, message?: string) => {
          window.clearTimeout(timeout);
          socket.off('connect', onConnect);
          socket.off('connect_error', onConnectError);
          if (!ok) socket.disconnect();
          this.setState({ authState: ok ? 'SUCCESS' : 'FAILED', error: ok ? null : (message ?? 'Socket authentication failed') });
          resolve(ok ? socket : null);
          this.authPromise = null;
        };
        const timeout = window.setTimeout(() => finish(false, 'Socket authentication timed out'), 8000);

        if (!this.resolvedUserId || !getSessionToken()) {
          finish(false);
          return;
        }

        const onConnect = () => finish(true);
        const onConnectError = (error: Error & { data?: { status?: number; code?: string } }) => {
          if (error.data?.status === 401 || error.data?.status === 403 || error.data?.code === 'INVALID_TOKEN' || error.data?.code === 'USER_NOT_FOUND') {
            this.forceLogout(error.message || 'Session expired. Please sign in again.');
          } else {
            finish(false);
          }
        };

        socket.once('connect', onConnect);
        socket.once('connect_error', onConnectError);

        if (socket.connected) {
          socket.off('connect', onConnect);
          socket.off('connect_error', onConnectError);
          finish(true);
        }
        else {
          socket.connect();
        }
      });
    }

    return this.authPromise;
  }

  async joinRoom(room: string) {
    const normalizedRoom = room.trim();
    if (!normalizedRoom) {
      this.markRoomJoinFailed('Room is required');
      return false;
    }
    const socket = await this.ensureAuthenticated();
    if (!socket) return false;
    if (this.joinedRoom && this.joinedRoom !== normalizedRoom) {
      socket.emit('leave_room', { room: this.joinedRoom });
      this.joinedRoom = null;
    }
    this.setState({ roomState: 'JOINING', room: null, error: null });
    return new Promise<boolean>((resolve) => {
      const finish = (joined: boolean, message?: string) => {
        socket.off('room_joined', onJoined);
        socket.off('room_error', onError);
        if (joined) {
          this.setState({ roomState: 'JOINED', room: normalizedRoom, error: null });
        } else {
          this.setState({ roomState: 'FAILED', error: message ?? 'Unable to join chat' });
          this.emitError(message ?? 'Unable to join chat');
        }
        resolve(joined);
      };
      const onJoined = (response: { room?: string }) => {
        if (response?.room === normalizedRoom) finish(true);
      };
      const onError = (response: { message?: string }) => finish(false, response?.message);
      socket.once('room_joined', onJoined);
      socket.once('room_error', onError);
      socket.emit('join_room', { room: normalizedRoom }, (response: { ok?: boolean; code?: string; message?: string }) => {
        if (response?.ok === false) finish(false, response.message ?? response.code);
      });
    });
  }

  leaveRoom(room = this.joinedRoom) {
    if (!room || !this.socket) return false;
    this.socket.emit('leave_room', { room });
    if (this.joinedRoom === room) {
      this.setState({ roomState: 'IDLE', room: null });
    }
    return true;
  }

  sendMessage(content: string, room = this.joinedRoom) {
    if (this.roomState !== 'JOINED' || !room || !content.trim() || !this.socket) return false;
    this.socket.emit('send_message', { room, content: content.trim() });
    return true;
  }

  cleanup() {
    this.disconnect();
  }

  getSocket() {
    return this.socket;
  }

  disconnect(resetAuth = true) {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.authPromise = null;
    }
    this.resolvedUserId = null;
    this.joinedRoom = null;
    this.setState({ authState: resetAuth ? 'CONNECTING' : 'FAILED', roomState: 'IDLE', room: null });
  }

  reset() {
    this.disconnect();
  }

  async retry() {
    this.disconnect();
    return this.ensureAuthenticated();
  }
}

export const socketService = new SocketService();
