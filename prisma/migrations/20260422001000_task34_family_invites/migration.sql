-- Task 34: family invite flow + accepted child access grants
CREATE TABLE "family_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inviter_user_id" UUID NOT NULL,
  "child_id" UUID NOT NULL,
  "invitee_email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'caregiver',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "family_invites_token_key" ON "family_invites"("token");
CREATE INDEX "family_invites_child_id_status_idx" ON "family_invites"("child_id", "status");
CREATE INDEX "family_invites_invitee_email_status_idx" ON "family_invites"("invitee_email", "status");

ALTER TABLE "family_invites"
  ADD CONSTRAINT "family_invites_inviter_user_id_fkey"
  FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "family_invites"
  ADD CONSTRAINT "family_invites_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "child_accesses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "child_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'caregiver',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "child_accesses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "child_accesses_child_id_user_id_key" UNIQUE ("child_id", "user_id")
);

CREATE INDEX "child_accesses_user_id_idx" ON "child_accesses"("user_id");
ALTER TABLE "child_accesses"
  ADD CONSTRAINT "child_accesses_child_id_fkey"
  FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "child_accesses"
  ADD CONSTRAINT "child_accesses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
