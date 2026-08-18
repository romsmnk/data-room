import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderPlus, MoreHorizontal, Upload } from "lucide-react";
import type { FileDto, FolderDto } from "@data-room/shared";
import { ResourceType } from "@data-room/shared";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/data-room/Breadcrumbs";
import { ItemsTable } from "@/components/data-room/ItemsTable";
import type { Role } from "@/components/data-room/ItemsTable";
import { CreateFolderDialog } from "@/components/data-room/CreateFolderDialog";
import { RenameDialog } from "@/components/data-room/RenameDialog";
import { DeleteConfirmDialog } from "@/components/data-room/DeleteConfirmDialog";
import { MoveFileDialog } from "@/components/data-room/MoveFileDialog";
import { ShareDialog } from "@/components/data-room/ShareDialog";
import { FileViewerDialog } from "@/components/data-room/FileViewerDialog";
import { UploadProgressPanel } from "@/components/data-room/UploadProgressPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { ApiError } from "@/lib/api";
import {
  createFolder,
  deleteDataRoom,
  deleteFile,
  deleteFolder,
  getDataRoomStats,
  getFileUrl,
  getFolderStats,
  listItems,
  moveFile,
  renameDataRoom,
  renameFile,
  renameFolder,
} from "@/lib/endpoints";

type Target =
  | { kind: "folder"; folder: FolderDto }
  | { kind: "file"; file: FileDto }
  | { kind: "room" };

export default function RoomBrowserPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const folderId = params.get("folderId");
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const queryKey = ["items", roomId, folderId];
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => listItems(roomId!, folderId),
    enabled: !!roomId,
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["items", roomId] });

  const { uploads, startUpload, dismiss } = useUploadQueue(() => invalidate());

  const [createFolderOpen, setCreateFolderOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<Target | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Target | null>(null);
  const [moveTarget, setMoveTarget] = React.useState<FileDto | null>(null);
  const [shareTarget, setShareTarget] = React.useState<Target | null>(null);
  const [viewerFile, setViewerFile] = React.useState<FileDto | null>(null);

  function navigateToFolder(id: string | null) {
    if (id) setParams({ folderId: id });
    else setParams({});
  }

  function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    startUpload(files, roomId!, folderId);
  }

  async function handleCreateFolder(name: string, allowRename?: boolean) {
    await createFolder({ name, dataRoomId: roomId!, parentId: folderId, allowRename });
    invalidate();
    toast.success(`Created "${name}"`);
  }

  async function handleRename(name: string, allowRename?: boolean) {
    if (!renameTarget) return;
    if (renameTarget.kind === "folder") {
      await renameFolder(renameTarget.folder.id, name, allowRename);
    } else if (renameTarget.kind === "file") {
      await renameFile(renameTarget.file.id, name, allowRename);
    } else {
      await renameDataRoom(roomId!, name);
    }
    invalidate();
    toast.success("Renamed");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "folder") {
      await deleteFolder(deleteTarget.folder.id);
      invalidate();
      toast.success(`Deleted "${deleteTarget.folder.name}"`);
    } else if (deleteTarget.kind === "file") {
      await deleteFile(deleteTarget.file.id);
      invalidate();
      toast.success(`Deleted "${deleteTarget.file.name}"`);
    } else {
      await deleteDataRoom(roomId!);
      navigate("/rooms");
      toast.success("Data room deleted");
    }
  }

  async function handleMove(targetFolderId: string | null) {
    if (!moveTarget) return;
    await moveFile(moveTarget.id, targetFolderId);
    invalidate();
    toast.success(`Moved "${moveTarget.name}"`);
  }

  if (isError) {
    const status = error instanceof ApiError ? error.status : undefined;
    const notFound = status === 404 || status === 403;
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-medium">
            {notFound ? "This item is no longer available." : "Something went wrong."}
          </p>
          <Button variant="outline" onClick={() => navigate("/rooms")}>
            Back to Data Rooms
          </Button>
        </div>
      </AppShell>
    );
  }

  const role: Role = (data?.role as Role) ?? "VIEWER";
  const canEdit = role === "OWNER" || role === "EDITOR";
  const canShare = role === "OWNER";
  const currentTarget: Target = folderId && data?.folder ? { kind: "folder", folder: data.folder } : { kind: "room" };
  const currentName = data?.folder?.name ?? data?.breadcrumbs[0]?.name ?? "";

  return (
    <AppShell>
      <div
        className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6"
        onDragOver={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (canEdit) handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {data ? (
            <div className="flex min-w-0 items-center gap-1">
              <Breadcrumbs items={data.breadcrumbs} onNavigate={navigateToFolder} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {canEdit && <DropdownMenuItem onClick={() => setRenameTarget(currentTarget)}>Rename</DropdownMenuItem>}
                  {canShare && <DropdownMenuItem onClick={() => setShareTarget(currentTarget)}>Share</DropdownMenuItem>}
                  {(currentTarget.kind === "room" ? role === "OWNER" : canEdit) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(currentTarget)}>
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Skeleton className="h-6 w-48" />
          )}

          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus />
                New folder
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}
          {role === "VIEWER" && <span className="text-xs text-muted-foreground">View only</span>}
        </div>

        {isLoading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ItemsTable
            folders={data.folders}
            files={data.files}
            role={role}
            onOpenFolder={(f) => navigateToFolder(f.id)}
            onOpenFile={setViewerFile}
            onRenameFolder={(f) => setRenameTarget({ kind: "folder", folder: f })}
            onDeleteFolder={(f) => setDeleteTarget({ kind: "folder", folder: f })}
            onShareFolder={(f) => setShareTarget({ kind: "folder", folder: f })}
            onRenameFile={(f) => setRenameTarget({ kind: "file", file: f })}
            onMoveFile={setMoveTarget}
            onDeleteFile={(f) => setDeleteTarget({ kind: "file", file: f })}
            onShareFile={(f) => setShareTarget({ kind: "file", file: f })}
            onDownloadFile={async (f) => {
              const { url } = await getFileUrl(f.id, "attachment");
              window.open(url, "_blank");
            }}
          />
        )}

        {dragActive && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-[1px]">
            <div className="rounded-xl border-2 border-dashed border-primary bg-background px-8 py-6 text-lg font-medium shadow-lg">
              Drop files to upload
            </div>
          </div>
        )}
      </div>

      <UploadProgressPanel uploads={uploads} onDismiss={dismiss} />

      <CreateFolderDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen} onCreate={handleCreateFolder} />

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          title={renameTarget.kind === "folder" ? "Rename folder" : renameTarget.kind === "file" ? "Rename file" : "Rename data room"}
          initialName={
            renameTarget.kind === "folder" ? renameTarget.folder.name : renameTarget.kind === "file" ? renameTarget.file.name : currentName
          }
          onRename={handleRename}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          itemName={
            deleteTarget.kind === "folder" ? deleteTarget.folder.name : deleteTarget.kind === "file" ? deleteTarget.file.name : currentName
          }
          fetchStats={
            deleteTarget.kind === "folder"
              ? () => getFolderStats(deleteTarget.folder.id)
              : deleteTarget.kind === "room"
                ? () => getDataRoomStats(roomId!)
                : undefined
          }
          onConfirm={handleDelete}
        />
      )}

      {moveTarget && (
        <MoveFileDialog
          open={!!moveTarget}
          onOpenChange={(open) => !open && setMoveTarget(null)}
          dataRoomId={roomId!}
          currentFolderId={moveTarget.folderId}
          fileName={moveTarget.name}
          onMove={handleMove}
        />
      )}

      {shareTarget && (
        <ShareDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          resourceType={shareTarget.kind === "folder" ? ResourceType.FOLDER : shareTarget.kind === "file" ? ResourceType.FILE : ResourceType.DATA_ROOM}
          resourceId={shareTarget.kind === "folder" ? shareTarget.folder.id : shareTarget.kind === "file" ? shareTarget.file.id : roomId!}
          resourceName={
            shareTarget.kind === "folder" ? shareTarget.folder.name : shareTarget.kind === "file" ? shareTarget.file.name : currentName
          }
        />
      )}

      {viewerFile && (
        <FileViewerDialog
          open={!!viewerFile}
          onOpenChange={(open) => !open && setViewerFile(null)}
          fileName={viewerFile.name}
          fetchViewUrl={() => getFileUrl(viewerFile.id, "inline")}
          fetchDownloadUrl={() => getFileUrl(viewerFile.id, "attachment")}
        />
      )}
    </AppShell>
  );
}
