-- MVP: feedback on a symptom triage run (matches Supabase `symptom_check_feedback` shape).

-- CreateTable
CREATE TABLE "symptom_check_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "check_id" UUID NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_check_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "symptom_check_feedback_user_id_check_id_key" ON "symptom_check_feedback"("user_id", "check_id");

-- CreateIndex
CREATE INDEX "symptom_check_feedback_check_id_idx" ON "symptom_check_feedback"("check_id");

-- AddForeignKey
ALTER TABLE "symptom_check_feedback" ADD CONSTRAINT "symptom_check_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_check_feedback" ADD CONSTRAINT "symptom_check_feedback_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "symptom_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
