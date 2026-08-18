import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.guard";
import { FoldersService } from "./folders.service";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { RenameDto } from "../common/dto/rename.dto";

@UseGuards(AuthGuard)
@Controller("folders")
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFolderDto) {
    return this.folders.create(user.id, dto);
  }

  @Patch(":id")
  rename(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: RenameDto) {
    return this.folders.rename(user.id, id, dto.name, dto.allowRename);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.folders.remove(user.id, id);
  }

  @Get(":id/stats")
  stats(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.folders.getStats(user.id, id);
  }
}
