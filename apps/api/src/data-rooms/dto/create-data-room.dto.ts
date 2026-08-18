import { IsString, Length } from "class-validator";

export class CreateDataRoomDto {
  @IsString()
  @Length(1, 255)
  name!: string;
}
