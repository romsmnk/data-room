import { Module } from "@nestjs/common";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";
import { AccessModule } from "../access/access.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [AccessModule, StorageModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
