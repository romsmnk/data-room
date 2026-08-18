import { Injectable, NotFoundException } from "@nestjs/common";
import { ResourceType } from "@data-room/shared";
import type { FolderStats } from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AccessService } from "../access/access.service";
import { toFolderDto } from "../common/mappers";
import { resolveNameConflict } from "../common/util/name-conflict";
import { NameConflictException } from "../common/exceptions/name-conflict.exception";

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AccessService,
  ) {}

  async create(userId: string, dto: { name: string; dataRoomId: string; parentId?: string; allowRename?: boolean }) {
    const parentId = dto.parentId ?? null;
    const role = parentId
      ? await this.access.getFolderAccess(userId, parentId)
      : await this.access.getDataRoomAccess(userId, dto.dataRoomId);
    this.access.requireAtLeast(role, "EDITOR");

    if (parentId) {
      const parent = await this.prisma.folder.findUnique({ where: { id: parentId } });
      if (parent?.dataRoomId !== dto.dataRoomId) throw new NotFoundException("Parent folder not found");
    }

    const name = await this.resolveName(dto.dataRoomId, parentId, dto.name, dto.allowRename);
    const folder = await this.prisma.folder.create({
      data: { name, parentId, dataRoomId: dto.dataRoomId, ownerId: userId },
    });
    return toFolderDto(folder);
  }

  async rename(userId: string, folderId: string, name: string, allowRename?: boolean) {
    const role = await this.access.getFolderAccess(userId, folderId);
    this.access.requireAtLeast(role, "EDITOR");

    const folder = await this.prisma.folder.findUniqueOrThrow({ where: { id: folderId } });
    const resolved = await this.resolveName(folder.dataRoomId, folder.parentId, name, allowRename, folderId);
    const updated = await this.prisma.folder.update({ where: { id: folderId }, data: { name: resolved } });
    return toFolderDto(updated);
  }

  async remove(userId: string, folderId: string) {
    const role = await this.access.getFolderAccess(userId, folderId);
    this.access.requireAtLeast(role, "EDITOR");

    const descendantFolderIds = await this.getDescendantFolderIds(folderId);
    const files = await this.prisma.file.findMany({
      where: { folderId: { in: descendantFolderIds } },
      select: { id: true, storageKey: true },
    });

    await this.prisma.$transaction([
      this.prisma.share.deleteMany({
        where: {
          OR: [
            { resourceType: ResourceType.FOLDER, resourceId: { in: descendantFolderIds } },
            { resourceType: ResourceType.FILE, resourceId: { in: files.map((f) => f.id) } },
          ],
        },
      }),
      this.prisma.folder.delete({ where: { id: folderId } }), // cascades subfolders + files
    ]);

    await this.storage.remove(files.map((f) => f.storageKey));
  }

  async getStats(userId: string, folderId: string): Promise<FolderStats> {
    const role = await this.access.getFolderAccess(userId, folderId);
    this.access.requireAtLeast(role, "VIEWER");

    const rows = await this.prisma.$queryRaw<{ folder_count: bigint; total_size: bigint; file_count: bigint }[]>`
      WITH RECURSIVE subtree AS (
        SELECT id FROM "Folder" WHERE id = ${folderId}
        UNION ALL
        SELECT f.id FROM "Folder" f JOIN subtree s ON f."parentId" = s.id
      ),
      file_agg AS (
        SELECT COALESCE(SUM("sizeBytes"), 0) AS total_size, COUNT(*) AS file_count
        FROM "File" WHERE "folderId" IN (SELECT id FROM subtree)
      )
      SELECT (SELECT COUNT(*) - 1 FROM subtree) AS folder_count, file_agg.total_size, file_agg.file_count FROM file_agg;
    `;
    const row = rows[0];
    return {
      totalSizeBytes: Number(row.total_size),
      itemCount: Number(row.folder_count) + Number(row.file_count),
    };
  }

  private async getDescendantFolderIds(folderId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT id FROM "Folder" WHERE id = ${folderId}
        UNION ALL
        SELECT f.id FROM "Folder" f JOIN subtree s ON f."parentId" = s.id
      )
      SELECT id FROM subtree;
    `;
    return rows.map((r) => r.id);
  }

  private async resolveName(
    dataRoomId: string,
    parentId: string | null,
    desiredName: string,
    allowRename?: boolean,
    excludeFolderId?: string,
  ): Promise<string> {
    const siblings = await this.prisma.folder.findMany({
      where: { dataRoomId, parentId, ...(excludeFolderId ? { id: { not: excludeFolderId } } : {}) },
      select: { name: true },
    });
    const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
    if (!taken.has(desiredName.toLowerCase())) return desiredName;

    const suggestion = resolveNameConflict(desiredName, taken);
    if (!allowRename) throw new NameConflictException(suggestion);
    return suggestion;
  }
}
