import type {
  CreateShareRequest,
  DataRoomDto,
  FileDto,
  FolderContentsDto,
  FolderDto,
  FolderStats,
  ShareDto,
  SharedWithMeItemDto,
} from "@data-room/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const API_URL = import.meta.env.VITE_API_URL;

// --- Data Rooms ---

export function listDataRooms() {
  return apiGet<{ owned: DataRoomDto[]; shared: DataRoomDto[] }>("/data-rooms");
}

export function createDataRoom(name: string) {
  return apiPost<DataRoomDto>("/data-rooms", { name });
}

export function getDataRoom(id: string) {
  return apiGet<DataRoomDto & { role: string }>(`/data-rooms/${id}`);
}

export function renameDataRoom(id: string, name: string) {
  return apiPatch<DataRoomDto>(`/data-rooms/${id}`, { name });
}

export function deleteDataRoom(id: string) {
  return apiDelete<void>(`/data-rooms/${id}`);
}

export function getDataRoomStats(id: string) {
  return apiGet<FolderStats>(`/data-rooms/${id}/stats`);
}

export function listItems(dataRoomId: string, folderId: string | null, cursor?: string | null) {
  const params = new URLSearchParams();
  if (folderId) params.set("folderId", folderId);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return apiGet<FolderContentsDto>(`/data-rooms/${dataRoomId}/items${qs ? `?${qs}` : ""}`);
}

// --- Folders ---

export function createFolder(input: { name: string; dataRoomId: string; parentId: string | null; allowRename?: boolean }) {
  return apiPost<FolderDto>("/folders", input);
}

export function renameFolder(id: string, name: string, allowRename?: boolean) {
  return apiPatch<FolderDto>(`/folders/${id}`, { name, allowRename });
}

export function deleteFolder(id: string) {
  return apiDelete<void>(`/folders/${id}`);
}

export function getFolderStats(id: string) {
  return apiGet<FolderStats>(`/folders/${id}/stats`);
}

// --- Files ---

export function renameFile(id: string, name: string, allowRename?: boolean) {
  return apiPatch<FileDto>(`/files/${id}`, { name, allowRename });
}

export function moveFile(id: string, folderId: string | null) {
  return apiPost<FileDto>(`/files/${id}/move`, { folderId });
}

export function deleteFile(id: string) {
  return apiDelete<void>(`/files/${id}`);
}

export async function getFileUrl(id: string, disposition: "inline" | "attachment" = "inline") {
  return apiGet<{ url: string }>(`/files/${id}/url?disposition=${disposition}`);
}

export interface UploadProgressHandlers {
  onProgress?: (fraction: number) => void;
}

/** XHR (not fetch) so we get real per-file upload progress events. */
export function uploadFile(
  input: { file: File; dataRoomId: string; folderId: string | null },
  handlers: UploadProgressHandlers = {},
): { promise: Promise<FileDto>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<FileDto>((resolve, reject) => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const form = new FormData();
      form.append("dataRoomId", input.dataRoomId);
      if (input.folderId) form.append("folderId", input.folderId);
      // File must be appended last: the backend reads fields in stream order.
      form.append("file", input.file, input.file.name);

      xhr.open("POST", `${API_URL}/files/upload`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) handlers.onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => {
        try {
          const body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
          if (xhr.status >= 200 && xhr.status < 300) resolve(body as FileDto);
          else reject(new Error(body?.message ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload cancelled"));
      xhr.send(form);
    })();
  });
  return { promise, abort: () => xhr.abort() };
}

// --- Shares ---

export function createShare(input: CreateShareRequest) {
  return apiPost<ShareDto>("/shares", input);
}

export function listSharesForResource(resourceType: string, resourceId: string) {
  return apiGet<ShareDto[]>(`/shares?resourceType=${resourceType}&resourceId=${resourceId}`);
}

export function revokeShare(id: string) {
  return apiDelete<void>(`/shares/${id}`);
}

export function listSharedWithMe() {
  return apiGet<SharedWithMeItemDto[]>("/shares/shared-with-me");
}

// --- Public (no auth) ---

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  const body = await res.json().catch(() => undefined);
  if (!res.ok) throw new Error(body?.message ?? res.statusText);
  return body as T;
}

export function getPublicShareInfo(token: string) {
  return publicFetch<{ resourceType: string; resourceId: string; resourceName: string; dataRoomId: string; isFile: boolean }>(
    `/public/shares/${token}`,
  );
}

export function listPublicItems(token: string, folderId: string | null, cursor?: string | null) {
  const params = new URLSearchParams();
  if (folderId) params.set("folderId", folderId);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return publicFetch<FolderContentsDto>(`/public/shares/${token}/items${qs ? `?${qs}` : ""}`);
}

export function getPublicFileUrl(token: string, fileId: string, disposition: "inline" | "attachment" = "inline") {
  return publicFetch<{ url: string }>(`/public/shares/${token}/files/${fileId}/url?disposition=${disposition}`);
}
