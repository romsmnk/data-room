import * as React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Eye } from "lucide-react";
import type { FileDto } from "@data-room/shared";
import { Breadcrumbs } from "@/components/data-room/Breadcrumbs";
import { ItemsTable } from "@/components/data-room/ItemsTable";
import { FileViewerDialog } from "@/components/data-room/FileViewerDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getPublicFileUrl, getPublicShareInfo, listPublicItems } from "@/lib/endpoints";

export default function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [folderId, setFolderId] = React.useState<string | null>(null);
  const [viewerFile, setViewerFile] = React.useState<FileDto | null>(null);

  const infoQuery = useQuery({
    queryKey: ["public-share-info", token],
    queryFn: () => getPublicShareInfo(token!),
    enabled: !!token,
    retry: false,
  });

  const itemsQuery = useQuery({
    queryKey: ["public-items", token, folderId],
    queryFn: () => listPublicItems(token!, folderId),
    enabled: !!token && infoQuery.isSuccess && !infoQuery.data.isFile,
    retry: false,
  });

  if (infoQuery.isError) {
    return <CenteredMessage title="This link is invalid or has been revoked." />;
  }

  if (infoQuery.isLoading || !infoQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  const info = infoQuery.data;

  if (info.isFile) {
    return (
      <PublicShell>
        <div className="mx-auto flex h-[80vh] max-w-4xl flex-col px-4 py-6">
          <h1 className="mb-3 truncate text-lg font-medium">{info.resourceName}</h1>
          <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted">
            <PublicFileFrame token={token!} fileId={info.resourceId} name={info.resourceName} />
          </div>
        </div>
      </PublicShell>
    );
  }

  if (itemsQuery.isError) {
    return <CenteredMessage title="This item is no longer available." />;
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {itemsQuery.data ? (
          <Breadcrumbs items={itemsQuery.data.breadcrumbs} onNavigate={setFolderId} />
        ) : (
          <Skeleton className="h-6 w-48" />
        )}
        <div className="mt-4">
          {itemsQuery.isLoading || !itemsQuery.data ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ItemsTable
              folders={itemsQuery.data.folders}
              files={itemsQuery.data.files}
              role="VIEWER"
              onOpenFolder={(f) => setFolderId(f.id)}
              onOpenFile={setViewerFile}
              onRenameFolder={() => {}}
              onDeleteFolder={() => {}}
              onShareFolder={() => {}}
              onRenameFile={() => {}}
              onMoveFile={() => {}}
              onDeleteFile={() => {}}
              onShareFile={() => {}}
              onDownloadFile={async (f) => {
                const { url } = await getPublicFileUrl(token!, f.id, "attachment");
                window.open(url, "_blank");
              }}
            />
          )}
        </div>
      </div>

      {viewerFile && (
        <FileViewerDialog
          open={!!viewerFile}
          onOpenChange={(open) => !open && setViewerFile(null)}
          fileName={viewerFile.name}
          fetchViewUrl={() => getPublicFileUrl(token!, viewerFile.id, "inline")}
          fetchDownloadUrl={() => getPublicFileUrl(token!, viewerFile.id, "attachment")}
        />
      )}
    </PublicShell>
  );
}

function PublicFileFrame({ token, fileId, name }: { token: string; fileId: string; name: string }) {
  const { data, isError } = useQuery({
    queryKey: ["public-file-url", token, fileId],
    queryFn: () => getPublicFileUrl(token, fileId, "inline"),
    retry: false,
  });
  if (isError) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">This file is no longer available.</div>;
  if (!data) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  return <iframe src={data.url} title={name} className="size-full" />;
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          Data Room
        </div>
        <Badge variant="secondary">
          <Eye />
          View only
        </Badge>
      </header>
      {children}
    </div>
  );
}

function CenteredMessage({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-lg font-medium">{title}</p>
    </div>
  );
}
