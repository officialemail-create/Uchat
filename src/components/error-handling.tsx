import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ErrorHandlingProps {
  networkInterrupted: boolean;
  permissionDenied: boolean;
  streamUnavailable: boolean;
  uploadFailed: boolean;
  onRetry: () => void;
  onClose: () => void;
}

export function ErrorHandling({
  networkInterrupted,
  permissionDenied,
  streamUnavailable,
  uploadFailed,
  onRetry,
  onClose,
}: ErrorHandlingProps) {
  const { toast } = useToast();
  const [reconnectProgress, setReconnectProgress] = useState(0);

  useEffect(() => {
    if (!networkInterrupted) {
      setReconnectProgress(0);
      return;
    }

    const interval = window.setInterval(() => {
      setReconnectProgress((prev) => (prev >= 100 ? 100 : prev + 12));
    }, 350);

    return () => window.clearInterval(interval);
  }, [networkInterrupted]);

  useEffect(() => {
    if (uploadFailed) {
      toast({
        title: "Upload failed",
        description: "File upload failed. Try a smaller file.",
      });
    }
  }, [uploadFailed, toast]);

  return (
    <>
      <Dialog open={permissionDenied || streamUnavailable} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {permissionDenied ? "Permission denied" : "Stream unavailable"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                  {permissionDenied
                    ? "You need permission to share this content."
                    : "Stream not found. Please check the URL."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="sm:justify-end">
            <button type="button" onClick={onRetry} className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white">
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Retry
              </span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {networkInterrupted ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[190] flex justify-center px-4 pt-4">
          <div className="w-full max-w-md rounded-2xl border border-purple-400/40 bg-black/70 p-3 text-white shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Reconnecting...</span>
              <span className="text-purple-300">{reconnectProgress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-purple-500 transition-all" style={{ width: `${reconnectProgress}%` }} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
