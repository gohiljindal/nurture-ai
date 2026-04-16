-- Growth measurements stored in the same Postgres DB as Prisma (local Docker or hosted).

CREATE TABLE "growth_measurements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "child_id" UUID NOT NULL,
    "measured_at" DATE NOT NULL,
    "weight_kg" DECIMAL(5,3),
    "height_cm" DECIMAL(5,1),
    "head_cm" DECIMAL(5,1),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "growth_measurements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "growth_measurements_child_id_idx" ON "growth_measurements"("child_id");

CREATE INDEX "growth_measurements_child_id_measured_at_idx" ON "growth_measurements"("child_id", "measured_at");

ALTER TABLE "growth_measurements" ADD CONSTRAINT "growth_measurements_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
