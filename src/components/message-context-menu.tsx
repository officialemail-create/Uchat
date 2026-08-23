import { Copy, Reply, Share2, Trash2, Edit3, Star, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MessageContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  isOwn: boolean;
  onReply: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDeleteForMe?: () => void;
  onDeleteForEveryone?: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
  onClose: () => void;
}

export function MessageContextMenu({
  open,
  x,
  y,
  isOwn,
  onReply,
  onCopy,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
  onReact,
  onClose,
}: MessageContextMenuProps) {
  const [showReactions, setShowReactions] = useState(false);
  const QUICK = ["👍", "❤️", "😂", "🎉", "🔥", "😮"];
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && menuRef.current) {
        const focusable = menuRef.current.querySelectorAll<HTMLElement>("button");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Message actions</div>
      <button type="button" onClick={onReply} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
        <Reply className="h-4 w-4" />
        Reply
      </button>
      <button type="button" onClick={onCopy} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
        <Copy className="h-4 w-4" />
        Copy
      </button>
      {isOwn && onEdit ? (
        <button type="button" onClick={onEdit} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
          <Edit3 className="h-4 w-4" />
          Edit
        </button>
      ) : null}
      <button type="button" onClick={onForward} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
        <Share2 className="h-4 w-4" />
        Forward
      </button>
      <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
        <button type="button" onClick={() => setShowReactions((prev) => !prev)} className="flex w-full items-center gap-3 text-left text-sm text-gray-700 transition hover:text-gray-900 dark:text-gray-200 dark:hover:text-white">
          <Smile className="h-4 w-4" />
          React
        </button>
        {showReactions ? (
          <div className="mt-3 flex flex-wrap gap-2 px-1">
            {QUICK.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setShowReactions(false);
                  onReact(emoji);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg transition hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
        <button type="button" onClick={onDeleteForMe} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30">
          <Trash2 className="h-4 w-4" />
          Delete for me
        </button>
        {isOwn ? (
          <button type="button" onClick={onDeleteForEveryone} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30">
            <Trash2 className="h-4 w-4" />
            Delete for everyone
          </button>
        ) : null}
      </div>
    </div>
  );
}
