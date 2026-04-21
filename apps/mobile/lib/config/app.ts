import Constants from "expo-constants";

/** Product identity — keep aligned with `docs/ARCHITECTURE_MASTER.md`. */
export const APP_NAME = "Nurture AI";

export const APP_TAGLINE =
  "From first breath to first steps — smart, AI-powered guidance for every parenting moment.";

/** From app.json / EAS; fallback for tests. */
export const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";
