import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FileViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fetchViewUrl: () => Promise<{ url: string }>;
  fetchDownloadUrl: () => Promise<{ url: string }>;
}

export function FileViewerDialog({ open, onOpenChange, fileName, fetchViewUrl, fetchDownloadUrl }: FileViewerDialogProps) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setUrl(null);
      setError(null);
      return;
    }
    fetchViewUrl()
      .then((res) => setUrl(res.url))
      .catch(() => setError("This file is no longer available."));
  }, [open, fetchViewUrl]);

  async function handleDownload() {
    const { url } = await fetchDownloadUrl();
    window.open(url, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle className="truncate">{fileName}</DialogTitle>
          <Button size="sm" variant="outline" onClick={() => void handleDownload()}>
            <Download />
            Download
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted">
          {error ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{error}</div>
          ) : url ? (
            <iframe src={url} title={fileName} className="size-full" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
