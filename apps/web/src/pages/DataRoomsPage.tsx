import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDataRoom, listDataRooms, listSharedWithMe } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";

export default function DataRoomsPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["data-rooms"], queryFn: listDataRooms });
  const { data: sharedWithMe, isLoading: loadingShared } = useQuery({
    queryKey: ["shared-with-me"],
    queryFn: listSharedWithMe,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Data Rooms</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New Data Room
          </Button>
        </div>

        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">My Data Rooms</TabsTrigger>
            <TabsTrigger value="shared">Shared with me</TabsTrigger>
          </TabsList>

          <TabsContent value="mine">
            {isLoading ? (
              <GridSkeleton />
            ) : data && data.owned.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.owned.map((room) => (
                  <Card
                    key={room.id}
                    className="cursor-pointer transition-colors hover:border-primary/50"
                    onClick={() => navigate(`/rooms/${room.id}`)}
                  >
                    <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="size-4" />
                        </div>
                        <CardTitle className="truncate text-base">{room.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Created {formatDate(room.createdAt)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState onCreate={() => setCreateOpen(true)} />
            )}
          </TabsContent>

          <TabsContent value="shared">
            {loadingShared ? (
              <GridSkeleton />
            ) : sharedWithMe && sharedWithMe.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sharedWithMe.map((item) => (
                  <Card
                    key={item.shareId}
                    className="cursor-pointer transition-colors hover:border-primary/50"
                    onClick={() =>
                      navigate(item.folderId ? `/rooms/${item.dataRoomId}?folderId=${item.folderId}` : `/rooms/${item.dataRoomId}`)
                    }
                  >
                    <CardHeader className="space-y-0">
                      <CardTitle className="truncate text-base">{item.resourceName}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      {item.resourceType === "DATA_ROOM" ? "Data room" : item.resourceType === "FOLDER" ? "Folder" : "File"} · Shared by{" "}
                      {item.ownerName ?? item.ownerEmail}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">Nothing has been shared with you yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateDataRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Building2 className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">No data rooms yet</p>
        <p className="text-sm text-muted-foreground">Create one to start organizing documents for due diligence.</p>
      </div>
      <Button onClick={onCreate}>
        <Plus />
        New Data Room
      </Button>
    </div>
  );
}

function CreateDataRoomDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = React.useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (open) setName("");
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => createDataRoom(name.trim()),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["data-rooms"] });
      onOpenChange(false);
      navigate(`/rooms/${room.id}`);
    },
    onError: () => toast.error("Failed to create data room"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Data Room</DialogTitle>
          <DialogDescription>Name it after the deal or the counterparty.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) mutation.mutate();
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="room-name">Name</Label>
            <Input
              id="room-name"
              placeholder="Project Atlas — Due Diligence"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
