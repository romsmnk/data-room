import * as React from "react";
import { toast } from "sonner";
import type { FolderStats } from "@data-room/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBytes } from "@/lib/format";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  /** Provide for folders / data rooms to warn about nested content; omit for a plain file. */
  fetchStats?: () => Promise<FolderStats>;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({ open, onOpenChange, itemName, fetchStats, onConfirm }: DeleteConfirmDialogProps) {
  const [stats, setStats] = React.useState<FolderStats | null>(null);
  const [loadingStats, setLoadingStats] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open || !fetchStats) return;
    setLoadingStats(true);
    setStats(null);
    fetchStats()
      .then(setStats)
      .finally(() => setLoadingStats(false));
  }, [open, fetchStats]);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{itemName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {fetchStats ? (
                loadingStats ? (
                  <span>Checking what&rsquo;s inside&hellip;</span>
                ) : stats && stats.itemCount > 0 ? (
                  <span>
                    This will permanently delete this folder and everything inside it:{" "}
                    <strong className="text-foreground">
                      {stats.itemCount} item{stats.itemCount === 1 ? "" : "s"}
                    </strong>{" "}
                    ({formatBytes(stats.totalSizeBytes)} total). Anyone it was shared with will lose access
                    immediately. This cannot be undone.
                  </span>
                ) : (
                  <span>This folder is empty. This cannot be undone.</span>
                )
              ) : (
                <span>This cannot be undone. Anyone it was shared with will lose access immediately.</span>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting || loadingStats}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
