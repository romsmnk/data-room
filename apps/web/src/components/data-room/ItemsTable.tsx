import { FileText, Folder, MoreHorizontal } from "lucide-react";
import type { FileDto, FolderDto } from "@data-room/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/format";

export type Role = "OWNER" | "EDITOR" | "VIEWER";

interface ItemsTableProps {
  folders: FolderDto[];
  files: FileDto[];
  role: Role;
  onOpenFolder: (folder: FolderDto) => void;
  onOpenFile: (file: FileDto) => void;
  onRenameFolder: (folder: FolderDto) => void;
  onDeleteFolder: (folder: FolderDto) => void;
  onShareFolder: (folder: FolderDto) => void;
  onRenameFile: (file: FileDto) => void;
  onMoveFile: (file: FileDto) => void;
  onDeleteFile: (file: FileDto) => void;
  onShareFile: (file: FileDto) => void;
  onDownloadFile: (file: FileDto) => void;
}

export function ItemsTable({
  folders,
  files,
  role,
  onOpenFolder,
  onOpenFile,
  onRenameFolder,
  onDeleteFolder,
  onShareFolder,
  onRenameFile,
  onMoveFile,
  onDeleteFile,
  onShareFile,
  onDownloadFile,
}: ItemsTableProps) {
  const canEdit = role === "OWNER" || role === "EDITOR";
  const canShare = role === "OWNER";

  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <Folder className="size-10 opacity-40" />
        <p className="text-sm">This folder is empty.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-2 pl-2 font-medium">Name</th>
          <th className="hidden py-2 font-medium sm:table-cell">Size</th>
          <th className="hidden py-2 pr-2 font-medium sm:table-cell">Modified</th>
          <th className="w-9" />
        </tr>
      </thead>
      <tbody>
        {folders.map((folder) => (
          <tr key={folder.id} className="group border-b last:border-0 hover:bg-accent/50">
            <td className="py-1.5 pl-2">
              <button
                type="button"
                onClick={() => onOpenFolder(folder)}
                className="flex items-center gap-2 truncate rounded py-1 text-left"
              >
                <Folder className="size-4 shrink-0 fill-muted-foreground/20 text-muted-foreground" />
                <span className="truncate">{folder.name}</span>
              </button>
            </td>
            <td className="hidden text-muted-foreground sm:table-cell">—</td>
            <td className="hidden pr-2 text-muted-foreground sm:table-cell">{formatDate(folder.updatedAt)}</td>
            <td>
              <RowMenu>
                {canEdit && <DropdownMenuItem onClick={() => onRenameFolder(folder)}>Rename</DropdownMenuItem>}
                {canShare && <DropdownMenuItem onClick={() => onShareFolder(folder)}>Share</DropdownMenuItem>}
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDeleteFolder(folder)}>
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </RowMenu>
            </td>
          </tr>
        ))}
        {files.map((file) => (
          <tr key={file.id} className="group border-b last:border-0 hover:bg-accent/50">
            <td className="py-1.5 pl-2">
              <button
                type="button"
                onClick={() => onOpenFile(file)}
                className="flex items-center gap-2 truncate rounded py-1 text-left"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </button>
            </td>
            <td className="hidden text-muted-foreground sm:table-cell">{formatBytes(file.sizeBytes)}</td>
            <td className="hidden pr-2 text-muted-foreground sm:table-cell">{formatDate(file.updatedAt)}</td>
            <td>
              <RowMenu>
                <DropdownMenuItem onClick={() => onDownloadFile(file)}>Download</DropdownMenuItem>
                {canEdit && <DropdownMenuItem onClick={() => onRenameFile(file)}>Rename</DropdownMenuItem>}
                {canEdit && <DropdownMenuItem onClick={() => onMoveFile(file)}>Move</DropdownMenuItem>}
                {canShare && <DropdownMenuItem onClick={() => onShareFile(file)}>Share</DropdownMenuItem>}
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDeleteFile(file)}>
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </RowMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RowMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
