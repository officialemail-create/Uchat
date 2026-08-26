import React, { useRef, useState } from "react";
import { Camera, Image, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadModalProps {
  onClose: () => void;
  onFilesSelected: (files: File[]) => void;
}

export default function UploadModal({ onClose, onFilesSelected }: UploadModalProps) {
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleCameraClick = () => {
    // Trigger file input with capture attribute for camera
    try {
      cameraInputRef.current?.click();
    } catch (err) {
      toast({ title: "Permission denied. Please allow access in settings.", description: "Unable to open camera" });
    }
  };

  const handleGalleryClick = () => {
    try {
      galleryInputRef.current?.click();
    } catch (err) {
      toast({ title: "Permission denied. Please allow access in settings.", description: "Unable to open gallery" });
    }
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      toast({ title: "No file selected" });
      return;
    }

    const file = files[0];
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSend = () => {
    if (!selectedFile) {
      toast({ title: "No file selected" });
      return;
    }
    onFilesSelected([selectedFile]);
    // clean up
    setSelectedFile(null);
    setPreviewUrl(null);
    onClose();
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center sm:justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative z-70 w-full sm:w-[420px] rounded-t-xl sm:rounded-xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Attach</h3>
          <button onClick={onClose} className="p-1 rounded-full text-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-3 mb-3">
          <button
            onClick={handleCameraClick}
            className="flex-1 flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2 text-sm hover:bg-white/5"
          >
            <Camera className="w-4 h-4 text-purple-400" /> Take Photo
          </button>
          <button
            onClick={handleGalleryClick}
            className="flex-1 flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2 text-sm hover:bg-white/5"
          >
            <Image className="w-4 h-4 text-purple-400" /> Choose from Gallery
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />

        {previewUrl ? (
          <div className="mt-3 flex items-center gap-3">
            {selectedFile?.type.startsWith("image/") ? (
              <img src={previewUrl} alt={selectedFile?.name} className="w-18 h-18 object-cover rounded-md" />
            ) : (
              <video src={previewUrl} className="w-18 h-18 rounded-md" controls />
            )}

            <div className="flex-1">
              <div className="text-sm font-medium">{selectedFile?.name}</div>
              <div className="text-xs text-muted">{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ""}</div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleCancel} className="inline-flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2 text-sm hover:bg-white/5">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSend} className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-3 py-2 text-sm text-white hover:bg-purple-400">
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        ) :
          <div className="mt-3 text-sm text-muted">No file selected</div>}
      </div>
    </div>
  );
}
