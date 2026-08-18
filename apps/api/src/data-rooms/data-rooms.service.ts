import { Injectable, NotFoundException } from "@nestjs/common";
import { ResourceType } from "@data-room/shared";
import type { BreadcrumbItem, FolderContentsDto, FolderStats } from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AccessService } from "../access/access.service";
import { toDataRoomDto, toFileDto, toFolderDto } from "../common/mappers";

@Injectable()
export class DataRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AccessService,
  ) {}

  async create(ownerId: string, name: string) {
    const room = await this.prisma.dataRoom.create({ data: { name, ownerId } });
    return toDataRoomDto(room);
  }

  async listForUser(userId: string) {
    const [owned, sharedRows] = await Promise.all([
      this.prisma.dataRoom.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" } }),
      this.prisma.share.findMany({
        where: {
          revokedAt: null,
          grantType: "USER",
          resourceType: ResourceType.DATA_ROOM,
          OR: [{ granteeUserId: userId }],
        },
      }),
    ]);

    // Also match shares granted by email before the grantee had an account.
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const byEmail = me
      ? await this.prisma.share.findMany({
          where: {
            revokedAt: null,
            grantType: "USER",
            resourceType: ResourceType.DATA_ROOM,
            granteeEmail: me.email,
          },
        })
      : [];

    const shareResourceIds = [...new Set([...sharedRows, ...byEmail].map((s) => s.resourceId))];
    const sharedRooms = shareResourceIds.length
      ? await this.prisma.dataRoom.findMany({ where: { id: { in: shareResourceIds } } })
      : [];

    return {
      owned: owned.map(toDataRoomDto),
      shared: sharedRooms.map(toDataRoomDto),
    };
  }

  async get(userId: string, dataRoomId: string) {
    const role = await this.access.getDataRoomAccess(userId, dataRoomId);
    this.access.requireAtLeast(role, "VIEWER");
    const room = await this.prisma.dataRoom.findUniqueOrThrow({ where: { id: dataRoomId } });
    return { ...toDataRoomDto(room), role };
  }

  async rename(userId: string, dataRoomId: string, name: string) {
    const role = await this.access.getDataRoomAccess(userId, dataRoomId);
    this.access.requireAtLeast(role, "EDITOR");
    const room = await this.prisma.dataRoom.update({ where: { id: dataRoomId }, data: { name } });
    return toDataRoomDto(room);
  }

  async remove(userId: string, dataRoomId: string) {
    const role = await this.access.getDataRoomAccess(userId, dataRoomId);
    this.access.requireAtLeast(role, "OWNER");

    const files = await this.prisma.file.findMany({
      where: { dataRoomId },
      select: { id: true, storageKey: true },
    });

    await this.prisma.$transaction([
      this.prisma.share.deleteMany({
        where: {
          OR: [
            { resourceType: ResourceType.DATA_ROOM, resourceId: dataRoomId },
            { resourceType: ResourceType.FOLDER, resourceId: { in: await this.allFolderIds(dataRoomId) } },
            { resourceType: ResourceType.FILE, resourceId: { in: files.map((f) => f.id) } },
          ],
        },
      }),
      this.prisma.dataRoom.delete({ where: { id: dataRoomId } }), // cascades folders + files
    ]);

    await this.storage.remove(files.map((f) => f.storageKey));
  }

  async getStats(userId: string, dataRoomId: string): Promise<FolderStats> {
    const role = await this.access.getDataRoomAccess(userId, dataRoomId);
    this.access.requireAtLeast(role, "VIEWER");

    const rows = await this.prisma.$queryRaw<{ folder_count: bigint; total_size: bigint; file_count: bigint }[]>`
      WITH RECURSIVE subtree AS (
        SELECT id FROM "Folder" WHERE "dataRoomId" = ${dataRoomId} AND "parentId" IS NULL
        UNION ALL
        SELECT f.id FROM "Folder" f JOIN subtree s ON f."parentId" = s.id
      )
      SELECT
        (SELECT COUNT(*) FROM subtree) AS folder_count,
        (SELECT COALESCE(SUM("sizeBytes"), 0) FROM "File" WHERE "dataRoomId" = ${dataRoomId}) AS total_size,
        (SELECT COUNT(*) FROM "File" WHERE "dataRoomId" = ${dataRoomId}) AS file_count;
    `;
    const row = rows[0];
    return {
      totalSizeBytes: Number(row.total_size),
      itemCount: Number(row.folder_count) + Number(row.file_count),
    };
  }

  async listItems(
    userId: string,
    dataRoomId: string,
    folderId: string | null,
    cursor: string | null,
    limit: number,
  ): Promise<FolderContentsDto> {
    let role;
    let folder = null;
    if (folderId) {
      folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder || folder.dataRoomId !== dataRoomId) throw new NotFoundException("Folder not found");
      role = await this.access.getFolderAccess(userId, folderId);
    } else {
      role = await this.access.getDataRoomAccess(userId, dataRoomId);
    }
    this.access.requireAtLeast(role, "VIEWER");

    const [folders, filesPage, breadcrumbs] = await Promise.all([
      this.prisma.folder.findMany({
        where: { dataRoomId, parentId: folderId },
        orderBy: { name: "asc" },
      }),
      this.prisma.file.findMany({
        where: { dataRoomId, folderId },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      this.buildBreadcrumbs(dataRoomId, folderId),
    ]);

    const hasMore = filesPage.length > limit;
    const files = hasMore ? filesPage.slice(0, limit) : filesPage;

    return {
      dataRoomId,
      folder: folder ? toFolderDto(folder) : null,
      breadcrumbs,
      folders: folders.map(toFolderDto),
      files: files.map(toFileDto),
      nextCursor: hasMore ? files[files.length - 1].id : null,
      role,
    };
  }

  private async buildBreadcrumbs(dataRoomId: string, folderId: string | null): Promise<BreadcrumbItem[]> {
    const room = await this.prisma.dataRoom.findUniqueOrThrow({
      where: { id: dataRoomId },
      select: { name: true },
    });
    const crumbs: BreadcrumbItem[] = [{ id: null, name: room.name }];
    if (!folderId) return crumbs;

    const rows = await this.prisma.$queryRaw<{ id: string; name: string; depth: number }[]>`
      WITH RECURSIVE ancestors AS (
        SELECT id, name, "parentId", 0 AS depth FROM "Folder" WHERE id = ${folderId}
        UNION ALL
        SELECT f.id, f.name, f."parentId", a.depth + 1 FROM "Folder" f JOIN ancestors a ON f.id = a."parentId"
      )
      SELECT id, name, depth FROM ancestors ORDER BY depth DESC;
    `;
    crumbs.push(...rows.map((r) => ({ id: r.id, name: r.name })));
    return crumbs;
  }

  private async allFolderIds(dataRoomId: string): Promise<string[]> {
    const rows = await this.prisma.folder.findMany({ where: { dataRoomId }, select: { id: true } });
    return rows.map((r) => r.id);
  }
}
