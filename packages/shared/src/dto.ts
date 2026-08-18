import type { GrantType, ResourceType, ShareRole } from "./enums";

export interface UserSummary {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface DataRoomDto {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderDto {
  id: string;
  name: string;
  parentId: string | null;
  dataRoomId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileDto {
  id: string;
  name: string;
  folderId: string | null;
  dataRoomId: string;
  ownerId: string;
  sizeBytes: number;
  mimeType: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

/** Aggregate size/count of a folder subtree (or data room root). */
export interface FolderStats {
  totalSizeBytes: number;
  itemCount: number;
}

export interface FolderContentsDto {
  dataRoomId: string;
  folder: FolderDto | null;
  breadcrumbs: BreadcrumbItem[];
  folders: FolderDto[];
  files: FileDto[];
  nextCursor: string | null;
  /** Caller's effective role on this resource: OWNER when they own the data room. */
  role: ShareRole | "OWNER";
}

export interface ShareDto {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  ownerId: string;
  grantType: GrantType;
  granteeUserId: string | null;
  granteeEmail: string | null;
  token: string | null;
  role: ShareRole;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateDataRoomRequest {
  name: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId: string | null;
}

export interface RenameRequest {
  name: string;
}

export interface MoveFileRequest {
  folderId: string;
}

export interface CreateShareRequest {
  resourceType: ResourceType;
  resourceId: string;
  grantType: GrantType;
  /** Required when grantType = USER; the app resolves this to a user id. */
  granteeEmail?: string;
}

export interface SharedWithMeItemDto {
  shareId: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  dataRoomId: string;
  /** Folder to open the browser in for FOLDER/FILE shares (the file's parent for FILE). Null for DATA_ROOM or root-level items. */
  folderId: string | null;
  role: ShareRole;
  ownerName: string | null;
  ownerEmail: string;
  createdAt: string;
}

export interface NameConflictError {
  code: "NAME_CONFLICT";
  suggestedName: string;
}
