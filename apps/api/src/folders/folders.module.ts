import { Module } from "@nestjs/common";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";
import { AuthModule } from "../auth/auth.module";
import { AccessModule } from "../access/access.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [AuthModule, AccessModule, StorageModule],
  controllers: [FoldersController],
  providers: [FoldersService],
})
export class FoldersModule {}
