import { AlertTriangle, Check, Copy, KeyRound, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface RoomInvitePanelProps {
  roomName?: string;
  inviteLink?: string;
  roomCode?: string;
  onCopyLink?: () => void;
  onRegenerateCode?: () => void;
  isRegenerating?: boolean;
}

export function RoomInvitePanel({
  roomName = "this room",
  inviteLink = "",
  roomCode = "",
  onCopyLink,
  onRegenerateCode,
  isRegenerating = false,
}: RoomInvitePanelProps) {
  const [openConfirm, setOpenConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const displayCode = useMemo(() => roomCode || "------", [roomCode]);

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: "Link copied", description: "The invite link is ready to share." });
      if (onCopyLink) onCopyLink();
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ title: "Copy failed" });
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="space-y-4">
        <div>
          
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Copy link</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              placeholder="No link available"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 font-mono text-sm text-gray-600 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Join code</label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <KeyRound className="h-4 w-4 text-gray-400" />
            <span className="font-mono text-sm font-semibold uppercase tracking-[0.25em] text-gray-700 dark:text-gray-200">{displayCode}</span>
          </div>
        </div>

        <AlertDialog open={openConfirm} onOpenChange={setOpenConfirm}>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={isRegenerating}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {isRegenerating ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Regenerate code
            </button>
          </AlertDialogTrigger>
          <AlertDialogPortal>
            <AlertDialogOverlay className="fixed inset-0 z-[200] bg-black/50" />
            <AlertDialogContent className="fixed left-1/2 top-1/2 z-[201] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <AlertDialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                    Regenerate invite code?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    This will invalidate all existing invite links for this room. Confirm?
                  </AlertDialogDescription>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <AlertDialogCancel asChild>
                  <button type="button" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">
                    Cancel
                  </button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (onRegenerateCode) onRegenerateCode();
                      setOpenConfirm(false);
                    }}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Confirm
                  </button>
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialog>
      </div>
    </div>
  );
}
