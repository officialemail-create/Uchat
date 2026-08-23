import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Loader2, MonitorPlay } from "lucide-react";
import { useEffect, useState } from "react";

interface BrowserShareFlowProps {
  open: boolean;
  isMobile: boolean;
  isSupported: boolean;
  onClose: () => void;
  onLaunchTab: () => void;
  onStartShare: (url?: string) => Promise<void>;
}

export function BrowserShareFlow({ open, isMobile, isSupported, onClose, onLaunchTab, onStartShare }: BrowserShareFlowProps) {
  const [urlValue, setUrlValue] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabOpened, setTabOpened] = useState(false);

  useEffect(() => {
    if (!open) {
      setUrlValue("");
      setWaiting(false);
      setError(null);
      setTabOpened(false);
    }
  }, [open]);

  const handleLaunchTab = () => {
    onLaunchTab();
    setTabOpened(true);
  };

  const handleStartShare = async () => {
    setError(null);
    setWaiting(true);

    try {
      await onStartShare(urlValue.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start browser sharing.");
    } finally {
      setWaiting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <MonitorPlay className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Open URL and share browser content</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                {isMobile
                  ? "Browser sharing is only available on Desktop."
                  : "A new browser tab will open so you can navigate to your video, PDF viewer, or page and then share that tab."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isMobile ? (
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-200">
            Browser sharing is only available on Desktop.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-200">
              {tabOpened
                ? "A new browser tab has opened. Navigate to the page or video you want to share, then press the share button below."
                : "Open the browser tab first, then continue with the share prompt."}
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Optional URL
              <input
                value={urlValue}
                onChange={(event) => setUrlValue(event.target.value)}
                placeholder="https://example.com"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>

            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLaunchTab}
                className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                <ExternalLink className="h-4 w-4" />
                Open new tab
              </button>

              <button
                type="button"
                disabled={waiting || !isSupported}
                onClick={handleStartShare}
                className="inline-flex items-center gap-2 rounded-full border border-purple-300 bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-900/40 dark:bg-gray-950 dark:text-purple-300 dark:hover:bg-purple-950/40"
              >
                {waiting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorPlay className="h-4 w-4" />}
                {waiting ? "Waiting for tab selection..." : "I'm ready. Start Sharing"}
              </button>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
