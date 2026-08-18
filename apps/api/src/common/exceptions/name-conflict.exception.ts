import { ConflictException } from "@nestjs/common";

export class NameConflictException extends ConflictException {
  constructor(suggestedName: string) {
    super({ code: "NAME_CONFLICT", suggestedName, message: `A name conflict occurred` });
  }
}
