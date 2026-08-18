import * as React from "react";
import type { FileDto } from "@data-room/shared";
import { uploadFile } from "@/lib/endpoints";

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

export function useUploadQueue(onUploaded: (file: FileDto) => void) {
  const [uploads, setUploads] = React.useState<UploadItem[]>([]);

  function startUpload(files: File[], dataRoomId: string, folderId: string | null) {
    for (const file of files) {
      const id = crypto.randomUUID();
      setUploads((prev) => [...prev, { id, name: file.name, progress: 0, status: "uploading" }]);

      const { promise } = uploadFile(
        { file, dataRoomId, folderId },
        {
          onProgress: (fraction) =>
            setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress: Math.round(fraction * 100) } : u))),
        },
      );

      promise
        .then((result) => {
          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, progress: 100, status: "done", name: result.name } : u)),
          );
          onUploaded(result);
        })
        .catch((err: Error) => {
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", error: err.message } : u)));
        });
    }
  }

  function dismiss(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  function clearFinished() {
    setUploads((prev) => prev.filter((u) => u.status === "uploading"));
  }

  return { uploads, startUpload, dismiss, clearFinished };
}
