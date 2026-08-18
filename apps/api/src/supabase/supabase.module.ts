import { Global, Module } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_ADMIN = "SUPABASE_ADMIN";

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      useFactory: (): SupabaseClient => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
          throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
        }
        // Service-role client: bypasses RLS, used only server-side to verify
        // user tokens and to read/write Storage on the user's behalf.
        return createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      },
    },
  ],
  exports: [SUPABASE_ADMIN],
})
export class SupabaseModule {}
