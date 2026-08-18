import type { DataRoom, File, Folder, Share } from "@prisma/client";
import type { DataRoomDto, FileDto, FolderDto, ShareDto } from "@data-room/shared";

export function toDataRoomDto(room: DataRoom): DataRoomDto {
  return {
    id: room.id,
    name: room.name,
    ownerId: room.ownerId,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export function toFolderDto(folder: Folder): FolderDto {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    dataRoomId: folder.dataRoomId,
    ownerId: folder.ownerId,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

export function toFileDto(file: File): FileDto {
  return {
    id: file.id,
    name: file.name,
    folderId: file.folderId,
    dataRoomId: file.dataRoomId,
    ownerId: file.ownerId,
    sizeBytes: file.sizeBytes,
    mimeType: file.mimeType,
    version: file.version,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

export function toShareDto(share: Share, resourceName: string): ShareDto {
  return {
    id: share.id,
    resourceType: share.resourceType,
    resourceId: share.resourceId,
    resourceName,
    ownerId: share.ownerId,
    grantType: share.grantType,
    granteeUserId: share.granteeUserId,
    granteeEmail: share.granteeEmail,
    token: share.token,
    role: share.role,
    createdAt: share.createdAt.toISOString(),
    revokedAt: share.revokedAt ? share.revokedAt.toISOString() : null,
  };
}
