import { useEffect } from 'react';
import { socketService } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { useDmStore } from '../store/dmStore';
import { normalizeDmMessage } from '../store/dmStore';
import { useQueryClient } from '@tanstack/react-query';
import { getGetRoomsQueryKey, getGetPrivateChatsQueryKey } from '@workspace/api-client-react';

export function useRoomSocket() {
  const { user, setUser } = useAuthStore();
  const roomStore = useRoomStore();
  const dmStore = useDmStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const run = async () => {
      const socket = await socketService.ensureAuthenticated();
      if (!socket || cancelled) return;

      socket.emit('room_auth', {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
      });

      socket.emit('join_user_channel', user.id);

      const onRoomNewMessage = (msg: any) => {
        roomStore.addMessage(msg);
        roomStore.incrementUnread(msg.roomId);
      };

      const onRoomMessageEdited = ({ messageId, newMessage }: any) => {
        roomStore.updateMessage(messageId, newMessage);
      };

      const onRoomMessageDeleted = ({ messageId }: any) => {
        roomStore.removeMessage(messageId);
      };

      const onRoomTypingUpdate = ({ roomId, users }: any) => {
        roomStore.setTyping(roomId, users);
      };

      const onRoomMemberJoined = ({ roomId, userId }: any) => {
        roomStore.addOnlineMember(roomId, userId);
        queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
      };

      const onRoomMemberLeft = ({ roomId, userId }: any) => {
        roomStore.removeOnlineMember(roomId, userId);
        queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
      };

      const onPrivateMessage = (msg: any) => {
        const chatId = msg.chatId ?? msg.roomId ?? msg.room;
        if (!chatId) return;
        const normalized = normalizeDmMessage({
          ...msg,
          chatId,
          senderUsername: msg.senderUsername ?? msg.senderId,
          senderName: msg.senderName ?? msg.senderId,
          timestamp: msg.timestamp ?? msg.createdAt,
        }, chatId);
        const pending = useDmStore.getState().messages.find((message) =>
          (msg.clientMessageId && message._pendingKey === msg.clientMessageId)
          || (message.status === 'sending'
            && message.chatId === chatId
            && message.senderId === user.id
            && message.content === normalized.content),
        );
        if (pending) {
          dmStore.updateMessage(pending.id, { ...normalized, status: 'sent', _pendingKey: pending._pendingKey });
        } else {
          dmStore.addMessage({ ...normalized, status: normalized.senderId === user.id ? 'sent' : 'delivered' });
        }
        dmStore.incrementUnread(chatId);
        queryClient.invalidateQueries({ queryKey: getGetPrivateChatsQueryKey() });
      };

      const onDmMessageDeleted = ({ messageId }: any) => {
        dmStore.removeMessage(messageId);
      };

      const onDmTypingUpdate = ({ chatId, users }: any) => {
        dmStore.setTyping(chatId, users ?? []);
      };

      const onDmMessagesRead = ({ chatId, messageIds }: any) => {
        if (Array.isArray(messageIds)) dmStore.markMessagesRead(chatId, messageIds);
      };

      const onReadUpdate = ({ chat_id: chatId, message_id: messageId }: any) => {
        if (chatId && messageId) dmStore.markMessagesRead(chatId, [messageId]);
      };

      const onReadReceipt = ({ messageIds, readBy }: { messageIds?: string[]; readBy?: string }) => {
        if (!Array.isArray(messageIds) || !readBy || readBy === user.id) return;
        messageIds.forEach((messageId) => {
          const message = dmStore.messages.find((candidate) => candidate.id === messageId);
          if (message && (message.senderId === user.id || message.senderUsername === user.username)) {
            dmStore.markMessagesRead(message.chatId, [messageId]);
          }
        });
      };

      const onUserOnline = (presence: any) => {
        if (!presence?.userId) return;
        dmStore.setPresence(presence.userId, { ...presence, online: true });
        queryClient.invalidateQueries({ queryKey: getGetPrivateChatsQueryKey() });
      };

      const onUserOffline = (presence: any) => {
        if (!presence?.userId) return;
        dmStore.setPresence(presence.userId, { ...presence, online: false });
        queryClient.invalidateQueries({ queryKey: getGetPrivateChatsQueryKey() });
      };
      const onPresenceHidden = ({ userId }: { userId?: string }) => {
        if (!userId) return;
        dmStore.setPresence(userId, { online: false });
        queryClient.invalidateQueries({ queryKey: getGetPrivateChatsQueryKey() });
      };

      const onUserPresenceChange = (presence: any) => {
        if (!presence?.userId) return;
        dmStore.setPresence(presence.userId, presence);
      };

      const onUserProfileUpdated = (profileData: any) => {
        // If the profile update is for the current user, update the auth store
        if (profileData?.username === user.username) {
          setUser({
            ...user,
            displayName: profileData.displayName ?? user.displayName,
            profilePicture: profileData.profilePicture ?? user.profilePicture,
          });
        }
      };

      socket.on('room_new_message', onRoomNewMessage);
      socket.on('room_message_edited', onRoomMessageEdited);
      socket.on('room_message_deleted', onRoomMessageDeleted);
      socket.on('room_typing_update', onRoomTypingUpdate);
      socket.on('room_member_joined', onRoomMemberJoined);
      socket.on('room_member_left', onRoomMemberLeft);

      socket.on('message_received', onPrivateMessage);
      socket.on('dm_message_deleted', onDmMessageDeleted);
      socket.on('dm_typing_update', onDmTypingUpdate);
      socket.on('dm_messages_read', onDmMessagesRead);
      socket.on('read_update', onReadUpdate);
      socket.on('read_receipt', onReadReceipt);
      socket.on('user_online', onUserOnline);
      socket.on('user_offline', onUserOffline);
      socket.on('presence_hidden', onPresenceHidden);
      socket.on('user_presence_change', onUserPresenceChange);
      socket.on('user_profile_updated', onUserProfileUpdated);

      cleanup = () => {
        socket.off('room_new_message', onRoomNewMessage);
        socket.off('room_message_edited', onRoomMessageEdited);
        socket.off('room_message_deleted', onRoomMessageDeleted);
        socket.off('room_typing_update', onRoomTypingUpdate);
        socket.off('room_member_joined', onRoomMemberJoined);
        socket.off('room_member_left', onRoomMemberLeft);

        socket.off('message_received', onPrivateMessage);
        socket.off('dm_message_deleted', onDmMessageDeleted);
        socket.off('dm_typing_update', onDmTypingUpdate);
        socket.off('dm_messages_read', onDmMessagesRead);
        socket.off('read_update', onReadUpdate);
        socket.off('read_receipt', onReadReceipt);
        socket.off('user_online', onUserOnline);
        socket.off('user_offline', onUserOffline);
          socket.off('presence_hidden', onPresenceHidden);
        socket.off('user_presence_change', onUserPresenceChange);
        socket.off('user_profile_updated', onUserProfileUpdated);
      };
    };

    void run();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [user, roomStore, dmStore, queryClient, setUser]);
}
