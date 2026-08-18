import { AlertCircle, CheckCircle2, FileText, X } from "lucide-react";
import type { UploadItem } from "@/hooks/useUploadQueue";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadProgressPanelProps {
  uploads: UploadItem[];
  onDismiss: (id: string) => void;
}

export function UploadProgressPanel({ uploads, onDismiss }: UploadProgressPanelProps) {
  if (uploads.length === 0) return null;
  const uploadingCount = uploads.filter((u) => u.status === "uploading").length;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 overflow-hidden rounded-lg border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
        {uploadingCount > 0 ? `Uploading ${uploadingCount} file${uploadingCount === 1 ? "" : "s"}…` : "Uploads complete"}
      </div>
      <ul className="max-h-64 divide-y overflow-y-auto">
        {uploads.map((u) => (
          <li key={u.id} className="flex items-center gap-2 px-3 py-2">
            {u.status === "error" ? (
              <AlertCircle className="size-4 shrink-0 text-destructive" />
            ) : u.status === "done" ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
            ) : (
              <FileText className="size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs" title={u.name}>
                {u.name}
              </div>
              {u.status === "uploading" && <Progress value={u.progress} className="mt-1 h-1" />}
              {u.status === "error" && <div className="mt-0.5 truncate text-xs text-destructive">{u.error}</div>}
            </div>
            {u.status !== "uploading" && (
              <button
                type="button"
                onClick={() => onDismiss(u.id)}
                className={cn("shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent")}
              >
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
