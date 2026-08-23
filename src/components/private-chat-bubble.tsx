import { AlertCircle, Check, CheckCheck, Clock3, Copy, Reply, Share2, Trash2 } from "lucide-react";
import { memo, useState } from "react";

type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

type PrivateMessageItem = {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  status: MessageStatus;
  kind?: "text" | "image" | "file";
  attachmentName?: string;
  attachmentUrl?: string;
  replyTo?: string;
  reactions?: Record<string, number>;
  starred?: boolean;
  unsent?: boolean;
};

interface MessageBubbleProps {
  message: PrivateMessageItem;
  isMine: boolean;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>, message: PrivateMessageItem) => void;
  onLongPress?: (message: PrivateMessageItem, x: number, y: number) => void;
  onReact?: (message: PrivateMessageItem, emoji: string) => void;
}

export const MessageBubble = memo(function MessageBubble({ message, isMine, onContextMenu, onLongPress }: MessageBubbleProps) {
  const statusIcon =
    message.status === "sending" ? <Clock3 className="h-3.5 w-3.5 text-muted" /> :
    message.status === "sent" ? <Check className="h-3.5 w-3.5 text-primary-foreground/80" /> :
    message.status === "delivered" ? <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/80" /> :
    message.status === "read" ? <CheckCheck className="h-3.5 w-3.5 text-primary/70" /> :
    <AlertCircle className="h-3.5 w-3.5 text-destructive/70" />;

  const [touchTimer, setTouchTimer] = useState<number | null>(null);

  const startLongPress = (event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const timer = window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      onLongPress?.(message, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, 500);
    setTouchTimer(timer);
    target.dataset.timer = String(timer);
  };

  const cancelLongPress = (event: React.TouchEvent<HTMLDivElement>) => {
    const timer = Number((event.currentTarget as HTMLDivElement).dataset.timer);
    if (!Number.isNaN(timer)) {
      window.clearTimeout(timer);
    }
    setTouchTimer(null);
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-0 py-0 md:max-w-[75%] ${isMine ? "rounded-br-none bg-primary text-primary-foreground shadow-sm border border-border" : "rounded-bl-none bg-surface text-foreground shadow-sm border border-border"}`}
        onContextMenu={(event) => onContextMenu(event, message)}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        {message.replyTo ? (
          <div className={`mx-3 mt-3 rounded-lg border border-border bg-background/80 px-3 py-2 text-xs text-muted ${isMine ? "bg-primary/15 border-primary text-primary-foreground" : ""}`}>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] opacity-70">
              <Reply className="h-3 w-3" />
              Reply
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-foreground">{message.replyTo}</p>
          </div>
        ) : null}

        <div className="p-3">
          {message.kind === "image" && message.attachmentUrl ? (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <img src={message.attachmentUrl} alt={message.attachmentName || "Shared image"} className="max-h-64 w-full object-cover" />
            </div>
          ) : null}

          {message.kind === "file" && message.attachmentUrl ? (
            <div className={`mb-2 rounded-lg border px-3 py-2 text-sm ${isMine ? "border-primary bg-primary/15" : "border-border bg-background/80 text-muted"}`}>
              <p className="font-medium text-foreground">{message.attachmentName || "File"}</p>
              <p className="mt-1 text-xs text-muted">Attachment</p>
            </div>
          ) : null}

          {message.content ? <p className="break-words text-base leading-relaxed tracking-tight text-foreground">{message.content}</p> : null}

          <div className="mt-2 flex items-center justify-end gap-1 text-xs font-mono text-muted">
            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            {isMine ? <span className="ml-1">{statusIcon}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
});

export function ContextMenu({ open, x, y, onReply, onCopy, onDelete, onForward, canDelete }: { open: boolean; x: number; y: number; onReply: () => void; onCopy: () => void; onDelete: () => void; onForward: () => void; canDelete: boolean; }) {
  if (!open) return null;

  return (
    <div className="fixed z-50 min-w-[180px] rounded-2xl border border-border bg-surface p-2 shadow-sm backdrop-blur" style={{ left: x, top: y }}>
      <button type="button" onClick={onReply} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-background/70">
        <Reply className="h-4 w-4" />
        Reply
      </button>
      <button type="button" onClick={onCopy} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-background/70">
        <Copy className="h-4 w-4" />
        Copy
      </button>
      <button type="button" onClick={onForward} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-background/70">
        <Share2 className="h-4 w-4" />
        Forward
      </button>
      {canDelete ? (
        <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      ) : null}
    </div>
  );
}
