import { Inject, Injectable } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ADMIN } from "../supabase/supabase.module";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

@Injectable()
export class StorageService {
  private readonly bucket: string;

  constructor(@Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient) {
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "data-room-files";
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).upload(key, data, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
  }

  async getSignedUrl(key: string, filename: string, disposition: "inline" | "attachment"): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(key, SIGNED_URL_TTL_SECONDS, {
        download: disposition === "attachment" ? filename : undefined,
      });
    if (error || !data) throw error ?? new Error("Failed to sign URL");
    return data.signedUrl;
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const { error } = await this.supabase.storage.from(this.bucket).remove(keys);
    if (error) throw error;
  }
}
