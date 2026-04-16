-- Aligns with supabase/migrations/20240203_vaccines.sql (child_vaccines + is_overdue trigger).

CREATE TABLE "child_vaccines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "child_id" UUID NOT NULL,
    "vaccine_code" TEXT NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "scheduled_date" DATE,
    "administered_at" DATE,
    "administered_by" TEXT,
    "lot_number" TEXT,
    "notes" TEXT,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "child_vaccines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "child_vaccines_child_id_idx" ON "child_vaccines"("child_id");

CREATE INDEX "child_vaccines_child_id_province_idx" ON "child_vaccines"("child_id", "province");

ALTER TABLE "child_vaccines" ADD CONSTRAINT "child_vaccines_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION child_vaccines_set_is_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_overdue := COALESCE(
    NEW.administered_at IS NULL AND NEW.scheduled_date < CURRENT_DATE,
    FALSE
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER child_vaccines_set_is_overdue
  BEFORE INSERT OR UPDATE OF administered_at, scheduled_date
  ON "child_vaccines"
  FOR EACH ROW
  EXECUTE PROCEDURE child_vaccines_set_is_overdue();
