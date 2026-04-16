-- Add optional child profile photo URL for mobile/web profile cards.
ALTER TABLE "children"
ADD COLUMN "photo_url" TEXT;
