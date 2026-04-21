import pkg from "@/package.json";

export type HealthPayload = {
  ok: true;
  service: "nurtureai-api";
  timestamp: string;
};

export type MetaPayload = {
  service: "nurtureai-api";
  name: string;
  version: string;
  /** `development` | `production` | `test` */
  node_env: string;
  git_sha: string | null;
};

export function buildHealthPayload(): HealthPayload {
  return {
    ok: true,
    service: "nurtureai-api",
    timestamp: new Date().toISOString(),
  };
}

export function buildMetaPayload(): MetaPayload {
  return {
    service: "nurtureai-api",
    name: pkg.name,
    version: pkg.version,
    node_env: process.env.NODE_ENV ?? "development",
    git_sha:
      process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
      process.env.GIT_SHA?.trim() ||
      null,
  };
}
