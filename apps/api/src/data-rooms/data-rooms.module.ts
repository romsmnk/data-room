import { Module } from "@nestjs/common";
import { DataRoomsController } from "./data-rooms.controller";
import { DataRoomsService } from "./data-rooms.service";
import { AuthModule } from "../auth/auth.module";
import { AccessModule } from "../access/access.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [AuthModule, AccessModule, StorageModule],
  controllers: [DataRoomsController],
  providers: [DataRoomsService],
  exports: [DataRoomsService],
})
export class DataRoomsModule {}
