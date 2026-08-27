export interface QueuedMessage {
  id: string;
  chatId: string;
  content: string;
  senderId: string;
  senderUsername: string;
  senderName: string;
  timestamp: string;
}

function storageKey(userId: string) {
  return `uchat-message-outbox:${userId}`;
}

export function loadQueuedMessages(userId: string): QueuedMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveQueuedMessages(userId: string, messages: QueuedMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(messages));
}

export function queueMessage(userId: string, message: QueuedMessage) {
  const messages = loadQueuedMessages(userId);
  if (!messages.some((queued) => queued.id === message.id)) {
    saveQueuedMessages(userId, [...messages, message]);
  }
}

export function removeQueuedMessage(userId: string, messageId: string) {
  saveQueuedMessages(userId, loadQueuedMessages(userId).filter((message) => message.id !== messageId));
}
