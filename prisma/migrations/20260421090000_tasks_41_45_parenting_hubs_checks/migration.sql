-- Task 45: track dental/hearing/vision flags per child
CREATE TABLE "child_health_flags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "child_id" UUID NOT NULL,
  "dental_due" BOOLEAN NOT NULL DEFAULT false,
  "hearing_concern" BOOLEAN NOT NULL DEFAULT false,
  "vision_concern" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "child_health_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "child_health_flags_child_id_key" UNIQUE ("child_id")
);

ALTER TABLE "child_health_flags"
  ADD CONSTRAINT "child_health_flags_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
