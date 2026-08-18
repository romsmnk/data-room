import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import multipart from "@fastify/multipart";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 1024 * 1024 * 1024 }), // 1GB, actual per-file cap enforced in FilesService
  );

  // @fastify/multipart resolves its own nested `fastify` peer copy under pnpm,
  // which structurally duplicates (but doesn't functionally differ from) the
  // one used by @nestjs/platform-fastify — hence the cast, not a real mismatch.
  await app.register(multipart as never, {
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB per file
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`API listening on :${port}`);
}

bootstrap();
