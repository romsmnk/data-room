import { BadRequestException, GoneException, Injectable, NotFoundException } from "@nestjs/common";
import { GrantType, ResourceType } from "@data-room/shared";
import type { BreadcrumbItem, FolderContentsDto } from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AccessService } from "../access/access.service";
import { toFileDto, toFolderDto } from "../common/mappers";

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AccessService,
  ) {}

  async getShareInfo(token: string) {
    const share = await this.resolveShare(token);
    const resource = await this.resolveResourceMeta(share.resourceType, share.resourceId);
    if (!resource) throw new GoneException("This item is no longer available");
    return {
      resourceType: share.resourceType,
      resourceId: share.resourceId,
      resourceName: resource.name,
      dataRoomId: resource.dataRoomId,
      isFile: share.resourceType === ResourceType.FILE,
    };
  }

  async listItems(
    token: string,
    folderId: string | null,
    cursor: string | null,
    limit: number,
  ): Promise<FolderContentsDto> {
    const share = await this.resolveShare(token);
    if (share.resourceType === ResourceType.FILE) {
      throw new BadRequestException("This share points to a single file");
    }

    const dataRoomId = await this.dataRoomIdFor(share.resourceType, share.resourceId);
    const targetFolderId = folderId ?? (share.resourceType === ResourceType.FOLDER ? share.resourceId : null);

    if (targetFolderId) {
      const withinScope = await this.isWithinShare(share, targetFolderId);
      if (!withinScope) throw new NotFoundException("Folder not found");
    }

    let folder = null;
    if (targetFolderId) {
      folder = await this.prisma.folder.findUnique({ where: { id: targetFolderId } });
      if (!folder) throw new NotFoundException("Folder not found");
    }

    const [folders, filesPage] = await Promise.all([
      this.prisma.folder.findMany({ where: { dataRoomId, parentId: targetFolderId }, orderBy: { name: "asc" } }),
      this.prisma.file.findMany({
        where: { dataRoomId, folderId: targetFolderId },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    ]);
    const hasMore = filesPage.length > limit;
    const files = hasMore ? filesPage.slice(0, limit) : filesPage;

    return {
      dataRoomId,
      folder: folder ? toFolderDto(folder) : null,
      breadcrumbs: await this.buildBreadcrumbs(share, targetFolderId),
      folders: folders.map(toFolderDto),
      files: files.map(toFileDto),
      nextCursor: hasMore ? files[files.length - 1].id : null,
      role: "VIEWER",
    };
  }

  async getFileUrl(token: string, fileId: string, disposition: "inline" | "attachment") {
    const share = await this.resolveShare(token);
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException("File not found");

    const allowed =
      (share.resourceType === ResourceType.FILE && share.resourceId === fileId) ||
      (share.resourceType === ResourceType.DATA_ROOM && share.resourceId === file.dataRoomId) ||
      (share.resourceType === ResourceType.FOLDER && file.folderId !== null && (await this.isWithinShare(share, file.folderId)));
    if (!allowed) throw new NotFoundException("File not found");

    const url = await this.storage.getSignedUrl(file.storageKey, file.name, disposition);
    return { url };
  }

  private async isWithinShare(share: { resourceType: ResourceType; resourceId: string }, folderId: string) {
    if (share.resourceType === ResourceType.DATA_ROOM) {
      const folder = await this.prisma.folder.findUnique({ where: { id: folderId }, select: { dataRoomId: true } });
      return folder?.dataRoomId === share.resourceId;
    }
    if (share.resourceType === ResourceType.FOLDER) {
      if (folderId === share.resourceId) return true;
      const ancestorIds = await this.access.getAncestorFolderIds(folderId);
      return ancestorIds.includes(share.resourceId);
    }
    return false;
  }

  private async resolveShare(token: string) {
    const share = await this.prisma.share.findFirst({
      where: { token, grantType: GrantType.PUBLIC_LINK, revokedAt: null },
    });
    if (!share) throw new NotFoundException("This link is invalid or has been revoked");
    return share;
  }

  private async resolveResourceMeta(resourceType: ResourceType, resourceId: string) {
    if (resourceType === ResourceType.DATA_ROOM) {
      const room = await this.prisma.dataRoom.findUnique({ where: { id: resourceId } });
      return room && { name: room.name, dataRoomId: room.id };
    }
    if (resourceType === ResourceType.FOLDER) {
      const folder = await this.prisma.folder.findUnique({ where: { id: resourceId } });
      return folder && { name: folder.name, dataRoomId: folder.dataRoomId };
    }
    const file = await this.prisma.file.findUnique({ where: { id: resourceId } });
    return file && { name: file.name, dataRoomId: file.dataRoomId };
  }

  private async dataRoomIdFor(resourceType: ResourceType, resourceId: string): Promise<string> {
    const meta = await this.resolveResourceMeta(resourceType, resourceId);
    if (!meta) throw new GoneException("This item is no longer available");
    return meta.dataRoomId;
  }

  private async buildBreadcrumbs(
    share: { resourceType: ResourceType; resourceId: string },
    folderId: string | null,
  ): Promise<BreadcrumbItem[]> {
    if (share.resourceType === ResourceType.DATA_ROOM) {
      const room = await this.prisma.dataRoom.findUniqueOrThrow({
        where: { id: share.resourceId },
        select: { name: true },
      });
      const crumbs: BreadcrumbItem[] = [{ id: null, name: room.name }];
      if (!folderId) return crumbs;
      crumbs.push(...(await this.ancestorChain(folderId)));
      return crumbs;
    }

    if (!folderId || folderId === share.resourceId) {
      const folder = await this.prisma.folder.findUniqueOrThrow({ where: { id: share.resourceId } });
      return [{ id: folder.id, name: folder.name }];
    }
    const chain = await this.ancestorChain(folderId);
    const rootIndex = chain.findIndex((c) => c.id === share.resourceId);
    return rootIndex === -1 ? chain : chain.slice(rootIndex);
  }

  private async ancestorChain(folderId: string): Promise<BreadcrumbItem[]> {
    const rows = await this.prisma.$queryRaw<{ id: string; name: string; depth: number }[]>`
      WITH RECURSIVE ancestors AS (
        SELECT id, name, "parentId", 0 AS depth FROM "Folder" WHERE id = ${folderId}
        UNION ALL
        SELECT f.id, f.name, f."parentId", a.depth + 1 FROM "Folder" f JOIN ancestors a ON f.id = a."parentId"
      )
      SELECT id, name, depth FROM ancestors ORDER BY depth DESC;
    `;
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }
}
