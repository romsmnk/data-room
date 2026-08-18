-- Prisma's `@@unique` treats NULLs as distinct, so it only guards sibling
-- name collisions when parentId/folderId is set. These partial indexes
-- close the gap for items that live at the data room root.
CREATE UNIQUE INDEX "Folder_root_name_unique" ON "Folder" ("dataRoomId", "name") WHERE "parentId" IS NULL;
CREATE UNIQUE INDEX "File_root_name_unique" ON "File" ("dataRoomId", "name") WHERE "folderId" IS NULL;
