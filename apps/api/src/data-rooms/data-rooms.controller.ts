import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.guard";
import { DataRoomsService } from "./data-rooms.service";
import { CreateDataRoomDto } from "./dto/create-data-room.dto";
import { RenameDto } from "../common/dto/rename.dto";
import { ListItemsQuery } from "./dto/list-items.query";

@UseGuards(AuthGuard)
@Controller("data-rooms")
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRooms.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDataRoomDto) {
    return this.dataRooms.create(user.id, dto.name);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.dataRooms.get(user.id, id);
  }

  @Patch(":id")
  rename(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: RenameDto) {
    return this.dataRooms.rename(user.id, id, dto.name);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.dataRooms.remove(user.id, id);
  }

  @Get(":id/stats")
  stats(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.dataRooms.getStats(user.id, id);
  }

  @Get(":id/items")
  items(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Query() query: ListItemsQuery) {
    return this.dataRooms.listItems(user.id, id, query.folderId ?? null, query.cursor ?? null, query.limit ?? 50);
  }
}
