import { IsEmail, IsIn, IsUUID, ValidateIf } from "class-validator";
import { GrantType, ResourceType } from "@data-room/shared";

export class CreateShareDto {
  @IsIn([ResourceType.DATA_ROOM, ResourceType.FOLDER, ResourceType.FILE])
  resourceType!: ResourceType;

  @IsUUID()
  resourceId!: string;

  @IsIn([GrantType.PUBLIC_LINK, GrantType.USER])
  grantType!: GrantType;

  @ValidateIf((o) => o.grantType === GrantType.USER)
  @IsEmail()
  granteeEmail?: string;
}
