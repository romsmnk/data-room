import * as React from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isNameConflict } from "@/lib/api";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialName: string;
  onRename: (name: string, allowRename?: boolean) => Promise<void>;
}

export function RenameDialog({ open, onOpenChange, title, initialName, onRename }: RenameDialogProps) {
  const [name, setName] = React.useState(initialName);
  const [conflict, setConflict] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(initialName);
      setConflict(null);
    }
  }, [open, initialName]);

  async function submit(finalName: string, allowRename?: boolean) {
    setSubmitting(true);
    try {
      await onRename(finalName, allowRename);
      onOpenChange(false);
    } catch (err) {
      if (isNameConflict(err)) {
        setConflict(err.body.suggestedName);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to rename");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choose a new name.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(name.trim());
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={name}
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                setConflict(null);
              }}
            />
            {conflict && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  An item with that name already exists here.{" "}
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2"
                    onClick={() => void submit(conflict, true)}
                  >
                    Use &ldquo;{conflict}&rdquo; instead
                  </button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || submitting}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
