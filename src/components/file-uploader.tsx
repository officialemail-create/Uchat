import { useRef, type ChangeEvent, type ReactNode } from "react";

interface FileUploaderProps {
  children: ReactNode;
  accept?: string;
  capture?: boolean | "user" | "environment";
  multiple?: boolean;
  onFilesSelected: (files: FileList) => void;
}

export function FileUploader({ children, accept, capture, multiple = false, onFilesSelected }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    event.target.value = "";
  };

  return (
    <div className="inline-flex" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture}
        className="hidden"
        onChange={handleChange}
      />
      {children}
    </div>
  );
}
