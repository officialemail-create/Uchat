import { useEffect, useRef } from "react";

export function useReadReceipts(
  messageId: string,
  isVisible: boolean,
  onRead: (messageId: string) => void,
) {
  const reportedMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isVisible || reportedMessageIdsRef.current.has(messageId)) return;

    reportedMessageIdsRef.current.add(messageId);
    onRead(messageId);
  }, [isVisible, messageId, onRead]);
}
