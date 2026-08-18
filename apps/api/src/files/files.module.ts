import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { AuthModule } from "../auth/auth.module";
import { AccessModule } from "../access/access.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [AuthModule, AccessModule, StorageModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
