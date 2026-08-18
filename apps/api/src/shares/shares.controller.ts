import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ResourceType } from "@data-room/shared";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.guard";
import { SharesService } from "./shares.service";
import { CreateShareDto } from "./dto/create-share.dto";

@UseGuards(AuthGuard)
@Controller("shares")
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Get("shared-with-me")
  sharedWithMe(@CurrentUser() user: AuthenticatedUser) {
    return this.shares.listSharedWithMe(user.id);
  }

  @Get()
  listForResource(
    @CurrentUser() user: AuthenticatedUser,
    @Query("resourceType") resourceType: ResourceType,
    @Query("resourceId") resourceId: string,
  ) {
    return this.shares.listForResource(user.id, resourceType, resourceId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShareDto) {
    return this.shares.create(user.id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async revoke(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.shares.revoke(user.id, id);
  }
}
