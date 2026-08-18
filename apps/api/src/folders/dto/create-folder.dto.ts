import { IsBoolean, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateFolderDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsUUID()
  dataRoomId!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  allowRename?: boolean;
}
