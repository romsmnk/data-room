import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ResourceType } from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";

export type EffectiveRole = "OWNER" | "EDITOR" | "VIEWER";

const RANK: Record<EffectiveRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

/**
 * Central permission resolver. Two directions on purpose:
 *  - access checks walk UP the tree (file -> folder chain -> data room),
 *    which is cheap because tree depth is small and bounded by the UI.
 *  - subtree stats (see FoldersService/DataRoomsService) walk DOWN, which is
 *    the expensive direction once a room has many descendants — see the
 *    "How it scales" section in the README for where that splits from MVP.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  hasAtLeast(role: EffectiveRole | null, minimum: EffectiveRole): boolean {
    return role !== null && RANK[role] >= RANK[minimum];
  }

  requireAtLeast(role: EffectiveRole | null, minimum: EffectiveRole): asserts role is EffectiveRole {
    if (role === null) throw new NotFoundException();
    if (!this.hasAtLeast(role, minimum)) throw new ForbiddenException();
  }

  async getDataRoomAccess(userId: string, dataRoomId: string): Promise<EffectiveRole | null> {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: dataRoomId },
      select: { ownerId: true },
    });
    if (!room) return null;
    if (room.ownerId === userId) return "OWNER";
    return this.findShareRole(userId, [{ type: ResourceType.DATA_ROOM, id: dataRoomId }]);
  }

  async getFolderAccess(userId: string, folderId: string): Promise<EffectiveRole | null> {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { ownerId: true, dataRoomId: true },
    });
    if (!folder) return null;
    if (folder.ownerId === userId) return "OWNER";

    const ancestorIds = await this.getAncestorFolderIds(folderId);
    const resources: { type: ResourceType; id: string }[] = [
      { type: ResourceType.DATA_ROOM, id: folder.dataRoomId },
      ...ancestorIds.map((id) => ({ type: ResourceType.FOLDER, id })),
    ];
    return this.findShareRole(userId, resources);
  }

  async getFileAccess(userId: string, fileId: string): Promise<EffectiveRole | null> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { ownerId: true, dataRoomId: true, folderId: true },
    });
    if (!file) return null;
    if (file.ownerId === userId) return "OWNER";

    const ancestorIds = file.folderId ? await this.getAncestorFolderIds(file.folderId) : [];
    const resources: { type: ResourceType; id: string }[] = [
      { type: ResourceType.DATA_ROOM, id: file.dataRoomId },
      ...ancestorIds.map((id) => ({ type: ResourceType.FOLDER, id })),
      { type: ResourceType.FILE, id: fileId },
    ];
    return this.findShareRole(userId, resources);
  }

  /** Folder ids from `folderId` up to (and including) the root folder, root-most last excluded (no synthetic root row). */
  async getAncestorFolderIds(folderId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE ancestors AS (
        SELECT id, "parentId" FROM "Folder" WHERE id = ${folderId}
        UNION ALL
        SELECT f.id, f."parentId" FROM "Folder" f JOIN ancestors a ON f.id = a."parentId"
      )
      SELECT id FROM ancestors;
    `;
    return rows.map((r) => r.id);
  }

  private async findShareRole(
    userId: string,
    resources: { type: ResourceType; id: string }[],
  ): Promise<EffectiveRole | null> {
    if (resources.length === 0) return null;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

    const shares = await this.prisma.share.findMany({
      where: {
        revokedAt: null,
        grantType: "USER",
        AND: [
          { OR: [{ granteeUserId: userId }, ...(user ? [{ granteeEmail: user.email }] : [])] },
          { OR: resources.map((r) => ({ resourceType: r.type, resourceId: r.id })) },
        ],
      },
      select: { role: true },
    });

    if (shares.length === 0) return null;
    return shares.some((s) => s.role === "EDITOR") ? "EDITOR" : "VIEWER";
  }
}
