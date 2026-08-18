import { Controller, Get, Param, Query } from "@nestjs/common";
import { PublicService } from "./public.service";

@Controller("public/shares/:token")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get()
  info(@Param("token") token: string) {
    return this.publicService.getShareInfo(token);
  }

  @Get("items")
  items(
    @Param("token") token: string,
    @Query("folderId") folderId?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(200, Math.max(1, parseInt(limit, 10))) : 50;
    return this.publicService.listItems(token, folderId ?? null, cursor ?? null, parsedLimit);
  }

  @Get("files/:fileId/url")
  fileUrl(
    @Param("token") token: string,
    @Param("fileId") fileId: string,
    @Query("disposition") disposition?: "inline" | "attachment",
  ) {
    return this.publicService.getFileUrl(token, fileId, disposition === "attachment" ? "attachment" : "inline");
  }
}
