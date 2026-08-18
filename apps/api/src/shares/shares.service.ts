import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { GrantType, ResourceType, ShareRole } from "@data-room/shared";
import type { SharedWithMeItemDto } from "@data-room/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toShareDto } from "../common/mappers";

interface ResourceInfo {
  name: string;
  dataRoomId: string;
  ownerId: string;
}

@Injectable()
export class SharesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    dto: { resourceType: ResourceType; resourceId: string; grantType: GrantType; granteeEmail?: string },
  ) {
    const resource = await this.resolveResource(dto.resourceType, dto.resourceId);
    if (!resource) throw new NotFoundException("Resource not found");
    if (resource.ownerId !== ownerId) throw new ForbiddenException("Only the owner can share this item");

    let granteeUserId: string | null = null;
    let granteeEmail: string | null = null;
    if (dto.grantType === GrantType.USER) {
      const email = dto.granteeEmail!.toLowerCase().trim();
      const me = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { email: true } });
      if (me?.email.toLowerCase() === email) {
        throw new BadRequestException("You already have access to your own item");
      }
      granteeEmail = email;
      const grantee = await this.prisma.user.findUnique({ where: { email } });
      granteeUserId = grantee?.id ?? null;
    }

    const share = await this.prisma.share.create({
      data: {
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        ownerId,
        grantType: dto.grantType,
        granteeUserId,
        granteeEmail,
        token: dto.grantType === GrantType.PUBLIC_LINK ? randomUUID() : null,
        // MVP grants are always read-only; the field stays EDITOR-capable in
        // the schema so per-user roles are additive later (see README).
        role: ShareRole.VIEWER,
      },
    });
    return toShareDto(share, resource.name);
  }

  async listForResource(ownerId: string, resourceType: ResourceType, resourceId: string) {
    const resource = await this.resolveResource(resourceType, resourceId);
    if (!resource) throw new NotFoundException("Resource not found");
    if (resource.ownerId !== ownerId) throw new ForbiddenException();

    const shares = await this.prisma.share.findMany({
      where: { resourceType, resourceId, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return shares.map((s) => toShareDto(s, resource.name));
  }

  async revoke(ownerId: string, shareId: string) {
    const share = await this.prisma.share.findUnique({ where: { id: shareId } });
    if (!share) throw new NotFoundException();
    if (share.ownerId !== ownerId) throw new ForbiddenException();
    await this.prisma.share.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
  }

  async listSharedWithMe(userId: string): Promise<SharedWithMeItemDto[]> {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    const shares = await this.prisma.share.findMany({
      where: {
        revokedAt: null,
        grantType: GrantType.USER,
        OR: [{ granteeUserId: userId }, { granteeEmail: me.email }],
      },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    const items: SharedWithMeItemDto[] = [];
    for (const share of shares) {
      const resource = await this.resolveResource(share.resourceType, share.resourceId);
      if (!resource) continue; // resource was deleted since the share was granted
      const folderId = await this.folderIdFor(share.resourceType, share.resourceId);
      items.push({
        shareId: share.id,
        resourceType: share.resourceType,
        resourceId: share.resourceId,
        resourceName: resource.name,
        dataRoomId: resource.dataRoomId,
        folderId,
        role: share.role,
        ownerName: share.owner.name,
        ownerEmail: share.owner.email,
        createdAt: share.createdAt.toISOString(),
      });
    }
    return items;
  }

  private async folderIdFor(resourceType: ResourceType, resourceId: string): Promise<string | null> {
    if (resourceType === ResourceType.DATA_ROOM) return null;
    if (resourceType === ResourceType.FOLDER) return resourceId;
    const file = await this.prisma.file.findUnique({ where: { id: resourceId }, select: { folderId: true } });
    return file?.folderId ?? null;
  }

  private async resolveResource(resourceType: ResourceType, resourceId: string): Promise<ResourceInfo | null> {
    if (resourceType === ResourceType.DATA_ROOM) {
      const room = await this.prisma.dataRoom.findUnique({ where: { id: resourceId } });
      return room && { name: room.name, dataRoomId: room.id, ownerId: room.ownerId };
    }
    if (resourceType === ResourceType.FOLDER) {
      const folder = await this.prisma.folder.findUnique({ where: { id: resourceId } });
      return folder && { name: folder.name, dataRoomId: folder.dataRoomId, ownerId: folder.ownerId };
    }
    const file = await this.prisma.file.findUnique({ where: { id: resourceId } });
    return file && { name: file.name, dataRoomId: file.dataRoomId, ownerId: file.ownerId };
  }
}
