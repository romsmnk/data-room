import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AccessService } from "../access/access.service";
import { toFileDto } from "../common/mappers";
import { resolveNameConflict } from "../common/util/name-conflict";
import { NameConflictException } from "../common/exceptions/name-conflict.exception";

export interface UploadInput {
  dataRoomId: string;
  folderId: string | null;
  name: string;
  buffer: Buffer;
  mimeType: string;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AccessService,
  ) {}

  async upload(userId: string, input: UploadInput) {
    const role = input.folderId
      ? await this.access.getFolderAccess(userId, input.folderId)
      : await this.access.getDataRoomAccess(userId, input.dataRoomId);
    this.access.requireAtLeast(role, "EDITOR");

    if (input.folderId) {
      const folder = await this.prisma.folder.findUnique({ where: { id: input.folderId } });
      if (folder?.dataRoomId !== input.dataRoomId) throw new NotFoundException("Folder not found");
    }

    // Uploads never block on a naming collision — silently de-duplicate, like Drive.
    const name = await this.resolveName(input.dataRoomId, input.folderId, input.name, true);

    const id = randomUUID();
    const storageKey = `${input.dataRoomId}/${id}`;
    await this.storage.upload(storageKey, input.buffer, input.mimeType);

    const file = await this.prisma.file.create({
      data: {
        id,
        name,
        folderId: input.folderId,
        dataRoomId: input.dataRoomId,
        ownerId: userId,
        storageKey,
        sizeBytes: input.buffer.byteLength,
        mimeType: input.mimeType,
      },
    });
    return toFileDto(file);
  }

  async rename(userId: string, fileId: string, name: string, allowRename?: boolean) {
    const role = await this.access.getFileAccess(userId, fileId);
    this.access.requireAtLeast(role, "EDITOR");

    const file = await this.prisma.file.findUniqueOrThrow({ where: { id: fileId } });
    const resolved = await this.resolveName(file.dataRoomId, file.folderId, name, allowRename, fileId);
    const updated = await this.prisma.file.update({ where: { id: fileId }, data: { name: resolved } });
    return toFileDto(updated);
  }

  async move(userId: string, fileId: string, targetFolderId: string | null) {
    const fileRole = await this.access.getFileAccess(userId, fileId);
    this.access.requireAtLeast(fileRole, "EDITOR");

    const file = await this.prisma.file.findUniqueOrThrow({ where: { id: fileId } });
    if (targetFolderId === file.folderId) return toFileDto(file);

    const targetRole = targetFolderId
      ? await this.access.getFolderAccess(userId, targetFolderId)
      : await this.access.getDataRoomAccess(userId, file.dataRoomId);
    this.access.requireAtLeast(targetRole, "EDITOR");

    if (targetFolderId) {
      const target = await this.prisma.folder.findUnique({ where: { id: targetFolderId } });
      if (!target || target.dataRoomId !== file.dataRoomId) {
        throw new BadRequestException("Cannot move a file across data rooms");
      }
    }

    const name = await this.resolveName(file.dataRoomId, targetFolderId, file.name, true, fileId);
    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: { folderId: targetFolderId, name },
    });
    return toFileDto(updated);
  }

  async remove(userId: string, fileId: string) {
    const role = await this.access.getFileAccess(userId, fileId);
    this.access.requireAtLeast(role, "EDITOR");

    const file = await this.prisma.file.findUniqueOrThrow({ where: { id: fileId } });
    await this.prisma.$transaction([
      this.prisma.share.deleteMany({ where: { resourceType: "FILE", resourceId: fileId } }),
      this.prisma.file.delete({ where: { id: fileId } }),
    ]);
    await this.storage.remove([file.storageKey]);
  }

  async getUrl(userId: string, fileId: string, disposition: "inline" | "attachment") {
    const role = await this.access.getFileAccess(userId, fileId);
    this.access.requireAtLeast(role, "VIEWER");

    const file = await this.prisma.file.findUniqueOrThrow({ where: { id: fileId } });
    const url = await this.storage.getSignedUrl(file.storageKey, file.name, disposition);
    return { url };
  }

  private async resolveName(
    dataRoomId: string,
    folderId: string | null,
    desiredName: string,
    allowRename?: boolean,
    excludeFileId?: string,
  ): Promise<string> {
    const siblings = await this.prisma.file.findMany({
      where: { dataRoomId, folderId, ...(excludeFileId ? { id: { not: excludeFileId } } : {}) },
      select: { name: true },
    });
    const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
    if (!taken.has(desiredName.toLowerCase())) return desiredName;

    const suggestion = resolveNameConflict(desiredName, taken);
    if (!allowRename) throw new NameConflictException(suggestion);
    return suggestion;
  }
}
