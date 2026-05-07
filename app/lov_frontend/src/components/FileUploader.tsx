import { useState, useRef, useCallback } from "react";
import { uploadFile } from "@/lib/api";
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  name: string;
  status: "uploading" | "success" | "error";
  message?: string;
}

export function FileUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    const entry: UploadedFile = { name: file.name, status: "uploading" };
    setFiles((prev) => [entry, ...prev]);

    try {
      const message = await uploadFile(file);
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name && f.status === "uploading"
            ? { ...f, status: "success", message }
            : f
        )
      );
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name && f.status === "uploading"
            ? { ...f, status: "error", message: err.message }
            : f
        )
      );
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach(handleUpload);
    },
    [handleUpload]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      selected.forEach(handleUpload);
      e.target.value = "";
    },
    [handleUpload]
  );

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Documents
      </h3>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 cursor-pointer transition-all duration-150",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <p className="text-xs font-medium text-foreground">Drop files here</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            PDF, DOCX, TXT, MD
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          multiple
          onChange={onFileSelect}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-2 animate-slide-up"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.name}</p>
                {f.message && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {f.message}
                  </p>
                )}
              </div>
              {f.status === "uploading" && (
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
              )}
              {f.status === "success" && (
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              )}
              {f.status === "error" && (
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
