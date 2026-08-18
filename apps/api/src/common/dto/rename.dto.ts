import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class RenameDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  /** If true and `name` collides, the server auto-appends " (1)" instead of returning 409. */
  @IsOptional()
  @IsBoolean()
  allowRename?: boolean;
}
