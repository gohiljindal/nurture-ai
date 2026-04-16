-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AppMeta" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" TEXT NOT NULL DEFAULT 'ok',

    CONSTRAINT "AppMeta_pkey" PRIMARY KEY ("id")
);
