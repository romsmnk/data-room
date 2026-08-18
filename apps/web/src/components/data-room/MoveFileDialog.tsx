import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listItems } from "@/lib/endpoints";
import { Breadcrumbs } from "@/components/data-room/Breadcrumbs";

interface MoveFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataRoomId: string;
  currentFolderId: string | null;
  fileName: string;
  onMove: (folderId: string | null) => Promise<void>;
}

export function MoveFileDialog({ open, onOpenChange, dataRoomId, currentFolderId, fileName, onMove }: MoveFileDialogProps) {
  const [targetFolderId, setTargetFolderId] = React.useState<string | null>(null);
  const [moving, setMoving] = React.useState(false);

  React.useEffect(() => {
    if (open) setTargetFolderId(null);
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["move-picker", dataRoomId, targetFolderId],
    queryFn: () => listItems(dataRoomId, targetFolderId),
    enabled: open,
  });

  const isSameLocation = targetFolderId === currentFolderId;

  async function handleMove() {
    setMoving(true);
    try {
      await onMove(targetFolderId);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move");
    } finally {
      setMoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">Move &ldquo;{fileName}&rdquo;</DialogTitle>
          <DialogDescription>Choose a destination folder.</DialogDescription>
        </DialogHeader>

        {data && <Breadcrumbs items={data.breadcrumbs} onNavigate={setTargetFolderId} />}

        <div className="h-64 overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.folders.length > 0 ? (
            <ul className="divide-y">
              {data.folders.map((folder) => (
                <li key={folder.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => setTargetFolderId(folder.id)}
                  >
                    <Folder className="size-4 text-muted-foreground" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No subfolders</div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleMove()} disabled={isSameLocation || moving}>
            {moving ? "Moving…" : isSameLocation ? "Already here" : "Move here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
