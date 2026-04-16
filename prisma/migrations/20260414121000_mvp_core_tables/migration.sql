-- Evolve local schema after `20260414120000_init` (drops bootstrap `AppMeta`).
DROP TABLE IF EXISTS "AppMeta";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "sex_at_birth" TEXT,
    "is_premature" BOOLEAN NOT NULL DEFAULT false,
    "gestational_age_weeks" INTEGER,
    "province" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "input_text" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "ai_response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disclaimer_accepted" BOOLEAN NOT NULL DEFAULT false,
    "model_used" TEXT,
    "flow_version" TEXT,
    "followup_count" INTEGER,
    "decision_source" TEXT,
    "rule_reason" TEXT,

    CONSTRAINT "symptom_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "children_user_id_idx" ON "children"("user_id");

-- CreateIndex
CREATE INDEX "symptom_checks_user_id_idx" ON "symptom_checks"("user_id");

-- CreateIndex
CREATE INDEX "symptom_checks_child_id_idx" ON "symptom_checks"("child_id");

-- CreateIndex
CREATE INDEX "symptom_checks_created_at_idx" ON "symptom_checks"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_checks" ADD CONSTRAINT "symptom_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_checks" ADD CONSTRAINT "symptom_checks_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
