import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { AuthModule } from "./auth/auth.module";
import { AccessModule } from "./access/access.module";
import { StorageModule } from "./storage/storage.module";
import { DataRoomsModule } from "./data-rooms/data-rooms.module";
import { FoldersModule } from "./folders/folders.module";
import { FilesModule } from "./files/files.module";
import { SharesModule } from "./shares/shares.module";
import { PublicModule } from "./public/public.module";

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    AuthModule,
    AccessModule,
    StorageModule,
    DataRoomsModule,
    FoldersModule,
    FilesModule,
    SharesModule,
    PublicModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
