import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Globe, Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { ResourceType, ShareDto } from "@data-room/shared";
import { GrantType } from "@data-room/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { createShare, listSharesForResource, revokeShare } from "@/lib/endpoints";
import { ApiError } from "@/lib/api";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}

export function ShareDialog({ open, onOpenChange, resourceType, resourceId, resourceName }: ShareDialogProps) {
  const queryClient = useQueryClient();
  const queryKey = ["shares", resourceType, resourceId];

  const { data: shares, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSharesForResource(resourceType, resourceId),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: createShare,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to share"),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeShare,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to revoke access"),
  });

  const publicLink = shares?.find((s) => s.grantType === GrantType.PUBLIC_LINK);
  const userShares = shares?.filter((s) => s.grantType === GrantType.USER) ?? [];

  const [email, setEmail] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await createMutation.mutateAsync({ resourceType, resourceId, grantType: GrantType.USER, granteeEmail: email.trim() });
      setEmail("");
      toast.success(`Invited ${email.trim()}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        toast.error("You can't share with your own email");
      }
    }
  }

  async function handleCopyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const linkUrl = publicLink ? `${window.location.origin}/share/${publicLink.token}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">Share &ldquo;{resourceName}&rdquo;</DialogTitle>
          <DialogDescription>Recipients get read-only access.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddPerson} className="flex gap-2">
          <Input
            type="email"
            placeholder="Invite by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={!email.trim() || createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Invite"}
          </Button>
        </form>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading&hellip;</p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {userShares.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">No one else has access yet.</p>
            )}
            {userShares.map((share) => (
              <PersonRow key={share.id} share={share} onRevoke={() => revokeMutation.mutate(share.id)} />
            ))}
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Globe className="size-4" />
            </div>
            <div>
              <div className="font-medium">Public link</div>
              <div className="text-muted-foreground">{publicLink ? "Anyone with the link can view" : "Off"}</div>
            </div>
          </div>
          {publicLink ? (
            <Button variant="ghost" size="sm" onClick={() => revokeMutation.mutate(publicLink.id)}>
              Remove
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({ resourceType, resourceId, grantType: GrantType.PUBLIC_LINK })}
            >
              <Link2 />
              Create link
            </Button>
          )}
        </div>

        {linkUrl && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
            <Input readOnly value={linkUrl} className="h-8 border-none bg-transparent shadow-none" />
            <Button size="sm" variant="secondary" onClick={() => void handleCopyLink(linkUrl)}>
              {copied ? <Check className="text-green-600" /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PersonRow({ share, onRevoke }: { share: ShareDto; onRevoke: () => void }) {
  const label = share.granteeEmail ?? "Invited user";
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Avatar className="size-7">
          <AvatarFallback className="text-[10px]">{label.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">Can view</div>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="size-7" onClick={onRevoke}>
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
