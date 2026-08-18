import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ADMIN } from "../supabase/supabase.module";
import { PrismaService } from "../prisma/prisma.service";
import type { FastifyRequest } from "fastify";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * Verifies the Supabase access token by asking Supabase Auth to resolve it
 * (works regardless of whether the project signs tokens HS256 or RS256, no
 * local key management). Costs one network round-trip per request, which is
 * an acceptable trade-off for this MVP's traffic; swapping in local JWKS
 * verification (`jose.createRemoteJWKSet`) is a drop-in optimization later.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException("Invalid or expired session");
    }

    const { id, email, user_metadata } = data.user;
    if (!email) {
      throw new UnauthorizedException("Account has no email");
    }

    const name = (user_metadata?.full_name as string | undefined) ?? (user_metadata?.name as string | undefined) ?? null;
    const avatarUrl = (user_metadata?.avatar_url as string | undefined) ?? null;

    // Avoid a write on every request: only touch the row on first sight.
    // Profile fields (name/avatar) refresh lazily whenever that happens again.
    let user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      user = await this.prisma.user.create({ data: { id, email, name, avatarUrl } });
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
    return true;
  }
}
