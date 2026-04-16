import { Prisma } from "@prisma/client";

const DB_UNREACHABLE =
  "Cannot connect to the database. Please try again in a moment. If this keeps happening, contact support.";

const SCHEMA_OUT_OF_DATE =
  "We couldn't save your information. Please try again. If the problem continues, contact support.";

function logDevDbHint(scope: string): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[${scope}] Database schema may be out of date. If you develop locally, run: npm run db:deploy`
  );
}

function messageFromErrorMessage(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (
    (lower.includes("column") && lower.includes("does not exist")) ||
    (lower.includes("relation") && lower.includes("does not exist")) ||
    lower.includes("photo_url")
  ) {
    logDevDbHint("prisma-errors/messageFromErrorMessage");
    return SCHEMA_OUT_OF_DATE;
  }
  if (lower.includes("invalid input syntax for type uuid")) {
    return "Session user id is invalid. Try signing out and signing in again.";
  }
  if (lower.includes("econnrefused") || lower.includes("connect econnrefused")) {
    return DB_UNREACHABLE;
  }
  return null;
}

/**
 * Maps common Prisma errors to short, user-safe messages (no stack traces).
 */
export function friendlyPrismaErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P1001" || e.code === "P1017") {
      return DB_UNREACHABLE;
    }
    if (e.code === "P2003") {
      return "Your account could not be linked in the database. Try signing out and signing in again.";
    }
    /** Column/table missing — local DB not migrated to match Prisma schema. */
    if (e.code === "P2022") {
      logDevDbHint("prisma-errors/P2022");
      return SCHEMA_OUT_OF_DATE;
    }
    if (e.code === "P2021") {
      logDevDbHint("prisma-errors/P2021");
      return SCHEMA_OUT_OF_DATE;
    }
    const fromMeta = messageFromErrorMessage(e.message);
    if (fromMeta) return fromMeta;
  }

  if (e instanceof Prisma.PrismaClientInitializationError) {
    return DB_UNREACHABLE;
  }

  /** Wrong field types / missing required fields in Prisma input. */
  if (e instanceof Prisma.PrismaClientValidationError) {
    const hint = messageFromErrorMessage(e.message);
    if (hint) return hint;
    logDevDbHint("prisma-errors/ValidationError");
    return (
      "We couldn't save this profile. Check that the name, date of birth, and photo (if any) are valid, then try again."
    );
  }

  if (e instanceof Prisma.PrismaClientUnknownRequestError) {
    const hint = messageFromErrorMessage(e.message);
    if (hint) return hint;
  }

  if (e instanceof Error) {
    const hint = messageFromErrorMessage(e.message);
    if (hint) return hint;
  }

  return fallback;
}

export function logPrismaWarning(scope: string, e: unknown): void {
  const code =
    e instanceof Prisma.PrismaClientKnownRequestError
      ? e.code
      : e instanceof Error
        ? e.name
        : "?";
  const line =
    e instanceof Error ? e.message.split("\n")[0].slice(0, 120) : String(e).slice(0, 120);
  console.warn(`[${scope}] ${code} ${line}`);
}
