import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.guard";
import { FilesService } from "./files.service";
import { RenameDto } from "../common/dto/rename.dto";
import { MoveFileDto } from "./dto/move-file.dto";

@UseGuards(AuthGuard)
@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("upload")
  async upload(@CurrentUser() user: AuthenticatedUser, @Req() req: FastifyRequest) {
    const part = await req.file();
    if (!part) throw new BadRequestException("No file provided");

    const dataRoomId = fieldValue(part.fields, "dataRoomId");
    const folderId = fieldValue(part.fields, "folderId");
    if (!dataRoomId) throw new BadRequestException("dataRoomId is required");

    const buffer = await part.toBuffer();
    return this.files.upload(user.id, {
      dataRoomId,
      folderId: folderId || null,
      name: part.filename,
      buffer,
      mimeType: part.mimetype || "application/octet-stream",
    });
  }

  @Get(":id/url")
  getUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("disposition") disposition?: "inline" | "attachment",
  ) {
    return this.files.getUrl(user.id, id, disposition === "attachment" ? "attachment" : "inline");
  }

  @Patch(":id")
  rename(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: RenameDto) {
    return this.files.rename(user.id, id, dto.name, dto.allowRename);
  }

  @Post(":id/move")
  move(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: MoveFileDto) {
    return this.files.move(user.id, id, dto.folderId ?? null);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.files.remove(user.id, id);
  }
}

function fieldValue(fields: Record<string, unknown>, key: string): string | undefined {
  const field = fields[key];
  if (!field) return undefined;
  const candidate = Array.isArray(field) ? field[0] : field;
  return typeof candidate === "object" && candidate !== null && "value" in candidate
    ? String((candidate as { value: unknown }).value)
    : undefined;
}
