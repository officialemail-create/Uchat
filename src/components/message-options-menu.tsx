import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2, Trash, Copy, CornerUpLeft } from "lucide-react";

interface MessageOptionsMenuProps {
  open: boolean;
  onClose: () => void;
  onReply?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onUnsend?: () => void;
  onDeleteForMe: () => void;
  align: "left" | "right";
}

interface ItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: "red" | "orange";
  first?: boolean;
  last?: boolean;
}

function MenuItem({ icon, label, onClick, danger, first, last }: ItemProps) {
  const r = "12px";
  const br = [first ? r : "0", first ? r : "0", last ? r : "0", last ? r : "0"].join(" ");
  const style =
    danger === "red"
      ? { color: "rgba(239,68,68,0.85)" }
      : danger === "orange"
      ? { color: "rgba(251,146,60,0.85)" }
      : { color: "rgba(255,255,255,0.65)" };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]"
      style={{ borderRadius: br, ...style }}
      role="menuitem"
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const DIVIDER = (
  <div className="mx-3" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
);

export default function MessageOptionsMenu({
  open, onClose, onReply, onCopy, onEdit, onUnsend, onDeleteForMe, align,
}: MessageOptionsMenuProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onClose, 12000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open, onClose]);

  const items: Array<{ key: string } & Omit<ItemProps, "first" | "last">> = [];
  if (onReply)  items.push({ key: "reply",  icon: <CornerUpLeft className="w-3.5 h-3.5" />, label: "Reply",               onClick: () => { onReply();       onClose(); } });
  if (onCopy)   items.push({ key: "copy",   icon: <Copy className="w-3.5 h-3.5" />,         label: "Copy",                onClick: () => { onCopy();        onClose(); } });
  if (onEdit)   items.push({ key: "edit",   icon: <Edit2 className="w-3.5 h-3.5" />,        label: "Edit Message",        onClick: () => { onEdit();        onClose(); } });
  if (onUnsend) items.push({ key: "unsend", icon: <Trash2 className="w-3.5 h-3.5" />,       label: "Delete for Everyone", onClick: () => { onUnsend();      onClose(); }, danger: "red" as const });
  items.push({   key: "delete", icon: <Trash className="w-3.5 h-3.5" />,                    label: "Delete for Me",       onClick: () => { onDeleteForMe(); onClose(); }, danger: "orange" as const });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 6 }}
          transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-full mb-2 z-50 min-w-[196px]"
          style={{
            [align === "right" ? "right" : "left"]: 0,
            background: "rgba(17,24,39,0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
          aria-label="Message actions"
        >
          {items.map((item, idx) => (
            <div key={item.key}>
              <MenuItem
                icon={item.icon}
                label={item.label}
                onClick={item.onClick}
                danger={item.danger}
                first={idx === 0}
                last={idx === items.length - 1}
              />
              {idx < items.length - 1 && DIVIDER}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
